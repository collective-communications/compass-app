/**
 * Reports tab — embedded within the results view at /results/$surveyId/reports.
 * Reuses hooks and components from the reports feature.
 * No survey picker needed (surveyId comes from route params).
 * Admin (tier_1) and client_exec users can generate reports.
 */

import { useCallback, useState, type ReactElement } from 'react';
import { FileText, Plus } from 'lucide-react';
import { useReports } from '../../../reports/hooks/use-reports';
import { ReportCard } from '../../../reports/components/report-card';
import { ReportPreview } from '../../../reports/components/report-preview';
import { ExportModal } from '../../../reports/components/export-modal';
import { useAuthStore } from '../../../../stores/auth-store';
import { useReportSelection } from '../../context/report-selection-context';

interface ReportsTabProps {
  surveyId: string;
}

export function ReportsTab({ surveyId }: ReportsTabProps): ReactElement {
  const user = useAuthStore((s) => s.user);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { selectedReport, selectReport } = useReportSelection();

  const {
    reports,
    isLoading,
    error,
    refresh,
  } = useReports(surveyId);

  const canGenerate = user?.tier === 'tier_1' || user?.role === 'client_exec';

  const handleGenerated = useCallback((): void => {
    void refresh();
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header with generate button */}
      {canGenerate && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 rounded-md bg-[var(--color-interactive)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)] focus:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" />
            Generate Report
          </button>
        </div>
      )}

      {/* Error */}
      {error !== null && (
        <div
          role="alert"
          className="rounded-md border border-[var(--severity-critical-border)]/20 bg-[var(--severity-critical-bg)] px-4 py-3 text-sm text-[var(--severity-critical-text)]"
        >
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)]"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && reports.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-6 py-12 text-center">
          <FileText size={40} className="text-[var(--grey-100)]" aria-hidden="true" />
          <p className="text-sm text-[var(--text-secondary)]">
            {canGenerate
              ? 'No reports yet. Click "Generate Report" to create one.'
              : 'No reports yet. Reports will appear here once generated.'}
          </p>
        </div>
      )}

      {/* Report list */}
      {!isLoading && reports.length > 0 && (
        <div role="list" aria-label="Generated reports">
          {reports.map((report) => (
            <div key={report.id} role="listitem" className="mb-3 last:mb-0">
              <ReportCard
                report={report}
                isSelected={selectedReport?.id === report.id}
                onSelect={() => selectReport(report)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Export modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        surveyId={surveyId}
        onGenerated={handleGenerated}
      />
    </div>
  );
}

/** Insights panel content for the reports tab — shows selected report preview. */
export function ReportsInsightsContent(): ReactElement {
  const { selectedReport } = useReportSelection();
  return <ReportPreview report={selectedReport} />;
}
