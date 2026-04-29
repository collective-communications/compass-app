/**
 * React hook for managing the report generation workflow.
 * Wraps createReport + polling loop to provide reactive generation status.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnalyticsActionStatus,
  AnalyticsEventName,
  AnalyticsSurface,
  type ReportConfig,
  type ReportGenerationStatus,
} from '@compass/types';
import { captureProductEvent } from '../../../lib/analytics';
import { createReport, getReportStatus, triggerReportGeneration } from '../services/report-api';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Polling interval for checking report generation status */
const POLL_INTERVAL_MS = 2_000;

/** Maximum time to poll before showing a timeout message */
const POLL_TIMEOUT_MS = 60_000;

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseReportGenerationReturn {
  generate: (config: ReportConfig) => Promise<void>;
  status: ReportGenerationStatus | null;
  progress: number;
  fileUrl: string | null;
  fileSize: number | null;
  pageCount: number | null;
  isGenerating: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Manages report generation: triggers creation, polls for status updates,
 * and exposes reactive state for UI binding.
 */
export function useReportGeneration(): UseReportGenerationReturn {
  const [status, setStatus] = useState<ReportGenerationStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportIdRef = useRef<string | null>(null);

  /** Stop all polling timers */
  const stopPolling = useCallback((): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /** Start polling for report status */
  const startPolling = useCallback(
    (reportId: string): void => {
      intervalRef.current = setInterval(async () => {
        try {
          const report = await getReportStatus(reportId);
          setStatus(report.status);
          setProgress(report.progress);

          if (report.status === 'completed') {
            setFileUrl(report.fileUrl);
            setFileSize(report.fileSize);
            setPageCount(report.pageCount);
            stopPolling();
          } else if (report.status === 'failed') {
            setError(report.error ?? 'Report generation failed.');
            stopPolling();
          }
        } catch (pollError) {
          const message =
            pollError instanceof Error ? pollError.message : 'Failed to check report status.';
          setError(message);
          stopPolling();
        }
      }, POLL_INTERVAL_MS);

      // Timeout guard
      timeoutRef.current = setTimeout(() => {
        stopPolling();
        setError('Taking longer than expected. Check the Reports tab.');
      }, POLL_TIMEOUT_MS);
    },
    [stopPolling],
  );

  /** Trigger report generation and begin polling */
  const generate = useCallback(
    async (config: ReportConfig): Promise<void> => {
      // Reset state for new generation
      stopPolling();
      setStatus('queued');
      setProgress(0);
      setFileUrl(null);
      setFileSize(null);
      setPageCount(null);
      setError(null);

      captureProductEvent({
        eventName: AnalyticsEventName.REPORT_GENERATION_REQUESTED,
        surface: AnalyticsSurface.REPORTS,
        surveyId: config.surveyId,
        reportFormat: config.format,
        actionStatus: AnalyticsActionStatus.REQUESTED,
      });

      try {
        const { reportId } = await createReport(config);
        reportIdRef.current = reportId;

        // Invoke edge function to generate the file. The edge function returns
        // the signed URL directly; the report row stores only the storage path.
        try {
          const generationResult = await triggerReportGeneration(reportId);
          const report = await getReportStatus(reportId);

          setStatus(report.status);
          setProgress(report.progress);
          setFileSize(report.fileSize ?? generationResult.fileSize);
          setPageCount(report.pageCount);

          if (report.status === 'completed') {
            setFileUrl(generationResult.signedUrl);
            captureProductEvent({
              eventName: AnalyticsEventName.REPORT_GENERATION_REQUESTED,
              surface: AnalyticsSurface.REPORTS,
              surveyId: config.surveyId,
              reportFormat: config.format,
              actionStatus: AnalyticsActionStatus.SUCCEEDED,
            });
            return;
          }

          if (report.status === 'failed') {
            setError(report.error ?? 'Report generation failed.');
            captureProductEvent({
              eventName: AnalyticsEventName.REPORT_GENERATION_REQUESTED,
              surface: AnalyticsSurface.REPORTS,
              surveyId: config.surveyId,
              reportFormat: config.format,
              actionStatus: AnalyticsActionStatus.FAILED,
            });
            return;
          }
        } catch (invokeError) {
          const message =
            invokeError instanceof Error ? invokeError.message : 'Failed to start report generation.';
          setStatus('failed');
          setError(message);
          captureProductEvent({
            eventName: AnalyticsEventName.REPORT_GENERATION_REQUESTED,
            surface: AnalyticsSurface.REPORTS,
            surveyId: config.surveyId,
            reportFormat: config.format,
            actionStatus: AnalyticsActionStatus.FAILED,
          });
          return;
        }

        // Defensive fallback for any future async generation mode.
        startPolling(reportId);
      } catch (createError) {
        const message =
          createError instanceof Error ? createError.message : 'Failed to create report.';
        setStatus('failed');
        setError(message);
        captureProductEvent({
          eventName: AnalyticsEventName.REPORT_GENERATION_REQUESTED,
          surface: AnalyticsSurface.REPORTS,
          surveyId: config.surveyId,
          reportFormat: config.format,
          actionStatus: AnalyticsActionStatus.FAILED,
        });
      }
    },
    [startPolling, stopPolling],
  );

  /** Reset all state back to initial values */
  const reset = useCallback((): void => {
    stopPolling();
    reportIdRef.current = null;
    setStatus(null);
    setProgress(0);
    setFileUrl(null);
    setFileSize(null);
    setPageCount(null);
    setError(null);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      stopPolling();
    };
  }, [stopPolling]);

  const isGenerating = status === 'queued' || status === 'generating';

  return {
    generate,
    status,
    progress,
    fileUrl,
    fileSize,
    pageCount,
    isGenerating,
    error,
    reset,
  };
}
