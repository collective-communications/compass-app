/** Tier 2 help content — Client SLT (authenticated, own organization). */

import { registerHelpContent } from '../help-content-store';
import type { HelpEntry } from '../help-content-store';

const compassHelp: HelpEntry = {
  title: 'Understanding your compass',
  sections: [
    {
      heading: 'The four dimensions',
      content:
        "Core: Purpose and care — why people come to work and whether they feel valued. Clarity: Direction and expectations — whether people know what's expected and where the organization is headed. Connection: Trust and relationships — the quality of interpersonal dynamics and psychological safety. Collaboration: Tools and action — whether people have what they need to work together effectively.",
    },
    {
      heading: 'Reading the shape',
      content:
        'A balanced compass (similar-sized slices) suggests consistent culture. An uneven compass highlights areas of strength and areas needing attention. The center Core score anchors the whole — if Core is low, other dimensions are harder to sustain.',
    },
    {
      heading: 'Risk flags',
      content:
        'Red and orange indicators highlight dimensions that fall below healthy thresholds. These are the highest-priority areas for action.',
    },
  ],
};

const surveyDimensionHelp: HelpEntry = {
  title: 'Reading question results',
  sections: [
    {
      heading: 'What the bars show',
      content:
        'Each question has a stacked bar showing the distribution of responses: Strongly Agree, Agree, Disagree, Strongly Disagree. The overall question score is the weighted average as a percentage.',
    },
    {
      heading: 'Reverse-scored questions',
      content:
        'Some questions are phrased negatively (e.g., "I feel disconnected from my team"). For these, disagreement is a positive signal. The scoring automatically inverts so that higher scores always mean better outcomes.',
    },
  ],
};

const groupsHelp: HelpEntry = {
  title: 'Using segment analysis',
  sections: [
    {
      heading: 'Filtering by segment',
      content:
        'Use the filter bar to switch between Department, Role, Location, and Tenure views. Select a specific segment to see its compass compared to the overall organization.',
    },
    {
      heading: 'Comparison bars',
      content:
        'Side-by-side bars show how a segment scores versus the organization overall. Delta indicators (+N% / -N%) highlight where segments diverge.',
    },
    {
      heading: 'Hidden segments',
      content:
        'Segments with too few responses are hidden entirely to protect anonymity. This is structural — the system cannot display the data, not just a policy choice.',
    },
  ],
};

const dialogueHelp: HelpEntry = {
  title: 'Exploring feedback',
  sections: [
    {
      heading: 'Topic filtering',
      content:
        "Topics are generated automatically from response content. Tap a topic pill to filter responses to that theme. The 'All' pill shows every response.",
    },
    {
      heading: 'Keyword bubbles',
      content:
        'Bubble size reflects how frequently a term appears across all responses. Larger bubbles = more common mentions.',
    },
  ],
};

const recommendationsHelp: HelpEntry = {
  title: 'Acting on recommendations',
  sections: [
    {
      heading: 'Priority levels',
      content:
        'Critical (red): Scores significantly below threshold — immediate attention needed. High (orange): Below healthy range — should be addressed soon. Medium (yellow): Room for improvement — monitor and plan. Healthy (green): Strong performance — maintain current approach.',
    },
    {
      heading: 'Engaging CC+C',
      content:
        'Each recommendation card includes related CC+C consulting services. Your consultant can help build an action plan around any recommendation.',
    },
  ],
};

const dashboardHelp: HelpEntry = {
  title: 'Your dashboard',
  sections: [
    {
      heading: 'Overview',
      content:
        "Your dashboard shows your organization's active survey status and key culture metrics. When results are available, you can navigate to detailed views from here.",
    },
  ],
};

const reportsHelp: HelpEntry = {
  title: 'Exporting reports',
  sections: [
    {
      heading: 'Format differences',
      content:
        'PDF Report: Branded, print-ready document. Best for archiving and sharing externally. Presentation Deck: Slides formatted for client meetings and leadership presentations.',
    },
    {
      heading: 'Section selection',
      content:
        "All sections are included by default. Uncheck sections you don't need to keep the report focused. The Cover Page is always included.",
    },
    {
      heading: 'Generation time',
      content:
        "Reports typically generate in under 30 seconds. You can close the modal and find the report in the Reports tab once it's ready.",
    },
  ],
};

/**
 * Register Tier 2 (client SLT) help drawer content.
 * Call once at app startup.
 */
export function registerTier2Content(): void {
  registerHelpContent('/results/:id/compass', compassHelp);
  registerHelpContent('/results/:id/survey', surveyDimensionHelp);
  registerHelpContent('/results/:id/groups', groupsHelp);
  registerHelpContent('/results/:id/dialogue', dialogueHelp);
  registerHelpContent('/results/:id/recommendations', recommendationsHelp);
  registerHelpContent('/dashboard', dashboardHelp);
  registerHelpContent('/reports', reportsHelp);
}
