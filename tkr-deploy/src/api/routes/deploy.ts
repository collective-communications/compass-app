import type { DeployOrchestrator } from "../../domain/deploy-orchestrator.js";

/**
 * Registers deploy action routes.
 * Full deploy runs async with SSE streaming progress.
 * Individual steps run synchronously and return results.
 */
export function registerDeployRoutes(
  orchestrator: DeployOrchestrator
): (req: Request) => Response | Promise<Response> | null {
  return (req: Request): Response | Promise<Response> | null => {
    const url = new URL(req.url);

    if (!url.pathname.startsWith("/api/deploy")) {
      return null;
    }

    if (req.method === "GET" && url.pathname === "/api/deploy/status") {
      return handleStatus(orchestrator);
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    switch (url.pathname) {
      case "/api/deploy/full":
        return handleFullDeploy(orchestrator);
      case "/api/deploy/secrets":
        return handleSingleStep(orchestrator, "syncSecrets");
      case "/api/deploy/migrations":
        return handleSingleStep(orchestrator, "pushMigrations");
      case "/api/deploy/functions":
        return handleSingleStep(orchestrator, "deployFunctions");
      default:
        return null;
    }
  };
}

function handleStatus(orchestrator: DeployOrchestrator): Response {
  return Response.json(orchestrator.status);
}

function handleFullDeploy(orchestrator: DeployOrchestrator): Response {
  if (orchestrator.isRunning) {
    return Response.json(
      { error: "Deploy already in progress" },
      { status: 409 }
    );
  }

  // Fire and forget — progress streams via SSE
  orchestrator.fullDeploy().catch(() => {
    // Errors are emitted via events; nothing to handle here
  });

  return Response.json({ started: true });
}

async function handleSingleStep(
  orchestrator: DeployOrchestrator,
  step: "syncSecrets" | "pushMigrations" | "deployFunctions"
): Promise<Response> {
  try {
    const result = await orchestrator.runSingle(step);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
