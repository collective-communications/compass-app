# Analytics Dashboard - Data Spec

## Current Data Boundary

The dashboard reads only from:

`public.get_analytics_summary(p_start_date date, p_end_date date)`

The web app must not read:

- `public.analytics_daily_counts`
- raw auth/session tables for analytics enrichment
- response answers or open text
- cookies, localStorage, sessionStorage, IP, user agent, or full URLs

---

## Current Summary Shape

Source TypeScript contract:

`packages/types/src/analytics.ts`

```ts
interface AnalyticsSummary {
  startDate: string;
  endDate: string;
  minimumReportableCount: number;
  totalEvents: number;
  routeViews: number;
  surveyStarts: number;
  surveyCompletions: number;
  reportGenerations: number;
  reportDownloads: number;
  activeOrganizations: number;
  activeSurveys: number;
  byEvent: AnalyticsEventCount[];
  bySurface: AnalyticsSurfaceCount[];
  routeViewsByRoute: AnalyticsRouteCount[];
  resultsTabs: AnalyticsResultsTabCount[];
  surveyResolutionStatuses: AnalyticsSurveyResolutionStatusCount[];
  topOrganizations: AnalyticsOrganizationCount[];
  dailyTotals: AnalyticsDailyTotal[];
}
```

---

## Event Names

Current event names:

| Event | Dashboard Use |
|---|---|
| `route_viewed` | Navigation, overview |
| `survey_deployment_resolved` | Survey Flow |
| `survey_edge_state_viewed` | Survey Flow |
| `survey_started` | Survey Flow, overview |
| `survey_resumed` | Survey Flow |
| `survey_progress_saved` | Survey Flow |
| `survey_open_text_submitted` | Survey Flow |
| `survey_open_text_skipped` | Survey Flow |
| `survey_completed` | Survey Flow, overview |
| `admin_client_selected` | Admin Actions |
| `survey_created` | Admin Actions |
| `survey_config_saved` | Admin Actions |
| `survey_published` | Admin Actions |
| `survey_unpublished` | Admin Actions |
| `survey_link_copied` | Admin Actions |
| `results_tab_viewed` | Reports and Results |
| `report_generation_requested` | Reports and Results |
| `report_download_requested` | Reports and Results |

---

## Stored Dimensions

The aggregate table can group by these dimensions:

| Dimension | Purpose | Privacy Notes |
|---|---|---|
| `event_date` | Date range and trend charts | Daily grain only |
| `event_name` | Event mix and section counts | Whitelisted enum |
| `surface` | Product area breakdown | Whitelisted enum |
| `route_template` | Navigation views | Template only, no raw URL |
| `organization_id` | Client activity | Display only above threshold |
| `survey_id` | Survey activity | Display only above threshold |
| `deployment_id` | Deployment activity | Not recommended for v1 UI |
| `tier` | Tier split | Safe aggregate dimension |
| `role` | Role split | Safe aggregate dimension |
| `report_format` | Report format usage | Safe enum |
| `results_tab` | Results tab usage | Safe enum |
| `survey_resolution_status` | Survey edge-state reporting | Safe enum |
| `action_status` | Workflow outcome reporting | Safe enum |
| `build_env` | Environment diagnostics | Filter out non-production by default |
| `app_version` | Release diagnostics | Optional admin-only diagnostic |

---

## Metric Definitions

### Overview Metrics

| Metric | Definition |
|---|---|
| Total Events | Sum of `event_count` for all rows in date window |
| Route Views | Sum where `event_name = 'route_viewed'` |
| Survey Starts | Sum where `event_name = 'survey_started'` |
| Survey Completions | Sum where `event_name = 'survey_completed'` |
| Report Generations | Sum where `event_name = 'report_generation_requested'` |
| Report Downloads | Sum where `event_name = 'report_download_requested'` |
| Active Organizations | Count distinct non-null `organization_id` |
| Active Surveys | Count distinct non-null `survey_id` |

### Derived Metrics

These can be computed in the UI from existing summary fields:

| Metric | Formula | Caveat |
|---|---|---|
| Report Activity | `reportGenerations + reportDownloads` | Counts actions, not users |
| Event-Based Completion Ratio | `surveyCompletions / surveyStarts` | Not unique respondent conversion |
| Admin Activity Count | Sum admin action events from `byEvent` | Requires event-name filtering |
| Results Activity Count | `results_tab_viewed + report_generation_requested + report_download_requested` | Counts actions |

Use cautious labels for ratios:

- Good: `Completion events / start events`
- Avoid: `Conversion rate`

---

## Existing RPC Output Coverage

| Dashboard Need | Current Support | Notes |
|---|---|---|
| Overview totals | Supported | Current compact panel uses this |
| Daily activity | Supported | `dailyTotals` |
| Event mix | Supported | `byEvent` |
| Surface mix | Supported | `bySurface` |
| Route ranking | Supported | `routeViewsByRoute` |
| Survey resolution statuses | Supported | `surveyResolutionStatuses` |
| Results tab usage | Supported | `resultsTabs` |
| Top organizations | Supported | Thresholded |
| Action outcomes | Needs extension | Group by `event_name`, `action_status` |
| Report formats | Needs extension | Group by `report_format` |
| Role/tier breakdown | Needs extension | Group by `role`, `tier` |
| Per-survey activity | Needs extension | Must threshold |
| Per-organization event mix | Needs extension | Must threshold |
| Production-only filtering | Needs extension | Filter or group by `build_env` |

---

## Recommended RPC Extension

Extend `get_analytics_summary` with these additional arrays.

```ts
interface AnalyticsActionStatusBreakdown {
  eventName: AnalyticsEventName;
  actionStatus: AnalyticsActionStatus;
  count: number;
}

interface AnalyticsReportFormatCount {
  reportFormat: ReportFormat;
  count: number;
}

interface AnalyticsRoleCount {
  role: UserRole;
  count: number;
}

interface AnalyticsTierCount {
  tier: UserTier;
  count: number;
}

interface AnalyticsOrganizationEventCount {
  organizationId: string;
  organizationName: string;
  eventName: AnalyticsEventName;
  count: number;
}

interface AnalyticsSurveyEventCount {
  surveyId: string;
  eventName: AnalyticsEventName;
  count: number;
}
```

Recommended additions to `AnalyticsSummary`:

```ts
actionStatuses: AnalyticsActionStatusBreakdown[];
reportFormats: AnalyticsReportFormatCount[];
byRole: AnalyticsRoleCount[];
byTier: AnalyticsTierCount[];
organizationEvents: AnalyticsOrganizationEventCount[];
surveyEvents: AnalyticsSurveyEventCount[];
```

Threshold rules:

- `organizationEvents` must include only organizations whose total count in the date window is at
  least `minimumReportableCount`.
- `surveyEvents` must include only surveys whose total count in the date window is at least
  `minimumReportableCount`.
- Do not include suppressed rows with exact counts.

---

## Date Range Behavior

Inputs:

- `startDate`: ISO date string
- `endDate`: ISO date string

Rules:

- Default: last 30 days, inclusive.
- Start date must be on or before end date.
- UI should use local date inputs but pass date-only strings.
- RPC uses database date boundaries and daily aggregate rows.

---

## Label Mapping

Event names should be displayed as product labels.

| Event | Label |
|---|---|
| `route_viewed` | Route views |
| `survey_deployment_resolved` | Survey deployment resolved |
| `survey_edge_state_viewed` | Survey edge states |
| `survey_started` | Survey starts |
| `survey_resumed` | Survey resumes |
| `survey_progress_saved` | Progress saves |
| `survey_open_text_submitted` | Open text submitted |
| `survey_open_text_skipped` | Open text skipped |
| `survey_completed` | Survey completions |
| `admin_client_selected` | Client selections |
| `survey_created` | Surveys created |
| `survey_config_saved` | Config saves |
| `survey_published` | Surveys published |
| `survey_unpublished` | Surveys unpublished |
| `survey_link_copied` | Survey links copied |
| `results_tab_viewed` | Results tab views |
| `report_generation_requested` | Report generations |
| `report_download_requested` | Report downloads |

Keep raw enum values available in tests and developer diagnostics.

---

## Privacy Invariants

Every dashboard data addition must preserve these invariants:

- No raw event rows are returned.
- No raw path or URL is returned.
- No answer values or open text are returned.
- No user IDs or emails are returned.
- No IP, IP hash, user agent, or fingerprint fields are returned.
- Client-specific rows are thresholded.
- Respondent-flow values remain aggregate event counts.
