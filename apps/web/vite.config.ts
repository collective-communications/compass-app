import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const ENV_DIR = '../../';
const DEFAULT_PORT = 42333;

export default defineConfig(({ mode }) => {
  // Load non-prefixed vars (PORT) for config only; envDir handles VITE_* for client code
  const allEnv = loadEnv(mode, ENV_DIR, '');
  const port = parseInt(allEnv.PORT, 10) || DEFAULT_PORT;

  return {
    envDir: ENV_DIR,
    envPrefix: 'VITE_',
    plugins: [tailwindcss(), react()],
    server: { port },
  };
});
