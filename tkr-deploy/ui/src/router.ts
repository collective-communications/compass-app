export interface Route {
  path: string;
  module: () => Promise<{ render: (container: HTMLElement) => void; cleanup: () => void }>;
}

const routes: Route[] = [
  { path: '/',         module: () => import('./screens/overview.js') },
  { path: '/secrets',  module: () => import('./screens/secrets.js') },
  { path: '/database', module: () => import('./screens/database.js') },
  { path: '/frontend', module: () => import('./screens/frontend.js') },
  { path: '/email',    module: () => import('./screens/email.js') },
  { path: '/cicd',     module: () => import('./screens/cicd.js') },
];

let currentCleanup: (() => void) | null = null;
let contentArea: HTMLElement | null = null;
let onNavigateCallback: ((path: string) => void) | null = null;

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

  const route = routes.find((r) => r.path === path) ?? routes[0];
  const mod = await route.module();
  mod.render(contentArea);
  currentCleanup = mod.cleanup;

  if (onNavigateCallback) {
    onNavigateCallback(path);
  }
}

/**
 * Initialize the router.
 */
export function initRouter(
  container: HTMLElement,
  onNavigate?: (path: string) => void,
): void {
  contentArea = container;
  onNavigateCallback = onNavigate ?? null;

  window.addEventListener('popstate', () => {
    void loadRoute(getCurrentPath());
  });

  void loadRoute(getCurrentPath());
}
