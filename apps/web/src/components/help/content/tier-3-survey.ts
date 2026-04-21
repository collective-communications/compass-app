/** Tier 3 help content — Survey respondents (anonymous, no account). */

import { registerHelpContent } from '../help-content-store';
import type { HelpEntry } from '../help-content-store';

/** Fallback Likert scale size used when a caller has not yet resolved the
 *  active survey's `settings.likertSize`. Kept in sync with
 *  `DEFAULT_LIKERT_SIZE` in `@compass/types`. */
const DEFAULT_SCALE_SIZE = 5;

/**
 * Build the Tier 3 help entry for the active survey's Likert scale size.
 *
 * Only the keyboard-shortcut line is dynamic — the rest of the copy is static.
 * Keeping this a factory (rather than a constant) lets the survey routes
 * re-register content once the deployment resolves and the real `likertSize`
 * is known.
 */
export function buildSurveyHelp(scaleSize: number): HelpEntry {
  return {
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
          `1-${scaleSize}: Select answer option`,
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
}

/**
 * Register Tier 3 (survey respondent) help drawer content.
 *
 * Call once at app startup with the fallback default, then re-register from
 * inside the survey provider once the active deployment resolves so the
 * keyboard shortcut line reflects the real `settings.likertSize`.
 *
 * @param scaleSize - Active survey's Likert scale size. Callers SHOULD always
 *   pass the resolved `survey.settings.likertSize`; the default is only used
 *   before the survey has loaded.
 */
export function registerTier3Content(scaleSize: number = DEFAULT_SCALE_SIZE): void {
  const entry = buildSurveyHelp(scaleSize);
  registerHelpContent('/s', entry);
  registerHelpContent('/survey', entry);
}
