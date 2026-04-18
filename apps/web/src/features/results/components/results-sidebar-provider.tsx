/**
 * ResultsSidebarProvider — owns the state shared across results tabs
 * (active dimension, selected report, active dialogue topic, active
 * recommendation index) and exposes it through four context providers.
 *
 * Extracted from the results route body so the route stays focused on
 * data loading + layout composition.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { ReportRow } from '../../reports';
import type { DimensionNavId } from '../tabs/compass';
import { deriveTopics } from '../tabs/dialogue';
import { DimensionContext } from '../context/dimension-context';
import {
  DialogueFilterContext,
  type DialogueTopicItem,
} from '../context/dialogue-filter-context';
import { RecommendationsNavContext } from '../context/recommendations-nav-context';
import { ReportSelectionContext } from '../context/report-selection-context';
import { useDialogueResponses } from '../hooks/use-dialogue-responses';
import { useRecommendations } from '../hooks/use-recommendations';
import { severitySortKey } from '../lib/severity-mapping';
import type { ResultsTabId } from '../types';

interface ResultsSidebarProviderProps {
  surveyId: string;
  /**
   * Currently active tab. The provider resets per-tab selection state
   * (selected report, active dialogue topic, active recommendation index,
   * and the default active dimension) whenever this changes.
   */
  activeTab: ResultsTabId;
  children: ReactNode;
}

/**
 * Wraps children in the four results-scope context providers:
 * Dimension, DialogueFilter, RecommendationsNav, ReportSelection.
 *
 * @param surveyId - Drives dialogue topic + recommendation queries. TanStack
 *   Query deduplicates these with the same calls inside the tab components.
 */
export function ResultsSidebarProvider({
  surveyId,
  activeTab,
  children,
}: ResultsSidebarProviderProps): ReactElement {
  const [activeDimension, setActiveDimension] = useState<DimensionNavId>('overview');
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activeRecIndex, setActiveRecIndex] = useState(0);

  const handleDimensionChange = useCallback((dimension: DimensionNavId) => {
    setActiveDimension(dimension);
  }, []);

  // Reset per-tab selection state when switching tabs. Skip the first render
  // (no transition has occurred yet) to preserve any initial state.
  const previousTabRef = useRef(activeTab);
  useEffect(() => {
    if (previousTabRef.current === activeTab) return;
    previousTabRef.current = activeTab;
    // Survey tab has no 'overview' — default to 'core'
    setActiveDimension(activeTab === 'survey' ? 'core' : 'overview');
    setSelectedReport(null);
    setActiveTopicId(null);
    setActiveRecIndex(0);
  }, [activeTab]);

  // Fetch dialogue responses to derive topic list for the sidebar.
  // TanStack Query deduplicates this with the same call inside DialogueTab.
  const { data: dialogueResponses } = useDialogueResponses({ surveyId });

  const dialogueTopics: DialogueTopicItem[] = useMemo(() => {
    const derived = deriveTopics(dialogueResponses ?? []);
    return derived.map((t) => ({ id: t.questionId, label: t.label, count: t.count }));
  }, [dialogueResponses]);

  const dialogueFilterValue = useMemo(
    () => ({ activeTopicId, setActiveTopicId, topics: dialogueTopics }),
    [activeTopicId, dialogueTopics],
  );

  // Fetch recommendations to derive the sorted list used by the sidebar and mobile strip.
  const { data: recommendations } = useRecommendations(surveyId);

  const sortedRecommendations = useMemo(() => {
    if (!recommendations) return [];
    return [...recommendations].sort(
      (a, b) =>
        severitySortKey(a.severity) - severitySortKey(b.severity) || a.priority - b.priority,
    );
  }, [recommendations]);

  const recommendationsNavValue = useMemo(
    () => ({
      activeIndex: activeRecIndex,
      setActiveIndex: setActiveRecIndex,
      sortedRecommendations,
    }),
    [activeRecIndex, sortedRecommendations],
  );

  const dimensionContextValue = useMemo(
    () => ({ activeDimension, setActiveDimension: handleDimensionChange }),
    [activeDimension, handleDimensionChange],
  );

  const reportSelectionValue = useMemo(
    () => ({ selectedReport, selectReport: setSelectedReport }),
    [selectedReport],
  );

  return (
    <ReportSelectionContext.Provider value={reportSelectionValue}>
      <DialogueFilterContext.Provider value={dialogueFilterValue}>
        <RecommendationsNavContext.Provider value={recommendationsNavValue}>
          <DimensionContext.Provider value={dimensionContextValue}>
            {children}
          </DimensionContext.Provider>
        </RecommendationsNavContext.Provider>
      </DialogueFilterContext.Provider>
    </ReportSelectionContext.Provider>
  );
}
