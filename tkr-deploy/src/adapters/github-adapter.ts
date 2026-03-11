import pino from "pino";

/**
 * Represents a GitHub Actions workflow run.
 */
export interface WorkflowRun {
  id: number;
  status: "queued" | "in_progress" | "completed" | "waiting";
  conclusion: "success" | "failure" | "cancelled" | "skipped" | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  event: string;
}

export interface GitHubAdapterConfig {
  token: string;
  owner: string;
  repo: string;
  logger?: pino.Logger;
}

/**
 * Adapter for GitHub Actions API interactions.
 * Handles workflow dispatch, run retrieval, and status polling.
 */
export class GitHubAdapter {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;
  private readonly logger: pino.Logger;

  constructor(private readonly config: GitHubAdapterConfig) {
    this.baseUrl = `https://api.github.com/repos/${config.owner}/${config.repo}`;
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    this.logger = config.logger ?? pino({ name: "github-adapter" });
  }

  /**
   * Dispatches a workflow via the workflow_dispatch event.
   * GitHub returns 204 with no body — the run ID must be found separately.
   */
  async dispatchWorkflow(
    workflowId: number,
    ref: string = "main"
  ): Promise<void> {
    const url = `${this.baseUrl}/actions/workflows/${workflowId}/dispatches`;
    this.logger.info({ workflowId, ref }, "Dispatching workflow");

    const response = await fetch(url, {
      method: "POST",
      headers: { ...this.headers, "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to dispatch workflow ${workflowId}: ${response.status} ${body}`
      );
    }

    this.logger.info({ workflowId }, "Workflow dispatched successfully");
  }

  /**
   * Retrieves a single workflow run by ID.
   */
  async getWorkflowRun(runId: number): Promise<WorkflowRun> {
    const url = `${this.baseUrl}/actions/runs/${runId}`;
    this.logger.debug({ runId }, "Fetching workflow run");

    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to get workflow run ${runId}: ${response.status} ${body}`
      );
    }

    return (await response.json()) as WorkflowRun;
  }

  /**
   * Finds the latest workflow_dispatch run for a given workflow.
   *
   * GitHub's dispatch endpoint returns 204 with no run ID, so we poll
   * recent runs filtered by event=workflow_dispatch and pick the newest one
   * created after our dispatch time.
   *
   * @param workflowId - The workflow file ID or name (e.g., "deploy.yml")
   * @param afterTimestamp - ISO timestamp; only runs created after this are considered
   * @param maxAttempts - Number of polling attempts (default: 10)
   * @param intervalMs - Milliseconds between polls (default: 3000)
   */
  async findLatestDispatchRun(
    workflowId: number,
    afterTimestamp?: string,
    maxAttempts: number = 10,
    intervalMs: number = 3000
  ): Promise<WorkflowRun | null> {
    const since = afterTimestamp ?? new Date().toISOString();
    this.logger.info(
      { workflowId, since, maxAttempts },
      "Polling for dispatch run"
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const url = `${this.baseUrl}/actions/workflows/${workflowId}/runs?event=workflow_dispatch&per_page=5`;
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        this.logger.warn(
          { status: response.status, attempt },
          "Failed to list workflow runs"
        );
        await this.sleep(intervalMs);
        continue;
      }

      const data = (await response.json()) as {
        workflow_runs: WorkflowRun[];
      };

      const match = data.workflow_runs.find(
        (run) => new Date(run.created_at) >= new Date(since)
      );

      if (match) {
        this.logger.info(
          { runId: match.id, attempt },
          "Found dispatch run"
        );
        return match;
      }

      this.logger.debug({ attempt }, "Run not found yet, polling...");
      await this.sleep(intervalMs);
    }

    this.logger.warn({ workflowId }, "Dispatch run not found after polling");
    return null;
  }

  /**
   * Lists workflows to find a workflow ID by filename.
   */
  async getWorkflowByFilename(filename: string): Promise<number | null> {
    const url = `${this.baseUrl}/actions/workflows`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      workflows: Array<{ id: number; path: string; name: string }>;
    };

    const workflow = data.workflows.find((w) =>
      w.path.endsWith(filename)
    );

    return workflow?.id ?? null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
