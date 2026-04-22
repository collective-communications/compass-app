import type { DeployOrchestrator } from '../../core/deploy-orchestrator.js';
import type { Router } from '../router.js';
import { jsonSuccess, jsonError } from '../router.js';

/**
 * Parse a boolean-ish query parameter. Treats `1`, `true`, and `yes`
 * (case-insensitive) as true; everything else — including missing — as false.
 */
function parseBoolParam(value: string | null): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Read an optional JSON body without crashing on empty requests. Returns
 * `undefined` for empty bodies and `null` for malformed JSON (so the caller
 * can distinguish "no body" from "bad body").
 */
async function readOptionalJsonBody<T>(req: Request): Promise<T | undefined | null> {
  try {
    const text = await req.text();
    if (!text) return undefined;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Register deploy orchestration routes:
 *
 * - `POST /api/deploy` — run the full deploy pipeline. `?dryRun=1` or body
 *   `{ dryRun: true }` previews without executing steps.
 * - `POST /api/deploy/step/:id` — execute a single step by id.
 * - `POST /api/deploy/resume?from=<stepId>` — resume from a given step onward.
 * - `GET /api/deploy/runs?limit=N` — list recent runs (default 50, max 500).
 * - `GET /api/deploy/runs/:runId` — fetch one run with its step entries.
 */
export function registerDeployRoutes(
  router: Router,
  orchestrator: DeployOrchestrator,
): void {
  router.post('/api/deploy', async (req) => {
    const url = new URL(req.url);
    const queryDryRun = parseBoolParam(url.searchParams.get('dryRun'));

    const body = await readOptionalJsonBody<{ dryRun?: boolean }>(req);
    if (body === null) return jsonError('Invalid JSON body', 400);
    const bodyDryRun = body?.dryRun === true;

    const dryRun = queryDryRun || bodyDryRun;
    const report = await orchestrator.fullDeploy({ dryRun });
    return jsonSuccess(report);
  });

  router.post('/api/deploy/step/:id', async (_req, params) => {
    const result = await orchestrator.stepDeploy(params.id);
    return jsonSuccess(result);
  });

  router.post('/api/deploy/resume', async (req) => {
    const url = new URL(req.url);
    const from = url.searchParams.get('from');
    if (!from) {
      return jsonError(
        "Missing required query parameter 'from' (e.g. ?from=<stepId>)",
        400,
      );
    }
    const report = await orchestrator.resumeFromStep(from);
    return jsonSuccess(report);
  });

  router.get('/api/deploy/runs', async (req) => {
    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    let limit = 50;
    if (limitParam !== null) {
      const parsed = parseInt(limitParam, 10);
      if (!Number.isFinite(parsed)) {
        return jsonError("Query parameter 'limit' must be an integer", 400);
      }
      limit = Math.min(500, Math.max(1, parsed));
    }
    const runs = await orchestrator.listRuns(limit);
    return jsonSuccess({ runs });
  });

  router.get('/api/deploy/runs/:runId', async (_req, params) => {
    const result = await orchestrator.getRun(params.runId);
    if (!result) return jsonError(`Unknown run: ${params.runId}`, 404);
    return jsonSuccess(result);
  });
}
