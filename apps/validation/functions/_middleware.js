const ALLOWED_HOST = "compass-calculations.pages.dev";

/**
 * Keeps deployment aliases and branch preview URLs from serving the validation app.
 *
 * @param {{ request: Request, next: () => Promise<Response> }} context Pages middleware context.
 * @returns {Promise<Response>} The next static asset response or a 404 for non-production hosts.
 */
export async function onRequest(context) {
  const { hostname } = new URL(context.request.url);

  if (hostname.toLowerCase() !== ALLOWED_HOST) {
    return new Response("Not found", {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    });
  }

  return context.next();
}
