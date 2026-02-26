/** Tier 3 help content — Survey respondents (anonymous, no account). */

import { registerHelpContent } from '../help-content-store';
import type { HelpEntry } from '../help-content-store';

const surveyHelp: HelpEntry = {
  title: 'Survey help',
  sections: [
    {
      heading: 'Your responses are anonymous',
      content:
        'This survey has no login and no account. Your responses are stored without any link to your identity. The system is designed so that anonymity is structural — not just a policy promise.',
    },
    {
      heading: 'How to navigate',
      content:
        'Use the progress squares at the top to jump between questions. Drag the chevron to browse quickly. Use Previous and Next buttons to move one question at a time.',
      keyboardShortcuts: [
        '1-4: Select answer option',
        'Enter: Next question',
        'Backspace: Previous question',
      ],
    },
    {
      heading: 'Saving your progress',
      content:
        "Tap 'Save' in the header at any time. You'll get a link to return where you left off. Progress is saved to this device automatically.",
    },
    {
      heading: 'Questions?',
      content:
        "Contact your organization's survey administrator if you have questions about this assessment.",
    },
  ],
};

/**
 * Register Tier 3 (survey respondent) help drawer content.
 * Call once at app startup.
 */
export function registerTier3Content(): void {
  registerHelpContent('/s', surveyHelp);
  registerHelpContent('/survey', surveyHelp);
}
