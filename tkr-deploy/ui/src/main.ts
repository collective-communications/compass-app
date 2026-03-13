import { initTheme } from './theme.js';
import { renderShell } from './shell.js';
import { initRouter } from './router.js';
import { apiFetch } from './api.js';
import type { DotStatus } from './components/status-dot.js';

interface HealthResponse {
  vaultLocked?: boolean;
  rollup?: string;
}

interface ManifestScreen {
  label: string;
  path: string;
  modulePath: string;
  providerId?: string;
}

interface ManifestResponse {
  name: string;
  screens: ManifestScreen[];
}

function mapHealthToStatus(data: HealthResponse): { status: DotStatus; label: string } {
  if (data.vaultLocked === false) {
    return { status: 'healthy', label: 'unlocked' };
  }
  if (data.vaultLocked === true) {
    return { status: 'warning', label: 'locked' };
  }
  return { status: 'unknown', label: 'unknown' };
}

async function bootstrap(): Promise<void> {
  initTheme();

  const app = document.getElementById('app');
  if (!app) return;

  // Fetch manifest to discover nav items and routes
  let manifest: ManifestResponse;
  try {
    manifest = await apiFetch<ManifestResponse>('/api/manifest');
  } catch {
    // Fallback if manifest endpoint unavailable
    manifest = {
      name: 'tkr-deploy',
      screens: [
        { label: 'Overview', path: '/', modulePath: 'screens/overview.js' },
        { label: 'Secrets', path: '/secrets', modulePath: 'screens/secrets.js' },
      ],
    };
  }

  const navItems = manifest.screens.map((s) => ({ label: s.label, path: s.path }));
  const routes = manifest.screens.map((s) => ({ path: s.path, modulePath: s.modulePath }));

  const shell = renderShell(app, navItems, manifest.name);
  initRouter(shell.contentArea, routes, (path) => shell.updateActivePill(path));

  // Health polling
  async function pollHealth(): Promise<void> {
    try {
      const data = await apiFetch<HealthResponse>('/api/health');
      const { status, label } = mapHealthToStatus(data);
      shell.updateVaultStatus(status, label);
    } catch {
      shell.updateVaultStatus('unknown', 'unreachable');
    }
  }

  void pollHealth();
  setInterval(() => void pollHealth(), 30_000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void bootstrap());
} else {
  void bootstrap();
}
