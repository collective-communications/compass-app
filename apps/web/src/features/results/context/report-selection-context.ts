/**
 * Context for sharing selected report state between the reports tab
 * and its insights panel in the results layout.
 */

import { createContext, useContext } from 'react';
import type { ReportRow } from '../../reports';

export interface ReportSelectionContextValue {
  selectedReport: ReportRow | null;
  selectReport: (report: ReportRow | null) => void;
}

export const ReportSelectionContext = createContext<ReportSelectionContextValue>({
  selectedReport: null,
  selectReport: () => {},
});

/** Hook for the reports tab and insights panel to share selection state. */
export function useReportSelection(): ReportSelectionContextValue {
  return useContext(ReportSelectionContext);
}
