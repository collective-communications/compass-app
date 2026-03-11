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
  timeoutMs?: number;
}

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export class SupabaseAdapter implements ProviderAdapter {
  readonly name = 'supabase' as const;

  private readonly projectRef: string;
  private readonly accessToken: string;
  private readonly timeoutMs: number;

  constructor(config: SupabaseAdapterConfig) {
    this.projectRef = config.projectRef;
    this.accessToken = config.accessToken;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const checkedAt = Date.now();
    try {
      const result = await this.runCli([
        'db', 'remote', 'changes',
        '--project-ref', this.projectRef,
      ]);

      if (result.exitCode === 0) {
        return {
          provider: this.name,
          status: 'healthy',
          label: 'Supabase',
          details: { projectRef: this.projectRef, pendingChanges: result.stdout.trim() },
          checkedAt,
        };
      }

      return {
        provider: this.name,
        status: 'warning',
        label: 'Supabase',
        details: { projectRef: this.projectRef, stderr: result.stderr.trim() },
        checkedAt,
      };
    } catch (error) {
      if (error instanceof CliNotFoundError) {
        return {
          provider: this.name,
          status: 'down',
          label: 'Supabase',
          details: { error: 'CLI not found' },
          checkedAt,
        };
      }
      if (error instanceof SupabaseAuthError) {
        return {
          provider: this.name,
          status: 'down',
          label: 'Supabase',
          details: { error: 'Authentication failed' },
          checkedAt,
        };
      }
      return {
        provider: this.name,
        status: 'unknown',
        label: 'Supabase',
        details: { error: String(error) },
        checkedAt,
      };
    }
  }

  async getMigrations(): Promise<MigrationEntry[]> {
    const result = await this.runCli([
      'db', 'remote', 'changes',
      '--project-ref', this.projectRef,
    ]);

    const entries: MigrationEntry[] = [];
    const lines = result.stdout.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      // Parse CLI output lines like: "20240101000000_init.sql (applied)"
      const match = line.match(/^(\S+\.sql)\s+\((\w+)\)(?:\s+(.+))?$/);
      if (match) {
        entries.push({
          filename: match[1],
          status: match[2] === 'applied' ? 'applied' : 'pending',
          appliedAt: match[3] ?? null,
        });
      }
    }

    return entries;
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

  async getEdgeFunctions(): Promise<EdgeFunction[]> {
    const result = await this.runCli([
      'functions', 'list',
      '--project-ref', this.projectRef,
    ]);

    const functions: EdgeFunction[] = [];
    const lines = result.stdout.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      // Skip header lines
      if (line.startsWith('─') || line.startsWith('NAME')) continue;

      const parts = line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        functions.push({
          name: parts[0],
          deployed: parts[1] === 'true' || parts[1] === 'Active',
          lastDeployed: parts[2] ?? null,
          requiredSecrets: parts[3] ? parts[3].split(',').map((s) => s.trim()) : [],
        });
      }
    }

    return functions;
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

  async getExtensionStatus(name: string): Promise<{ installed: boolean; version: string | null }> {
    const url = `https://api.supabase.com/v1/projects/${this.projectRef}/extensions`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new SupabaseApiError(response.status, `Failed to get extensions: ${response.statusText}`);
    }

    const extensions = (await response.json()) as Array<{ name: string; installed_version: string | null }>;
    const ext = extensions.find((e) => e.name === name);

    return {
      installed: ext?.installed_version != null,
      version: ext?.installed_version ?? null,
    };
  }

  async enableExtension(name: string): Promise<void> {
    const url = `https://api.supabase.com/v1/projects/${this.projectRef}/extensions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new SupabaseApiError(response.status, `Failed to enable extension "${name}": ${response.statusText}`);
    }
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
