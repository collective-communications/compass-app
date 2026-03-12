import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { GitHubAdapter } from './github-adapter.js';
import {
  GitHubAuthError,
  GitHubForbiddenError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  GitHubValidationError,
  GitHubTimeoutError,
} from './github-errors.js';

const TOKEN = 'ghp_test_123';
const OWNER = 'test-org';
const REPO = 'test-repo';

interface MockFetchOptions {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

function mockFetch(handler: (url: string, init?: RequestInit) => MockFetchOptions): void {
  globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const { status, body, headers } = handler(url, init);
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    });
  }) as unknown as typeof fetch;
}

function mockFetchError(error: Error): void {
  globalThis.fetch = mock(async () => {
    throw error;
  }) as unknown as typeof fetch;
}

// Mock encryptSecret to avoid dependency on tweetnacl in tests
mock.module('./github-crypto.js', () => ({
  encryptSecret: async (_value: string, _publicKeyBase64: string) => 'encrypted_base64_value',
}));

describe('GitHubAdapter', () => {
  const originalFetch = globalThis.fetch;
  let adapter: GitHubAdapter;

  beforeEach(() => {
    adapter = new GitHubAdapter({ token: TOKEN, owner: OWNER, repo: REPO });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('healthCheck', () => {
    it('returns healthy when repo is accessible', async () => {
      mockFetch(() => ({
        status: 200,
        body: { full_name: `${OWNER}/${REPO}`, private: true },
      }));

      const result = await adapter.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.provider).toBe('github');
      expect(result.label).toBe('GitHub');
      expect(result.details.repo).toBe(`${OWNER}/${REPO}`);
    });

    it('returns down on 401', async () => {
      mockFetch(() => ({ status: 401, body: { message: 'Bad credentials' } }));
      const result = await adapter.healthCheck();
      expect(result.status).toBe('down');
    });

    it('returns down on 404', async () => {
      mockFetch(() => ({ status: 404, body: { message: 'Not Found' } }));
      const result = await adapter.healthCheck();
      expect(result.status).toBe('down');
    });
  });

  describe('getWorkflows', () => {
    it('maps known workflows and marks missing as not_created', async () => {
      let callCount = 0;
      globalThis.fetch = mock(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        callCount++;

        if (url.includes('/actions/workflows') && !url.includes('/runs')) {
          return new Response(JSON.stringify({
            workflows: [
              { id: 1, name: 'CI', path: '.github/workflows/ci.yml', state: 'active' },
            ],
          }), { status: 200 });
        }

        // Workflow runs for ci.yml
        if (url.includes('/workflows/1/runs')) {
          return new Response(JSON.stringify({
            workflow_runs: [{
              id: 100,
              status: 'completed',
              conclusion: 'success',
              event: 'push',
              head_branch: 'main',
              html_url: 'https://github.com/owner/repo/actions/runs/100',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:05:00Z',
              run_started_at: '2024-01-01T00:00:00Z',
            }],
          }), { status: 200 });
        }

        return new Response(JSON.stringify({}), { status: 200 });
      }) as unknown as typeof fetch;

      const workflows = await adapter.getWorkflows();
      expect(workflows).toHaveLength(3); // ci.yml, deploy.yml, supabase-keepalive.yml

      const ci = workflows.find((w) => w.filename === 'ci.yml')!;
      expect(ci.state).toBe('active');
      expect(ci.lastRun).not.toBeNull();
      expect(ci.lastRun!.conclusion).toBe('success');

      const deploy = workflows.find((w) => w.filename === 'deploy.yml')!;
      expect(deploy.state).toBe('not_created');
      expect(deploy.lastRun).toBeNull();
    });
  });

  describe('getWorkflowRuns', () => {
    it('returns mapped workflow runs', async () => {
      mockFetch(() => ({
        status: 200,
        body: {
          workflow_runs: [
            {
              id: 100,
              status: 'completed',
              conclusion: 'success',
              event: 'push',
              head_branch: 'main',
              html_url: 'https://github.com/owner/repo/actions/runs/100',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:05:00Z',
              run_started_at: '2024-01-01T00:00:00Z',
            },
          ],
        },
      }));

      const runs = await adapter.getWorkflowRuns(1, 5);
      expect(runs).toHaveLength(1);
      expect(runs[0].id).toBe(100);
      expect(runs[0].branch).toBe('main');
      expect(runs[0].durationMs).toBe(300000); // 5 minutes
    });
  });

  describe('getRecentRuns', () => {
    it('returns recent runs across all workflows', async () => {
      mockFetch(() => ({
        status: 200,
        body: { workflow_runs: [] },
      }));

      const runs = await adapter.getRecentRuns(5);
      expect(runs).toEqual([]);
    });
  });

  describe('listSecrets', () => {
    it('returns secret names', async () => {
      mockFetch(() => ({
        status: 200,
        body: { secrets: [{ name: 'DEPLOY_KEY' }, { name: 'API_TOKEN' }] },
      }));

      const names = await adapter.listSecrets();
      expect(names).toEqual(['DEPLOY_KEY', 'API_TOKEN']);
    });
  });

  describe('setSecret', () => {
    it('fetches public key then puts encrypted secret', async () => {
      const urls: string[] = [];
      const methods: string[] = [];

      globalThis.fetch = mock(async (input: string | URL | Request, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        urls.push(url);
        methods.push(init?.method ?? 'GET');

        if (url.includes('/public-key')) {
          return new Response(JSON.stringify({ key_id: 'pk_1', key: 'base64publickey==' }), { status: 200 });
        }

        // PUT secret returns 204
        return new Response(null, { status: 204 });
      }) as unknown as typeof fetch;

      await adapter.setSecret('MY_SECRET', 'my-value');
      expect(urls).toHaveLength(2);
      expect(urls[0]).toContain('/public-key');
      expect(urls[1]).toContain('/secrets/MY_SECRET');
      expect(methods[1]).toBe('PUT');
    });
  });

  describe('createFile', () => {
    it('puts base64-encoded content to contents API', async () => {
      let capturedBody: Record<string, unknown> = {};

      globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
        capturedBody = JSON.parse(init?.body as string);
        return new Response(JSON.stringify({ content: { sha: 'abc123' } }), { status: 201 });
      }) as unknown as typeof fetch;

      await adapter.createFile('.github/workflows/ci.yml', 'name: CI', 'Add CI workflow');
      expect(capturedBody.message).toBe('Add CI workflow');
      expect(capturedBody.content).toBe(btoa('name: CI'));
    });
  });

  describe('error handling', () => {
    it('throws GitHubAuthError on 401', async () => {
      mockFetch(() => ({ status: 401, body: { message: 'Bad credentials' } }));
      await expect(adapter.listSecrets()).rejects.toBeInstanceOf(GitHubAuthError);
    });

    it('throws GitHubForbiddenError on 403 (non-rate-limit)', async () => {
      mockFetch(() => ({
        status: 403,
        body: { message: 'Forbidden' },
        headers: { 'X-RateLimit-Remaining': '100' },
      }));
      await expect(adapter.listSecrets()).rejects.toBeInstanceOf(GitHubForbiddenError);
    });

    it('throws GitHubRateLimitError on 403 with remaining=0', async () => {
      mockFetch(() => ({
        status: 403,
        body: { message: 'API rate limit exceeded' },
        headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '1700000000' },
      }));

      try {
        await adapter.listSecrets();
        expect.unreachable('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubRateLimitError);
        expect((error as GitHubRateLimitError).resetAt).toBe(1700000000000);
      }
    });

    it('throws GitHubNotFoundError on 404', async () => {
      mockFetch(() => ({ status: 404, body: { message: 'Not Found' } }));
      await expect(adapter.listSecrets()).rejects.toBeInstanceOf(GitHubNotFoundError);
    });

    it('throws GitHubValidationError on 422', async () => {
      mockFetch(() => ({ status: 422, body: { message: 'Validation Failed' } }));
      await expect(adapter.createFile('bad', '', '')).rejects.toBeInstanceOf(GitHubValidationError);
    });

    it('throws GitHubTimeoutError on timeout', async () => {
      const timeoutAdapter = new GitHubAdapter({ token: TOKEN, owner: OWNER, repo: REPO, timeoutMs: 10 });
      mockFetchError(new DOMException('The operation was aborted', 'TimeoutError'));
      await expect(timeoutAdapter.listSecrets()).rejects.toBeInstanceOf(GitHubTimeoutError);
    });
  });

  describe('request headers', () => {
    it('sends correct GitHub API headers', async () => {
      let capturedHeaders: Record<string, string> = {};
      globalThis.fetch = mock(async (_input: string | URL | Request, init?: RequestInit) => {
        capturedHeaders = Object.fromEntries(Object.entries(init?.headers ?? {}));
        return new Response(JSON.stringify({ full_name: 'x/y', private: false }), { status: 200 });
      }) as unknown as typeof fetch;

      await adapter.healthCheck();
      expect(capturedHeaders['Authorization']).toBe(`Bearer ${TOKEN}`);
      expect(capturedHeaders['Accept']).toBe('application/vnd.github+json');
      expect(capturedHeaders['X-GitHub-Api-Version']).toBe('2022-11-28');
    });
  });
});
