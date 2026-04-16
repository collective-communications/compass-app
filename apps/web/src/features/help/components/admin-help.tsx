/**
 * Tier 1 (CC+C team) help content. Inline sections for now — wiring a YAML
 * loader backed by `.context-kit/_ref/help-content.yaml` is a follow-up.
 */

import type { ReactElement } from 'react';

interface HelpSection {
  id: string;
  title: string;
  body: string;
}

const SECTIONS: readonly HelpSection[] = [
  {
    id: 'clients',
    title: 'Managing clients',
    body:
      'Create and configure client organizations from the Clients tab. Each client has its own set of surveys, users, and segment definitions.',
  },
  {
    id: 'surveys',
    title: 'Running a survey',
    body:
      'From Surveys, create a new instance under a client, configure the question bank and Likert scale, then distribute invitations. Live results appear in Insights once responses arrive.',
  },
  {
    id: 'insights',
    title: 'Insights & archetype analysis',
    body:
      'The Insights view rolls up responses across dimensions, derives the archetype match, and flags risk conditions. Segment scores below the anonymity threshold are hidden by design.',
  },
  {
    id: 'users',
    title: 'User administration',
    body:
      'Manage CC+C team accounts and client user invitations from Users. CC+C roles (admin, member) and client roles (exec, director, manager, user) govern access.',
  },
];

export function AdminHelp(): ReactElement {
  return <HelpContent sections={SECTIONS} audience="CC+C team" />;
}

export function HelpContent({
  sections,
  audience,
}: {
  sections: readonly HelpSection[];
  audience: string;
}): ReactElement {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-[var(--grey-900)]">Help</h1>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">{audience}</p>

      <div className="flex flex-col gap-4">
        {sections.map((s) => (
          <section
            key={s.id}
            aria-labelledby={`help-${s.id}`}
            className="rounded-lg border border-[var(--grey-300)] bg-[var(--surface)] p-6"
          >
            <h2
              id={`help-${s.id}`}
              className="mb-2 text-base font-semibold text-[var(--grey-900)]"
            >
              {s.title}
            </h2>
            <p className="text-sm text-[var(--grey-700)]">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
