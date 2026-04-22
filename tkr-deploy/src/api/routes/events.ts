import type { Router } from '../router.js';
import type { EventBus, DeployEvent } from '../../core/event-bus.js';

/** Keepalive cadence — SSE comment frames every 20s to keep proxies honest. */
const KEEPALIVE_MS = 20_000;

/**
 * Register the `GET /api/events` Server-Sent Events endpoint.
 *
 * Each SSE connection subscribes to the provided {@link EventBus} and forwards
 * every {@link DeployEvent} to the client as a typed SSE frame:
 *
 * ```
 * event: <kind>
 * data: <JSON>
 *
 * ```
 *
 * A `keepalive` event fires every {@link KEEPALIVE_MS}ms so proxies and load
 * balancers don't close the connection. Subscriptions are torn down on
 * cancel(). If `controller.enqueue` throws (client went away mid-frame) the
 * event is silently dropped rather than propagated.
 */
export function registerEventRoutes(router: Router, eventBus: EventBus): void {
  router.get('/api/events', async () => {
    const encoder = new TextEncoder();
    let keepaliveInterval: ReturnType<typeof setInterval> | null = null;
    let unsubscribe: (() => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        const safeEnqueue = (chunk: Uint8Array): void => {
          try {
            controller.enqueue(chunk);
          } catch {
            // Stream closed — drop the frame; cleanup runs from cancel().
          }
        };

        // Initial handshake frame — lets the client confirm the stream is live.
        safeEnqueue(encoder.encode('event: connected\ndata: {}\n\n'));

        const listener = (event: DeployEvent): void => {
          const frame = `event: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`;
          safeEnqueue(encoder.encode(frame));
        };
        unsubscribe = eventBus.on(listener);

        keepaliveInterval = setInterval(() => {
          safeEnqueue(encoder.encode('event: keepalive\ndata: {}\n\n'));
        }, KEEPALIVE_MS);
      },
      cancel() {
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval);
          keepaliveInterval = null;
        }
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  });
}
