/**
 * Public API for the admin settings feature.
 */

export { SystemSettingsPage } from './pages/system-settings-page';
export { SurveyDefaultsCard } from './components/survey-defaults-card';
export { BrandingCard } from './components/branding-card';
export { EmailTemplatesCard } from './components/email-templates-card';
export { DataSecurityCard } from './components/data-security-card';
export {
  useSystemSettings,
  systemSettingsKeys,
  type SystemSettings,
  type SaveStatus,
} from './hooks/use-system-settings';
