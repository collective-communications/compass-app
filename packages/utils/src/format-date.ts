/**
 * Display format for dates. `short` uses an abbreviated month ("Apr 16, 2026");
 * `long` uses the full month name ("April 16, 2026").
 */
export type DisplayDateFormat = 'short' | 'long';

export interface FormatDisplayDateOptions {
  /** BCP 47 locale tag. Defaults to `'en-CA'`. */
  locale?: string;
  /** String returned for null, undefined, or unparseable input. Defaults to `'--'`. */
  nullFallback?: string;
}

const DEFAULT_LOCALE = 'en-CA';
const DEFAULT_NULL_FALLBACK = '--';

const FORMAT_OPTIONS: Record<DisplayDateFormat, Intl.DateTimeFormatOptions> = {
  short: { year: 'numeric', month: 'short', day: 'numeric' },
  long: { year: 'numeric', month: 'long', day: 'numeric' },
};

/**
 * Formats a date for display in the UI.
 *
 * Accepts an ISO date string, a `Date` instance, or null/undefined. Returns
 * the configured `nullFallback` for missing or invalid input so call sites
 * never need null-checks of their own.
 *
 * @param input - ISO date string, `Date` object, or null/undefined
 * @param format - `'short'` (e.g. "Apr 16, 2026") or `'long'` (e.g. "April 16, 2026")
 * @param options - Optional locale and null-fallback overrides
 * @returns Formatted date string, or `nullFallback` for missing/invalid input
 */
export function formatDisplayDate(
  input: string | Date | null | undefined,
  format: DisplayDateFormat = 'short',
  options?: FormatDisplayDateOptions,
): string {
  const nullFallback = options?.nullFallback ?? DEFAULT_NULL_FALLBACK;
  if (input === null || input === undefined) {
    return nullFallback;
  }

  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return nullFallback;
  }

  const locale = options?.locale ?? DEFAULT_LOCALE;
  return date.toLocaleDateString(locale, FORMAT_OPTIONS[format]);
}
