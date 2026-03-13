import type { ProviderAdapter, ProviderHealth } from '../../src/types/provider.js';
import type { DeploymentEntry, VercelEnvVar } from './types.js';
import {
  VercelApiError,
  VercelTimeoutError,
} from './errors.js';

export interface VercelAdapterOptions {
  token: string;
  projectId: string;
  orgId?: string;
  timeoutMs?: number;
  /** Lazy credential resolver — called per-request to get fresh token from vault. */
  resolve?: {
    token: () => Promise<string>;
    projectId?: () => Promise<string>;
    orgId?: () => Promise<string>;
  };
}

export class VercelAdapter implements ProviderAdapter {
  readonly name = 'vercel' as const;

  private readonly initialToken: string;
  private readonly initialProjectId: string;
  private readonly orgId: string | undefined;
  private readonly timeoutMs: number;
  private readonly resolve?: VercelAdapterOptions['resolve'];

  constructor(options: VercelAdapterOptions) {
    this.initialToken = options.token;
    this.initialProjectId = options.projectId;
    this.orgId = options.orgId;
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.resolve = options.resolve;
  }

  private async getToken(): Promise<string> {
    if (this.resolve?.token) {
      const resolved = await this.resolve.token();
      if (resolved) return resolved;
    }
    return this.initialToken;
  }

  get projectId(): string {
    return this.initialProjectId;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await this.getToken();
    const url = new URL(path, 'https://api.vercel.com');
    if (this.orgId) url.searchParams.set('teamId', this.orgId);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new VercelTimeoutError(this.timeoutMs);
      }
      throw error;
    }

    if (!res.ok) throw await VercelApiError.fromResponse(res);
    return res.json() as Promise<T>;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = Date.now();
    try {
      const project = await this.request<{ name: string }>(
        'GET',
        `/v9/projects/${this.projectId}`,
      );
      return {
        provider: this.name,
        status: 'healthy',
        label: project.name,
        details: { projectId: this.projectId },
        checkedAt,
      };
    } catch (error: unknown) {
      const status = error instanceof VercelApiError ? 'down' : 'unknown';
      return {
        provider: this.name,
        status,
        label: this.projectId,
        details: { error: error instanceof Error ? error.message : String(error) },
        checkedAt,
      };
    }
  }

  async getProject(): Promise<{ name: string; framework: string | null; alias: string[] }> {
    const data = await this.request<{
      name: string;
      framework: string | null;
      alias?: { domain: string }[];
    }>('GET', `/v9/projects/${this.projectId}`);

    return {
      name: data.name,
      framework: data.framework,
      alias: data.alias?.map((a) => a.domain) ?? [],
    };
  }

  async getDeployments(limit: number = 20): Promise<DeploymentEntry[]> {
    const data = await this.request<{
      deployments: Array<{
        uid: string;
        url?: string;
        meta?: { githubCommitSha?: string; githubCommitMessage?: string; githubCommitRef?: string };
        target: 'production' | 'preview' | null;
        state?: string;
        ready?: number;
        buildingAt?: number;
        created: number;
        errorMessage?: string;
        inspectorUrl?: string;
      }>;
    }>('GET', `/v6/deployments?projectId=${this.projectId}&limit=${limit}`);

    return data.deployments.map((d): DeploymentEntry => ({
      uid: d.uid,
      commitSha: d.meta?.githubCommitSha ?? '',
      commitMessage: d.meta?.githubCommitMessage ?? '',
      branch: d.meta?.githubCommitRef ?? '',
      target: d.target === 'production' ? 'production' : 'preview',
      status: d.state ?? 'UNKNOWN',
      duration: d.ready && d.buildingAt ? d.ready - d.buildingAt : null,
      createdAt: new Date(d.created).toISOString(),
      url: d.url ? `https://${d.url}` : undefined,
      errorMessage: d.errorMessage,
      inspectorUrl: d.inspectorUrl,
    }));
  }

  async getCurrentDeployment(): Promise<DeploymentEntry | null> {
    const deployments = await this.getDeployments(10);
    return deployments.find((d) => d.target === 'production') ?? null;
  }

  async getEnvVars(): Promise<VercelEnvVar[]> {
    const data = await this.request<{
      envs: Array<{ key: string; value: string; target: string[]; type: string; id: string }>;
    }>('GET', `/v9/projects/${this.projectId}/env`);

    return data.envs.filter((e) => e.target.includes('production'));
  }

  async setEnvVar(key: string, value: string): Promise<void> {
    const existing = await this.request<{
      envs: Array<{ key: string; id: string; target: string[]; type: string }>;
    }>('GET', `/v9/projects/${this.projectId}/env`);

    const match = existing.envs.find((e) => e.key === key);

    if (match) {
      await this.request('PATCH', `/v9/projects/${this.projectId}/env/${match.id}`, {
        value,
      });
    } else {
      await this.request('POST', `/v9/projects/${this.projectId}/env`, {
        key,
        value,
        target: ['production'],
        type: 'encrypted',
      });
    }
  }

  async triggerRedeploy(deploymentId: string): Promise<string> {
    const project = await this.getProject();
    const data = await this.request<{ id: string }>(
      'POST',
      `/v13/deployments?forceNew=1`,
      { deploymentId, name: project.name, target: 'production' },
    );
    return data.id;
  }

  async promoteDeployment(uid: string): Promise<void> {
    await this.request('POST', `/v6/deployments/${uid}/promote`, {});
  }

  async pollDeployment(uid: string): Promise<DeploymentEntry> {
    const maxAttempts = 30; // 30 * 10s = 5 min
    const intervalMs = 10_000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const data = await this.request<{
        uid: string;
        meta?: { githubCommitSha?: string; githubCommitMessage?: string; githubCommitRef?: string };
        target: 'production' | 'preview' | null;
        state?: string;
        ready?: number;
        buildingAt?: number;
        created: number;
      }>('GET', `/v6/deployments/${uid}`);

      const entry: DeploymentEntry = {
        uid: data.uid,
        commitSha: data.meta?.githubCommitSha ?? '',
        commitMessage: data.meta?.githubCommitMessage ?? '',
        branch: data.meta?.githubCommitRef ?? '',
        target: data.target === 'production' ? 'production' : 'preview',
        status: data.state ?? 'UNKNOWN',
        duration: data.ready && data.buildingAt ? data.ready - data.buildingAt : null,
        createdAt: new Date(data.created).toISOString(),
      };

      if (entry.status === 'READY' || entry.status === 'ERROR') {
        return entry;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new VercelTimeoutError(maxAttempts * intervalMs);
  }
}
