/**
 * Lightweight pattern-matching HTTP router — no framework dependencies.
 */

export type RouteHandler = (
  req: Request,
  params: Record<string, string>,
) => Promise<Response>;

interface RouteEntry {
  method: string;
  pattern: URLPattern;
  handler: RouteHandler;
}

export class Router {
  private readonly routes: RouteEntry[] = [];

  /** Register a route. Path params use `:name` syntax (e.g. `/api/items/:id`). */
  add(method: string, path: string, handler: RouteHandler): void {
    // Convert `:param` syntax to URLPattern `{:param}` groups
    const patternPath = path.replace(/:(\w+)/g, ':$1');
    const pattern = new URLPattern({ pathname: patternPath });
    this.routes.push({ method: method.toUpperCase(), handler, pattern });
  }

  get(path: string, handler: RouteHandler): void {
    this.add('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.add('POST', path, handler);
  }

  /** Match a request to a registered route. Returns handler + extracted params, or null. */
  match(req: Request): { handler: RouteHandler; params: Record<string, string> } | null {
    const method = req.method.toUpperCase();
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const result = route.pattern.exec(req.url);
      if (result) {
        const params: Record<string, string> = {};
        const groups = result.pathname.groups;
        for (const [key, value] of Object.entries(groups)) {
          if (value !== undefined) params[key] = value;
        }
        return { handler: route.handler, params };
      }
    }
    return null;
  }
}

/** Wrap data in a success envelope. */
export function jsonSuccess(data: unknown, status: number = 200): Response {
  return Response.json({ success: true, data }, { status });
}

/** Wrap an error message in a failure envelope. */
export function jsonError(error: string, status: number = 500): Response {
  return Response.json({ success: false, error }, { status });
}
