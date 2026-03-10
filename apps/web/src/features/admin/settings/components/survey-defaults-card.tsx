/**
 * Survey defaults settings card.
 * Controls anonymity threshold, default duration, and default survey messages.
 * Changes apply to new surveys only.
 */

import { useState, useCallback, type ReactElement, type ChangeEvent } from 'react';
import type { SystemSettings, SaveStatus } from '../hooks/use-system-settings';
import { AutoSaveIndicator, type AutoSaveStatus } from '../../surveys/components/auto-save-indicator';
import { Card } from '@/components/ui/card';

interface SurveyDefaultsCardProps {
  settings: SystemSettings;
  saveStatus: SaveStatus;
  onUpdateField: <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]) => void;
}

const SAVE_TO_AUTOSAVE: Record<SaveStatus, AutoSaveStatus> = {
  saved: 'saved',
  saving: 'saving',
  error: 'error',
};

export function SurveyDefaultsCard({
  settings,
  saveStatus,
  onUpdateField,
}: SurveyDefaultsCardProps): ReactElement {
  const [editingWelcome, setEditingWelcome] = useState(false);
  const [editingCompletion, setEditingCompletion] = useState(false);

  const handleThresholdChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const value = Math.min(20, Math.max(3, Number(e.target.value)));
      onUpdateField('anonymity_threshold', value);
    },
    [onUpdateField],
  );

  const handleDurationChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const value = Math.max(1, Number(e.target.value));
      onUpdateField('default_duration_days', value);
    },
    [onUpdateField],
  );

  const handleWelcomeChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>): void => {
      onUpdateField('welcome_message', e.target.value);
    },
    [onUpdateField],
  );

  const handleCompletionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>): void => {
      onUpdateField('completion_message', e.target.value);
    },
    [onUpdateField],
  );

  return (
    <Card className="rounded-xl">
      <fieldset>
        <legend className="mb-4 flex w-full items-center justify-between">
          <span className="text-lg font-semibold text-[var(--grey-900)]">Survey Defaults</span>
          <AutoSaveIndicator status={SAVE_TO_AUTOSAVE[saveStatus]} />
        </legend>

        <p className="mb-6 text-sm text-[var(--grey-500)]">
          Changes apply to new surveys only &mdash; existing surveys keep their values.
        </p>

        {/* Anonymity threshold */}
        <div className="mb-5">
          <label
            htmlFor="anonymity-threshold"
            className="mb-1 block text-sm font-medium text-[var(--grey-700)]"
          >
            Anonymity threshold
          </label>
          <input
            id="anonymity-threshold"
            type="number"
            min={3}
            max={20}
            value={settings.anonymity_threshold}
            onChange={handleThresholdChange}
            aria-label={`Anonymity threshold, current value ${settings.anonymity_threshold}, range 3 to 20`}
            className="w-24 rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core)]"
          />
          <p className="mt-1 text-xs text-[var(--grey-500)]">
            Minimum: 3. Applied as the default for all new surveys.
          </p>
        </div>

        {/* Default duration */}
        <div className="mb-5">
          <label
            htmlFor="default-duration"
            className="mb-1 block text-sm font-medium text-[var(--grey-700)]"
          >
            Default survey duration (days)
          </label>
          <input
            id="default-duration"
            type="number"
            min={1}
            value={settings.default_duration_days}
            onChange={handleDurationChange}
            aria-label={`Default survey duration in days, current value ${settings.default_duration_days}`}
            className="w-24 rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core)]"
          />
        </div>

        {/* Welcome message */}
        <div className="mb-5">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--grey-700)]">Welcome message</span>
            <button
              type="button"
              onClick={() => setEditingWelcome((prev) => !prev)}
              className="text-xs font-medium text-[var(--color-core)] hover:underline"
            >
              {editingWelcome ? 'Done' : 'Edit'}
            </button>
          </div>
          {editingWelcome ? (
            <textarea
              value={settings.welcome_message}
              onChange={handleWelcomeChange}
              rows={3}
              aria-label="Welcome message"
              className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core)]"
            />
          ) : (
            <p className="rounded-lg bg-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-600)]">
              {settings.welcome_message}
            </p>
          )}
        </div>

        {/* Completion message */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--grey-700)]">Completion message</span>
            <button
              type="button"
              onClick={() => setEditingCompletion((prev) => !prev)}
              className="text-xs font-medium text-[var(--color-core)] hover:underline"
            >
              {editingCompletion ? 'Done' : 'Edit'}
            </button>
          </div>
          {editingCompletion ? (
            <textarea
              value={settings.completion_message}
              onChange={handleCompletionChange}
              rows={3}
              aria-label="Completion message"
              className="w-full rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] focus:border-[var(--color-core)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core)]"
            />
          ) : (
            <p className="rounded-lg bg-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-600)]">
              {settings.completion_message}
            </p>
          )}
        </div>
      </fieldset>
    </Card>
  );
}
