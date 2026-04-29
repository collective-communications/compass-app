/**
 * Scoring Validator — interactive dev tool for the scoring pipeline.
 *
 * Owns all state and derives pipeline outputs via useMemo. Renders a
 * two-column layout wiring all child components.
 *
 * Used by the standalone validation app and the web app's `/dev/scoring`
 * route during development.
 */

import React, { useState, useMemo } from 'react';
import {
  computeSurveyScores,
  identifyArchetype,
  euclideanDistance,
  distanceToConfidence,
  ARCHETYPE_VECTORS,
  evaluateRiskFlags,
  DEFAULT_RISK_THRESHOLDS,
  calculateTrustLadderPosition,
} from '@compass/scoring';
import type {
  AnswerWithMeta,
  SurveyScoreResult,
  ArchetypeMatch,
  ArchetypeVector,
  RiskFlag,
  RiskThresholds,
  TrustLadderResult,
} from '@compass/scoring';
import { defaultAnswers } from './data/questions.js';
import type { QuestionAnswer } from './data/questions.js';
import { PRESETS, DEFAULT_PRESET_ID } from './data/presets.js';
import { ConfigBar } from './components/ConfigBar.js';
import { AnswerInputPanel } from './components/AnswerInputPanel.js';
import { CompassPreview } from './components/CompassPreview.js';
import { ScoreBreakdownTab } from './components/ScoreBreakdownTab.js';
import { ArchetypeDistanceTab } from './components/ArchetypeDistanceTab.js';
import { RiskFlagInspector } from './components/RiskFlagInspector.js';
import { TrustLadderTab } from './components/TrustLadderTab.js';
import { ComparePanel } from './components/ComparePanel.js';

// ---------------------------------------------------------------------------
// Exported interfaces for child components
// ---------------------------------------------------------------------------

/** Full set of derived pipeline outputs passed down to child panels. */
export interface ScoringValidatorOutputs {
  surveyScoreResult: SurveyScoreResult;
  archetypeMatch: ArchetypeMatch;
  allArchetypeDistances: Array<{
    archetype: ArchetypeVector;
    distance: number;
    confidence: 'strong' | 'moderate' | 'weak';
  }>;
  riskFlags: RiskFlag[];
  trustLadder: TrustLadderResult;
}

/** Prop shape for components that accept individual answer changes. */
export interface AnswerChangeHandler {
  (questionId: string, value: number): void;
}

/** ScoringValidator takes no props — it is a route component. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ScoringValidatorProps {}

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type ActiveTab = 'scores' | 'archetypes' | 'risks' | 'trust' | 'compare';

const TAB_LABELS: Record<ActiveTab, string> = {
  scores: 'Scores',
  archetypes: 'Archetypes',
  risks: 'Risk Flags',
  trust: 'Trust Ladder',
  compare: 'Compare',
};

// ---------------------------------------------------------------------------
// Pipeline helper — shared by both Scenario A and Scenario B memos
// ---------------------------------------------------------------------------

function runPipeline(
  sessionId: string,
  answers: QuestionAnswer[],
  scaleSize: 4 | 5,
  riskThresholds: RiskThresholds,
): ScoringValidatorOutputs | null {
  if (answers.length === 0) return null;
  try {
    const answersWithMeta: AnswerWithMeta[] = answers.map((q) => ({
      questionId: q.questionId,
      value: q.value,
      reverseScored: q.reverseScored,
      dimensionId: q.questionId,
      dimensionCode: q.dimensionCode,
      weight: q.weight,
      subDimensionCode: q.subDimensionCode,
    }));

    const surveyScoreResult = computeSurveyScores(sessionId, answersWithMeta, scaleSize);
    const archetypeMatch = identifyArchetype(surveyScoreResult.overallScores, ARCHETYPE_VECTORS);

    const allArchetypeDistances = ARCHETYPE_VECTORS.map((archetype) => {
      const scoreMap = Object.fromEntries(
        Object.entries(surveyScoreResult.overallScores).map(([k, v]) => [k, v.score]),
      );
      const distance = euclideanDistance(scoreMap, archetype.targetScores);
      return { archetype, distance, confidence: distanceToConfidence(distance) };
    }).sort((a, b) => a.distance - b.distance);

    const riskFlags = evaluateRiskFlags(surveyScoreResult.overallScores, riskThresholds);
    const trustLadder = calculateTrustLadderPosition(surveyScoreResult.overallScores);

    return { surveyScoreResult, archetypeMatch, allArchetypeDistances, riskFlags, trustLadder };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Root component for the Scoring Validator dev tool.
 * Owns all state; derives all pipeline outputs via useMemo.
 */
export function ScoringValidator(): React.ReactElement {
  // ── State ─────────────────────────────────────────────────────────────────

  const defaultPreset = PRESETS.find((p) => p.id === DEFAULT_PRESET_ID);
  const initialScale: 4 | 5 = defaultPreset?.scaleSize ?? 5;
  const [scaleSize, setScaleSize] = useState<4 | 5>(initialScale);
  const [answers, setAnswers] = useState<QuestionAnswer[]>(() => defaultPreset?.build() ?? defaultAnswers(initialScale));
  const [riskThresholds, setRiskThresholds] = useState<RiskThresholds>(DEFAULT_RISK_THRESHOLDS);
  const [compareMode, setCompareMode] = useState(false);
  const [scenarioB, setScenarioB] = useState<QuestionAnswer[]>(() => defaultAnswers(initialScale));
  const [activeTab, setActiveTab] = useState<ActiveTab>('scores');
  const [activePresetId, setActivePresetId] = useState<string | null>(DEFAULT_PRESET_ID);
  const [activeBPresetId, setActiveBPresetId] = useState<string | null>(null);

  // ── Pipeline outputs (derived) ────────────────────────────────────────────

  const outputs = useMemo(
    (): ScoringValidatorOutputs | null => runPipeline('dev-tool', answers, scaleSize, riskThresholds),
    [answers, scaleSize, riskThresholds],
  );

  const outputsB = useMemo(
    (): ScoringValidatorOutputs | null => {
      if (!compareMode || scenarioB.length === 0) return null;
      return runPipeline('dev-tool-b', scenarioB, scaleSize, riskThresholds);
    },
    [scenarioB, scaleSize, riskThresholds, compareMode],
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Change the Likert scale size, clamping any answer values that exceed the new max. */
  function handleScaleChange(newScale: 4 | 5): void {
    setAnswers((prev) => prev.map((a) => ({ ...a, value: Math.min(a.value, newScale) })));
    setScaleSize(newScale);
  }

  /** Update the value for a single question answer (clears active preset). */
  function handleAnswerChange(questionId: string, value: number): void {
    setActivePresetId(null);
    setAnswers((prev) =>
      prev.map((a) => (a.questionId === questionId ? { ...a, value } : a)),
    );
  }

  /** Load a named preset — replaces all answers and sets the scale size. */
  function handlePresetLoad(newAnswers: QuestionAnswer[], newScaleSize: 4 | 5, presetId: string): void {
    setAnswers(newAnswers);
    setScaleSize(newScaleSize);
    setActivePresetId(presetId);
  }

  /** Reset all answer values to the midpoint of the current scale. */
  function handleReset(): void {
    const mid = Math.floor((1 + scaleSize) / 2);
    setAnswers((prev) => prev.map((a) => ({ ...a, value: mid })));
    setActivePresetId(null);
  }

  /** Update a single risk threshold field. */
  function handleThresholdChange(field: keyof RiskThresholds, value: number): void {
    setRiskThresholds((prev) => ({ ...prev, [field]: value }));
  }

  /** Toggle compare mode; snapshots current answers into Scenario B on entry and switches to compare tab. */
  function handleCompareToggle(): void {
    setCompareMode((prev) => {
      if (!prev) {
        setScenarioB([...answers]);
        setActiveTab('compare');
      }
      return !prev;
    });
  }

  /** Load a preset into Scenario B. */
  function handleBPresetLoad(newAnswers: QuestionAnswer[], newScaleSize: 4 | 5, presetId: string): void {
    setScenarioB(newAnswers);
    setActiveBPresetId(presetId);
    // Scenario B uses scaleSize from the preset (same scaleSize as A for fair comparison)
    // Only update global scale if it differs — keep A's scale as the authoritative one.
    // Per spec, scale size is shared; if B preset has a different scale, we honor it.
    setScaleSize(newScaleSize);
  }

  // ── Tabs ──────────────────────────────────────────────────────────────────

  const visibleTabs: ActiveTab[] = compareMode
    ? ['scores', 'archetypes', 'risks', 'trust', 'compare']
    : ['scores', 'archetypes', 'risks', 'trust'];

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--surface-app, #F5F5F5)',
      }}
    >
      {/* ── Left column — fixed 380px ──────────────────────────────────── */}
      <div
        style={{
          width: 380,
          flexShrink: 0,
          borderRight: '1px solid var(--grey-200, #E5E4E0)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            borderBottom: '1px solid var(--grey-200, #E5E4E0)',
          }}
        >
          <span
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}
          >
            Scoring Validator
          </span>
          <span
            style={{
              fontSize: 10,
              fontFamily: 'monospace',
              background: 'var(--grey-100, #F5F5F5)',
              color: 'var(--text-tertiary)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            DEV
          </span>
        </div>

        {/* Config Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--grey-200, #E5E4E0)',
          }}
        >
          <ConfigBar
            scaleSize={scaleSize}
            activePresetId={activePresetId}
            compareMode={compareMode}
            onScaleChange={handleScaleChange}
            onPresetLoad={handlePresetLoad}
            onReset={handleReset}
            onCompareToggle={handleCompareToggle}
          />
        </div>

        {/* Answer Input */}
        <div style={{ flex: 1, padding: '12px 16px' }}>
          <AnswerInputPanel
            answers={answers}
            scaleSize={scaleSize}
            outputs={outputs}
            onAnswerChange={handleAnswerChange}
          />
        </div>
      </div>

      {/* ── Right column — flex ────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {outputs === null ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-tertiary)',
              fontSize: 13,
            }}
          >
            Loading questions…
          </div>
        ) : (
          <>
            {/* Compass Preview */}
            <div
              style={{
                padding: 24,
                borderBottom: '1px solid var(--grey-200, #E5E4E0)',
                flexShrink: 0,
              }}
            >
              <CompassPreview outputs={outputs} />
            </div>

            {/* Tab Bar */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid var(--grey-200, #E5E4E0)',
                padding: '0 24px',
                flexShrink: 0,
              }}
            >
              {visibleTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    borderBottom:
                      activeTab === tab
                        ? '2px solid var(--grey-900, #212121)'
                        : '2px solid transparent',
                    fontWeight: activeTab === tab ? 600 : 400,
                    color:
                      activeTab === tab
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 13,
                    marginBottom: -1,
                  }}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
              {activeTab === 'scores' && (
                <ScoreBreakdownTab outputs={outputs} scaleSize={scaleSize} />
              )}
              {activeTab === 'archetypes' && (
                <ArchetypeDistanceTab outputs={outputs} />
              )}
              {activeTab === 'risks' && (
                <RiskFlagInspector
                  outputs={outputs}
                  riskThresholds={riskThresholds}
                  onThresholdChange={handleThresholdChange}
                />
              )}
              {activeTab === 'trust' && (
                <TrustLadderTab outputs={outputs} />
              )}
              {activeTab === 'compare' && compareMode && (
                <ComparePanel
                  outputsA={outputs}
                  outputsB={outputsB}
                  activeBPresetId={activeBPresetId}
                  onLoadBPreset={handleBPresetLoad}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
