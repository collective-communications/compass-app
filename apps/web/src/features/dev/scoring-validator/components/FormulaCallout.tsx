/**
 * FormulaCallout — collapsible inline formula explanation for the Scoring Validator.
 *
 * Renders a small "ƒ Formula" toggle pill. Clicking it expands a card showing
 * the formulas and plain-English explanations relevant to the current tab.
 */

import React, { useState } from 'react';

export interface FormulaCalloutProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/** Collapsible formula card. Collapsed by default. */
export function FormulaCallout({
  children,
  defaultOpen = false,
}: FormulaCalloutProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      {/* Toggle pill */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: 'transparent',
          border: '1px solid var(--grey-200, #E5E4E0)',
          borderRadius: 12,
          cursor: 'pointer',
          fontSize: 12,
          color: 'var(--text-tertiary, #757575)',
          fontFamily: 'monospace',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 14 }}>ƒ</span>
        <span>Formula</span>
        <span style={{ fontSize: 9 }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Expanded content */}
      {open && (
        <div
          style={{
            marginTop: 10,
            background: 'var(--surface-card, #FFFFFF)',
            border: '1px solid var(--grey-200, #E5E4E0)',
            borderRadius: 8,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared primitives used across formula content
// ---------------------------------------------------------------------------

/** Section heading inside a FormulaCallout card. */
export function FormulaSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary, #757575)',
        }}
      >
        {title}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  );
}

/** A single formula row: left-aligned expression + right-aligned note. */
export function FormulaRow({
  expr,
  note,
}: {
  expr: React.ReactNode;
  note?: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <code
        style={{
          fontSize: 12,
          fontFamily: 'monospace',
          color: 'var(--text-primary, #212121)',
          background: 'var(--grey-50, #F5F5F5)',
          padding: '2px 8px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}
      >
        {expr}
      </code>
      {note && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-secondary, #616161)',
            lineHeight: 1.5,
          }}
        >
          {note}
        </span>
      )}
    </div>
  );
}

/** Separator between formula sections. */
export function FormulaDivider(): React.ReactElement {
  return (
    <div
      style={{
        height: 1,
        background: 'var(--grey-100, #F5F5F5)',
        margin: '2px 0',
      }}
    />
  );
}
