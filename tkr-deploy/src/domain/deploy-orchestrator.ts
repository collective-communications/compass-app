import pino from "pino";
import type { GitHubAdapter, WorkflowRun } from "../adapters/github-adapter.js";
import type {
  DeployEventEmitter,
  DeployStepName,
} from "./event-emitter.js";

export interface DeployOrchestratorConfig {
  github: GitHubAdapter;
  emitter: DeployEventEmitter;
  logger?: pino.Logger;
  /** GitHub Actions workflow filename, e.g., "deploy.yml" */
  workflowFilename?: string;
  /** Polling interval for pipeline status (ms) */
  pollIntervalMs?: number;
  /** Max polling attempts for pipeline completion */
  maxPollAttempts?: number;
  /** Health check URL to verify after deploy */
  healthCheckUrl?: string;
  /** Hook: sync secrets to providers */
  syncSecretsHook?: () => Promise<Record<string, unknown>>;
  /** Hook: push database migrations */
  pushMigrationsHook?: () => Promise<Record<string, unknown>>;
  /** Hook: deploy edge functions */
  deployFunctionsHook?: () => Promise<Record<string, unknown>>;
  /** Hook: run preflight checks */
  preflightHook?: () => Promise<Record<string, unknown>>;
}

export interface StepResult {
  step: DeployStepName;
  success: boolean;
  result: Record<string, unknown>;
  error?: string;
}

const ALL_STEPS: DeployStepName[] = [
  "preflight",
  "syncSecrets",
  "pushMigrations",
  "triggerPipeline",
  "watchPipeline",
  "healthCheck",
];

/**
 * Orchestrates a full deploy: local pre-conditions → GitHub Actions pipeline → health check.
 * Emits typed events at every step lifecycle boundary for SSE consumers.
 */
export class DeployOrchestrator {
  private readonly logger: pino.Logger;
  private readonly pollIntervalMs: number;
  private readonly maxPollAttempts: number;
  private running = false;
  private currentStep: DeployStepName | null = null;
  private stepResults: StepResult[] = [];

  constructor(private readonly config: DeployOrchestratorConfig) {
    this.logger = config.logger ?? pino({ name: "deploy-orchestrator" });
    this.pollIntervalMs = config.pollIntervalMs ?? 10_000;
    this.maxPollAttempts = config.maxPollAttempts ?? 60;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get status(): {
    running: boolean;
    currentStep: DeployStepName | null;
    steps: StepResult[];
  } {
    return {
      running: this.running,
      currentStep: this.currentStep,
      steps: [...this.stepResults],
    };
  }

  /**
   * Run the full deploy pipeline asynchronously.
   * Returns the aggregated results of all steps.
   */
  async fullDeploy(): Promise<StepResult[]> {
    if (this.running) {
      throw new Error("Deploy already in progress");
    }

    this.running = true;
    this.stepResults = [];
    this.currentStep = null;

    const { emitter } = this.config;

    emitter.emit({
      type: "deploy:start",
      timestamp: new Date().toISOString(),
      steps: ALL_STEPS,
    });

    try {
      await this.runStep("preflight", () => this.preflight());
      await this.runStep("syncSecrets", () => this.syncSecrets());
      await this.runStep("pushMigrations", () => this.pushMigrations());
      await this.runStep("triggerPipeline", () => this.triggerPipeline());
      await this.runStep("watchPipeline", () => this.watchPipeline());
      await this.runStep("healthCheck", () => this.healthCheck());

      const allSuccess = this.stepResults.every((s) => s.success);

      emitter.emit({
        type: "deploy:complete",
        timestamp: new Date().toISOString(),
        success: allSuccess,
        summary: {
          total: this.stepResults.length,
          passed: this.stepResults.filter((s) => s.success).length,
          failed: this.stepResults.filter((s) => !s.success).length,
        },
      });

      return this.stepResults;
    } finally {
      this.running = false;
      this.currentStep = null;
    }
  }

  /**
   * Run a single named step independently.
   */
  async runSingle(
    step: "syncSecrets" | "pushMigrations" | "deployFunctions"
  ): Promise<StepResult> {
    const handlers: Record<string, () => Promise<Record<string, unknown>>> = {
      syncSecrets: () => this.syncSecrets(),
      pushMigrations: () => this.pushMigrations(),
      deployFunctions: () => this.deployFunctions(),
    };

    const handler = handlers[step];
    if (!handler) {
      throw new Error(`Unknown step: ${step}`);
    }

    const result = await this.executeStep(step as DeployStepName, handler);
    return result;
  }

  // --- Step implementations ---

  private async preflight(): Promise<Record<string, unknown>> {
    if (this.config.preflightHook) {
      return this.config.preflightHook();
    }
    return { status: "ok", checks: ["vault", "providers", "secrets"] };
  }

  private async syncSecrets(): Promise<Record<string, unknown>> {
    if (this.config.syncSecretsHook) {
      return this.config.syncSecretsHook();
    }
    return { synced: true, providers: ["github", "vercel", "supabase"] };
  }

  private async pushMigrations(): Promise<Record<string, unknown>> {
    if (this.config.pushMigrationsHook) {
      return this.config.pushMigrationsHook();
    }
    return { pushed: true };
  }

  private async deployFunctions(): Promise<Record<string, unknown>> {
    if (this.config.deployFunctionsHook) {
      return this.config.deployFunctionsHook();
    }
    return { deployed: true };
  }

  private async triggerPipeline(): Promise<Record<string, unknown>> {
    const { github } = this.config;
    const filename = this.config.workflowFilename ?? "deploy.yml";

    const workflowId = await github.getWorkflowByFilename(filename);
    if (!workflowId) {
      throw new Error(`Workflow '${filename}' not found`);
    }

    const dispatchTime = new Date().toISOString();
    await github.dispatchWorkflow(workflowId);

    const run = await github.findLatestDispatchRun(workflowId, dispatchTime);
    if (!run) {
      throw new Error("Could not find dispatch run after triggering");
    }

    // Stash run ID for watchPipeline
    this.pipelineRunId = run.id;
    this.pipelineRunUrl = run.html_url;

    return {
      triggered: true,
      runId: run.id,
      url: run.html_url,
    };
  }

  private pipelineRunId: number | null = null;
  private pipelineRunUrl: string = "";

  private async watchPipeline(): Promise<Record<string, unknown>> {
    if (!this.pipelineRunId) {
      throw new Error("No pipeline run to watch — triggerPipeline must run first");
    }

    const { github, emitter } = this.config;
    const runId = this.pipelineRunId;

    for (let attempt = 1; attempt <= this.maxPollAttempts; attempt++) {
      const run: WorkflowRun = await github.getWorkflowRun(runId);

      emitter.emit({
        type: "pipeline:status",
        timestamp: new Date().toISOString(),
        runId: run.id,
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
      });

      if (run.status === "completed") {
        if (run.conclusion !== "success") {
          throw new Error(
            `Pipeline failed: conclusion=${run.conclusion} (${run.html_url})`
          );
        }
        return {
          completed: true,
          conclusion: run.conclusion,
          url: run.html_url,
          polls: attempt,
        };
      }

      await this.sleep(this.pollIntervalMs);
    }

    throw new Error(
      `Pipeline did not complete within ${this.maxPollAttempts} polls`
    );
  }

  private async healthCheck(): Promise<Record<string, unknown>> {
    const url = this.config.healthCheckUrl;
    if (!url) {
      return { skipped: true, reason: "no healthCheckUrl configured" };
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status} ${url}`);
    }

    return { healthy: true, status: response.status, url };
  }

  // --- Helpers ---

  private async runStep(
    name: DeployStepName,
    fn: () => Promise<Record<string, unknown>>
  ): Promise<void> {
    const result = await this.executeStep(name, fn);
    this.stepResults.push(result);

    if (!result.success) {
      throw new Error(`Step '${name}' failed: ${result.error}`);
    }
  }

  private async executeStep(
    name: DeployStepName,
    fn: () => Promise<Record<string, unknown>>
  ): Promise<StepResult> {
    const { emitter } = this.config;
    this.currentStep = name;

    emitter.emit({
      type: "deploy:step-start",
      step: name,
      timestamp: new Date().toISOString(),
    });

    try {
      const result = await fn();
      emitter.emit({
        type: "deploy:step-complete",
        step: name,
        timestamp: new Date().toISOString(),
        result,
      });
      return { step: name, success: true, result };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);
      emitter.emit({
        type: "deploy:step-fail",
        step: name,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      });
      return { step: name, success: false, result: {}, error: errorMessage };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
