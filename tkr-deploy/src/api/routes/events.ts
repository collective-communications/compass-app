import type { Router } from '../router.js';

export function registerEventRoutes(router: Router): void {
  router.get('/api/events', async () => {
    const encoder = new TextEncoder();
    let keepaliveInterval: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection event
        controller.enqueue(encoder.encode('event: connected\ndata: {}\n\n'));

        // Keepalive every 15 seconds
        keepaliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch {
            // Stream closed — clean up handled in cancel
          }
        }, 15_000);
      },
      cancel() {
        if (keepaliveInterval) {
          clearInterval(keepaliveInterval);
          keepaliveInterval = null;
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
