import React from 'react';
import type { QuestionAnswer } from '../data/questions.js';
import { PRESETS } from '../data/presets.js';

export interface ConfigBarProps {
  scaleSize: 4 | 5;
  activePresetId: string | null;
  compareMode: boolean;
  onScaleChange: (scale: 4 | 5) => void;
  onPresetLoad: (answers: QuestionAnswer[], scaleSize: 4 | 5, presetId: string) => void;
  onReset: () => void;
  onCompareToggle: () => void;
}

const pillBase: React.CSSProperties = {
  fontSize: 12,
  padding: '4px 10px',
  borderRadius: 12,
  cursor: 'pointer',
  lineHeight: 1,
};

const pillActive: React.CSSProperties = {
  ...pillBase,
  background: 'var(--grey-900, #212121)',
  color: '#fff',
  border: 'none',
};

const pillInactive: React.CSSProperties = {
  ...pillBase,
  background: 'transparent',
  color: 'var(--text-secondary, #616161)',
  border: '1px solid var(--grey-300, #E0E0E0)',
};

export function ConfigBar({
  scaleSize,
  activePresetId,
  compareMode,
  onScaleChange,
  onPresetLoad,
  onReset,
  onCompareToggle,
}: ConfigBarProps): React.ReactElement {
  function handlePresetChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const id = e.target.value;
    const preset = PRESETS.find((p) => p.id === id);
    if (preset) {
      onPresetLoad(preset.build(), preset.scaleSize, preset.id);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      {/* Scale toggle */}
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          style={scaleSize === 4 ? pillActive : pillInactive}
          onClick={() => onScaleChange(4)}
        >
          4pt
        </button>
        <button
          style={scaleSize === 5 ? pillActive : pillInactive}
          onClick={() => onScaleChange(5)}
        >
          5pt
        </button>
      </div>

      <span style={{ color: 'var(--grey-300, #E0E0E0)', margin: '0 2px' }}>|</span>

      {/* Preset selector */}
      <select
        value={activePresetId ?? ''}
        onChange={handlePresetChange}
        style={{
          fontSize: 12,
          padding: '3px 6px',
          borderRadius: 4,
          border: '1px solid var(--grey-300, #E0E0E0)',
          background: 'var(--surface-card, #fff)',
          color: 'var(--text-primary, #212121)',
          cursor: 'pointer',
        }}
      >
        <option value="">— preset —</option>
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {/* Reset */}
      <button
        style={pillInactive}
        onClick={onReset}
      >
        Reset
      </button>

      {/* Compare toggle */}
      <button
        style={compareMode ? pillActive : pillInactive}
        onClick={onCompareToggle}
      >
        ⇄ Compare
      </button>
    </div>
  );
}
