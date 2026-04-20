/** Brand color tokens for the four compass dimensions. */
export const colors = {
  core: '#0C3D50',
  interactive: '#00385C',
  clarity: '#FF7F50',
  connection: '#9FD7C3',
  collaboration: '#E8B4A8',
} as const;

/** Extended compass color palette. navy-teal aliases interactive — use --color-interactive in code. */
export const extendedColors = {
  'navy-teal': '#00385C',
  gold: '#E8C845',
  mint: '#A1D7BE',
  sage: '#8AC3A9',
  'pale-mint': '#EBF7F2',
  blush: '#F5C4B8',
  rose: '#D4A094',
  highlight: '#FFF5F0',
} as const;

/** Display gradient — teal → seafoam → gold, for large headlines on dark backgrounds. */
export const gradient = {
  'display-text': {
    type: 'linear' as const,
    direction: 'to right',
    stops: ['#5BBFB5', '#A4D4B4', '#E8C845'],
    css: 'linear-gradient(to right, #5BBFB5, #A4D4B4, #E8C845)',
  },
} as const;

/** 8-value greyscale palette. */
export const greyscale = {
  50: '#F5F5F5',
  100: '#E5E4E0',
  300: '#BDBDBD',
  400: '#9E9E9E',
  500: '#757575',
  700: '#424242',
  800: '#303030',
  900: '#212121',
} as const;

/**
 * Semantic text color tokens — AA-compliant on greyscale backgrounds.
 * Light values target --grey-50 (#F5F5F5) backgrounds.
 * Dark values target --grey-50 (#212121) backgrounds in dark mode.
 */
export const textColors = {
  primary: { light: greyscale[900], dark: '#F5F5F5' },
  secondary: { light: greyscale[700], dark: '#BDBDBD' },
  tertiary: { light: '#616161', dark: '#A0A0A0' },
  placeholder: { light: '#757575', dark: '#8A8A8A' },
  disabled: { light: greyscale[400], dark: '#8A8A8A' },
} as const;

/** Typography tokens — DM Sans for all UI; monospace for code/hex values. */
export const typography = {
  display: "'DM Sans', 'Calibri', Arial, sans-serif",
  headings: "'DM Sans', 'Calibri', Arial, sans-serif",
  body: "'DM Sans', 'Calibri', Arial, sans-serif",
  mono: "'Consolas', 'Monaco', ui-monospace, monospace",
} as const;

/** Type scale (px). */
export const typeScale = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  lg: '18px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '30px',
  '4xl': '36px',
  display: '48px',
} as const;

/** Font weight tokens — DM Sans supports 400–900. */
export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  heavy: 800,
} as const;

/** Line height tokens. */
export const lineHeight = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.625,
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

/** Layout tokens — rails, containers, shell dimensions, gaps. */
export const layout = {
  rail: { sm: '380px', md: '400px', lg: '432px' },
  container: { narrow: '760px', survey: '600px', default: '1120px', wide: '1440px' },
  shell: { headerH: '64px', sidebarW: '240px', sidebarCollapsedW: '72px' },
  gap: { sm: '16px', md: '24px', lg: '32px', xl: '40px' },
} as const;

/** Border radius tokens. */
export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
} as const;

/** Box shadow tokens — navy-tinted for lg/xl. */
export const shadow = {
  sm: '0 2px 6px rgba(0, 0, 0, 0.08)',
  md: '0 3px 10px rgba(0, 0, 0, 0.1)',
  lg: '0 4px 20px rgba(12, 61, 80, 0.08)',
  xl: '0 8px 30px rgba(12, 61, 80, 0.12)',
} as const;

/** Severity level color tokens — border, light background, dark background. */
export const severity = {
  critical: { border: '#B71C1C', bg: '#FFEBEE', bgDark: '#3E1111', textDark: '#FF6B6B' },
  high: { border: '#E65100', bg: '#FFF3E0', bgDark: '#3E2200', textDark: '#FF8A65' },
  medium: { border: '#F9A825', bg: '#FFFDE7', bgDark: '#3E3500', textDark: '#F9A825' },
  healthy: { border: '#2E7D32', bg: '#E8F5E9', bgDark: '#1B3E1C', textDark: '#66BB6A' },
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
 * Five canonical compass archetype patterns.
 * Scores are 0–100 per dimension. Used for demos, seed data,
 * and the Recommendations tab narrative.
 */
export const archetypes = {
  'busy-burned': { core: 45, clarity: 40, connection: 55, collaboration: 60 },
  'command-control': { core: 40, clarity: 78, connection: 35, collaboration: 55 },
  'well-intentioned': { core: 75, clarity: 42, connection: 72, collaboration: 55 },
  'over-collaborated': { core: 38, clarity: 35, connection: 50, collaboration: 82 },
  aligned: { core: 82, clarity: 78, connection: 80, collaboration: 76 },
} as const;

/** Archetype key type derived from token keys. */
export type ArchetypeKey = keyof typeof archetypes;

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
    root.style.setProperty(`--severity-${key}-text`, val.border);
  }

  for (const [key, val] of Object.entries(textColors)) {
    root.style.setProperty(`--text-${key}`, val.light);
  }

  root.style.setProperty('--color-core-text', colors.core);
  root.style.setProperty('--track-color', greyscale[100]);
  root.style.setProperty('--surface-card', '#FFFFFF');

  root.style.setProperty('--font-display', typography.display);
  root.style.setProperty('--font-headings', typography.headings);
  root.style.setProperty('--font-body', typography.body);
  root.style.setProperty('--font-mono', typography.mono);

  for (const [key, value] of Object.entries(extendedColors)) {
    root.style.setProperty(`--color-${key}`, value);
  }

  root.style.setProperty('--gradient-display', gradient['display-text'].css);

  // Type scale
  for (const [key, value] of Object.entries(typeScale)) {
    root.style.setProperty(`--text-${key}`, value);
  }

  // Font weights
  for (const [key, value] of Object.entries(fontWeight)) {
    root.style.setProperty(`--fw-${key}`, String(value));
  }

  // Line heights
  for (const [key, value] of Object.entries(lineHeight)) {
    root.style.setProperty(`--lh-${key}`, String(value));
  }

  // Layout — rails
  for (const [key, value] of Object.entries(layout.rail)) {
    root.style.setProperty(`--rail-${key}`, value);
  }

  // Layout — containers
  for (const [key, value] of Object.entries(layout.container)) {
    root.style.setProperty(`--layout-max-${key}`, value);
  }

  // Layout — shell
  root.style.setProperty('--shell-header-h', layout.shell.headerH);
  root.style.setProperty('--shell-sidebar-w', layout.shell.sidebarW);
  root.style.setProperty('--shell-sidebar-collapsed-w', layout.shell.sidebarCollapsedW);

  // Layout — gaps
  for (const [key, value] of Object.entries(layout.gap)) {
    root.style.setProperty(`--layout-gap-${key}`, value);
  }

  // Archetype presets — CSS uses abbreviated names per design system convention
  const archetypeCssNames: Record<string, string> = {
    'busy-burned': 'busy',
    'command-control': 'command',
    'well-intentioned': 'wellint',
    'over-collaborated': 'overcol',
    aligned: 'aligned',
  };

  for (const [name, scores] of Object.entries(archetypes)) {
    const cssName = archetypeCssNames[name] ?? name;
    for (const [dim, score] of Object.entries(scores)) {
      root.style.setProperty(`--archetype-${cssName}-${dim}`, String(score));
    }
  }
}
