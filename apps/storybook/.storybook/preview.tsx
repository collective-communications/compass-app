import type { Preview, Decorator } from '@storybook/react-vite';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import './storybook.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
});

/**
 * Wraps any story in a real TanStack RouterProvider.
 *
 * RouterProvider renders the route tree (not children), so Story must be
 * passed as the root route's component — not as a React child.
 * useState ensures the router is created once per story render cycle.
 */
function StoryRouter({ story: Story }: { story: React.ComponentType }) {
  const [router] = React.useState(() => {
    const rootRoute = createRootRoute({ component: Story });
    return createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });
  });

  return <RouterProvider router={router} />;
}

const ThemeDecorator: Decorator = (Story, context) => {
  const theme = context.globals.theme || 'light';
  return (
    <div
      className={theme === 'dark' ? 'dark' : ''}
      style={{
        padding: '1rem',
        backgroundColor: 'var(--grey-50)',
        color: 'var(--grey-900)',
        minHeight: '100vh',
      }}
    >
      <QueryClientProvider client={queryClient}>
        <StoryRouter story={Story} />
      </QueryClientProvider>
    </div>
  );
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: {
        title: 'Theme',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',

    viewport: {
      value: 'mobile',
      isRotated: false
    }
  },
  decorators: [ThemeDecorator],
  parameters: {
    viewport: {
      options: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '812px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      }
    },
    layout: 'fullscreen',
  },
};

export default preview;

export { PublicShellDecorator, SurveyShellDecorator, AppShellDecorator } from './decorators/shells';
