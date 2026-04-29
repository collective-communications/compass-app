# Analytics Dashboard - Screen Spec

## Layout

Single-page admin dashboard with a compact header, date range controls, summary metrics, and tabs.

```
+--------------------------------------------------------------------+
| Analytics                                      [Last 30 days]      |
| Aggregate usage, no visitor tracking          [Start] [End]       |
+--------------------------------------------------------------------+
| Events   Route Views   Starts   Completions   Reports   Orgs      |
+--------------------------------------------------------------------+
| Overview | Navigation | Survey Flow | Admin Actions | Reports      |
+--------------------------------------------------------------------+
| Tab content                                                        |
|                                                                    |
+--------------------------------------------------------------------+
```

Route:

`/analytics`

Access:

- CC+C roles only.
- Uses existing app shell and Tier 1 navigation.

---

## Header

### Title

`Analytics`

### Supporting Text

Short text under title:

`Aggregate usage, no visitor tracking`

This text is acceptable because it clarifies a privacy boundary. Do not add a long explanation or
feature tutorial in the dashboard itself.

### Date Controls

Controls:

- Preset select: `Last 7 days`, `Last 30 days`, `Last 90 days`, `Custom`
- Start date input
- End date input

Behavior:

- Default preset is `Last 30 days`.
- Selecting a preset updates start and end dates immediately.
- Choosing a custom date updates the preset label to `Custom`.
- Invalid range disables data fetch and shows inline validation near the date controls.
- No modal confirmation.
- No toast.

---

## Summary Row

Six compact metric blocks.

| Block | Value |
|---|---|
| Events | `totalEvents` |
| Route Views | `routeViews` |
| Survey Starts | `surveyStarts` |
| Completions | `surveyCompletions` |
| Reports | `reportGenerations + reportDownloads` |
| Active Orgs | `activeOrganizations` |

Each block includes:

- Icon
- Label
- Tabular numeric value
- Optional small delta only after a comparison-window RPC exists

Do not calculate percent conversion from unique users. The current model stores event counts, not
person counts.

---

## Tabs

Tabs:

1. Overview
2. Navigation
3. Survey Flow
4. Admin Actions
5. Reports
6. Organizations

Tab content should preserve the selected date range and cached query data.

---

## Tab: Overview

Purpose: Show product activity at a glance.

Panels:

| Panel | Content |
|---|---|
| Daily Activity | Bar or line chart from `dailyTotals` |
| Event Mix | Horizontal bars from `byEvent` |
| Surface Mix | Horizontal bars from `bySurface` |
| Top Route | Single highlighted route from `routeViewsByRoute[0]` |

Daily Activity:

- X-axis: date
- Y-axis: event count
- Empty dates should render as zero if the client normalizes the range
- Table fallback below chart for screen readers and narrow layouts

Event Mix:

- Show event name labels as readable product labels, not raw snake case.
- Keep raw event name in accessible text or tooltip for diagnostics.

---

## Tab: Navigation

Purpose: Show which product surfaces and route templates receive attention.

Panels:

| Panel | Content |
|---|---|
| Route Views | Ranked table from `routeViewsByRoute` |
| Surface Usage | Bars or table from `bySurface` |
| Admin vs Respondent Split | Derived from `bySurface` |

Route Views Table:

| Column | Source |
|---|---|
| Route | `routeTemplate` |
| Surface | Derived from route template or extension field |
| Views | `count` |

Rules:

- Route labels must be route templates, never raw browser paths.
- `/s/$token` is safe to show because it is a template.
- Do not link route rows to raw URLs.

---

## Tab: Survey Flow

Purpose: Show aggregate survey lifecycle health.

Primary visualization:

```
Resolved -> Started -> Saved/Resumed -> Open Text -> Completed
```

Use counts from `byEvent`:

| Step | Event |
|---|---|
| Resolved | `survey_deployment_resolved` |
| Started | `survey_started` |
| Resumed | `survey_resumed` |
| Progress Saved | `survey_progress_saved` |
| Open Text Submitted | `survey_open_text_submitted` |
| Open Text Skipped | `survey_open_text_skipped` |
| Completed | `survey_completed` |

Secondary panel:

`surveyResolutionStatuses`

Rows:

- valid
- not found
- closed
- expired
- not yet open
- already completed
- error

Rules:

- Label as aggregate event counts.
- Do not call this a unique respondent funnel.
- Do not show answer, question, token, invitee, or free-text dimensions.

---

## Tab: Admin Actions

Purpose: Show operational work performed by CC+C users and where failures occur.

Panels:

| Panel | Content |
|---|---|
| Workflow Counts | Counts for client select, survey create, config save, publish, unpublish, link copy |
| Action Outcomes | Requested/succeeded/failed/canceled by action |
| Activity by Organization | Thresholded top organizations |

Action Outcomes needs an RPC extension that groups by:

- `event_name`
- `action_status`

Display:

- Use stacked bars for action status.
- Failed statuses are visible but not alarming.
- Empty failed counts should render as zero, not hide the row.

---

## Tab: Reports

Purpose: Show which reporting and results surfaces are used after surveys.

Panels:

| Panel | Content |
|---|---|
| Results Tab Usage | `resultsTabs` |
| Report Generation | `report_generation_requested` by action status |
| Report Downloads | `report_download_requested` |
| Report Formats | `reportFormat` extension |

Results Tab Usage:

- Use readable labels: Compass, Survey, Groups, Dialogue, Reports, Recommendations, History.
- Include count.
- Sort descending by count.

Report Generation:

- Requested, succeeded, failed, canceled.
- For failures, show count only. Do not expose error messages in analytics.

---

## Tab: Organizations

Purpose: Show which client organizations have reportable aggregate activity.

Primary table:

| Column | Source |
|---|---|
| Organization | `organizationName` |
| Events | `count` |

Optional later columns:

- Route views
- Survey starts
- Survey completions
- Report activity

Rules:

- Only show organizations returned by the RPC.
- Suppressed organizations should not appear with hidden names or exact counts.
- Include small text: `Organizations appear after at least 5 aggregate events.`

---

## Loading, Empty, and Error States

### Loading

- Skeleton metric blocks and chart/table placeholders.
- Keep tab headers visible.

### Empty

Text:

`No aggregate analytics recorded for this date range.`

No setup instructions in the empty state unless the dashboard is in development mode.

### Unavailable

Text:

`Usage analytics unavailable.`

Common causes can be logged for developers, but the UI should remain calm.

### Invalid Date Range

Text near controls:

`Start date must be on or before end date.`

Disable fetch until valid.

---

## Responsive Behavior

Desktop:

- Summary metrics in a six-column grid.
- Tab content may use two columns where useful.

Tablet:

- Summary metrics in three columns.
- Charts above tables.

Mobile:

- Summary metrics in one or two columns.
- Tabs remain horizontally scrollable with visible active state.
- Tables may switch to compact stacked rows.
