/**
 * ServiceLinksCard — "How COLLECTIVE culture + communication Can Help"
 * panel with links to CC+C services. Rendered in the insights panel.
 */

import type { ReactElement } from 'react';

interface ServiceLink {
  label: string;
  href: string;
  description: string;
}

const SERVICES: ServiceLink[] = [
  {
    label: 'Culture Assessment',
    href: 'https://collectivecommunication.ca/services/culture-assessment',
    description: 'Deep-dive analysis with facilitated leadership workshops.',
  },
  {
    label: 'Listening Labs',
    href: 'https://collectivecommunication.ca/services/listening-labs',
    description: 'Facilitated employee conversations to surface themes and insights.',
  },
  {
    label: 'Strategic Communication',
    href: 'https://collectivecommunication.ca/services/strategic-communication',
    description: 'Internal communication strategy aligned to culture priorities.',
  },
  {
    label: 'Leadership Advisory',
    href: 'https://collectivecommunication.ca/services/leadership-advisory',
    description: 'One-on-one coaching for SLT members on culture transformation.',
  },
];

/** CC+C services reference card for the insights panel. */
export function ServiceLinksCard(): ReactElement {
  return (
    <section
      className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] p-6"
      aria-labelledby="service-links-heading"
    >
      <h3 id="service-links-heading" className="mb-4 text-sm font-semibold text-[var(--grey-900)]">
        How COLLECTIVE culture + communication Can Help
      </h3>
      <ul className="flex flex-col gap-3">
        {SERVICES.map((service) => (
          <li key={service.label}>
            <a
              href={service.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <span className="text-sm font-medium text-[var(--color-interactive)] underline-offset-2 group-hover:underline">
                {service.label}
              </span>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                {service.description}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
