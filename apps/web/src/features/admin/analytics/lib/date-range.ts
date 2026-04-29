export type AnalyticsRangePreset = '7' | '30' | '90' | 'custom';

export interface AnalyticsDateRange {
  startDate: string;
  endDate: string;
  preset: AnalyticsRangePreset;
}

export const ANALYTICS_RANGE_PRESETS: ReadonlyArray<{
  id: AnalyticsRangePreset;
  label: string;
  days: number | null;
}> = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
  { id: 'custom', label: 'Custom', days: null },
];

function padDatePart(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Format a Date as the local date-only value expected by native date inputs. */
export function formatLocalDate(value: Date): string {
  return [
    value.getFullYear(),
    padDatePart(value.getMonth() + 1),
    padDatePart(value.getDate()),
  ].join('-');
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function getPresetDateRange(
  preset: Exclude<AnalyticsRangePreset, 'custom'> = '30',
  baseDate = new Date(),
): AnalyticsDateRange {
  const presetConfig = ANALYTICS_RANGE_PRESETS.find((item) => item.id === preset);
  const days = presetConfig?.days ?? 30;
  const end = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(0, days - 1));

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
    preset,
  };
}

export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end) return false;
  return start.getTime() <= end.getTime();
}

export function getInclusiveDates(startDate: string, endDate: string): string[] {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end || start.getTime() > end.getTime()) return [];

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    dates.push(formatLocalDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
