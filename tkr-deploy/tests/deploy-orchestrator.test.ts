import { describe, it, expect, beforeEach, mock } from "bun:test";
import { DeployOrchestrator } from "../src/domain/deploy-orchestrator.js";
import { DeployEventEmitter, type DeployEvent } from "../src/domain/event-emitter.js";
import type { GitHubAdapter, WorkflowRun } from "../src/adapters/github-adapter.js";

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

describe("DeployOrchestrator", () => {
  let emitter: DeployEventEmitter;
  let github: GitHubAdapter;
  let orchestrator: DeployOrchestrator;
  let events: DeployEvent[];

  beforeEach(() => {
    emitter = new DeployEventEmitter();
    github = createMockGitHub();
    events = [];
    emitter.on("*", (e) => events.push(e));

    orchestrator = new DeployOrchestrator({
      github,
      emitter,
      pollIntervalMs: 0,
      maxPollAttempts: 1,
    });
  });

  it("runs full deploy pipeline and emits lifecycle events", async () => {
    const results = await orchestrator.fullDeploy();

    expect(results).toHaveLength(6);
    expect(results.every((r) => r.success)).toBe(true);

    // Check event sequence
    const types = events.map((e) => e.type);
    expect(types[0]).toBe("deploy:start");
    expect(types[types.length - 1]).toBe("deploy:complete");
    expect(types).toContain("deploy:step-start");
    expect(types).toContain("deploy:step-complete");
    expect(types).toContain("pipeline:status");
  });

  it("reports running status during deploy", async () => {
    expect(orchestrator.isRunning).toBe(false);

    let wasRunning = false;
    emitter.on("deploy:step-start", () => {
      wasRunning = orchestrator.isRunning;
    });

    await orchestrator.fullDeploy();

    expect(wasRunning).toBe(true);
    expect(orchestrator.isRunning).toBe(false);
  });

  it("prevents concurrent deploys", async () => {
    const first = orchestrator.fullDeploy();

    await expect(orchestrator.fullDeploy()).rejects.toThrow(
      "Deploy already in progress"
    );

    await first;
  });

  it("stops and emits failure on step error", async () => {
    const failOrchestrator = new DeployOrchestrator({
      github,
      emitter,
      pollIntervalMs: 0,
      preflightHook: () => Promise.reject(new Error("vault locked")),
    });

    const results = await failOrchestrator.fullDeploy().catch(() => {
      return failOrchestrator.status.steps;
    });

    expect(results[0].success).toBe(false);
    expect(results[0].error).toBe("vault locked");

    const failEvents = events.filter((e) => e.type === "deploy:step-fail");
    expect(failEvents).toHaveLength(1);
  });

  it("runs single step independently", async () => {
    const result = await orchestrator.runSingle("syncSecrets");
    expect(result.success).toBe(true);
    expect(result.step).toBe("syncSecrets");
  });

  it("uses custom hooks when provided", async () => {
    const hookOrchestrator = new DeployOrchestrator({
      github,
      emitter,
      pollIntervalMs: 0,
      maxPollAttempts: 1,
      syncSecretsHook: () =>
        Promise.resolve({ synced: true, custom: true }),
      pushMigrationsHook: () =>
        Promise.resolve({ pushed: true, count: 3 }),
    });

    const results = await hookOrchestrator.fullDeploy();
    const secretsResult = results.find((r) => r.step === "syncSecrets");
    expect(secretsResult?.result).toEqual({ synced: true, custom: true });
  });

  it("status returns step results", async () => {
    await orchestrator.fullDeploy();
    const status = orchestrator.status;

    expect(status.running).toBe(false);
    expect(status.currentStep).toBeNull();
    expect(status.steps).toHaveLength(6);
  });
});
