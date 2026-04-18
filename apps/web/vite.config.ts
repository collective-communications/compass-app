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
    build: {
      rollupOptions: {
        output: {
          // Split long-lived third-party libraries into their own chunks so
          // they cache independently of our application code. Each bucket
          // holds libraries that tend to version together — when we upgrade
          // one, only its chunk's hash changes, leaving the others cached.
          manualChunks: {
            react: ['react', 'react-dom'],
            supabase: ['@supabase/supabase-js'],
            tanstack: ['@tanstack/react-router', '@tanstack/react-query'],
            dnd: ['@dnd-kit/core', '@dnd-kit/sortable'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
