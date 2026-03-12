/** Brand color tokens for the four compass dimensions. */
export const colors = {
  core: '#0A3B4F',
  clarity: '#FF7F50',
  connection: '#9FD7C3',
  collaboration: '#E8B4A8',
} as const;

/** Extended compass color palette. */
export const extendedColors = {
  'navy-teal': '#00385C',
  'dark-teal': '#0D385C',
  mint: '#A1D7BE',
  sage: '#8AC3A9',
  'pale-mint': '#EBF7F2',
  blush: '#F5C4B8',
  rose: '#D4A094',
  highlight: '#FFF5F0',
} as const;

/** 7-value greyscale palette. */
export const greyscale = {
  50: '#F5F5F5',
  100: '#E5E4E0',
  300: '#BDBDBD',
  400: '#9E9E9E',
  500: '#757575',
  700: '#424242',
  900: '#212121',
} as const;

/** Typography tokens. */
export const typography = {
  headings: "'DM Serif Display', serif",
  body: "'DM Sans', sans-serif",
} as const;

/** Spacing scale based on 8px unit. */
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
} as const;

/** Border radius tokens. */
export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

/** Box shadow tokens. */
export const shadow = {
  sm: '0 2px 6px rgba(0, 0, 0, 0.08)',
  md: '0 3px 10px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 20px rgba(10, 59, 79, 0.08)',
  xl: '0 8px 30px rgba(10, 59, 79, 0.12)',
} as const;

/** Severity level color tokens — border, light background, dark background. */
export const severity = {
  critical: { border: '#B71C1C', bg: '#FFEBEE', bgDark: '#3E1111' },
  high: { border: '#E65100', bg: '#FFF3E0', bgDark: '#3E2200' },
  medium: { border: '#F9A825', bg: '#FFFDE7', bgDark: '#3E3500' },
  healthy: { border: '#2E7D32', bg: '#E8F5E9', bgDark: '#1B3E1C' },
} as const;

/** Severity level type derived from token keys. */
export type SeverityLevel = keyof typeof severity;

/** Dimension metadata — label and brand color for each compass dimension. */
export const dimensions = {
  core: { label: 'Core', color: colors.core },
  clarity: { label: 'Clarity', color: colors.clarity },
  connection: { label: 'Connection', color: colors.connection },
  collaboration: { label: 'Collaboration', color: colors.collaboration },
} as const;

/** Dimension key type derived from token keys. */
export type DimensionKey = keyof typeof dimensions;

/**
 * Injects CSS custom properties into :root.
 * Called once at app bootstrap.
 */
export function injectTokens(): void {
  const root = document.documentElement;

  for (const [key, value] of Object.entries(colors)) {
    root.style.setProperty(`--color-${key}`, value);
  }

  for (const [key, value] of Object.entries(greyscale)) {
    root.style.setProperty(`--grey-${key}`, value);
  }

  for (const [key, val] of Object.entries(severity)) {
    root.style.setProperty(`--severity-${key}-border`, val.border);
    root.style.setProperty(`--severity-${key}-bg`, val.bg);
  }

  root.style.setProperty('--track-color', greyscale[100]);
  root.style.setProperty('--surface-card', '#FFFFFF');

  root.style.setProperty('--font-headings', typography.headings);
  root.style.setProperty('--font-body', typography.body);
}
