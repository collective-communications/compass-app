/**
 * Hook for fetching and managing the list of reports for a given survey.
 * Wraps listReports + deleteReport with reactive state and optimistic removal.
 */

import { useCallback, useEffect, useState } from 'react';
import { listReports, deleteReport } from '../services/report-api';
import type { ReportRow } from '../services/report-api';

export interface UseReportsReturn {
  /** Reports for the active survey, newest first */
  reports: ReportRow[];
  /** Whether the initial fetch is in progress */
  isLoading: boolean;
  /** Fetch error message, if any */
  error: string | null;
  /** Re-fetch reports from the server */
  refresh: () => Promise<void>;
  /** Remove a report by ID (optimistic) */
  remove: (reportId: string) => Promise<void>;
  /** The currently selected report for preview, if any */
  selectedReport: ReportRow | null;
  /** Select a report for the preview panel */
  selectReport: (report: ReportRow | null) => void;
}

/**
 * Fetches and manages reports for a survey.
 * Pass null surveyId to skip fetching (e.g. before a survey is selected).
 */
export function useReports(surveyId: string | null): UseReportsReturn {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    if (surveyId === null) {
      setReports([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listReports(surveyId);
      setReports(data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Failed to load reports.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [surveyId]);

  /** Optimistically remove a report, rolling back on failure */
  const remove = useCallback(
    async (reportId: string): Promise<void> => {
      const previousReports = reports;

      // Optimistic removal
      setReports((prev) => prev.filter((r) => r.id !== reportId));

      // Clear selection if removed report was selected
      setSelectedReport((prev) => (prev?.id === reportId ? null : prev));

      try {
        await deleteReport(reportId);
      } catch (deleteError) {
        // Rollback on failure
        setReports(previousReports);
        const message =
          deleteError instanceof Error ? deleteError.message : 'Failed to delete report.';
        setError(message);
      }
    },
    [reports],
  );

  // Fetch on mount and when surveyId changes
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Clear selection when surveyId changes
  useEffect(() => {
    setSelectedReport(null);
  }, [surveyId]);

  return {
    reports,
    isLoading,
    error,
    refresh,
    remove,
    selectedReport,
    selectReport: setSelectedReport,
  };
}
