/**
 * Metadata configuration card for per-organization dropdown options.
 * Manages departments, roles, locations, and tenure bands with
 * add/remove/reorder. Warns before removing items in use by active responses.
 */

import { useState, useCallback, useRef, type ReactElement, type KeyboardEvent } from 'react';
import type { MetadataListItem, MetadataCategory, SaveStatus } from '../hooks/use-org-settings';
import { AutoSaveIndicator, type AutoSaveStatus } from '../../surveys/components/auto-save-indicator';

interface MetadataConfigProps {
  category: MetadataCategory;
  label: string;
  description: string;
  items: MetadataListItem[];
  inUseLabels: Set<string>;
  saveStatus: SaveStatus;
  onUpdate: (items: MetadataListItem[]) => void;
}

const SAVE_TO_AUTOSAVE: Record<SaveStatus, AutoSaveStatus> = {
  saved: 'saved',
  saving: 'saving',
  error: 'error',
};

const CATEGORY_PLACEHOLDER: Record<MetadataCategory, string> = {
  departments: 'e.g. Engineering, Marketing',
  roles: 'e.g. Manager, Individual Contributor',
  locations: 'e.g. Toronto, Vancouver',
  tenureBands: 'e.g. 0-1 years, 1-3 years',
};

function generateId(): string {
  return crypto.randomUUID();
}

export function MetadataConfig({
  category,
  label,
  description,
  items,
  inUseLabels,
  saveStatus,
  onUpdate,
}: MetadataConfigProps): ReactElement {
  const [newValue, setNewValue] = useState('');
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = useCallback((): void => {
    const trimmed = newValue.trim();
    if (!trimmed) return;

    const duplicate = items.some(
      (item) => item.label.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) return;

    const nextOrder = items.length > 0
      ? Math.max(...items.map((i) => i.sortOrder)) + 1
      : 0;

    const updated = [
      ...items,
      { id: generateId(), label: trimmed, sortOrder: nextOrder },
    ];

    onUpdate(updated);
    setNewValue('');
    inputRef.current?.focus();
  }, [newValue, items, onUpdate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  const handleRemove = useCallback(
    (itemId: string): void => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      if (inUseLabels.has(item.label) && pendingRemoval !== itemId) {
        setPendingRemoval(itemId);
        return;
      }

      const updated = items
        .filter((i) => i.id !== itemId)
        .map((i, idx) => ({ ...i, sortOrder: idx }));

      onUpdate(updated);
      setPendingRemoval(null);
    },
    [items, inUseLabels, pendingRemoval, onUpdate],
  );

  const handleCancelRemoval = useCallback((): void => {
    setPendingRemoval(null);
  }, []);

  const handleMoveUp = useCallback(
    (index: number): void => {
      if (index === 0) return;
      const updated = [...items];
      const temp = updated[index]!;
      updated[index] = updated[index - 1]!;
      updated[index - 1] = temp;
      const reordered = updated.map((item, idx) => ({ ...item, sortOrder: idx }));
      onUpdate(reordered);
    },
    [items, onUpdate],
  );

  const handleMoveDown = useCallback(
    (index: number): void => {
      if (index >= items.length - 1) return;
      const updated = [...items];
      const temp = updated[index]!;
      updated[index] = updated[index + 1]!;
      updated[index + 1] = temp;
      const reordered = updated.map((item, idx) => ({ ...item, sortOrder: idx }));
      onUpdate(reordered);
    },
    [items, onUpdate],
  );

  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-6">
      <fieldset>
        <legend className="mb-4 flex w-full items-center justify-between">
          <span className="text-lg font-semibold text-[var(--grey-900)]">{label}</span>
          <AutoSaveIndicator status={SAVE_TO_AUTOSAVE[saveStatus]} />
        </legend>

        <p className="mb-4 text-sm text-[var(--text-secondary)]">{description}</p>

        {/* Item list */}
        <ul className="mb-4 space-y-1" role="list" aria-label={`${label} items`}>
          {sorted.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50,#F5F5F5)] px-3 py-2"
            >
              {/* Reorder controls */}
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  aria-label={`Move ${item.label} up`}
                  className="text-[var(--text-tertiary)] hover:text-[var(--grey-700)] disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 2L2 7h8L6 2z" fill="currentColor" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === sorted.length - 1}
                  aria-label={`Move ${item.label} down`}
                  className="text-[var(--text-tertiary)] hover:text-[var(--grey-700)] disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M6 10L2 5h8L6 10z" fill="currentColor" />
                  </svg>
                </button>
              </div>

              <span className="flex-1 text-sm text-[var(--grey-900)]">{item.label}</span>

              {inUseLabels.has(item.label) && (
                <span className="text-xs text-[var(--text-tertiary)]">in use</span>
              )}

              {pendingRemoval === item.id ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs text-red-700">
                    This value is referenced by active responses. Remove anyway?
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="text-xs font-medium text-red-700 hover:underline"
                    aria-label={`Confirm remove ${item.label}`}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelRemoval}
                    className="text-xs font-medium text-[var(--text-secondary)] hover:underline"
                    aria-label="Cancel removal"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  aria-label={`Remove ${item.label}`}
                  className="text-[var(--text-tertiary)] hover:text-red-700"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </li>
          ))}

          {sorted.length === 0 && (
            <li className="py-3 text-center text-sm text-[var(--text-tertiary)]">
              No {label.toLowerCase()} configured yet.
            </li>
          )}
        </ul>

        {/* Add new item */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={CATEGORY_PLACEHOLDER[category]}
            aria-label={`Add new ${label.toLowerCase().replace(/s$/, '')}`}
            className="flex-1 rounded-lg border border-[var(--grey-100)] px-3 py-2 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-core-text)]"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newValue.trim()}
            className="rounded-lg bg-[var(--grey-900,#212121)] px-4 py-2 text-sm font-medium text-[var(--grey-50)] disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </fieldset>
    </div>
  );
}
