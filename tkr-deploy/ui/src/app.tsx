import { render, type JSX } from 'preact';
import { initTheme } from './stores/theme.js';
import { startVaultPolling } from './stores/vault.js';
import { startDeployStream } from './stores/deploy.js';
import { loadManifest } from './stores/manifest.js';
import { initRouter, currentPath$, resolveRoute, type RouteDefinition } from './router.js';
import { Topbar } from './shell/Topbar.js';
import { PillNav } from './shell/PillNav.js';

import { DeployScreen } from './screens/deploy.js';
import { SecretsScreen } from './screens/secrets.js';
import { HistoryScreen } from './screens/history.js';

const routes: RouteDefinition[] = [
  { path: '/', component: DeployScreen },
  { path: '/secrets', component: SecretsScreen },
  { path: '/history', component: HistoryScreen },
];

function App(): JSX.Element {
  const path = currentPath$.value;
  const Screen = resolveRoute(path);

  return (
    <div class="shell">
      <Topbar />
      <PillNav />
      <main class="shell-content">
        {Screen ? <Screen /> : <p>Not found</p>}
      </main>
    </div>
  );
}

function bootstrap(): void {
  initTheme();
  initRouter(routes, '/');
  void loadManifest();
  startVaultPolling();
  startDeployStream();

  const root = document.getElementById('app');
  if (root) {
    render(<App />, root);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
