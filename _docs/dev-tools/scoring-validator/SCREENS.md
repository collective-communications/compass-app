# Scoring Validator — Screen Spec

## Layout

Two-column layout. Left column (380px fixed, scrollable): Config Bar + Answer Input. Right column (flex, scrollable): Compass Preview + tabbed output area.

```
┌────────────────────────┬────────────────────────────────────────────┐
│ CONFIG BAR             │  COMPASS PREVIEW                           │
│ [4pt] [5pt]            │  ┌──────────┐  CORE        82.00% healthy  │
│ [Preset ▾]  [Reset]    │  │          │  CLARITY     77.50%           │
│ [⇄ Compare]            │  │  Compass │  CONNECTION  68.25%           │
├────────────────────────┤  │   SVG    │  COLLAB.     71.00%           │
│ ANSWER INPUT           │  └──────────┘                              │
│                        ├────────────────────────────────────────────┤
│ ▼ ● CORE    82.00%     │  Scores  Archetypes  Risk Flags  Trust      │
│   Q1  ──●────  3  ↔ ✕ │  Ladder  Compare*                          │
│   Q2  ────●──  4      │                                            │
│   Q13 ─●────── 2  ↔  │  [tab content]                             │
│   ...                  │                                            │
│                        │                                            │
│ ▼ ○ CLARITY  77.50%   │                                            │
│   Q14 ─●────── 2  ↔  │                                            │
│   ...                  │                                            │
│                        │                                            │
│ ▷ CONNECTION  68.25%   │                                            │
│ ▷ COLLAB.    71.00%   │                                            │
└────────────────────────┴────────────────────────────────────────────┘
```

`*` Compare tab visible only when Compare mode is active.

---

## Panel A: Config Bar

Fixed at the top of the left column. Always visible.

### Scale Toggle

Pill button pair: **4-point** | **5-point**

- Active pill: dark fill (`var(--grey-900)`) with white text
- Inactive: text only
- On switch: slider `max` updates to new scaleSize; values are clamped (`Math.min(currentValue, newMax)`); all scores recalculate
- Does NOT reset slider values unless clamping is required

### Preset Selector

Dropdown (native `<select>` or custom) showing 8 named presets:

1. Healthy Org
2. Broken Core
3. Fragile Core
4. Disconnected
5. Clarity-Driven
6. Connection-Driven
7. Collaboration-Driven
8. Scale Parity

Selecting a preset loads that scenario's answer values into all sliders and sets `scaleSize` as defined by the preset. After loading, the selector shows the preset name until any slider is manually changed, at which point it resets to `— custom —`.

### Reset Button

Returns all sliders to the scale midpoint:
- 4-point: midpoint = 2 (lower mid, `Math.floor((1 + 4) / 2)`)
- 5-point: midpoint = 3

Does not change `scaleSize`.

### Compare Toggle

Button labeled `⇄ Compare`. Activates Compare mode:
- Adds a second answer input column (Scenario B) to the left panel
- Enables the Compare tab in the right panel
- Scenario A = current slider state; Scenario B starts as a copy of Scenario A

---

## Panel B: Answer Input

Scrollable list below the Config Bar. Questions grouped into four collapsible dimension sections.

### Dimension Section Header

```
▼ ● CORE    82.00%
```

- Expand/collapse chevron (`▼` / `▷`)
- Color swatch circle (dimension color: Core=#0C3D50, Clarity=#FF7F50, Connection=#9FD7C3, Collaboration=#E8B4A8)
- Dimension name
- Live aggregate score for that dimension (updates as sliders change)
- **Sub-dimension toggle** (small icon button in header row): when active, questions are grouped under sub-dimension labels with each sub-dimension's aggregate score shown

Default state: all four dimension sections expanded.

### Question Row

```
Q1  I feel comfortable admitting mistakes...  ──●──  3
```

| Element | Detail |
|---|---|
| Question ID | `Q1`–`Q55`, monospace, muted color |
| Question text | Truncated at 60 chars; full text in `title` attribute (native tooltip on hover) |
| Slider | `<input type="range">`, `min=1`, `max=scaleSize`, `step=1` |
| Value badge | Integer 1–N displayed right of slider |
| `↔` indicator | Shown when `reverseScored: true`; on hover shows normalized value (e.g., `"↔ → 4"`) |

Value badge background reflects the value:
- Low (1–2): `var(--severity-high-bg)` tint
- Mid: neutral
- High (N–N-1): `var(--color-core)` tint (applies to all dimensions for simplicity)

### Sub-Dimension View

When enabled via the toggle in the dimension header, questions are grouped under their `subDimensionCode` label:

```
▼ ● CORE    82.00%
  psychological_safety  85.00%
    Q1  ──●──  3
    Q2  ────●  4
  trust  78.33%
    Q3  ──●──  3
    ...
```

Each sub-dimension label shows its aggregate score. Collapsible independently.

---

## Panel C: Compass Preview

Top of the right column. Always visible.

```
┌──────────────────────────────────────────────────────────────────┐
│   ┌──────────┐    CORE          82.00%   [healthy]               │
│   │          │    CLARITY       77.50%                           │
│   │ <Compass>│    CONNECTION    68.25%                           │
│   │  280px   │    COLLABORATION 71.00%                           │
│   └──────────┘                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Compass Component Props

```tsx
<Compass
  scores={compassScores}   // DimensionScore[] — see ARCHITECTURE.md for mapping
  size={280}
  animated={false}         // no entry animation during live editing
  showLabels={true}
  showGapIndicator={true}
/>
```

`animated={false}` is intentional: animations triggered on every slider change would be distracting and laggy.

### Dimension Score Cards

Four cards laid out in a 2×2 grid or single column (responsive). Each card:
- Dimension name (label from tokens)
- Score percentage: `82.00%` (2 decimal places)
- Health badge on Core card only: `healthy` / `fragile` / `broken`
  - healthy → `var(--severity-healthy-text)` / green
  - fragile → `var(--severity-medium-text)` / amber
  - broken → `var(--severity-critical-text)` / red

---

## Tab: Scores

Full breakdown of every number the pipeline produces.

### Dimension Table

| Dimension | Raw Score (1–N) | Score (%) | Response Count |
|---|---|---|---|
| Core | 3.08 | 69.33% | 13 |
| Clarity | 3.25 | 75.00% | 14 |
| Connection | 2.94 | 64.67% | 16 |
| Collaboration | 3.17 | 72.22% | 12 |

Dimension rows in bold. Clicking a dimension row expands its sub-dimension rows (indented, lighter weight):

| &nbsp;&nbsp;Sub-dimension | Raw Score | Score (%) | Count |
|---|---|---|---|
| &nbsp;&nbsp;psychological_safety | 3.50 | 83.33% | 2 |
| &nbsp;&nbsp;trust | 3.00 | 66.67% | 3 |
| &nbsp;&nbsp;... | | | |

### Formula Footnote

```
score = ((rawScore − 1) / (scaleSize − 1)) × 100
```

Shown below table in muted text.

---

## Tab: Archetypes

### Matched Archetype Card

Top of panel. Shows the winning archetype:

```
┌─────────────────────────────────────────────┐
│  Connection-Driven             [MODERATE]   │
│  Deep interpersonal bonds and belonging,    │
│  sometimes at the expense of structure.     │
│  Distance: 18.7                             │
└─────────────────────────────────────────────┘
```

Confidence badge colors:
- `STRONG` (dist < 15): green
- `MODERATE` (15 ≤ dist < 25): amber
- `WEAK` (dist ≥ 25): muted/grey

### Distance Table

All 6 archetypes, sorted by distance (closest first). Winning row highlighted.

| Archetype | Core | Clarity | Connection | Collaboration | Distance | Confidence |
|---|---|---|---|---|---|---|
| **Connection-Driven** ✓ | 70 | 60 | 90 | 65 | 18.7 | MODERATE |
| Balanced | 80 | 80 | 80 | 80 | 22.4 | MODERATE |
| Collaboration-Driven | 70 | 65 | 65 | 90 | 26.1 | WEAK |
| Core-Fragile | 40 | 65 | 65 | 65 | 38.5 | WEAK |
| Clarity-Driven | 70 | 90 | 60 | 65 | 41.2 | WEAK |
| Disconnected | 35 | 35 | 35 | 35 | 89.4 | WEAK |

Threshold reference lines labeled in the header:
- `◆ STRONG < 15` and `◆ MODERATE < 25` shown as annotations above/below the table.

---

## Tab: Risk Flags

### Active Flag Cards

Each active flag is a card with a left border colored by severity:
- critical: `var(--severity-critical-border)` (red)
- high: `var(--severity-high-border)` (orange)
- medium: `var(--severity-medium-border)` (yellow)

Card content:
```
┌│─────────────────────────────────────────────┐
 │  ● CORE                    [CRITICAL]
 │  Score: 43.33%
 │  Core foundation is broken — address before other dimensions
 │  Threshold: coreCritical = 50 (6.7 points above threshold)
└──────────────────────────────────────────────┘
```

Healthy dimensions shown as a single collapsed line: `Connection — healthy (no flags)`.

### Threshold Panel

Below the flag cards. Editable number inputs for all three thresholds:

| Threshold | Default | Input |
|---|---|---|
| Core critical below | 50 | `[50]` |
| Any dimension high below | 40 | `[40]` |
| Core medium below | 70 | `[70]` |

Changes take effect immediately; flags re-evaluate on every keystroke.

---

## Tab: Trust Ladder

Vertical list of 9 rungs from bottom (rung 1) to top (rung 9), or top-to-bottom with rung 9 at top — matches reading order: "what's the highest we've achieved?"

Each rung row:

```
9  Career / Growth       [collaboration]    ○ not_started    —
8  Processes & Platforms [collaboration]    ⟳ in_progress   2.67
7  Team Members          [connection]       ✓ achieved       3.20
6  Relationship          [connection]       ✓ achieved       3.40    ← current level
5  Role Clarification    [clarity]          ✓ achieved       3.10
...
```

Columns: rung number, name, dimension badge, status icon + label, raw score (1–N, 2 decimals).

Below the ladder:
- **Current Level:** `Level 6 — Relationship`
- **Next Actions:** list of first 1–2 unachieved rung names above current level

Status icon colors match severity system: achieved=green, in_progress=amber, not_started=grey.

---

## Tab: Compare

Visible only when Compare mode is active (Config Bar `⇄ Compare` toggle).

### Three-Column Layout

```
┌─────────────────┬────────┬─────────────────┐
│  SCENARIO A     │  DELTA │  SCENARIO B      │
├─────────────────┼────────┼─────────────────┤
│  Archetype      │        │  Archetype       │
│  Connection-D.  │   ——   │  Clarity-Driven  │
│  MODERATE 18.7  │        │  STRONG 11.2     │
├─────────────────┼────────┼─────────────────┤
│  Core Health    │        │  Core Health     │
│  healthy        │   ——   │  fragile         │
├─────────────────┼────────┼─────────────────┤
│  CORE   82.00%  │ −14.5% │  CORE   67.50%  │
│  CLARITY 77.50% │ +12.5% │  CLARITY 90.00%  │
│  CONNECTION...  │        │  ...             │
└─────────────────┴────────┴─────────────────┘
```

Delta column:
- Positive delta (B > A): green `+X.XX%`
- Negative delta (B < A): red `−X.XX%`
- No change: grey `—`

Dimension rows are expandable to show sub-dimension deltas.

Scenario B has its own independent slider set (Answer Input in left panel gets a second column when Compare mode is active). Scenario B preset selector appears inline with the B column header.

---

## Empty / Error States

| Situation | Display |
|---|---|
| Dimension has 0 answers (impossible with fixture) | Dimension score shows `—` |
| All sliders at 1 (non-reversed) = all scores 0% | Compass renders all segments at minimum; Archetypes shows Disconnected at lowest distance |
| Trust ladder all not_started | Current Level: `Level 0 — None`; Next Actions: Purpose, Values |
| Scale toggle to 5pt with values > 4 | Values auto-clamped; banner: `2 values clamped to 5` |
