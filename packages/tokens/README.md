# @compass/tokens

Design tokens for the Collective Culture Compass brand: colors, typography, spacing, radii, shadows, and severity levels.

## Public API

### Token Objects

- `colors` — Brand color tokens for the four compass dimensions (core, clarity, connection, collaboration)
- `extendedColors` — Extended compass color palette (navy-teal, gold, mint, sage, blush, rose, etc.)
- `gradient` — Display gradient definition (teal → seafoam → gold) for headlines on dark backgrounds
- `greyscale` — 7-value greyscale palette (50 through 900)
- `textColors` — Semantic text color tokens with light/dark mode variants (AA-compliant)
- `typography` — Font family tokens (display, headings, body — all DM Sans, sans-serif unified)
- `spacing` — Spacing scale based on 8px unit (xs through 4xl)
- `radius` — Border radius tokens (sm through full)
- `shadow` — Box shadow tokens (sm through xl)
- `severity` — Severity level color tokens with border, background, and dark mode variants
- `dimensions` — Dimension metadata mapping dimension keys to labels and brand colors

### Functions

- `injectTokens` — Injects all tokens as CSS custom properties on `:root` (called once at app bootstrap)

### Types

- `SeverityLevel` — Union of severity keys (critical, high, medium, healthy)
- `DimensionKey` — Union of dimension keys (core, clarity, connection, collaboration)

## Key Dependencies

- None (pure TypeScript constants; `injectTokens` uses the DOM API)
