/** Tier 1 help content — CC+C admin (power users). */

import { registerHelpContent } from '../help-content-store';
import type { HelpEntry } from '../help-content-store';

const clientsListHelp: HelpEntry = {
  title: 'Managing clients',
  sections: [
    {
      heading: 'Client cards',
      content:
        "Each card shows the organization's active survey status and key metrics. Green border: active survey running healthy. Orange border: needs attention (low response rate or approaching close date). No border: no active survey.",
    },
    {
      heading: 'Adding clients',
      content:
        "Click '+ Add Client' to create a new organization. You'll set the organization name, industry, employee count, and primary contact. Metadata options (departments, roles, locations, tenure bands) are configured per client in their settings.",
    },
  ],
};

const clientDetailHelp: HelpEntry = {
  title: 'Client overview',
  sections: [
    {
      heading: 'Tabs',
      content:
        "Overview: Organization info, metrics, consultant assignment, and notes. Surveys: All surveys for this organization — create, configure, deploy, monitor. Access results via the survey card actions. Users: Client team members who have access to the platform.",
    },
    {
      heading: 'Notes',
      content:
        'Admin notes are visible only to CC+C team. Use them to track client context, meeting outcomes, or action items. Notes appear in reverse chronological order.',
    },
  ],
};

const surveyManagementHelp: HelpEntry = {
  title: 'Survey workflow',
  sections: [
    {
      heading: 'Creating a survey',
      content:
        "Click '+ New Survey' to create from the Culture Compass template. The survey starts as a Draft with 32 pre-loaded questions. Configure dates, anonymity threshold, and welcome/completion messages.",
    },
    {
      heading: 'Publishing',
      content:
        "Click 'Publish Now' or generate a link from the configuration modal. Share the anonymous link with the organization. Only one survey per organization can be active at a time.",
    },
    {
      heading: 'Monitoring',
      content:
        'Active survey cards show response count, completion rate, and days remaining. The deployment panel shows response breakdown by department.',
    },
    {
      heading: 'Closing',
      content:
        'Surveys close automatically on their close date, or you can close early. After closing, scores are calculated automatically. Review results before enabling client access.',
    },
  ],
};

const surveyBuilderHelp: HelpEntry = {
  title: 'Editing questions',
  sections: [
    {
      heading: 'What you can edit',
      content:
        'Question text, help text, reverse-scored toggle, diagnostic focus, and recommended action. Question type and dimension assignment are locked by the template to preserve the Culture Compass framework.',
    },
    {
      heading: 'Reordering',
      content:
        'Drag questions to reorder within a dimension. Cross-dimension moves are not allowed — this preserves the framework structure. Reorders auto-save immediately.',
    },
    {
      heading: 'Reverse scoring',
      content:
        'Questions marked with (R) are reverse-scored. Disagreement counts as a positive signal. The scoring engine handles inversion automatically. Several questions are reverse-scored by default.',
    },
  ],
};

const usersHelp: HelpEntry = {
  title: 'Team management',
  sections: [
    {
      heading: 'Roles',
      content:
        'Owner/Admin: Full platform access including settings and team management. Consultant: Full access to client data but limited platform settings.',
    },
    {
      heading: 'Inviting',
      content:
        "Click '+ Invite' and enter an email address and role. The invitee receives a sign-in link. Invitations expire after 7 days. You can resend expired invitations.",
    },
    {
      heading: 'Restrictions',
      content:
        'You cannot remove the last Owner — the platform must always have one. You cannot change your own role or remove yourself.',
    },
  ],
};

const settingsHelp: HelpEntry = {
  title: 'Platform configuration',
  sections: [
    {
      heading: 'Survey defaults',
      content:
        'These values apply to newly created surveys. Existing surveys keep their configured values. The anonymity threshold (minimum 3) controls when segment data is hidden on the Groups tab.',
    },
    {
      heading: 'Branding',
      content:
        "The CC+C logo and brand colors are set here. Per-client branding (client logo, organization name) is configured in each client's settings.",
    },
    {
      heading: 'Email templates',
      content:
        'Edit the templates used for survey invitations, reminders, and report-ready notifications. Changes apply to all future emails. Previously sent emails are not affected.',
    },
  ],
};

/**
 * Register Tier 1 (CC+C admin) help drawer content.
 * Call once at app startup.
 */
export function registerTier1Content(): void {
  registerHelpContent('/clients', clientsListHelp);
  registerHelpContent('/clients/:id', clientDetailHelp);
  registerHelpContent('/clients/:id/surveys', surveyManagementHelp);
  registerHelpContent('/clients/:id/surveys/:id/builder', surveyBuilderHelp);
  registerHelpContent('/settings/users', usersHelp);
  registerHelpContent('/settings', settingsHelp);
}
