/**
 * Survey route definitions for TanStack Router.
 * Creates the `/s/$token` route tree for survey respondents.
 */

import { useCallback, useMemo } from 'react';
import { createRoute, Outlet, useNavigate } from '@tanstack/react-router';
import type { AnyRoute } from '@tanstack/react-router';
import { QuestionType } from '@compass/types';
import { SurveyShell } from '../../shells/survey';
import { SurveyProvider, useSurveyContext } from './context/survey-context';
import { useDeployment } from './hooks/use-deployment';
import { useQuestions } from './hooks/use-questions';
import { useResumeSession } from './hooks/use-resume-session';
import { useSubmitResponse } from './hooks/use-submit-response';
import { useAnswerStore } from './stores/answer-store';
import { SessionCookieManager } from './lib/session-cookie';
import { InvalidTokenScreen, SurveyClosedScreen, SurveyNotOpenScreen, AlreadyCompletedScreen, DeploymentExpiredScreen } from './components/edge-states';
import { WelcomeScreen } from './components/welcome-screen';
import { WelcomeBackScreen } from './components/welcome-back-screen';
import { QuestionScreen } from './components/question-screen';
import { OpenEndedScreen } from './components/open-ended-screen';
import { ThankYouScreen } from './components/thank-you-screen';
import { SaveProgressScreen } from './components/save-progress-screen';

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--grey-100)] border-t-[var(--color-core-text)]" />
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

export function createSurveyRoutes<TParent extends AnyRoute>(parentRoute: TParent) {
  const surveyLayoutRoute = createRoute({
    getParentRoute: () => parentRoute,
    path: '/s/$token',
    component: function SurveyLayout(): React.ReactElement {
      const { token } = surveyLayoutRoute.useParams() as { token: string };
      const { data: resolution, isLoading, error } = useDeployment(token);
      const navigate = useNavigate();

      const handleSave = useCallback(() => {
        navigate({ to: '/s/$token/saved', params: { token } });
      }, [navigate, token]);

      // While resolving the deployment token, show a loading spinner
      if (isLoading || !resolution) {
        return (
          <SurveyShell orgName="">
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--grey-100)] border-t-[var(--color-core-text)]" />
            </div>
          </SurveyShell>
        );
      }

      // Network error fetching deployment
      if (error) {
        return (
          <SurveyShell orgName="">
            <div className="flex items-center justify-center py-24">
              <p className="text-sm text-[var(--severity-critical-text)]">
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
        <SurveyShell orgName={survey.title} onSave={handleSave}>
          <SurveyProvider value={{ deployment, survey, sessionToken }}>
            <SurveyLayoutInner />
          </SurveyProvider>
        </SurveyShell>
      );
    },
  });

  const surveyIndexRoute = createRoute({
    getParentRoute: () => surveyLayoutRoute,
    path: '/',
    component: function SurveyWelcomePage(): React.ReactElement {
      const { deployment } = useSurveyContext();
      const { data: questions } = useQuestions(deployment.surveyId);
      const navigate = useNavigate();

      const questionCount = questions?.length ?? 0;

      const handleStart = useCallback(
        () => {
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
      const { token } = surveyQuestionRoute.useParams() as { token: string };
      const navigate = useNavigate();

      const handleComplete = useCallback(() => {
        void navigate({
          to: '/s/$token/open',
          params: { token },
        });
      }, [navigate, token]);

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

      const openEndedQuestion = useMemo(
        () => questions?.find((q) => q.type === QuestionType.OPEN_TEXT),
        [questions],
      );

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
        "Is there anything else you'd like to share about your experience?";

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

  return surveyLayoutRoute.addChildren([
    surveyIndexRoute,
    surveyQuestionRoute,
    surveyOpenEndedRoute,
    surveyCompleteRoute,
    surveySavedRoute,
  ]);
}
