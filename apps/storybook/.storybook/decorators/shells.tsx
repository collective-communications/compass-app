import type { Decorator } from '@storybook/react-vite';
import React from 'react';

/* -------------------------------------------------------------------------- */
/*  Shared styles                                                             */
/* -------------------------------------------------------------------------- */

const headerBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 24px',
  borderBottom: '1px solid var(--grey-100)',
  backgroundColor: 'var(--surface-card)',
  fontFamily: 'var(--font-body)',
};

const footerBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 24px',
  borderTop: '1px solid var(--grey-100)',
  backgroundColor: 'var(--surface-card)',
  fontFamily: 'var(--font-body)',
  fontSize: '13px',
  color: 'var(--text-secondary, #424242)',
};

const shellContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100%',
  backgroundColor: 'var(--grey-50)',
  fontFamily: 'var(--font-body)',
};

/* -------------------------------------------------------------------------- */
/*  PublicShellDecorator                                                       */
/*  Header: CC+C logo text, no footer, full-width content                     */
/* -------------------------------------------------------------------------- */

export const PublicShellDecorator: Decorator = (Story) => (
  <div style={shellContainer}>
    <header style={{ ...headerBase, justifyContent: 'flex-start' }}>
      <span
        style={{
          fontFamily: 'var(--font-headings)',
          fontSize: '16px',
          fontWeight: 400,
          color: 'var(--color-core)',
          letterSpacing: '0.02em',
        }}
      >
        <strong style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          COLLECTIVE
        </strong>{' '}
        culture + communication
      </span>
    </header>

    <main style={{ flex: 1, padding: '24px' }}>
      <Story />
    </main>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  SurveyShellDecorator                                                      */
/*  Header: client logo placeholder + org name. Centered 600px content.       */
/*  Footer: Help + Theme. No user identity (structural anonymity).            */
/* -------------------------------------------------------------------------- */

export const SurveyShellDecorator: Decorator = (Story) => (
  <div style={shellContainer}>
    <header style={headerBase}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Placeholder client logo */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            backgroundColor: 'var(--grey-300)',
          }}
        />
        <span
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: 'var(--grey-700)',
          }}
        >
          Organization Name
        </span>
      </div>
    </header>

    <main
      style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <Story />
      </div>
    </main>

    <footer style={footerBase}>
      <span style={{ cursor: 'pointer' }}>Help</span>
      <span style={{ cursor: 'pointer' }}>Theme</span>
    </footer>
  </div>
);

/* -------------------------------------------------------------------------- */
/*  AppShellDecorator                                                         */
/*  Header: CC+C logo + avatar. Pill nav bar. Full-width content.             */
/*  Footer: simplified bottom tab bar.                                        */
/* -------------------------------------------------------------------------- */

const pillNavItems = ['Dashboard', 'Results', 'Reports'] as const;
const activePill = 'Dashboard';

const pillStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '6px 16px',
  borderRadius: '9999px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'default',
  backgroundColor: isActive ? 'var(--grey-700)' : 'transparent',
  color: isActive ? '#ffffff' : 'var(--text-secondary, #424242)',
  border: 'none',
  fontFamily: 'var(--font-body)',
});

export const AppShellDecorator: Decorator = (Story) => (
  <div style={shellContainer}>
    {/* Header */}
    <header style={headerBase}>
      <span
        style={{
          fontFamily: 'var(--font-headings)',
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--color-core)',
        }}
      >
        <strong style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          COLLECTIVE
        </strong>{' '}
        c+c
      </span>

      {/* Avatar placeholder */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'var(--grey-300)',
        }}
      />
    </header>

    {/* Pill navigation bar */}
    <nav
      aria-label="Main navigation"
      style={{
        display: 'flex',
        gap: '8px',
        padding: '8px 24px',
        borderBottom: '1px solid var(--grey-100)',
        backgroundColor: 'var(--surface-card)',
      }}
    >
      {pillNavItems.map((item) => (
        <span key={item} style={pillStyle(item === activePill)}>
          {item}
        </span>
      ))}
    </nav>

    {/* Content */}
    <main style={{ flex: 1, padding: '24px' }}>
      <Story />
    </main>

    {/* Simplified bottom tab bar */}
    <footer
      style={{
        ...footerBase,
        justifyContent: 'space-around',
        padding: '10px 24px',
      }}
    >
      {['Home', 'Results', 'Reports', 'Settings'].map((tab) => (
        <span
          key={tab}
          style={{
            fontSize: '11px',
            color: tab === 'Home' ? 'var(--color-core)' : 'var(--text-secondary, #424242)',
            fontWeight: tab === 'Home' ? 600 : 400,
            textAlign: 'center',
          }}
        >
          {tab}
        </span>
      ))}
    </footer>
  </div>
);
