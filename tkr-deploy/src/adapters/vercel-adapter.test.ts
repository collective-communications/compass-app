import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { VercelAdapter } from './vercel-adapter.js';
import {
  VercelAuthError,
  VercelNotFoundError,
  VercelRateLimitError,
} from './vercel-errors.js';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const PROJECT_ID = 'prj_test123';
const TOKEN = 'test-token';
const ORG_ID = 'team_abc';

function makeAdapter(orgId?: string): VercelAdapter {
  return new VercelAdapter({
    token: TOKEN,
    projectId: PROJECT_ID,
    orgId,
    timeoutMs: 5000,
  });
}

const originalFetch = globalThis.fetch;

describe('VercelAdapter', () => {
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() => Promise.resolve(jsonResponse({})));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // 1. healthCheck — healthy
  it('healthCheck returns healthy on success', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ name: 'my-project' })),
    );
    const adapter = makeAdapter();
    const result = await adapter.healthCheck();

    expect(result.status).toBe('healthy');
    expect(result.provider).toBe('vercel');
    expect(result.label).toBe('my-project');
    expect(result.checkedAt).toBeGreaterThan(0);
  });

  // 2. healthCheck — 401
  it('healthCheck returns down on 401', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ error: { message: 'Unauthorized' } }, 401)),
    );
    const adapter = makeAdapter();
    const result = await adapter.healthCheck();

    expect(result.status).toBe('down');
  });

  // 3. healthCheck — 404
  it('healthCheck returns down on 404', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ error: { message: 'Not found' } }, 404)),
    );
    const adapter = makeAdapter();
    const result = await adapter.healthCheck();

    expect(result.status).toBe('down');
  });

  // 4. getDeployments maps response correctly
  it('getDeployments maps Vercel response to DeploymentEntry[]', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({
        deployments: [
          {
            uid: 'dpl_1',
            meta: { githubCommitSha: 'abc123', githubCommitMessage: 'fix bug', githubCommitRef: 'main' },
            target: 'production',
            state: 'READY',
            ready: 1700000100000,
            buildingAt: 1700000000000,
            created: 1700000000000,
          },
          {
            uid: 'dpl_2',
            meta: {},
            target: null,
            state: 'BUILDING',
            created: 1700000050000,
          },
        ],
      })),
    );
    const adapter = makeAdapter();
    const deployments = await adapter.getDeployments(5);

    expect(deployments).toHaveLength(2);
    expect(deployments[0].uid).toBe('dpl_1');
    expect(deployments[0].commitSha).toBe('abc123');
    expect(deployments[0].target).toBe('production');
    expect(deployments[0].duration).toBe(100000);
    expect(deployments[1].target).toBe('preview');
    expect(deployments[1].duration).toBeNull();
  });

  // 5. getCurrentDeployment returns latest production
  it('getCurrentDeployment returns first production deployment', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({
        deployments: [
          { uid: 'dpl_preview', meta: {}, target: null, state: 'READY', created: 1700000000000 },
          { uid: 'dpl_prod', meta: {}, target: 'production', state: 'READY', created: 1699999000000 },
        ],
      })),
    );
    const adapter = makeAdapter();
    const result = await adapter.getCurrentDeployment();

    expect(result).not.toBeNull();
    expect(result!.uid).toBe('dpl_prod');
  });

  // 6. getCurrentDeployment returns null when no production
  it('getCurrentDeployment returns null when no production deployments', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({
        deployments: [
          { uid: 'dpl_1', meta: {}, target: null, state: 'READY', created: 1700000000000 },
        ],
      })),
    );
    const adapter = makeAdapter();
    const result = await adapter.getCurrentDeployment();

    expect(result).toBeNull();
  });

  // 7. getEnvVars filters to production
  it('getEnvVars filters to production targets', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({
        envs: [
          { key: 'API_KEY', value: 'secret', target: ['production'], type: 'encrypted', id: 'env_1' },
          { key: 'DEV_KEY', value: 'dev', target: ['development'], type: 'plain', id: 'env_2' },
          { key: 'SHARED', value: 'both', target: ['production', 'preview'], type: 'encrypted', id: 'env_3' },
        ],
      })),
    );
    const adapter = makeAdapter();
    const vars = await adapter.getEnvVars();

    expect(vars).toHaveLength(2);
    expect(vars.map((v) => v.key)).toEqual(['API_KEY', 'SHARED']);
  });

  // 8. setEnvVar creates new var
  it('setEnvVar creates when key does not exist', async () => {
    let callCount = 0;
    fetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(jsonResponse({ envs: [] }));
      }
      return Promise.resolve(jsonResponse({ id: 'env_new' }));
    });
    const adapter = makeAdapter();
    await adapter.setEnvVar('NEW_KEY', 'new_value');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCall = fetchMock.mock.calls[1] as [URL, RequestInit];
    const body = JSON.parse(secondCall[1].body as string);
    expect(body.key).toBe('NEW_KEY');
    expect(body.value).toBe('new_value');
    expect(secondCall[1].method).toBe('POST');
  });

  // 9. setEnvVar updates existing var
  it('setEnvVar updates when key exists', async () => {
    let callCount = 0;
    fetchMock.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve(jsonResponse({
          envs: [{ key: 'EXISTING', id: 'env_99', target: ['production'], type: 'encrypted' }],
        }));
      }
      return Promise.resolve(jsonResponse({}));
    });
    const adapter = makeAdapter();
    await adapter.setEnvVar('EXISTING', 'updated');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCall = fetchMock.mock.calls[1] as [URL, RequestInit];
    expect(secondCall[1].method).toBe('PATCH');
    expect(secondCall[0].toString()).toContain('/env/env_99');
  });

  // 10. triggerRedeploy returns new uid
  it('triggerRedeploy returns new deployment uid', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ uid: 'dpl_new' })),
    );
    const adapter = makeAdapter();
    const uid = await adapter.triggerRedeploy('dpl_old');

    expect(uid).toBe('dpl_new');
    const call = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(call[1].method).toBe('POST');
    expect(call[0].toString()).toContain('forceNew=1');
  });

  // 11. rate limit 429
  it('throws VercelRateLimitError on 429', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse(
        { error: { message: 'Too many requests' } },
        429,
        { 'Retry-After': '60' },
      )),
    );
    const adapter = makeAdapter();

    try {
      await adapter.getDeployments();
      expect(true).toBe(false); // should not reach
    } catch (error) {
      expect(error).toBeInstanceOf(VercelRateLimitError);
      expect((error as VercelRateLimitError).retryAfterMs).toBe(60_000);
    }
  });

  // 12. pollDeployment resolves on READY
  it('pollDeployment resolves when status is READY', async () => {
    let callCount = 0;
    fetchMock.mockImplementation(() => {
      callCount++;
      const state = callCount < 3 ? 'BUILDING' : 'READY';
      return Promise.resolve(jsonResponse({
        uid: 'dpl_poll',
        meta: {},
        target: 'production',
        state,
        created: 1700000000000,
        ...(state === 'READY' ? { ready: 1700000100000, buildingAt: 1700000000000 } : {}),
      }));
    });

    // Patch setTimeout to resolve immediately for test speed
    const origSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: () => void) => origSetTimeout(fn, 0)) as typeof setTimeout;

    try {
      const adapter = makeAdapter();
      const result = await adapter.pollDeployment('dpl_poll');
      expect(result.status).toBe('READY');
      expect(result.uid).toBe('dpl_poll');
      expect(callCount).toBe(3);
    } finally {
      globalThis.setTimeout = origSetTimeout;
    }
  });

  // 13. pollDeployment resolves on ERROR
  it('pollDeployment resolves when status is ERROR', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({
        uid: 'dpl_err',
        meta: {},
        target: null,
        state: 'ERROR',
        created: 1700000000000,
      })),
    );

    const origSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: () => void) => origSetTimeout(fn, 0)) as typeof setTimeout;

    try {
      const adapter = makeAdapter();
      const result = await adapter.pollDeployment('dpl_err');
      expect(result.status).toBe('ERROR');
    } finally {
      globalThis.setTimeout = origSetTimeout;
    }
  });

  // 14. teamId included in URL when orgId provided
  it('includes teamId in URL when orgId is set', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ name: 'team-project' })),
    );
    const adapter = makeAdapter(ORG_ID);
    await adapter.healthCheck();

    const call = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(call[0].toString()).toContain(`teamId=${ORG_ID}`);
  });
});
