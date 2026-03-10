import { useCallback, useEffect, useMemo, useState } from 'react';
import { createRootRoute, createRoute, Link, Outlet, useNavigate } from '@tanstack/react-router';
import { type UserRole, QuestionType, getTierFromRole, getTierHomeRoute } from '@compass/types';
import { SurveyShell } from '../shells/survey';
import { AppShell } from '../components/shells/app-shell';
import { PublicShell } from '../components/shells/public-shell';
import { BrandPanel, LoginForm, ForgotPasswordForm, SocialSignOnButtons } from '../features/auth/components';
import { useAuth, usePasswordReset } from '../features/auth/hooks';
import { ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createResultsRoutes } from '../features/results/routes';
import { createAdminRoutes } from '../features/admin/routes';
import { createDashboardRoutes } from '../features/dashboard/routes';
import { createReportsRoutes } from '../features/reports/routes';
import { SurveyProvider, useSurveyContext } from '../features/survey/context/survey-context';
import { useDeployment } from '../features/survey/hooks/use-deployment';
import { useQuestions } from '../features/survey/hooks/use-questions';
import { useResumeSession } from '../features/survey/hooks/use-resume-session';
import { useSubmitResponse } from '../features/survey/hooks/use-submit-response';
import { useAnswerStore } from '../features/survey/stores/answer-store';
import { SessionCookieManager } from '../features/survey/lib/session-cookie';
import { InvalidTokenScreen, SurveyClosedScreen, SurveyNotOpenScreen, AlreadyCompletedScreen, DeploymentExpiredScreen } from '../features/survey/components/edge-states';
import { WelcomeScreen } from '../features/survey/components/welcome-screen';
import { WelcomeBackScreen } from '../features/survey/components/welcome-back-screen';
import { QuestionScreen } from '../features/survey/components/question-screen';
import { OpenEndedScreen } from '../features/survey/components/open-ended-screen';
import { ThankYouScreen } from '../features/survey/components/thank-you-screen';
import { SaveProgressScreen } from '../features/survey/components/save-progress-screen';

const rootRoute = createRootRoute({
  component: function RootLayout(): React.ReactElement {
    return <Outlet />;
  },
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: function IndexPage(): React.ReactElement {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Culture Compass</h1>
          <p style={{ color: 'var(--grey-500)', marginBottom: '1.5rem' }}>COLLECTIVE culture + communication</p>
          <Link
            to="/auth/login"
            className="inline-block rounded-lg bg-[var(--color-core,#0A3B4F)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  },
});

/* ── Survey routes ─────────────────────────────────────────────── */

const surveyLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/s/$token',
  component: function SurveyLayout(): React.ReactElement {
    const { token } = surveyLayoutRoute.useParams();
    const { data: resolution, isLoading, error } = useDeployment(token);

    // While resolving the deployment token, show a loading spinner
    if (isLoading || !resolution) {
      return (
        <SurveyShell orgName="">
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--grey-100)] border-t-[#0A3B4F]" />
          </div>
        </SurveyShell>
      );
    }

    // Network error fetching deployment
    if (error) {
      return (
        <SurveyShell orgName="">
          <div className="flex items-center justify-center py-24">
            <p className="text-sm text-[#D32F2F]">
              Unable to load the survey. Please check your connection and try again.
            </p>
          </div>
        </SurveyShell>
      );
    }

    // Edge states — render within SurveyShell for consistent layout
    if (resolution.status === 'not_found') {
      return (
        <SurveyShell orgName="">
          <InvalidTokenScreen />
        </SurveyShell>
      );
    }

    if (resolution.status === 'expired') {
      return (
        <SurveyShell orgName="">
          <DeploymentExpiredScreen />
        </SurveyShell>
      );
    }

    if (resolution.status === 'not_yet_open') {
      return (
        <SurveyShell orgName="">
          <SurveyNotOpenScreen opensDate={resolution.opensAt} />
        </SurveyShell>
      );
    }

    if (resolution.status === 'closed') {
      return (
        <SurveyShell orgName="">
          <SurveyClosedScreen closedDate={resolution.closesAt} />
        </SurveyShell>
      );
    }

    if (resolution.status === 'already_completed') {
      return (
        <SurveyShell orgName="">
          <AlreadyCompletedScreen />
        </SurveyShell>
      );
    }

    // Valid deployment — provide context to child routes
    const { deployment, survey } = resolution;
    const sessionToken = SessionCookieManager.getOrCreateSession(deployment.id);

    return (
      <SurveyShell orgName={survey.title}>
        <SurveyProvider value={{ deployment, survey, sessionToken }}>
          <SurveyLayoutInner />
        </SurveyProvider>
      </SurveyShell>
    );
  },
});

/**
 * Inner layout component that handles resume detection.
 * Separated so it can access SurveyContext via the provider above.
 */
function SurveyLayoutInner(): React.ReactElement {
  const { deployment, survey } = useSurveyContext();
  const { data: questions } = useQuestions(survey.id);
  const totalQuestions = questions?.length ?? 0;

  const resumeSession = useResumeSession(deployment.id, survey.id, totalQuestions);
  const navigate = useNavigate();

  // If resume check is still loading, show spinner
  if (resumeSession.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--grey-100)] border-t-[#0A3B4F]" />
      </div>
    );
  }

  // Already completed on this device
  if (resumeSession.isCompleted) {
    return <AlreadyCompletedScreen />;
  }

  // Returning user with progress — show welcome back
  if (resumeSession.hasSession && resumeSession.answeredCount > 0) {
    return (
      <WelcomeBackScreen
        answeredCount={resumeSession.answeredCount}
        totalCount={totalQuestions}
        resumeIndex={resumeSession.resumeIndex}
        isLoading={false}
        onResume={() => {
          void navigate({
            to: '/s/$token/q/$index',
            params: { token: deployment.token, index: String(resumeSession.resumeIndex) },
          });
        }}
      />
    );
  }

  // No prior session — render child route (index = welcome screen)
  return <Outlet />;
}

const surveyIndexRoute = createRoute({
  getParentRoute: () => surveyLayoutRoute,
  path: '/',
  component: function SurveyWelcomePage(): React.ReactElement {
    const { deployment } = useSurveyContext();
    const { data: questions } = useQuestions(deployment.surveyId);
    const navigate = useNavigate();

    const questionCount = questions?.length ?? 0;

    const handleStart = useCallback(
      (_responseId: string) => {
        void navigate({
          to: '/s/$token/q/$index',
          params: { token: deployment.token, index: '1' },
        });
      },
      [navigate, deployment.token],
    );

    return <WelcomeScreen questionCount={questionCount} onStart={handleStart} />;
  },
});

const surveyQuestionRoute = createRoute({
  getParentRoute: () => surveyLayoutRoute,
  path: '/q/$index',
  component: function SurveyQuestionPage(): React.ReactElement {
    const { token } = surveyQuestionRoute.useParams();
    const navigate = useNavigate();

    const handleComplete = useCallback(() => {
      void navigate({
        to: '/s/$token/open',
        params: { token },
      });
    }, [navigate, token]);

    // QuestionScreen manages its own internal index via the store;
    // the route $index param establishes the initial entry point.
    return <QuestionScreen onComplete={handleComplete} />;
  },
});

const surveyOpenEndedRoute = createRoute({
  getParentRoute: () => surveyLayoutRoute,
  path: '/open',
  component: function SurveyOpenEndedPage(): React.ReactElement {
    const { deployment, survey, sessionToken } = useSurveyContext();
    const { data: questions } = useQuestions(survey.id);
    const { submit, isPending } = useSubmitResponse();
    const navigate = useNavigate();

    // Find the open-ended question if one exists
    const openEndedQuestion = useMemo(
      () => questions?.find((q) => q.type === QuestionType.OPEN_TEXT),
      [questions],
    );

    // The session token serves as the response identifier for server operations
    const responseId = sessionToken;

    const handleSubmit = useCallback(
      (text: string) => {
        if (!responseId) return;
        void submit({
          responseId,
          deploymentId: deployment.id,
          openEndedText: text,
          openEndedQuestionId: openEndedQuestion?.id,
        }).then(() => {
          void navigate({
            to: '/s/$token/complete',
            params: { token: deployment.token },
          });
        });
      },
      [submit, responseId, deployment.id, deployment.token, openEndedQuestion?.id, navigate],
    );

    const handleSkip = useCallback(() => {
      if (!responseId) return;
      void submit({
        responseId,
        deploymentId: deployment.id,
      }).then(() => {
        void navigate({
          to: '/s/$token/complete',
          params: { token: deployment.token },
        });
      });
    }, [submit, responseId, deployment.id, deployment.token, navigate]);

    const prompt =
      'Is there anything else you would like to share about your experience?';

    return (
      <OpenEndedScreen
        prompt={prompt}
        isSubmitting={isPending}
        onSubmit={handleSubmit}
        onSkip={handleSkip}
      />
    );
  },
});

const surveyCompleteRoute = createRoute({
  getParentRoute: () => surveyLayoutRoute,
  path: '/complete',
  component: function SurveyCompletePage(): React.ReactElement {
    return <ThankYouScreen />;
  },
});

const surveySavedRoute = createRoute({
  getParentRoute: () => surveyLayoutRoute,
  path: '/saved',
  component: function SurveySavedPage(): React.ReactElement {
    const { deployment, survey } = useSurveyContext();
    const { data: questions } = useQuestions(survey.id);
    const answers = useAnswerStore((s) => s.answers);
    const navigate = useNavigate();

    const totalQuestions = questions?.length ?? 0;
    const answeredCount = Object.keys(answers).length;
    const remainingCount = Math.max(0, totalQuestions - answeredCount);
    const estimatedMinutes = Math.ceil(remainingCount / 3);

    const closesAt = survey.closesAt;
    const daysRemaining = closesAt
      ? Math.max(0, Math.ceil((new Date(closesAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    const handleContinue = useCallback(() => {
      const resumeIndex = Math.min(answeredCount + 1, totalQuestions);
      void navigate({
        to: '/s/$token/q/$index',
        params: { token: deployment.token, index: String(resumeIndex) },
      });
    }, [navigate, deployment.token, answeredCount, totalQuestions]);

    return (
      <SaveProgressScreen
        remainingCount={remainingCount}
        estimatedMinutes={estimatedMinutes}
        closesAt={closesAt}
        daysRemaining={daysRemaining}
        onContinue={handleContinue}
        deploymentToken={deployment.token}
      />
    );
  },
});

/* ── Auth routes ───────────────────────────────────────────────── */

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: function AuthLayout(): React.ReactElement {
    return <Outlet />;
  },
});

export interface LoginSearch {
  returnTo?: string;
  error?: string;
}

const loginRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/login',
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    returnTo: typeof search.returnTo === 'string' ? search.returnTo : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: function LoginPage(): React.ReactElement {
    const { isLoading, error, signInWithEmail, signInWithOAuth } = useAuth();

    return (
      <PublicShell>
        <div className="flex flex-1">
          <BrandPanel />

          <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
            <div className="w-full max-w-sm">
              <h1
                className="mb-8 text-center text-2xl font-bold text-[var(--grey-900)]"
                style={{ fontFamily: 'var(--font-headings)' }}
              >
                Sign in
              </h1>

              <LoginForm onSubmit={signInWithEmail} isLoading={isLoading} error={error} />
              <SocialSignOnButtons onSignIn={signInWithOAuth} isLoading={isLoading} />

              <p className="mt-4 text-center">
                <Link
                  to="/auth/forgot-password"
                  className="text-sm text-[var(--color-core)] hover:underline"
                >
                  Forgot your password?
                </Link>
              </p>
            </div>
          </div>
        </div>
      </PublicShell>
    );
  },
});

const callbackRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/callback',
  component: function AuthCallbackPage(): React.ReactElement {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'error'>('loading');

    useEffect(() => {
      async function handleCallback(): Promise<void> {
        // Check for error in URL hash params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlError = hashParams.get('error_description') ?? hashParams.get('error');

        if (urlError) {
          await navigate({
            to: '/auth/login',
            search: { error: urlError },
          });
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          await navigate({
            to: '/auth/login',
            search: { error: 'Authentication failed. Please try again.' },
          });
          return;
        }

        const userId = sessionData.session.user.id;
        const { data: member } = await supabase
          .from('org_members')
          .select('role')
          .eq('user_id', userId)
          .single();

        const role: UserRole = (member?.role as UserRole) ?? 'client_user';
        const tier = getTierFromRole(role);
        await navigate({ to: getTierHomeRoute(tier) });
      }

      handleCallback().catch(() => {
        setStatus('error');
      });
    }, [navigate]);

    if (status === 'error') {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-[var(--grey-500)]">Authentication failed. Redirecting...</p>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--grey-500)]">Completing sign-in...</p>
      </div>
    );
  },
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/forgot-password',
  component: function ForgotPasswordPage(): React.ReactElement {
    const { requestReset, isLoading, error } = usePasswordReset();

    return (
      <PublicShell>
        <div className="flex flex-1">
          <BrandPanel />

          <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
            <div className="w-full max-w-sm">
              <div className="mb-6">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-core)] hover:underline"
                >
                  <ArrowLeft size={16} />
                  Back to sign in
                </Link>
              </div>

              <div className="mb-2 flex justify-center">
                <Lock size={32} className="text-[var(--color-core)]" />
              </div>

              <h1
                className="mb-2 text-center text-2xl font-bold text-[var(--grey-900)]"
                style={{ fontFamily: 'var(--font-headings)' }}
              >
                Reset your password
              </h1>
              <p className="mb-8 text-center text-sm text-[var(--grey-500)]">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <ForgotPasswordForm onSubmit={requestReset} isLoading={isLoading} error={error} />

              <div className="mt-6 rounded-lg border border-[var(--grey-200)] bg-[var(--grey-50)] p-4">
                <p className="mb-2 text-sm font-medium text-[var(--grey-700)]">
                  Didn&apos;t receive the email?
                </p>
                <ul className="list-disc pl-4 text-xs text-[var(--grey-500)] space-y-1">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes and try again</li>
                </ul>
              </div>

              <p className="mt-4 text-center text-sm text-[var(--grey-500)]">
                Remember your password?{' '}
                <Link
                  to="/auth/login"
                  className="text-[var(--color-core)] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </PublicShell>
    );
  },
});

export interface ForgotPasswordSentSearch {
  email?: string;
}

const forgotPasswordSentRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/forgot-password/sent',
  validateSearch: (search: Record<string, unknown>): ForgotPasswordSentSearch => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),
  component: function ForgotPasswordSentPage(): React.ReactElement {
    const { email } = forgotPasswordSentRoute.useSearch();

    return (
      <PublicShell>
        <div className="flex flex-1">
          <BrandPanel />

          <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
            <div className="w-full max-w-sm text-center">
              <div className="mb-4 flex justify-center">
                <CheckCircle size={40} className="text-[var(--color-connection)]" />
              </div>

              <h1
                className="mb-2 text-2xl font-bold text-[var(--grey-900)]"
                style={{ fontFamily: 'var(--font-headings)' }}
              >
                Check your email
              </h1>

              {email && (
                <p className="mb-6 text-sm text-[var(--grey-500)]">
                  We sent a reset link to <span className="font-medium text-[var(--grey-700)]">{email}</span>
                </p>
              )}

              <ol className="mb-8 space-y-3 text-left text-sm text-[var(--grey-600)]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-xs font-medium text-[var(--grey-700)]">1</span>
                  Open the email from Culture Compass
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-xs font-medium text-[var(--grey-700)]">2</span>
                  Click the reset link
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--grey-100)] text-xs font-medium text-[var(--grey-700)]">3</span>
                  Choose a new password
                </li>
              </ol>

              <Link
                to="/auth/login"
                className="inline-block text-sm text-[var(--color-core)] hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </PublicShell>
    );
  },
});

/* ── Feature route trees ──────────────────────────────────────── */

const resultsRoutes = createResultsRoutes(rootRoute);
const adminRoutes = createAdminRoutes(rootRoute);
const dashboardRoutes = createDashboardRoutes(rootRoute);
const reportsRoutes = createReportsRoutes(rootRoute);

/* ── Not Found ─────────────────────────────────────────────────── */

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: function NotFoundPage(): React.ReactElement {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>404</h1>
          <p style={{ color: 'var(--grey-500)' }}>Page not found</p>
        </div>
      </div>
    );
  },
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  surveyLayoutRoute.addChildren([
    surveyIndexRoute,
    surveyQuestionRoute,
    surveyOpenEndedRoute,
    surveyCompleteRoute,
    surveySavedRoute,
  ]),
  authRoute.addChildren([loginRoute, callbackRoute, forgotPasswordSentRoute, forgotPasswordRoute]),
  resultsRoutes,
  adminRoutes,
  dashboardRoutes,
  reportsRoutes,
  notFoundRoute,
]);
