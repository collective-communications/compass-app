# Analytics Dashboard - Architecture Spec

## Current Architecture

```
Browser instrumentation
  -> Supabase Edge Function: capture-analytics
    -> RPC: record_analytics_event
      -> Table: analytics_daily_counts
        -> RPC: get_analytics_summary
          -> SDK: getAnalyticsSummary
            -> React Query: useAnalyticsSummary
              -> UI: AnalyticsSummaryPanel
```

The dashboard should keep this boundary. The UI reads summaries only; ingestion and validation stay
in the Edge Function and database RPCs.

---

## Target Route

Add a Tier 1 admin route:

`/analytics`

Suggested files:

| File | Purpose |
|---|---|
| `apps/web/src/features/admin/analytics/pages/analytics-dashboard-page.tsx` | Route-level page |
| `apps/web/src/features/admin/analytics/components/analytics-summary-row.tsx` | Top metrics |
| `apps/web/src/features/admin/analytics/components/analytics-date-range.tsx` | Date controls |
| `apps/web/src/features/admin/analytics/components/analytics-tabs.tsx` | Tab container |
| `apps/web/src/features/admin/analytics/components/overview-tab.tsx` | Overview tab |
| `apps/web/src/features/admin/analytics/components/navigation-tab.tsx` | Navigation tab |
| `apps/web/src/features/admin/analytics/components/survey-flow-tab.tsx` | Survey flow tab |
| `apps/web/src/features/admin/analytics/components/admin-actions-tab.tsx` | Admin actions tab |
| `apps/web/src/features/admin/analytics/components/reports-tab.tsx` | Reports tab |
| `apps/web/src/features/admin/analytics/components/organizations-tab.tsx` | Organizations tab |
| `apps/web/src/features/admin/analytics/lib/labels.ts` | Enum-to-label helpers |
| `apps/web/src/features/admin/analytics/lib/metrics.ts` | Derived metrics |

Keep the current compact `/clients` panel, but move reusable pieces into the files above.

---

## Route Registration

Update:

`apps/web/src/features/admin/routes.tsx`

Requirements:

- Register `/analytics`.
- Guard with existing Tier 1 route permissions.
- Add route permission entry if route-permissions uses explicit path lists.
- Add navigation entry only for CC+C roles.

Tests:

- `ccc_admin` can access `/analytics`.
- `ccc_member` can access `/analytics`.
- Client roles redirect to their home route.

---

## Data Access

Current hook:

`apps/web/src/features/admin/analytics/hooks/use-analytics-summary.ts`

Required change:

- Accept date range parameters.
- Include date range in query key.
- Keep stale time consistent with existing query config.

Suggested API:

```ts
interface UseAnalyticsSummaryParams {
  startDate: string;
  endDate: string;
}

function useAnalyticsSummary(
  params: UseAnalyticsSummaryParams,
): UseQueryResult<AnalyticsSummary>;
```

SDK API already supports:

```ts
getAnalyticsSummary({
  startDate,
  endDate,
});
```

---

## Component Responsibilities

### AnalyticsDashboardPage

Owns:

- Date range state
- Active tab state
- Query invocation
- Page-level loading, empty, and unavailable states

Does not own:

- RPC mapping
- Event label formatting
- Chart math

### AnalyticsSummaryRow

Displays:

- Total events
- Route views
- Survey starts
- Completions
- Reports
- Active organizations

Inputs:

- `AnalyticsSummary`

### AnalyticsDateRange

Displays:

- Preset select
- Start date input
- End date input
- Inline validation

Outputs:

- Valid date range

Rules:

- No toast.
- No modal.
- No fetch while invalid.

### Tab Components

Each tab receives:

```ts
interface AnalyticsTabProps {
  summary: AnalyticsSummary;
}
```

Tabs must not fetch independently in v1. One summary query keeps the dashboard predictable.

---

## Charting

Preferred first implementation:

- CSS bars and lightweight SVG line/bar charts built in React.
- No new charting dependency unless interaction requirements exceed simple charts.

Reasons:

- Current data shape is small.
- Accessibility and responsive behavior are easier to control.
- Avoids adding a large dependency for a small dashboard.

If a charting dependency is introduced later, it must support:

- Server-safe rendering in Vite.
- Keyboard and screen-reader accessible labels.
- Deterministic tests.
- No telemetry.

---

## RPC Extension Slice

The current RPC supports the first dashboard version. A fuller version should extend
`get_analytics_summary` in a separate migration.

Add grouped outputs:

- `actionStatuses`
- `reportFormats`
- `byRole`
- `byTier`
- `organizationEvents`
- `surveyEvents`

Update:

- `packages/types/src/analytics.ts`
- `packages/types/src/analytics.test.ts`
- `packages/types/src/database.types.ts`
- `packages/sdk/src/admin/analytics.ts`
- `packages/sdk/src/admin/analytics.test.ts`
- `supabase/tests/security_cookie_free_analytics.sql`

Rules:

- Keep raw table inaccessible to authenticated users.
- Keep organization and survey breakdowns thresholded.
- Keep raw URLs, user IDs, answers, open text, IP, and user agent impossible to return.

---

## Implementation Slices

### Slice 1: Dashboard Route and Current Summary View

Deliver:

- `/analytics` route.
- Date controls.
- Summary row.
- Overview, Navigation, Survey Flow, Reports, and Organizations tabs using current RPC fields.
- `/clients` panel links to `/analytics`.

Verification:

- Route permission tests.
- Component tests for empty, loading, invalid date, and unavailable states.
- Typecheck.

### Slice 2: RPC Summary Extensions

Deliver:

- Add action status, report format, role, tier, organization event, and survey event arrays.
- Preserve thresholding.
- Update SDK and shared types.

Verification:

- pgTAP for authorization and thresholding.
- Unit tests for SDK mapping.
- Typecheck.

### Slice 3: Full Tab Visualizations

Deliver:

- Admin Actions tab with action outcomes.
- Reports tab with format and status breakdown.
- Organization tab with thresholded event mix.
- Accessible chart/table pairs.

Verification:

- Component tests for labels, zero states, threshold text, and responsive rendering.
- Accessibility checks for chart labels and tab navigation.

---

## Testing Strategy

Unit tests:

- Label helpers map every analytics enum.
- Derived metrics handle missing rows and zero denominators.
- Date range validation blocks invalid ranges.
- Hook passes correct RPC dates.

Component tests:

- Dashboard renders current summary fields.
- Empty state renders when all counts are zero.
- Unavailable state renders on query error.
- Tabs render expected rows from fixture data.

Database tests:

- `get_analytics_summary` denies non-CC+C users.
- Direct table reads remain denied.
- Thresholded organization and survey rows do not leak small groups.
- No raw analytics event table exists.

Privacy regression tests:

- Dashboard code does not import the analytics table directly.
- Dashboard code does not reference forbidden fields such as `userId`, `email`, `ip`, `userAgent`,
  `openText`, `answer`, `token`, `url`, or `signedUrl`.

---

## Rollout

Before enabling `/analytics` in production:

- Run app/package tests.
- Run typecheck.
- Run pgTAP against a disposable Supabase database.
- Confirm CSP still blocks third-party analytics domains.
- Confirm no new cookie, storage, IP, user-agent, or raw URL reads were introduced.
