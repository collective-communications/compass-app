import type { DeployEventEmitter } from "../domain/event-emitter.js";
import type { DeployOrchestrator } from "../domain/deploy-orchestrator.js";
import { registerEventRoutes } from "./routes/events.js";
import { registerDeployRoutes } from "./routes/deploy.js";

export interface ServerConfig {
  port: number;
  emitter: DeployEventEmitter;
  orchestrator: DeployOrchestrator;
}

/**
 * Creates a Bun HTTP server that routes requests through registered handlers.
 */
export function createServer(config: ServerConfig): {
  fetch: (req: Request) => Response | Promise<Response>;
  port: number;
} {
  const eventHandler = registerEventRoutes(config.emitter);
  const deployHandler = registerDeployRoutes(config.orchestrator);

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  return {
    port: config.port,
    fetch: async (req: Request): Promise<Response> => {
      // Handle CORS preflight
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }

      // Try each route handler in order
      const eventResponse = eventHandler(req);
      if (eventResponse) return eventResponse;

      const deployResponse = deployHandler(req);
      if (deployResponse) return deployResponse;

      // Health endpoint
      const url = new URL(req.url);
      if (url.pathname === "/api/health") {
        return Response.json({ ok: true });
      }

      return new Response("Not Found", { status: 404 });
    },
  };
}
