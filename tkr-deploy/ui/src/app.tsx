/**
 * App entry — bootstraps the run-centric Direction D shell.
 *
 * Layout:
 *   <Topbar />              fixed (48px), spans full width
 *   <div class="shell-body">
 *     <RunRail />           desktop only (≥768px)
 *     <main class="shell-content">{Screen}</main>
 *   </div>
 *   <MobileTabBar />        mobile only (<768px), fixed bottom
 *
 * @module app
 */

import { render, type JSX } from 'preact';
import { initTheme } from './stores/theme.js';
import { startVaultPolling } from './stores/vault.js';
import { startDeployStream } from './stores/deploy.js';
import { loadManifest } from './stores/manifest.js';
import {
  initRouter,
  currentPath$,
  resolveRoute,
  type RouteDefinition,
} from './router.js';
import { Topbar } from './shell/Topbar.js';
import { RunRail } from './shell/RunRail.js';
import { MobileTabBar } from './shell/MobileTabBar.js';

import { DeployScreen } from './screens/deploy.js';
import { SecretsScreen } from './screens/secrets.js';
import { DatabaseScreen } from './screens/database.js';
import { FrontendScreen } from './screens/frontend.js';
import { EmailScreen } from './screens/email.js';
import { CicdScreen } from './screens/cicd.js';

const routes: RouteDefinition[] = [
  { path: '/', component: DeployScreen },
  { path: '/secrets', component: SecretsScreen },
  { path: '/database', component: DatabaseScreen },
  { path: '/frontend', component: FrontendScreen },
  { path: '/email', component: EmailScreen },
  { path: '/cicd', component: CicdScreen },
];

function App(): JSX.Element {
  const path = currentPath$.value;
  const Screen = resolveRoute(path);

  return (
    <div class="shell">
      <Topbar />
      <div class="shell-body">
        <RunRail />
        <main id="main-content" class="shell-content">
          {Screen ? <Screen /> : <p>Not found</p>}
        </main>
      </div>
      <MobileTabBar />
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
