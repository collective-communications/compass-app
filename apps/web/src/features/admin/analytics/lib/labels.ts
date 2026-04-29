import {
  AnalyticsActionStatus,
  AnalyticsEventName,
  AnalyticsResultsTab,
  AnalyticsRouteTemplate,
  AnalyticsSurface,
  AnalyticsSurveyResolutionStatus,
  type AnalyticsActionStatus as AnalyticsActionStatusType,
  type AnalyticsEventName as AnalyticsEventNameType,
  type AnalyticsResultsTab as AnalyticsResultsTabType,
  type AnalyticsRouteTemplate as AnalyticsRouteTemplateType,
  type AnalyticsSurface as AnalyticsSurfaceType,
  type AnalyticsSurveyResolutionStatus as AnalyticsSurveyResolutionStatusType,
  type ReportFormat,
} from '@compass/types';

export const ANALYTICS_EVENT_LABELS: Readonly<Record<AnalyticsEventNameType, string>> = {
  [AnalyticsEventName.ROUTE_VIEWED]: 'Route views',
  [AnalyticsEventName.SURVEY_DEPLOYMENT_RESOLVED]: 'Survey deployment resolved',
  [AnalyticsEventName.SURVEY_EDGE_STATE_VIEWED]: 'Survey edge states',
  [AnalyticsEventName.SURVEY_STARTED]: 'Survey starts',
  [AnalyticsEventName.SURVEY_RESUMED]: 'Survey resumes',
  [AnalyticsEventName.SURVEY_PROGRESS_SAVED]: 'Progress saves',
  [AnalyticsEventName.SURVEY_OPEN_TEXT_SUBMITTED]: 'Open text submitted',
  [AnalyticsEventName.SURVEY_OPEN_TEXT_SKIPPED]: 'Open text skipped',
  [AnalyticsEventName.SURVEY_COMPLETED]: 'Survey completions',
  [AnalyticsEventName.ADMIN_CLIENT_SELECTED]: 'Client selections',
  [AnalyticsEventName.SURVEY_CREATED]: 'Surveys created',
  [AnalyticsEventName.SURVEY_CONFIG_SAVED]: 'Config saves',
  [AnalyticsEventName.SURVEY_PUBLISHED]: 'Surveys published',
  [AnalyticsEventName.SURVEY_UNPUBLISHED]: 'Surveys unpublished',
  [AnalyticsEventName.SURVEY_LINK_COPIED]: 'Survey links copied',
  [AnalyticsEventName.RESULTS_TAB_VIEWED]: 'Results tab views',
  [AnalyticsEventName.REPORT_GENERATION_REQUESTED]: 'Report generations',
  [AnalyticsEventName.REPORT_DOWNLOAD_REQUESTED]: 'Report downloads',
};

export const ANALYTICS_SURFACE_LABELS: Readonly<Record<AnalyticsSurfaceType, string>> = {
  [AnalyticsSurface.PUBLIC]: 'Public',
  [AnalyticsSurface.AUTH]: 'Auth',
  [AnalyticsSurface.SURVEY]: 'Survey',
  [AnalyticsSurface.ADMIN]: 'Admin',
  [AnalyticsSurface.DASHBOARD]: 'Dashboard',
  [AnalyticsSurface.RESULTS]: 'Results',
  [AnalyticsSurface.REPORTS]: 'Reports',
  [AnalyticsSurface.SETTINGS]: 'Settings',
  [AnalyticsSurface.HELP]: 'Help',
  [AnalyticsSurface.PROFILE]: 'Profile',
  [AnalyticsSurface.DEV]: 'Developer tools',
};

export const ANALYTICS_RESULTS_TAB_LABELS: Readonly<Record<AnalyticsResultsTabType, string>> = {
  [AnalyticsResultsTab.COMPASS]: 'Compass',
  [AnalyticsResultsTab.SURVEY]: 'Survey',
  [AnalyticsResultsTab.GROUPS]: 'Groups',
  [AnalyticsResultsTab.DIALOGUE]: 'Dialogue',
  [AnalyticsResultsTab.REPORTS]: 'Reports',
  [AnalyticsResultsTab.RECOMMENDATIONS]: 'Recommendations',
  [AnalyticsResultsTab.HISTORY]: 'History',
};

export const ANALYTICS_RESOLUTION_LABELS: Readonly<
  Record<AnalyticsSurveyResolutionStatusType, string>
> = {
  [AnalyticsSurveyResolutionStatus.VALID]: 'Valid',
  [AnalyticsSurveyResolutionStatus.NOT_FOUND]: 'Not found',
  [AnalyticsSurveyResolutionStatus.CLOSED]: 'Closed',
  [AnalyticsSurveyResolutionStatus.EXPIRED]: 'Expired',
  [AnalyticsSurveyResolutionStatus.NOT_YET_OPEN]: 'Not yet open',
  [AnalyticsSurveyResolutionStatus.ALREADY_COMPLETED]: 'Already completed',
  [AnalyticsSurveyResolutionStatus.ERROR]: 'Error',
};

export const ANALYTICS_ACTION_STATUS_LABELS: Readonly<
  Record<AnalyticsActionStatusType, string>
> = {
  [AnalyticsActionStatus.REQUESTED]: 'Requested',
  [AnalyticsActionStatus.SUCCEEDED]: 'Succeeded',
  [AnalyticsActionStatus.FAILED]: 'Failed',
  [AnalyticsActionStatus.CANCELED]: 'Canceled',
};

export function getEventLabel(eventName: AnalyticsEventNameType): string {
  return ANALYTICS_EVENT_LABELS[eventName] ?? eventName;
}

export function getSurfaceLabel(surface: AnalyticsSurfaceType): string {
  return ANALYTICS_SURFACE_LABELS[surface] ?? surface;
}

export function getResultsTabLabel(resultsTab: AnalyticsResultsTabType): string {
  return ANALYTICS_RESULTS_TAB_LABELS[resultsTab] ?? resultsTab;
}

export function getResolutionStatusLabel(
  status: AnalyticsSurveyResolutionStatusType,
): string {
  return ANALYTICS_RESOLUTION_LABELS[status] ?? status;
}

export function getActionStatusLabel(status: AnalyticsActionStatusType): string {
  return ANALYTICS_ACTION_STATUS_LABELS[status] ?? status;
}

export function getReportFormatLabel(format: ReportFormat): string {
  return format.toUpperCase();
}

export function getRouteSurface(
  routeTemplate: AnalyticsRouteTemplateType,
): AnalyticsSurfaceType {
  if (routeTemplate.startsWith('/s/')) return AnalyticsSurface.SURVEY;
  if (routeTemplate.startsWith('/results/')) return AnalyticsSurface.RESULTS;
  if (routeTemplate.startsWith('/reports/')) return AnalyticsSurface.REPORTS;
  if (routeTemplate.startsWith('/auth/')) return AnalyticsSurface.AUTH;
  if (routeTemplate.startsWith('/settings')) return AnalyticsSurface.SETTINGS;
  if (routeTemplate.startsWith('/help')) return AnalyticsSurface.HELP;
  if (routeTemplate.startsWith('/profile')) return AnalyticsSurface.PROFILE;
  if (routeTemplate.startsWith('/dashboard')) return AnalyticsSurface.DASHBOARD;
  if (
    routeTemplate.startsWith('/clients')
    || routeTemplate.startsWith('/surveys')
    || routeTemplate.startsWith('/users')
    || routeTemplate.startsWith('/recommendations')
    || routeTemplate.startsWith('/email-')
    || routeTemplate === AnalyticsRouteTemplate.ANALYTICS
  ) {
    return AnalyticsSurface.ADMIN;
  }

  return AnalyticsSurface.PUBLIC;
}
