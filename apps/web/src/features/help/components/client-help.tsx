/**
 * Tier 2 (client) help content. Inline sections for now.
 */

import type { ReactElement } from 'react';
import { HelpContent } from './admin-help';

const SECTIONS = [
  {
    id: 'dashboard',
    title: 'Your dashboard',
    body:
      'The dashboard summarizes your organization’s culture assessment — the current archetype match, key findings, and any risk flags. It’s a starting point; deeper analysis lives in Results.',
  },
  {
    id: 'results',
    title: 'Interpreting results',
    body:
      'Results shows your four dimension scores (Core, Clarity, Connection, Collaboration) on the Compass, plus survey-level breakdowns and group comparisons. Segments below the anonymity threshold are hidden to protect respondents.',
  },
  {
    id: 'reports',
    title: 'Downloading reports',
    body:
      'Generate a branded PDF from Reports. Reports include the archetype, dimension scores, key findings, and recommendations. Delivery is available to executives and directors.',
  },
  {
    id: 'anonymity',
    title: 'How anonymity works',
    body:
      'Survey responses are structurally anonymous — no respondent identifier is stored. Segment-level data is only shown once at least five responses are received for that segment.',
  },
] as const;

export function ClientHelp(): ReactElement {
  return <HelpContent sections={SECTIONS} audience="Your team" />;
}
