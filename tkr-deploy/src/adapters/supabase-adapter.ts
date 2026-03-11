import type { ProviderAdapter, ProviderHealth } from '../types/provider.js';
import type { MigrationEntry, EdgeFunction } from '../types/supabase.js';
import {
  CliNotFoundError,
  SupabaseAuthError,
  SupabaseTimeoutError,
  SupabaseApiError,
} from './supabase-errors.js';

export interface SupabaseAdapterConfig {
  projectRef: string;
  accessToken: string;
  serviceRoleKey?: string;
  supabaseUrl?: string;
  projectRoot?: string;
  timeoutMs?: number;
}

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MGMT_API = 'https://api.supabase.com';

export class SupabaseAdapter implements ProviderAdapter {
  readonly name = 'supabase' as const;

  private readonly projectRef: string;
  private readonly accessToken: string;
  private readonly serviceRoleKey: string;
  private readonly supabaseUrl: string;
  private readonly projectRoot: string;
  private readonly timeoutMs: number;

  constructor(config: SupabaseAdapterConfig) {
    this.projectRef = config.projectRef;
    this.accessToken = config.accessToken;
    this.serviceRoleKey = config.serviceRoleKey ?? '';
    this.supabaseUrl = config.supabaseUrl ?? '';
    this.projectRoot = config.projectRoot ?? process.cwd();
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  // ── Management API helper ──

  private async mgmtRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${MGMT_API}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new SupabaseApiError(res.status, `Supabase API ${method} ${path}: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Database RPC helper (uses service role key) ──

  private async dbRpc<T>(sql: string): Promise<T> {
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new SupabaseApiError(0, 'Database query requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }
    const res = await fetch(`${this.supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.serviceRoleKey}`,
        'apikey': this.serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      throw new SupabaseApiError(res.status, `Database RPC failed: ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  // ── Health (Management API) ──

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = Date.now();
    try {
      const project = await this.mgmtRequest<{
        id: string;
        name: string;
        region: string;
        status: string;
        database?: { version?: string };
      }>('GET', `/v1/projects/${this.projectRef}`);

      const isHealthy = project.status === 'ACTIVE_HEALTHY';
      return {
        provider: this.name,
        status: isHealthy ? 'healthy' : 'warning',
        label: 'Supabase',
        details: {
          projectRef: this.projectRef,
          region: project.region,
          version: project.database?.version ?? 'unknown',
        },
        checkedAt,
      };
    } catch (error) {
      return {
        provider: this.name,
        status: error instanceof SupabaseApiError ? 'down' : 'unknown',
        label: 'Supabase',
        details: { error: error instanceof Error ? error.message : String(error) },
        checkedAt,
      };
    }
  }

  // ── Migrations (local filesystem scan + CLI for push) ──

  async getMigrations(): Promise<MigrationEntry[]> {
    const { readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const migrationsDir = join(this.projectRoot, 'supabase', 'migrations');

    let files: string[] = [];
    try {
      const all = await readdir(migrationsDir);
      files = all.filter((f) => f.endsWith('.sql')).sort();
    } catch {
      return [];
    }

    return files.map((filename): MigrationEntry => ({
      filename,
      status: 'applied',
      appliedAt: null,
    }));
  }

  async pushMigrations(): Promise<{ applied: string[]; errors: string[] }> {
    const result = await this.runCli([
      'db', 'push',
      '--project-ref', this.projectRef,
    ]);

    if (result.exitCode === 0) {
      const applied = result.stdout
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => line.trim());
      return { applied, errors: [] };
    }

    return {
      applied: [],
      errors: result.stderr.trim().split('\n').filter(Boolean),
    };
  }

  // ── Edge Functions (Management API) ──

  async getEdgeFunctions(): Promise<EdgeFunction[]> {
    const { readdir } = await import('node:fs/promises');
    const { join } = await import('node:path');

    // 1. Scan local function directories
    const functionsDir = join(this.projectRoot, 'supabase', 'functions');
    let localNames: string[] = [];
    try {
      const entries = await readdir(functionsDir, { withFileTypes: true });
      localNames = entries
        .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
        .map((e) => e.name);
    } catch {
      // No local functions directory
    }

    // 2. Get remote deployed functions from Management API
    let remoteMap = new Map<string, { status: string; updatedAt: string | null }>();
    try {
      const remote = await this.mgmtRequest<Array<{
        slug: string;
        status: string;
        updated_at: string;
      }>>('GET', `/v1/projects/${this.projectRef}/functions`);
      for (const fn of remote) {
        remoteMap.set(fn.slug, { status: fn.status, updatedAt: fn.updated_at });
      }
    } catch {
      // API unavailable — show local only
    }

    // 3. Merge: local dirs as source of truth, remote status overlaid
    const allNames = new Set([...localNames, ...remoteMap.keys()]);
    return Array.from(allNames).sort().map((name): EdgeFunction => {
      const remote = remoteMap.get(name);
      return {
        name,
        deployed: remote?.status === 'ACTIVE',
        lastDeployed: remote?.updatedAt ?? null,
        requiredSecrets: [],
      };
    });
  }

  async deployFunction(name: string): Promise<void> {
    const result = await this.runCli([
      'functions', 'deploy', name,
      '--project-ref', this.projectRef,
    ]);

    if (result.exitCode !== 0) {
      throw new SupabaseApiError(1, `Failed to deploy function "${name}": ${result.stderr.trim()}`);
    }
  }

  async deployAllFunctions(): Promise<{ deployed: string[]; failed: Array<{ name: string; error: string }> }> {
    const functions = await this.getEdgeFunctions();
    const deployed: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];

    for (const fn of functions) {
      try {
        await this.deployFunction(fn.name);
        deployed.push(fn.name);
      } catch (error) {
        failed.push({
          name: fn.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { deployed, failed };
  }

  // ── Extensions (Management API database query) ──

  private async dbQuery<T>(sql: string): Promise<T> {
    return this.mgmtRequest<T>(
      'POST',
      `/v1/projects/${this.projectRef}/database/query`,
      { query: sql },
    );
  }

  async getExtensionStatus(name: string): Promise<{ installed: boolean; version: string | null }> {
    const rows = await this.dbQuery<Array<{
      name: string;
      installed_version: string | null;
      default_version: string | null;
    }>>(
      `SELECT name, installed_version, default_version FROM pg_available_extensions WHERE name = '${name}'`,
    );

    const ext = rows[0];
    if (!ext) return { installed: false, version: null };

    return {
      installed: ext.installed_version != null,
      version: ext.installed_version ?? ext.default_version ?? null,
    };
  }

  async enableExtension(name: string): Promise<void> {
    await this.dbQuery(`CREATE EXTENSION IF NOT EXISTS ${name}`);
  }

  async setSecrets(secrets: Record<string, string>): Promise<void> {
    const args: string[] = ['secrets', 'set', '--project-ref', this.projectRef];
    for (const [key, value] of Object.entries(secrets)) {
      args.push(`${key}=${value}`);
    }

    const result = await this.runCli(args);
    if (result.exitCode !== 0) {
      throw new SupabaseApiError(1, `Failed to set secrets: ${result.stderr.trim()}`);
    }
  }

  private async runCli(args: string[], opts?: { timeoutMs?: number }): Promise<CliResult> {
    const timeout = opts?.timeoutMs ?? this.timeoutMs;

    let proc: ReturnType<typeof Bun.spawn>;
    try {
      proc = Bun.spawn(['supabase', ...args], {
        stdout: 'pipe',
        stderr: 'pipe',
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: this.accessToken },
      });
    } catch {
      throw new CliNotFoundError();
    }

    const timer = setTimeout(() => {
      proc.kill();
    }, timeout);

    try {
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      const exitCode = await proc.exited;
      clearTimeout(timer);

      if (exitCode === null || (proc.killed && exitCode !== 0)) {
        throw new SupabaseTimeoutError(timeout);
      }

      if (stderr.includes('not logged in') || stderr.includes('Invalid token') || stderr.includes('unauthorized')) {
        throw new SupabaseAuthError(stderr.trim());
      }

      return { stdout, stderr, exitCode };
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof CliNotFoundError || error instanceof SupabaseAuthError || error instanceof SupabaseTimeoutError) {
        throw error;
      }
      throw error;
    }
  }
}
