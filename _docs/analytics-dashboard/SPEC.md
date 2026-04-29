# Analytics Dashboard - Specification

An admin dashboard for viewing aggregate, cookie-free Culture Compass usage analytics.

The dashboard visualizes the analytics data that is already collected by the current implementation:
daily aggregate counters, safe route templates, product surfaces, survey lifecycle events, admin
workflow events, results tab usage, report activity, and thresholded organization activity.

---

## Purpose

The analytics dashboard helps CC+C understand how the product is being used without creating
visitor profiles or weakening respondent anonymity.

The dashboard answers:

- Which product areas are being used?
- Are respondents reaching and completing surveys?
- Which admin workflows are active or failing?
- Which results and report surfaces are used after survey completion?
- Which organizations have enough aggregate activity to be reportable?

The dashboard does not answer who did something, how often a specific person returned, where a
respondent came from, or what a respondent answered.

---

## Users

Primary users:

- `ccc_admin`
- `ccc_member`

Non-users:

- Client users
- Respondents
- Anonymous visitors

The dashboard must use the same authorization boundary as `get_analytics_summary`: service role for
backend reads, or authenticated CC+C users for product UI reads.

---

## Non-Goals

- No third-party analytics products.
- No cookies, localStorage visitor IDs, session IDs, fingerprinting, or cross-session tracking.
- No raw IP address, IP hash, user agent, device, location, or browser analytics.
- No raw URL, query string, hash fragment, survey token, deployment token, signed URL, or storage path.
- No survey answer value, question text, open text, search text, or free-form filter text.
- No unique visitors, sessions, returning users, respondent profiles, or per-user attribution.
- No respondent-level funnel. Funnel numbers are aggregate event counts.

---

## Route

Preferred route:

`/analytics`

Access:

- Visible in Tier 1 navigation for CC+C users.
- Blocked for client roles using the existing route guard model.
- The current compact panel on `/clients` may remain as a summary preview and link to `/analytics`.

Fallback for first iteration:

- Keep the dashboard embedded on `/clients` if navigation work is out of scope.
- Use the same components so the embedded view can later move to `/analytics` without changing data
  contracts.

---

## Dashboard Sections

| Section | Purpose | Current Data Available |
|---|---|---|
| Overview | High-level product usage health | Yes |
| Product Navigation | Route and surface usage | Yes |
| Survey Flow | Aggregate respondent lifecycle | Partial |
| Admin Actions | CC+C workflow activity and action outcomes | Partial |
| Results and Reports | Results tab and report activity | Partial |
| Organization Activity | Thresholded client activity | Partial |

`Partial` means the raw aggregate table stores the dimensions, but `get_analytics_summary` should be
extended to expose the exact breakdown needed by the UI.

---

## Key Metrics

### Overview

| Metric | Source | Notes |
|---|---|---|
| Total events | `summary.totalEvents` | All aggregate analytics events in date window |
| Route views | `summary.routeViews` | Count of `route_viewed` events |
| Survey starts | `summary.surveyStarts` | Count of `survey_started` events |
| Survey completions | `summary.surveyCompletions` | Count of `survey_completed` events |
| Report activity | `summary.reportGenerations + summary.reportDownloads` | Combined headline value |
| Active organizations | `summary.activeOrganizations` | Distinct organizations in aggregate rows |
| Active surveys | `summary.activeSurveys` | Distinct surveys in aggregate rows |
| Daily activity | `summary.dailyTotals` | Line or bar chart |

### Product Navigation

| Metric | Source | Notes |
|---|---|---|
| Views by route | `summary.routeViewsByRoute` | Route templates only |
| Activity by surface | `summary.bySurface` | Admin, survey, results, reports, etc. |
| Top route | First item in `routeViewsByRoute` | Already available |

### Survey Flow

| Metric | Event |
|---|---|
| Deployment resolved | `survey_deployment_resolved` |
| Edge state viewed | `survey_edge_state_viewed` |
| Survey started | `survey_started` |
| Survey resumed | `survey_resumed` |
| Progress saved | `survey_progress_saved` |
| Open text submitted | `survey_open_text_submitted` |
| Open text skipped | `survey_open_text_skipped` |
| Survey completed | `survey_completed` |

### Admin Actions

| Metric | Event | Dimension |
|---|---|---|
| Clients selected | `admin_client_selected` | Organization |
| Surveys created | `survey_created` | Organization, survey |
| Config saves | `survey_config_saved` | Action status |
| Publishes | `survey_published` | Action status |
| Unpublishes | `survey_unpublished` | Action status |
| Survey links copied | `survey_link_copied` | Action status |

### Results and Reports

| Metric | Event or Dimension |
|---|---|
| Results tab views | `results_tab_viewed` grouped by `resultsTab` |
| Report generation requests | `report_generation_requested` |
| Report generation outcomes | `report_generation_requested` grouped by `actionStatus` |
| Report downloads | `report_download_requested` |
| Report formats | `reportFormat` |

### Organization Activity

| Metric | Source | Notes |
|---|---|---|
| Top organizations | `summary.topOrganizations` | Already thresholded to minimum reportable count |
| Organization event mix | Extension | Must apply threshold |
| Organization daily activity | Extension | Must apply threshold |
| Organization survey/report activity | Extension | Must apply threshold |

---

## Privacy Rules

The dashboard must display only aggregate analytics returned by authorized RPCs.

Rules:

- Never read `analytics_daily_counts` directly from web code.
- Never expose groups smaller than `minimumReportableCount`.
- Label funnel numbers as event counts, not unique people.
- Use route templates exactly as stored. Do not reconstruct raw URLs.
- Use organization names only when the aggregate count meets the reporting threshold.
- Use empty states for unavailable or unreportable data instead of leaking suppressed counts.

---

## UX Principles

- Quiet, dense, operational layout.
- No marketing hero, oversized intro, or explanatory splash screen.
- Date range controls visible but compact.
- Tabs for major analysis modes.
- Inline unavailable states, not toast notifications.
- Charts must have table equivalents or readable labels for accessibility.
- Do not show controls for dimensions that the implementation cannot truthfully support.

---

## Document Index

| Document | Contents |
|---|---|
| [SCREENS.md](./SCREENS.md) | Layout, tabs, controls, states, and interactions |
| [DATA.md](./DATA.md) | Available data, metric definitions, RPC extensions, privacy constraints |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Route, components, data flow, implementation slices, tests |
