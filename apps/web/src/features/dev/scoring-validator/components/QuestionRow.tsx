import React from 'react';
import type { QuestionAnswer } from '../data/questions.js';

export interface QuestionRowProps {
  answer: QuestionAnswer;
  scaleSize: 4 | 5;
  showSubDimension: boolean;
  onChange: (value: number) => void;
}

function valueBadgeStyle(value: number, scaleSize: 4 | 5): React.CSSProperties {
  if (value <= 2) {
    return {
      color: 'var(--severity-high-text, #C62828)',
      background: 'var(--severity-high-bg, #FFEBEE)',
    };
  }
  if (value >= scaleSize - 1) {
    return {
      color: 'var(--color-core, #0C3D50)',
      background: 'var(--color-core-tint, #E8F0F4)',
    };
  }
  return {
    color: 'var(--text-secondary, #616161)',
    background: 'transparent',
  };
}

export function QuestionRow({
  answer,
  scaleSize,
  showSubDimension,
  onChange,
}: QuestionRowProps): React.ReactElement {
  const label =
    answer.text.length > 55 ? answer.text.slice(0, 55) + '…' : answer.text;

  const badgeColors = valueBadgeStyle(answer.value, scaleSize);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 0',
      }}
    >
      {/* Question ID */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 11,
          color: 'var(--text-tertiary, #9E9E9E)',
          width: 30,
          flexShrink: 0,
        }}
      >
        {answer.questionId}
      </span>

      {/* Question text */}
      <span
        title={answer.text}
        style={{
          fontSize: 12,
          flex: 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          color: 'var(--text-primary, #212121)',
        }}
      >
        {label}
      </span>

      {/* Slider */}
      <input
        type="range"
        min={1}
        max={scaleSize}
        step={1}
        value={answer.value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 80, flexShrink: 0 }}
      />

      {/* Value badge */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: 12,
          width: 18,
          textAlign: 'center',
          borderRadius: 3,
          padding: '0 3px',
          flexShrink: 0,
          ...badgeColors,
        }}
      >
        {answer.value}
      </span>

      {/* Reverse-scored indicator */}
      {answer.reverseScored && (
        <span
          title={`↔ normalized: ${scaleSize + 1 - answer.value}`}
          style={{
            fontSize: 10,
            color: 'var(--text-tertiary, #9E9E9E)',
            flexShrink: 0,
            cursor: 'default',
          }}
        >
          ↔
        </span>
      )}

      {/* Sub-dimension badge */}
      {showSubDimension && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--text-tertiary, #9E9E9E)',
            fontFamily: 'monospace',
            flexShrink: 0,
          }}
        >
          {answer.subDimensionCode}
        </span>
      )}
    </div>
  );
}
