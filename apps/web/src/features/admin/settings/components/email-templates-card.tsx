/**
 * Email templates settings card.
 * Lists editable email templates with inline expand/collapse editing.
 */

import { useState, useCallback, type ReactElement } from 'react';
import { Card } from '../../../../components/ui/card';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const PLACEHOLDER_TEMPLATES: EmailTemplate[] = [
  {
    id: 'survey-invitation',
    name: 'Survey invitation',
    subject: 'You are invited to complete a Culture Compass survey',
    body: 'Hello,\n\nYou have been invited to participate in a Culture Compass survey for {{organization_name}}. Click the link below to begin.\n\n{{survey_link}}\n\nThis survey is completely anonymous.',
  },
  {
    id: 'reminder-email',
    name: 'Reminder email',
    subject: 'Reminder: Culture Compass survey closing soon',
    body: 'Hello,\n\nThis is a reminder that the Culture Compass survey for {{organization_name}} closes on {{close_date}}. If you have not yet completed it, please use the link below.\n\n{{survey_link}}',
  },
  {
    id: 'report-ready',
    name: 'Report ready notification',
    subject: 'Your Culture Compass report is ready',
    body: 'Hello,\n\nThe Culture Compass report for {{organization_name}} is now available. Log in to view your results.\n\n{{dashboard_link}}',
  },
];

export function EmailTemplatesCard(): ReactElement {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <Card className="rounded-lg">
      <fieldset>
        <legend className="mb-4 text-lg font-semibold text-[var(--grey-900)]">
          Email Templates
        </legend>

        <div className="flex flex-col divide-y divide-[var(--grey-100)]">
          {PLACEHOLDER_TEMPLATES.map((template) => {
            const isExpanded = expandedId === template.id;
            return (
              <div key={template.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--grey-700)]">
                    {template.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleExpand(template.id)}
                    aria-expanded={isExpanded}
                    aria-controls={`template-${template.id}`}
                    className="text-xs font-medium text-[var(--color-core)] hover:underline"
                  >
                    {isExpanded ? 'Collapse' : 'Preview / Edit'}
                  </button>
                </div>

                {isExpanded && (
                  <div
                    id={`template-${template.id}`}
                    className="mt-3 space-y-3"
                  >
                    <div>
                      <label
                        htmlFor={`subject-${template.id}`}
                        className="mb-1 block text-xs font-medium text-[var(--grey-500)]"
                      >
                        Subject
                      </label>
                      <input
                        id={`subject-${template.id}`}
                        type="text"
                        defaultValue={template.subject}
                        className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core)]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`body-${template.id}`}
                        className="mb-1 block text-xs font-medium text-[var(--grey-500)]"
                      >
                        Body
                      </label>
                      <textarea
                        id={`body-${template.id}`}
                        defaultValue={template.body}
                        rows={5}
                        className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core)]"
                      />
                    </div>
                    <p className="text-xs text-[var(--grey-400)]">
                      Variables: {'{{organization_name}}'}, {'{{survey_link}}'}, {'{{close_date}}'}, {'{{dashboard_link}}'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>
    </Card>
  );
}
