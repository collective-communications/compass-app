import { renderShell } from './shell.js';
import { initRouter } from './router.js';
import { apiFetch } from './api.js';
import type { DotStatus } from './components/status-dot.js';

interface HealthResponse {
  status: string;
  vault?: { sealed?: boolean };
}

function mapHealthToStatus(data: HealthResponse): { status: DotStatus; label: string } {
  if (data.vault?.sealed === false) {
    return { status: 'healthy', label: 'unsealed' };
  }
  if (data.vault?.sealed === true) {
    return { status: 'warning', label: 'sealed' };
  }
  return { status: 'unknown', label: 'unknown' };
}

function bootstrap(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const shell = renderShell(app);
  initRouter(shell.contentArea, (path) => shell.updateActivePill(path));

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
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
