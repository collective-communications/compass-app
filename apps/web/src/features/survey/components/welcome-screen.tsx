/**
 * Survey welcome screen with organization branding, survey info,
 * time estimate, privacy note, and metadata collection form.
 * Entry point for respondents accessing a survey via deployment link.
 */
import { useCallback, type ReactNode } from 'react';
import type { RespondentMetadata } from '@compass/types';
import { useSurveyContext } from '../context/survey-context';
import { useMetadataConfig } from '../hooks/use-metadata-config';
import { useCreateResponse } from '../hooks/use-create-response';
import { MetadataForm } from './metadata-form';

/** Estimate survey duration at ~3 questions per minute */
function estimateMinutes(questionCount: number): number {
  return Math.ceil(questionCount / 3);
}

export interface WelcomeScreenProps {
  /** Total number of questions in the survey */
  questionCount: number;
  /** Called after response is created, with the new responseId */
  onStart: (responseId: string) => void;
}

export function WelcomeScreen({ questionCount, onStart }: WelcomeScreenProps): ReactNode {
  const { survey, deployment } = useSurveyContext();
  const { data: metadataConfig, isLoading: isConfigLoading } = useMetadataConfig(
    survey.organizationId,
  );
  const createResponse = useCreateResponse();

  const timeEstimate = estimateMinutes(questionCount);

  const handleMetadataSubmit = useCallback(
    (metadata: RespondentMetadata) => {
      createResponse.mutate(
        {
          surveyId: survey.id,
          deploymentId: deployment.id,
          metadata,
        },
        {
          onSuccess: ({ responseId }) => {
            onStart(responseId);
          },
        },
      );
    },
    [createResponse, survey.id, deployment.id, onStart],
  );

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-[600px] rounded-xl border border-[#E5E4E0] bg-white p-6 sm:p-8">
        {/* Greeting and survey info */}
        <h1 className="mb-2 text-2xl font-semibold text-[#212121]">Hello.</h1>

        <p className="mb-4 text-[#616161]">
          {survey.settings?.welcomeMessage ??
            `You have been invited to participate in the ${survey.title}. Your feedback will help shape the culture of your organization.`}
        </p>

        {/* Survey details */}
        <div className="mb-6 flex flex-wrap gap-4 text-sm text-[#616161]">
          <span>{questionCount} questions</span>
          <span aria-hidden="true">|</span>
          <span>~{timeEstimate} minutes</span>
        </div>

        {/* Privacy notice */}
        <div className="mb-8 rounded-lg bg-[#F5F5F5] px-4 py-3">
          <p className="text-sm text-[#424242]">
            Your responses are anonymous and confidential. Individual answers are never shared with
            your organization.
          </p>
        </div>

        {/* Divider */}
        <hr className="mb-6 border-[#E5E4E0]" />

        {/* Metadata form */}
        {isConfigLoading || !metadataConfig ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E4E0] border-t-[#0A3B4F]" />
          </div>
        ) : (
          <MetadataForm
            config={metadataConfig}
            onSubmit={handleMetadataSubmit}
            isSubmitting={createResponse.isPending}
          />
        )}

        {/* Submission error */}
        {createResponse.isError && (
          <p className="mt-4 text-center text-sm text-red-600" role="alert">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}
