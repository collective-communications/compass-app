import pino from "pino";
import { GitHubAdapter } from "./src/adapters/github-adapter.js";
import { DeployEventEmitter } from "./src/domain/event-emitter.js";
import { DeployOrchestrator } from "./src/domain/deploy-orchestrator.js";
import { createServer } from "./src/api/server.js";

const logger = pino({ name: "tkr-deploy" });

const port = Number(process.env.DEPLOY_PORT ?? 4100);

// --- Adapters ---

const github = new GitHubAdapter({
  token: process.env.GITHUB_TOKEN ?? "",
  owner: process.env.GITHUB_OWNER ?? "",
  repo: process.env.GITHUB_REPO ?? "",
  logger,
});

// --- Domain ---

const emitter = new DeployEventEmitter();

const orchestrator = new DeployOrchestrator({
  github,
  emitter,
  logger,
  workflowFilename: "deploy.yml",
  healthCheckUrl: process.env.HEALTH_CHECK_URL,
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 10_000),
  maxPollAttempts: Number(process.env.MAX_POLL_ATTEMPTS ?? 60),
});

// --- Server ---

const server = Bun.serve(createServer({ port, emitter, orchestrator }));

logger.info({ port: server.port }, "tkr-deploy server started");
