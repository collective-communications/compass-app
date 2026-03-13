import type { ProviderAdapter, ProviderHealth } from '../../src/types/provider.js';
import type { WorkflowStatus, WorkflowRun } from './types.js';
import { KNOWN_WORKFLOWS } from './types.js';
import {
  GitHubApiError,
  GitHubTimeoutError,
} from './errors.js';
import { encryptSecret } from './crypto.js';

export interface GitHubAdapterConfig {
  token: string;
  owner: string;
  repo: string;
  timeoutMs?: number;
  /** Lazy credential resolver — called per-request to get fresh token from vault. */
  resolve?: {
    token: () => Promise<string>;
  };
}

const BASE_URL = 'https://api.github.com';
const DEFAULT_TIMEOUT_MS = 10_000;

export class GitHubAdapter implements ProviderAdapter {
  readonly name = 'github' as const;

  private readonly initialToken: string;
  private readonly owner: string;
  private readonly repo: string;
  private readonly timeoutMs: number;
  private readonly resolve?: GitHubAdapterConfig['resolve'];

  constructor(config: GitHubAdapterConfig) {
    this.initialToken = config.token;
    this.owner = config.owner;
    this.repo = config.repo;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.resolve = config.resolve;
  }

  private async getToken(): Promise<string> {
    if (this.resolve?.token) {
      const resolved = await this.resolve.token();
      if (resolved) return resolved;
    }
    return this.initialToken;
  }

  private get repoPath(): string {
    return `/repos/${this.owner}/${this.repo}`;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = Date.now();
    try {
      const repo = await this.request<{ full_name: string; private: boolean }>(
        'GET',
        this.repoPath,
      );
      return {
        provider: this.name,
        status: 'healthy',
        label: 'GitHub',
        details: { repo: repo.full_name, private: repo.private },
        checkedAt,
      };
    } catch (error: unknown) {
      return {
        provider: this.name,
        status: 'down',
        label: 'GitHub',
        details: { error: error instanceof Error ? error.message : String(error) },
        checkedAt,
      };
    }
  }

  async getWorkflows(): Promise<WorkflowStatus[]> {
    const body = await this.request<{
      workflows: Array<{
        id: number;
        name: string;
        path: string;
        state: string;
      }>;
    }>('GET', `${this.repoPath}/actions/workflows`);

    const fetched = new Map(
      body.workflows.map((w) => {
        const filename = w.path.split('/').pop() ?? w.path;
        return [filename, w];
      }),
    );

    const results: WorkflowStatus[] = [];

    for (const known of KNOWN_WORKFLOWS) {
      const w = fetched.get(known);
      if (w) {
        // Fetch latest run for this workflow
        let lastRun: WorkflowRun | null = null;
        try {
          const runs = await this.getWorkflowRuns(w.id, 1);
          lastRun = runs[0] ?? null;
        } catch {
          // no runs available
        }

        results.push({
          id: w.id,
          name: w.name,
          filename: known,
          state: w.state === 'active' ? 'active' : 'active',
          lastRun,
        });
      } else {
        results.push({
          id: 0,
          name: known.replace('.yml', ''),
          filename: known,
          state: 'not_created',
          lastRun: null,
        });
      }
    }

    return results;
  }

  async getWorkflowRuns(workflowId: number, limit: number = 10): Promise<WorkflowRun[]> {
    const body = await this.request<{
      workflow_runs: Array<{
        id: number;
        status: string;
        conclusion: string | null;
        event: string;
        head_branch: string;
        html_url: string;
        created_at: string;
        updated_at: string;
        run_started_at: string | null;
      }>;
    }>('GET', `${this.repoPath}/actions/workflows/${workflowId}/runs?per_page=${limit}`);

    return body.workflow_runs.map((r) => mapRun(r));
  }

  async getRecentRuns(limit: number = 10): Promise<WorkflowRun[]> {
    const body = await this.request<{
      workflow_runs: Array<{
        id: number;
        status: string;
        conclusion: string | null;
        event: string;
        head_branch: string;
        html_url: string;
        created_at: string;
        updated_at: string;
        run_started_at: string | null;
      }>;
    }>('GET', `${this.repoPath}/actions/runs?per_page=${limit}`);

    return body.workflow_runs.map((r) => mapRun(r));
  }

  async listSecrets(): Promise<string[]> {
    const body = await this.request<{
      secrets: Array<{ name: string }>;
    }>('GET', `${this.repoPath}/actions/secrets`);

    return body.secrets.map((s) => s.name);
  }

  async getPublicKey(): Promise<{ key_id: string; key: string }> {
    return this.request<{ key_id: string; key: string }>(
      'GET',
      `${this.repoPath}/actions/secrets/public-key`,
    );
  }

  async setSecret(name: string, value: string): Promise<void> {
    const publicKey = await this.getPublicKey();
    const encryptedValue = await encryptSecret(value, publicKey.key);

    await this.request('PUT', `${this.repoPath}/actions/secrets/${name}`, {
      encrypted_value: encryptedValue,
      key_id: publicKey.key_id,
    });
  }

  async createFile(path: string, content: string, message: string): Promise<void> {
    const encoded = btoa(content);
    await this.request('PUT', `${this.repoPath}/contents/${path}`, {
      message,
      content: encoded,
    });
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getToken();
    const url = `${BASE_URL}${path}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new GitHubTimeoutError(this.timeoutMs);
      }
      throw error;
    }

    if (!response.ok) {
      throw await GitHubApiError.fromResponse(response);
    }

    // Some PUT endpoints return 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }
}

function mapRun(r: {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  head_branch: string;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_started_at: string | null;
}): WorkflowRun {
  const startTime = r.run_started_at ? new Date(r.run_started_at).getTime() : null;
  const endTime = r.status === 'completed' ? new Date(r.updated_at).getTime() : null;
  const durationMs = startTime && endTime ? endTime - startTime : null;

  return {
    id: r.id,
    status: r.status,
    conclusion: r.conclusion,
    event: r.event,
    branch: r.head_branch,
    durationMs,
    createdAt: r.created_at,
    htmlUrl: r.html_url,
  };
}
