import { describe, it, expect, beforeEach, afterAll, mock } from "bun:test";
import { GitHubAdapter } from "../src/adapters/github-adapter.js";

// Mock fetch globally for these tests
const mockFetch = mock(() => Promise.resolve(new Response()));

describe("GitHubAdapter", () => {
  let adapter: GitHubAdapter;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockReset();
    adapter = new GitHubAdapter({
      token: "test-token",
      owner: "test-owner",
      repo: "test-repo",
    });
  });

  // Restore after all tests
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  describe("dispatchWorkflow", () => {
    it("sends POST to correct URL with ref", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, { status: 204 })
      );

      await adapter.dispatchWorkflow(12345, "main");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://api.github.com/repos/test-owner/test-repo/actions/workflows/12345/dispatches"
      );
      expect(opts.method).toBe("POST");
      expect(JSON.parse(opts.body as string)).toEqual({ ref: "main" });
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("Not Found", { status: 404 })
      );

      await expect(adapter.dispatchWorkflow(99999)).rejects.toThrow(
        "Failed to dispatch workflow 99999: 404"
      );
    });
  });

  describe("getWorkflowRun", () => {
    it("returns parsed workflow run", async () => {
      const run = {
        id: 100,
        status: "completed",
        conclusion: "success",
        html_url: "https://github.com/runs/100",
        created_at: "2026-03-04T00:00:00Z",
        updated_at: "2026-03-04T00:01:00Z",
        run_number: 5,
        event: "workflow_dispatch",
      };

      mockFetch.mockResolvedValueOnce(Response.json(run));

      const result = await adapter.getWorkflowRun(100);
      expect(result.id).toBe(100);
      expect(result.conclusion).toBe("success");
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce(
        new Response("Not Found", { status: 404 })
      );

      await expect(adapter.getWorkflowRun(999)).rejects.toThrow(
        "Failed to get workflow run 999: 404"
      );
    });
  });

  describe("findLatestDispatchRun", () => {
    it("finds a run created after the given timestamp", async () => {
      const run = {
        id: 200,
        status: "queued",
        conclusion: null,
        html_url: "https://github.com/runs/200",
        created_at: "2026-03-04T00:00:05Z",
        updated_at: "2026-03-04T00:00:05Z",
        run_number: 10,
        event: "workflow_dispatch",
      };

      mockFetch.mockResolvedValueOnce(
        Response.json({ workflow_runs: [run] })
      );

      const result = await adapter.findLatestDispatchRun(
        12345,
        "2026-03-04T00:00:00Z",
        1,
        0
      );

      expect(result).not.toBeNull();
      expect(result!.id).toBe(200);
    });

    it("returns null when no matching run found", async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve(Response.json({ workflow_runs: [] }))
      );

      const result = await adapter.findLatestDispatchRun(
        12345,
        "2026-03-04T00:00:00Z",
        2,
        0
      );

      expect(result).toBeNull();
    });
  });

  describe("getWorkflowByFilename", () => {
    it("returns workflow ID matching filename", async () => {
      mockFetch.mockResolvedValueOnce(
        Response.json({
          workflows: [
            { id: 1, path: ".github/workflows/ci.yml", name: "CI" },
            { id: 2, path: ".github/workflows/deploy.yml", name: "Deploy" },
          ],
        })
      );

      const id = await adapter.getWorkflowByFilename("deploy.yml");
      expect(id).toBe(2);
    });

    it("returns null when no match", async () => {
      mockFetch.mockResolvedValueOnce(
        Response.json({ workflows: [] })
      );

      const id = await adapter.getWorkflowByFilename("nonexistent.yml");
      expect(id).toBeNull();
    });
  });
});
