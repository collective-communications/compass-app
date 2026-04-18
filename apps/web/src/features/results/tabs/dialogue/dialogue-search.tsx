/**
 * Debounced search input for filtering open-ended responses.
 * Debounces input by 300ms before invoking the onChange callback.
 */

import { useState, useEffect, useRef, type ReactElement } from 'react';

interface DialogueSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const DEBOUNCE_MS = 300;

/** Debounced search input for dialogue responses. */
export function DialogueSearch({ value, onChange }: DialogueSearchProps): ReactElement {
  const [localValue, setLocalValue] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  function handleChange(next: string): void {
    setLocalValue(next);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), DEBOUNCE_MS);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <input
        type="search"
        aria-label="Search open-ended responses"
        placeholder="Search responses..."
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] px-4 py-2 pr-10 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--grey-700)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20"
      />
      {localValue.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => handleChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
