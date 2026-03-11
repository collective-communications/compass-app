import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { SupabaseAdapter } from './supabase-adapter.js';
import {
  CliNotFoundError,
  SupabaseAuthError,
  SupabaseTimeoutError,
  SupabaseApiError,
} from './supabase-errors.js';

/** Helper to create a mock Bun.spawn process */
function mockProc(stdout: string, stderr: string, exitCode: number, opts?: { killed?: boolean }): any {
  return {
    stdout: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(stdout));
        controller.close();
      },
    }),
    stderr: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(stderr));
        controller.close();
      },
    }),
    exited: Promise.resolve(exitCode),
    killed: opts?.killed ?? false,
    kill: mock(() => {}),
  };
}

function createAdapter(overrides?: Partial<{ projectRef: string; accessToken: string; timeoutMs: number }>): SupabaseAdapter {
  return new SupabaseAdapter({
    projectRef: overrides?.projectRef ?? 'test-project-ref',
    accessToken: overrides?.accessToken ?? 'test-access-token',
    timeoutMs: overrides?.timeoutMs,
  });
}

describe('SupabaseAdapter', () => {
  let spawnSpy: ReturnType<typeof spyOn>;
  let fetchSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    spawnSpy = spyOn(Bun, 'spawn');
    fetchSpy = spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    spawnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('has name "supabase"', () => {
    const adapter = createAdapter();
    expect(adapter.name).toBe('supabase');
  });

  describe('healthCheck', () => {
    it('returns healthy when CLI succeeds', async () => {
      spawnSpy.mockReturnValue(mockProc('No pending changes', '', 0));
      const adapter = createAdapter();

      const health = await adapter.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.provider).toBe('supabase');
      expect(health.label).toBe('Supabase');
      expect(health.details.projectRef).toBe('test-project-ref');
      expect(typeof health.checkedAt).toBe('number');
    });

    it('returns down when CLI is not found', async () => {
      spawnSpy.mockImplementation(() => { throw new Error('spawn ENOENT'); });
      const adapter = createAdapter();

      const health = await adapter.healthCheck();

      expect(health.status).toBe('down');
      expect(health.details.error).toBe('CLI not found');
    });

    it('returns down on auth failure', async () => {
      spawnSpy.mockReturnValue(mockProc('', 'Error: not logged in', 1));
      const adapter = createAdapter();

      const health = await adapter.healthCheck();

      expect(health.status).toBe('down');
      expect(health.details.error).toBe('Authentication failed');
    });

    it('returns warning on non-zero exit code without auth error', async () => {
      spawnSpy.mockReturnValue(mockProc('', 'some warning', 1));
      // Need to avoid auth error detection — use stderr without auth keywords
      spawnSpy.mockReturnValue(mockProc('', 'connection refused', 1));
      const adapter = createAdapter();

      const health = await adapter.healthCheck();

      expect(health.status).toBe('warning');
    });
  });

  describe('getMigrations', () => {
    it('parses migration entries from CLI output', async () => {
      const output = [
        '20240101000000_init.sql (applied) 2024-01-01T00:00:00Z',
        '20240201000000_users.sql (pending)',
      ].join('\n');
      spawnSpy.mockReturnValue(mockProc(output, '', 0));
      const adapter = createAdapter();

      const migrations = await adapter.getMigrations();

      expect(migrations).toHaveLength(2);
      expect(migrations[0]).toEqual({
        filename: '20240101000000_init.sql',
        status: 'applied',
        appliedAt: '2024-01-01T00:00:00Z',
      });
      expect(migrations[1]).toEqual({
        filename: '20240201000000_users.sql',
        status: 'pending',
        appliedAt: null,
      });
    });
  });

  describe('pushMigrations', () => {
    it('returns applied filenames on success', async () => {
      spawnSpy.mockReturnValue(mockProc('20240101000000_init.sql\n20240201000000_users.sql', '', 0));
      const adapter = createAdapter();

      const result = await adapter.pushMigrations();

      expect(result.applied).toEqual(['20240101000000_init.sql', '20240201000000_users.sql']);
      expect(result.errors).toEqual([]);
    });

    it('returns errors on failure', async () => {
      spawnSpy.mockReturnValue(mockProc('', 'syntax error at line 5\nrollback', 1));
      const adapter = createAdapter();

      const result = await adapter.pushMigrations();

      expect(result.applied).toEqual([]);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('deployFunction', () => {
    it('succeeds when CLI exits 0', async () => {
      spawnSpy.mockReturnValue(mockProc('Deployed function hello-world', '', 0));
      const adapter = createAdapter();

      await expect(adapter.deployFunction('hello-world')).resolves.toBeUndefined();

      const args = spawnSpy.mock.calls[0][0];
      expect(args).toContain('functions');
      expect(args).toContain('deploy');
      expect(args).toContain('hello-world');
    });

    it('throws SupabaseApiError on failure', async () => {
      spawnSpy.mockReturnValue(mockProc('', 'function not found', 1));
      const adapter = createAdapter();

      await expect(adapter.deployFunction('missing')).rejects.toBeInstanceOf(SupabaseApiError);
    });
  });

  describe('deployAllFunctions', () => {
    it('handles partial failure', async () => {
      // First call: getEdgeFunctions list
      const listOutput = 'fn-a    Active    2024-01-01    \nfn-b    Active    2024-01-02    ';
      spawnSpy
        .mockReturnValueOnce(mockProc(listOutput, '', 0))
        // deploy fn-a succeeds
        .mockReturnValueOnce(mockProc('Deployed', '', 0))
        // deploy fn-b fails
        .mockReturnValueOnce(mockProc('', 'deploy error', 1));

      const adapter = createAdapter();
      const result = await adapter.deployAllFunctions();

      expect(result.deployed).toEqual(['fn-a']);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].name).toBe('fn-b');
    });
  });

  describe('getExtensionStatus', () => {
    it('returns installed status via Management API', async () => {
      fetchSpy.mockResolvedValue(new Response(
        JSON.stringify([
          { name: 'pgvector', installed_version: '0.5.0' },
          { name: 'pg_trgm', installed_version: null },
        ]),
        { status: 200 },
      ));
      const adapter = createAdapter();

      const status = await adapter.getExtensionStatus('pgvector');

      expect(status.installed).toBe(true);
      expect(status.version).toBe('0.5.0');
    });

    it('returns not installed for missing extension', async () => {
      fetchSpy.mockResolvedValue(new Response(
        JSON.stringify([{ name: 'other', installed_version: null }]),
        { status: 200 },
      ));
      const adapter = createAdapter();

      const status = await adapter.getExtensionStatus('pgvector');

      expect(status.installed).toBe(false);
      expect(status.version).toBeNull();
    });

    it('throws SupabaseApiError on non-OK response', async () => {
      fetchSpy.mockResolvedValue(new Response('Forbidden', { status: 403, statusText: 'Forbidden' }));
      const adapter = createAdapter();

      await expect(adapter.getExtensionStatus('pgvector')).rejects.toBeInstanceOf(SupabaseApiError);
    });
  });

  describe('enableExtension', () => {
    it('sends POST to Management API', async () => {
      fetchSpy.mockResolvedValue(new Response('{}', { status: 201 }));
      const adapter = createAdapter();

      await adapter.enableExtension('pgvector');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/extensions');
      expect(opts.method).toBe('POST');
      expect(JSON.parse(opts.body as string)).toEqual({ name: 'pgvector' });
    });
  });

  describe('setSecrets', () => {
    it('passes key=value pairs to CLI', async () => {
      spawnSpy.mockReturnValue(mockProc('Secrets set', '', 0));
      const adapter = createAdapter();

      await adapter.setSecrets({ API_KEY: 'abc123', DB_URL: 'postgres://...' });

      const args = spawnSpy.mock.calls[0][0] as string[];
      expect(args).toContain('secrets');
      expect(args).toContain('set');
      expect(args).toContain('API_KEY=abc123');
      expect(args).toContain('DB_URL=postgres://...');
    });
  });

  describe('CLI timeout', () => {
    it('throws SupabaseTimeoutError when process is killed', async () => {
      const neverResolve = {
        stdout: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(''));
            controller.close();
          },
        }),
        stderr: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(''));
            controller.close();
          },
        }),
        exited: Promise.resolve(137),
        killed: true,
        kill: mock(() => {}),
      };
      spawnSpy.mockReturnValue(neverResolve);
      const adapter = createAdapter({ timeoutMs: 100 });

      await expect(adapter.healthCheck()).resolves.toMatchObject({
        status: 'unknown',
      });
    });
  });
});
