import { describe, it, expect, beforeEach, mock } from "bun:test";
import { DeployOrchestrator } from "../../src/domain/deploy-orchestrator.js";
import { DeployEventEmitter, type DeployEvent } from "../../src/domain/event-emitter.js";
import type { GitHubAdapter, WorkflowRun } from "../../src/adapters/github-adapter.js";
import { createServer } from "../../src/api/server.js";

function createMockGitHub(): GitHubAdapter {
  return {
    dispatchWorkflow: mock(() => Promise.resolve()),
    getWorkflowRun: mock(() =>
      Promise.resolve({
        id: 100,
        status: "completed",
        conclusion: "success",
        html_url: "https://github.com/runs/100",
        created_at: "2026-03-04T00:00:00Z",
        updated_at: "2026-03-04T00:01:00Z",
        run_number: 1,
        event: "workflow_dispatch",
      } as WorkflowRun)
    ),
    findLatestDispatchRun: mock(() =>
      Promise.resolve({
        id: 100,
        status: "queued",
        conclusion: null,
        html_url: "https://github.com/runs/100",
        created_at: "2026-03-04T00:00:00Z",
        updated_at: "2026-03-04T00:00:00Z",
        run_number: 1,
        event: "workflow_dispatch",
      } as WorkflowRun)
    ),
    getWorkflowByFilename: mock(() => Promise.resolve(42)),
  } as unknown as GitHubAdapter;
}

describe("Full deploy integration", () => {
  let emitter: DeployEventEmitter;
  let orchestrator: DeployOrchestrator;
  let serverConfig: ReturnType<typeof createServer>;

  beforeEach(() => {
    emitter = new DeployEventEmitter();
    const github = createMockGitHub();
    orchestrator = new DeployOrchestrator({
      github,
      emitter,
      pollIntervalMs: 0,
      maxPollAttempts: 1,
    });
    serverConfig = createServer({ port: 0, emitter, orchestrator });
  });

  it("POST /api/deploy/full returns started and 409 on second call", async () => {
    const res1 = await serverConfig.fetch(
      new Request("http://localhost/api/deploy/full", { method: "POST" })
    );
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.started).toBe(true);

    // Second call while running should 409
    const res2 = await serverConfig.fetch(
      new Request("http://localhost/api/deploy/full", { method: "POST" })
    );
    expect(res2.status).toBe(409);
  });

  it("GET /api/deploy/status returns current state", async () => {
    const res = await serverConfig.fetch(
      new Request("http://localhost/api/deploy/status")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("running");
    expect(body).toHaveProperty("steps");
  });

  it("POST /api/deploy/secrets runs single step", async () => {
    const res = await serverConfig.fetch(
      new Request("http://localhost/api/deploy/secrets", { method: "POST" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.step).toBe("syncSecrets");
  });

  it("POST /api/deploy/migrations runs single step", async () => {
    const res = await serverConfig.fetch(
      new Request("http://localhost/api/deploy/migrations", { method: "POST" })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.step).toBe("pushMigrations");
  });

  it("GET /api/health returns ok", async () => {
    const res = await serverConfig.fetch(
      new Request("http://localhost/api/health")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("unknown routes return 404", async () => {
    const res = await serverConfig.fetch(
      new Request("http://localhost/api/unknown")
    );
    expect(res.status).toBe(404);
  });
});
