import React, { useState } from 'react';
import type { DimensionCode } from '@compass/scoring';
import type { QuestionAnswer } from '../data/questions.js';
import type { ScoringValidatorOutputs } from '../ScoringValidator.js';
import { QuestionRow } from './QuestionRow.js';

export interface AnswerInputPanelProps {
  answers: QuestionAnswer[];
  scaleSize: 4 | 5;
  outputs: ScoringValidatorOutputs | null;
  onAnswerChange: (questionId: string, value: number) => void;
}

const DIMENSION_CONFIG = {
  core:          { label: 'Core',          color: 'var(--color-core, #0C3D50)' },
  clarity:       { label: 'Clarity',       color: 'var(--color-clarity, #FF7F50)' },
  connection:    { label: 'Connection',    color: 'var(--color-connection, #9FD7C3)' },
  collaboration: { label: 'Collaboration', color: 'var(--color-collaboration, #E8B4A8)' },
} as const;

const DIMENSION_ORDER: DimensionCode[] = ['core', 'clarity', 'connection', 'collaboration'];

function formatScore(score: number | undefined): string {
  return score !== undefined ? `${score.toFixed(2)}%` : '—';
}

/** Returns unique subDimensionCode values in first-appearance order. */
function uniqueSubDims(answers: QuestionAnswer[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const a of answers) {
    if (!seen.has(a.subDimensionCode)) {
      seen.add(a.subDimensionCode);
      result.push(a.subDimensionCode);
    }
  }
  return result;
}

export function AnswerInputPanel({
  answers,
  scaleSize,
  outputs,
  onAnswerChange,
}: AnswerInputPanelProps): React.ReactElement {
  const [collapsedDims, setCollapsedDims] = useState<Set<DimensionCode>>(new Set());
  const [showSubDim, setShowSubDim] = useState<Record<DimensionCode, boolean>>({
    core: false,
    clarity: false,
    connection: false,
    collaboration: false,
  });
  const [collapsedSubDims, setCollapsedSubDims] = useState<Set<string>>(new Set());

  function toggleDim(dim: DimensionCode): void {
    setCollapsedDims((prev) => {
      const next = new Set(prev);
      if (next.has(dim)) next.delete(dim);
      else next.add(dim);
      return next;
    });
  }

  function toggleSubDimView(dim: DimensionCode, e: React.MouseEvent): void {
    e.stopPropagation();
    setShowSubDim((prev) => ({ ...prev, [dim]: !prev[dim] }));
  }

  function toggleSubDim(key: string, e: React.MouseEvent): void {
    e.stopPropagation();
    setCollapsedSubDims((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  if (answers.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text-tertiary, #9E9E9E)' }}>No answers loaded.</div>;
  }

  return (
    <div style={{ fontSize: 12 }}>
      {DIMENSION_ORDER.map((dim) => {
        const dimAnswers = answers.filter((a) => a.dimensionCode === dim);
        if (dimAnswers.length === 0) return null;

        const isCollapsed = collapsedDims.has(dim);
        const isSubDimOn = showSubDim[dim];
        const dimScore = outputs?.surveyScoreResult.overallScores[dim]?.score;
        const cfg = DIMENSION_CONFIG[dim];

        return (
          <div key={dim} style={{ marginBottom: 8 }}>
            {/* Dimension header */}
            <div
              onClick={() => toggleDim(dim)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 0',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: 10, color: 'var(--text-tertiary, #9E9E9E)', width: 10, flexShrink: 0 }}>
                {isCollapsed ? '▷' : '▼'}
              </span>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: cfg.color,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #212121)' }}>
                {cfg.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary, #616161)',
                  marginLeft: 'auto',
                  marginRight: 6,
                }}
              >
                {formatScore(dimScore)}
              </span>
              <button
                onClick={(e) => toggleSubDimView(dim, e)}
                style={{
                  fontSize: 10,
                  padding: '1px 5px',
                  borderRadius: 3,
                  border: '1px solid var(--grey-300, #E0E0E0)',
                  background: isSubDimOn ? 'var(--grey-900, #212121)' : 'transparent',
                  color: isSubDimOn ? '#fff' : 'var(--text-tertiary, #9E9E9E)',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                sub
              </button>
            </div>

            {/* Question rows */}
            {!isCollapsed && (
              <div style={{ paddingLeft: 16 }}>
                {!isSubDimOn ? (
                  dimAnswers.map((a) => (
                    <QuestionRow
                      key={a.questionId}
                      answer={a}
                      scaleSize={scaleSize}
                      showSubDimension={false}
                      onChange={(v) => onAnswerChange(a.questionId, v)}
                    />
                  ))
                ) : (
                  uniqueSubDims(dimAnswers).map((subDimCode) => {
                    const subAnswers = dimAnswers.filter((a) => a.subDimensionCode === subDimCode);
                    const subKey = `${dim}:${subDimCode}`;
                    const isSubCollapsed = collapsedSubDims.has(subKey);
                    const subScore = outputs?.surveyScoreResult.subDimensionScores.find(
                      (s) => s.subDimensionCode === subDimCode,
                    )?.score;

                    return (
                      <div key={subKey} style={{ marginBottom: 4 }}>
                        {/* Sub-dimension header */}
                        <div
                          onClick={(e) => toggleSubDim(subKey, e)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '3px 0',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                        >
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary, #9E9E9E)', width: 10 }}>
                            {isSubCollapsed ? '▷' : '▼'}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'monospace',
                              color: 'var(--text-secondary, #616161)',
                            }}
                          >
                            {subDimCode}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: 'var(--text-tertiary, #9E9E9E)',
                              marginLeft: 'auto',
                            }}
                          >
                            {formatScore(subScore)}
                          </span>
                        </div>

                        {/* Sub-dimension question rows */}
                        {!isSubCollapsed && (
                          <div style={{ paddingLeft: 16 }}>
                            {subAnswers.map((a) => (
                              <QuestionRow
                                key={a.questionId}
                                answer={a}
                                scaleSize={scaleSize}
                                showSubDimension={false}
                                onChange={(v) => onAnswerChange(a.questionId, v)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
