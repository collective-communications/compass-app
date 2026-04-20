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
- `typeScale` — px-based type scale (xs through display), mapped to rem units (0.65rem–3rem)
- `fontWeight` — Weight tokens for DM Sans (regular, medium, semibold, bold, heavy)
- `lineHeight` — Line height tokens (tight, normal, relaxed) for setting vertical rhythm
- `layout` — Rail widths, container max-widths (survey constrained to 600px), shell dimensions (header/footer heights), and gaps between components
- `spacing` — Spacing scale based on 8px unit (xs through 4xl)
- `radius` — Border radius tokens (sm through full)
- `shadow` — Box shadow tokens (sm through xl)
- `severity` — Severity level color tokens with border, background, and dark mode variants
- `dimensions` — Dimension metadata mapping dimension keys to labels and brand colors
- `archetypes` — Five canonical compass score profiles (busy-burned, command-control, well-intentioned, over-collaborated, aligned)

### Functions

- `injectTokens` — Injects all tokens as CSS custom properties on `:root` (called once at app bootstrap)

### Types

- `SeverityLevel` — Union of severity keys (critical, high, medium, healthy)
- `DimensionKey` — Union of dimension keys (core, clarity, connection, collaboration)
- `ArchetypeKey` — Union of archetype keys (busy-burned, command-control, well-intentioned, over-collaborated, aligned)

### Breaking Changes (Phase 4G)

- `dark-teal` removed from `extendedColors` — use `--color-interactive` instead
- `grey-200` removed from `greyscale` — consolidated into 7-value palette (50, 100, 200, 300, 600, 800, 900)

## Key Dependencies

- None (pure TypeScript constants; `injectTokens` uses the DOM API)
