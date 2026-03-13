export interface RouteDefinition {
  path: string;
  modulePath: string;
}

let currentCleanup: (() => void) | null = null;
let contentArea: HTMLElement | null = null;
let onNavigateCallback: ((path: string) => void) | null = null;
let routeTable: RouteDefinition[] = [];

/**
 * Get the current pathname.
 */
export function getCurrentPath(): string {
  return window.location.pathname;
}

/**
 * Navigate to a path, updating browser history.
 */
export async function navigate(path: string): Promise<void> {
  if (path !== getCurrentPath()) {
    window.history.pushState(null, '', path);
  }
  await loadRoute(path);
}

async function loadRoute(path: string): Promise<void> {
  if (!contentArea) return;

  if (currentCleanup) {
    currentCleanup();
    currentCleanup = null;
  }

  const route = routeTable.find((r) => r.path === path) ?? routeTable[0];
  if (!route) return;

  const mod = await import(`./${route.modulePath}`) as { render: (container: HTMLElement) => void; cleanup: () => void };
  mod.render(contentArea);
  currentCleanup = mod.cleanup;

  if (onNavigateCallback) {
    onNavigateCallback(path);
  }
}

/**
 * Initialize the router with dynamically-discovered routes.
 */
export function initRouter(
  container: HTMLElement,
  routes: RouteDefinition[],
  onNavigate?: (path: string) => void,
): void {
  contentArea = container;
  routeTable = routes;
  onNavigateCallback = onNavigate ?? null;

  window.addEventListener('popstate', () => {
    void loadRoute(getCurrentPath());
  });

  void loadRoute(getCurrentPath());
}
