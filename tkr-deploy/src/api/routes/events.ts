import type { Server } from "bun";
import type { DeployEventEmitter } from "../../domain/event-emitter.js";

/**
 * Registers SSE event routes. Each connected client receives real-time
 * deploy lifecycle events formatted as Server-Sent Events.
 */
export function registerEventRoutes(
  emitter: DeployEventEmitter
): (req: Request) => Response | null {
  return (req: Request): Response | null => {
    const url = new URL(req.url);

    if (url.pathname !== "/api/events") {
      return null;
    }

    if (req.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        controller.enqueue(
          formatSSE("connected", { timestamp: new Date().toISOString() })
        );

        // Subscribe to all deploy events
        unsubscribe = emitter.on("*", (event) => {
          try {
            controller.enqueue(formatSSE(event.type, event));
          } catch {
            // Stream closed — cleanup handled in cancel
          }
        });
      },
      cancel() {
        unsubscribe?.();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  };
}

function formatSSE(
  eventType: string,
  data: Record<string, unknown>
): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}
