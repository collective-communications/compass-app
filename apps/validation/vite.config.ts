import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const ENV_DIR = '../../';
const DEFAULT_PORT = 42334;

export default defineConfig(({ mode }) => {
  const allEnv = loadEnv(mode, ENV_DIR, '');
  const port = parseInt(allEnv.VALIDATION_PORT || allEnv.PORT, 10) || DEFAULT_PORT;

  return {
    envDir: ENV_DIR,
    envPrefix: 'VITE_',
    plugins: [tailwindcss(), react()],
    server: { port },
  };
});
