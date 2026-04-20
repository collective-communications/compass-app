/**
 * A11y Report panel — walks the Storybook story index, navigates to each story,
 * triggers the axe scan via the a11y addon's MANUAL event, collects results,
 * and exports a consolidated JSON report.
 *
 * Uses React.createElement (no JSX) because Storybook v10 manager addons
 * are bundled by esbuild which does not support .tsx.
 */

import React from 'react';
import { addons } from 'storybook/manager-api';
import { useStorybookApi } from 'storybook/manager-api';
import { A11Y_EVENTS } from './constants.ts';
import type { A11yReport, AxeResults, StoryA11yResult } from './types.ts';

const { createElement: h, useCallback, useRef, useState } = React;

type RunState = 'idle' | 'running' | 'done';

/** Delay after emitting MANUAL — gives the a11y addon time to run axe and emit RESULT. */
const SCAN_DELAY_MS = 2000;

function SummaryCard({ label, count, color }: { label: string; count: number; color: string }) {
  return h('div', {
    style: { padding: '12px 16px', borderRadius: 8, border: '1px solid #E5E4E0', textAlign: 'center' as const },
  },
    h('div', { style: { fontSize: 24, fontWeight: 700, color } }, count),
    h('div', { style: { fontSize: 12, color: '#757575', marginTop: 2 } }, label),
  );
}

export function PanelContent(): React.ReactElement {
  const api = useStorybookApi();
  const [state, setState] = useState<RunState>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0, storyName: '' });
  const [report, setReport] = useState<A11yReport | null>(null);
  const abortRef = useRef(false);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const runReport = useCallback(async () => {
    abortRef.current = false;
    setState('running');

    const index = api.getIndex();
    if (!index) {
      setState('idle');
      return;
    }

    const storyEntries = Object.values(index.entries).filter(
      (e): e is { type: 'story'; id: string; title: string; name: string } =>
        (e as { type: string }).type === 'story',
    );

    setProgress({ current: 0, total: storyEntries.length, storyName: '' });

    const channel = addons.getChannel();
    const results = new Map<string, StoryA11yResult>();

    for (let i = 0; i < storyEntries.length; i++) {
      if (abortRef.current) break;

      const entry = storyEntries[i];
      setProgress({ current: i + 1, total: storyEntries.length, storyName: `${entry.title} / ${entry.name}` });

      // Navigate to the story
      api.selectStory(entry.id);

      // Wait for story to render
      await sleep(500);

      // Set up a one-shot listener for the result
      const resultPromise = new Promise<AxeResults | null>((resolve) => {
        const timeout = setTimeout(() => {
          channel.off(A11Y_EVENTS.RESULT, onResult);
          channel.off(A11Y_EVENTS.ERROR, onError);
          resolve(null);
        }, SCAN_DELAY_MS);

        const onResult = (axeResults: AxeResults, _storyId?: string) => {
          clearTimeout(timeout);
          channel.off(A11Y_EVENTS.RESULT, onResult);
          channel.off(A11Y_EVENTS.ERROR, onError);
          resolve(axeResults);
        };

        const onError = () => {
          clearTimeout(timeout);
          channel.off(A11Y_EVENTS.RESULT, onResult);
          channel.off(A11Y_EVENTS.ERROR, onError);
          resolve(null);
        };

        channel.on(A11Y_EVENTS.RESULT, onResult);
        channel.on(A11Y_EVENTS.ERROR, onError);
      });

      // Trigger the a11y scan
      channel.emit(A11Y_EVENTS.MANUAL, entry.id, {});

      const axeResults = await resultPromise;

      if (axeResults) {
        const hasViolations = axeResults.violations.length > 0;
        const hasIncomplete = axeResults.incomplete.length > 0;
        results.set(entry.id, {
          storyId: entry.id,
          title: entry.title,
          name: entry.name,
          status: hasViolations ? 'fail' : hasIncomplete ? 'incomplete' : 'pass',
          violations: axeResults.violations,
          passes: axeResults.passes,
          incomplete: axeResults.incomplete,
          timestamp: new Date().toISOString(),
        });
      } else {
        results.set(entry.id, {
          storyId: entry.id,
          title: entry.title,
          name: entry.name,
          status: 'error',
          violations: [],
          passes: [],
          incomplete: [],
          timestamp: new Date().toISOString(),
        });
      }
    }

    const stories = Array.from(results.values());
    const builtReport: A11yReport = {
      generatedAt: new Date().toISOString(),
      storybookVersion: '10.2.17',
      totalStories: stories.length,
      summary: {
        passed: stories.filter((s) => s.status === 'pass').length,
        failed: stories.filter((s) => s.status === 'fail').length,
        incomplete: stories.filter((s) => s.status === 'incomplete').length,
        errors: stories.filter((s) => s.status === 'error').length,
      },
      stories,
    };

    setReport(builtReport);
    setState('done');
  }, [api]);

  const downloadReport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `a11y-report-${report.generatedAt.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [report]);

  const btnStyle = {
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 500,
    border: 'none',
    borderRadius: 6,
    background: '#0C3D50',
    color: '#fff',
    cursor: 'pointer',
  };

  const outlineBtnStyle = {
    ...btnStyle,
    background: 'transparent',
    border: '1px solid #E5E4E0',
    color: 'inherit',
  };

  // Idle state
  if (state === 'idle') {
    return h('div', { style: { padding: 16, fontFamily: 'system-ui, sans-serif' } },
      h('h2', { style: { margin: '0 0 12px', fontSize: 16, fontWeight: 600 } }, 'Accessibility Report'),
      h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#757575' } },
        'Walks every story, triggers an axe scan, and exports a consolidated JSON report.',
      ),
      h('button', { type: 'button', onClick: runReport, style: btnStyle }, 'Generate Report'),
    );
  }

  // Running state
  if (state === 'running') {
    const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    return h('div', { style: { padding: 16, fontFamily: 'system-ui, sans-serif' } },
      h('h2', { style: { margin: '0 0 12px', fontSize: 16, fontWeight: 600 } }, 'Accessibility Report'),
      h('p', { style: { margin: '0 0 8px', fontSize: 13 } },
        `Scanning story ${progress.current} of ${progress.total}…`,
      ),
      h('div', { style: { height: 6, borderRadius: 3, background: '#E5E4E0', overflow: 'hidden' } },
        h('div', { style: { height: '100%', width: `${pct}%`, background: '#0C3D50', borderRadius: 3, transition: 'width 0.3s ease' } }),
      ),
      h('p', { style: { margin: '8px 0 0', fontSize: 12, color: '#757575' } }, progress.storyName),
      h('button', {
        type: 'button',
        onClick: () => { abortRef.current = true; },
        style: { ...outlineBtnStyle, marginTop: 12 },
      }, 'Cancel'),
    );
  }

  // Done state
  if (state === 'done' && report) {
    const failedStories = report.stories.filter((s) => s.status === 'fail');

    return h('div', { style: { padding: 16, fontFamily: 'system-ui, sans-serif' } },
      h('h2', { style: { margin: '0 0 12px', fontSize: 16, fontWeight: 600 } }, 'Accessibility Report'),
      // Summary cards
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 } },
        h(SummaryCard, { label: 'Passed', count: report.summary.passed, color: '#2E7D32' }),
        h(SummaryCard, { label: 'Failed', count: report.summary.failed, color: '#B71C1C' }),
        h(SummaryCard, { label: 'Incomplete', count: report.summary.incomplete, color: '#F9A825' }),
        h(SummaryCard, { label: 'Errors', count: report.summary.errors, color: '#757575' }),
      ),
      // Failed stories detail
      failedStories.length > 0
        ? h('details', { style: { marginBottom: 16 } },
            h('summary', { style: { fontSize: 13, fontWeight: 500, cursor: 'pointer' } },
              `${failedStories.length} stories with violations`,
            ),
            h('ul', { style: { margin: '8px 0 0', padding: '0 0 0 20px', fontSize: 12 } },
              ...failedStories.map((s) =>
                h('li', { key: s.storyId, style: { marginBottom: 4 } },
                  h('strong', null, s.title), ` — ${s.name} `,
                  h('span', { style: { color: '#B71C1C', marginLeft: 6 } },
                    `(${s.violations.length} violation${s.violations.length !== 1 ? 's' : ''})`,
                  ),
                ),
              ),
            ),
          )
        : null,
      // Action buttons
      h('div', { style: { display: 'flex', gap: 8 } },
        h('button', { type: 'button', onClick: downloadReport, style: btnStyle }, 'Download JSON'),
        h('button', {
          type: 'button',
          onClick: () => { setState('idle'); setReport(null); },
          style: outlineBtnStyle,
        }, 'Run Again'),
      ),
    );
  }

  return h('div', null);
}
