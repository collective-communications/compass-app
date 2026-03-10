import { describe, it, expect, mock, beforeEach } from 'bun:test';
import type { AuthUser } from '@compass/types';
import { UserRole } from '@compass/types';

// ─── Mock Setup ─────────────────────────────────────────────────────────────

let mockUser: AuthUser | null = null;

mock.module('../../stores/auth-store', () => ({
  useAuthStore: Object.assign(
    () => mockUser,
    { getState: () => ({ user: mockUser }) },
  ),
}));

/**
 * Capture every `createRoute` call so we can extract `beforeLoad` guards
 * by path without instantiating a real router.
 *
 * TanStack Router's `redirect` returns an object — the guard throws it.
 */
const capturedRoutes: Array<{ path: string; beforeLoad?: () => void }> = [];

mock.module('@tanstack/react-router', () => ({
  createRoute: (opts: { path?: string; beforeLoad?: () => void }) => {
    capturedRoutes.push({ path: opts.path ?? '', beforeLoad: opts.beforeLoad });
    const self: Record<string, unknown> = { ...opts };
    self.addChildren = () => self;
    self.useParams = () => ({});
    self.getParentRoute = opts.getParentRoute;
    return self;
  },
  redirect: (opts: { to: string }) => opts,
  Outlet: () => null,
  useNavigate: () => () => undefined,
  Link: ({ to, children, className }: { to: string; children: unknown; className?: string }) => ({ to, children, className }),
}));

// Stub all component imports — only guard logic is under test
mock.module('../../components/shells/app-shell', () => ({ AppShell: () => null }));
mock.module('./surveys', () => ({
  SurveyListPage: () => null, SurveyBuilderPage: () => null,
  DeploymentPanel: () => null, ResponseTracker: () => null,
}));
mock.module('./surveys/hooks/use-deployment-management', () => ({ useDeploymentManagement: () => ({}) }));
mock.module('./surveys/hooks/use-response-tracking', () => ({ useResponseTracking: () => ({}) }));
mock.module('./surveys/hooks/use-realtime-responses', () => ({ useRealtimeResponses: () => ({}) }));
mock.module('./surveys/hooks/use-survey-builder', () => ({ useSurveyBuilder: () => ({}) }));
mock.module('./clients', () => ({ ClientListPage: () => null }));
mock.module('./clients/pages/client-detail-page', () => ({ ClientDetailPage: () => null }));
mock.module('./clients/components/client-users-tab', () => ({ ClientUsersTab: () => null }));
mock.module('./clients/pages/org-settings-page', () => ({ OrgSettingsPage: () => null }));
mock.module('./settings', () => ({ SystemSettingsPage: () => null }));
mock.module('./users', () => ({ UsersPage: () => null }));

// Import after mocks are wired, then invoke to populate `capturedRoutes`
const { createAdminRoutes } = await import('./routes.js');
const fakeRoot = { addChildren: () => fakeRoot } as never;
createAdminRoutes(fakeRoot);

function guardFor(path: string): () => void {
  const entry = capturedRoutes.find((r) => r.path === path);
  if (!entry?.beforeLoad) {
    throw new Error(`No beforeLoad guard found for path "${path}"`);
  }
  return entry.beforeLoad;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'u-1',
    email: 'test@ccc.ca',
    fullName: 'Test User',
    avatarUrl: null,
    role: UserRole.CCC_ADMIN,
    organizationId: null,
    tier: 'tier_1',
    ...overrides,
  };
}

/** Assert that calling `fn` throws a redirect to `expectedPath`. */
function expectRedirect(fn: () => void, expectedPath: string): void {
  try {
    fn();
    expect.unreachable('guard should have thrown a redirect');
  } catch (thrown) {
    expect((thrown as { to: string }).to).toBe(expectedPath);
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Admin route guards', () => {
  beforeEach(() => {
    mockUser = null;
  });

  describe('/admin layout — tier gate', () => {
    const guard = guardFor('/admin');

    it('redirects unauthenticated users to /dashboard', () => {
      mockUser = null;
      expectRedirect(guard, '/dashboard');
    });

    it('redirects tier_2 users to /dashboard', () => {
      mockUser = makeUser({ role: UserRole.CLIENT_DIRECTOR, tier: 'tier_2' });
      expectRedirect(guard, '/dashboard');
    });

    it('allows ccc_admin users through', () => {
      mockUser = makeUser({ role: UserRole.CCC_ADMIN, tier: 'tier_1' });
      expect(() => guard()).not.toThrow();
    });

    it('allows ccc_member users through', () => {
      mockUser = makeUser({ role: UserRole.CCC_MEMBER, tier: 'tier_1' });
      expect(() => guard()).not.toThrow();
    });
  });

  describe('/settings — ccc_admin-only gate', () => {
    const guard = guardFor('/settings');

    it('allows ccc_admin users', () => {
      mockUser = makeUser({ role: UserRole.CCC_ADMIN, tier: 'tier_1' });
      expect(() => guard()).not.toThrow();
    });

    it('redirects ccc_member to /admin/surveys', () => {
      mockUser = makeUser({ role: UserRole.CCC_MEMBER, tier: 'tier_1' });
      expectRedirect(guard, '/admin/surveys');
    });
  });

  describe('/settings/users — ccc_admin-only gate', () => {
    const guard = guardFor('/settings/users');

    it('allows ccc_admin users', () => {
      mockUser = makeUser({ role: UserRole.CCC_ADMIN, tier: 'tier_1' });
      expect(() => guard()).not.toThrow();
    });

    it('redirects ccc_member to /admin/surveys', () => {
      mockUser = makeUser({ role: UserRole.CCC_MEMBER, tier: 'tier_1' });
      expectRedirect(guard, '/admin/surveys');
    });
  });
});
