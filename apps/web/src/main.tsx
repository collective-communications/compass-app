import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Side-effect import: registers the web app's Supabase client + logger with
// @compass/sdk so service functions imported by the React tree resolve their
// dependencies. Must run before any feature module that calls SDK functions.
import './lib/supabase';
import { AuthProvider } from './features/auth/components';
import { routeTree } from './routes/__root';
import { registerTier3Content } from './components/help/content/tier-3-survey';
import { STALE_TIMES } from './lib/query-config';
import './index.css';

registerTier3Content();

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIMES.results,
      retry: 1,
    },
  },
});

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
