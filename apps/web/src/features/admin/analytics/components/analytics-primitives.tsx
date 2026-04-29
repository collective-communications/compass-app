import type { ReactElement, ReactNode } from 'react';
import type { AnalyticsBarItem } from '../lib/metrics';

export interface AnalyticsCardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function AnalyticsCard({
  children,
  className = '',
  padded = true,
}: AnalyticsCardProps): ReactElement {
  return (
    <section
      className={`rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] ${
        padded ? 'p-5' : ''
      } ${className}`}
    >
      {children}
    </section>
  );
}

export interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  hint?: string;
}

export function SectionHeader({ eyebrow, title, hint }: SectionHeaderProps): ReactElement {
  return (
    <div className="mb-3 flex items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            {eyebrow}
          </p>
        )}
        <h2 className="text-[15px] font-semibold text-[var(--grey-900)]">{title}</h2>
      </div>
      {hint && (
        <span className="shrink-0 text-right text-[11px] text-[var(--text-tertiary)]">
          {hint}
        </span>
      )}
    </div>
  );
}

export interface AnalyticsPillProps {
  children: ReactNode;
  tone?: 'neutral' | 'info' | 'healthy' | 'medium' | 'critical' | 'coral' | 'teal';
}

const PILL_TONE_CLASS: Record<NonNullable<AnalyticsPillProps['tone']>, string> = {
  neutral: 'border-[var(--grey-100)] bg-[var(--grey-50)] text-[var(--text-secondary)]',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  healthy:
    'border-[var(--severity-healthy-border)] bg-[var(--severity-healthy-bg)] text-[var(--severity-healthy-text)]',
  medium:
    'border-[var(--severity-medium-border)] bg-[var(--severity-medium-bg)] text-[var(--severity-medium-text)]',
  critical:
    'border-[var(--severity-critical-border)] bg-[var(--severity-critical-bg)] text-[var(--severity-critical-text)]',
  coral: 'border-[#F8C9B5] bg-[#FFF1EB] text-[#B7521E]',
  teal: 'border-[#BFE3D5] bg-[var(--color-pale-mint)] text-[var(--color-core)]',
};

export function AnalyticsPill({
  children,
  tone = 'neutral',
}: AnalyticsPillProps): ReactElement {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${PILL_TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export interface BarListProps {
  items: readonly AnalyticsBarItem[];
  max?: number;
  valueLabel?: (value: number) => string;
  emptyLabel?: string;
}

export function BarList({
  items,
  max,
  valueLabel = (value: number): string => value.toLocaleString(),
  emptyLabel = 'No aggregate analytics recorded for this date range.',
}: BarListProps): ReactElement {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--text-secondary)]">{emptyLabel}</p>;
  }

  const top = max ?? Math.max(1, ...items.map((item) => item.value));

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        const width = `${Math.max(0, Math.min(100, (item.value / top) * 100))}%`;
        return (
          <div
            key={item.key}
            className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_72px] items-center gap-3"
          >
            <span
              className="truncate text-sm text-[var(--grey-900)]"
              title={item.description ?? item.label}
            >
              {item.label}
            </span>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--grey-50)]">
              <div
                className="h-full rounded-full"
                style={{ width, background: item.color ?? 'var(--color-interactive)' }}
              />
            </div>
            <span className="text-right text-sm font-semibold tabular-nums text-[var(--grey-900)]">
              {valueLabel(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export interface StackedBarProps {
  segments: readonly { key: string; label: string; value: number; color: string }[];
  heightClassName?: string;
}

export function StackedBar({
  segments,
  heightClassName = 'h-2.5',
}: StackedBarProps): ReactElement {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div
      className={`flex overflow-hidden rounded-full bg-[var(--grey-50)] ${heightClassName}`}
      role="img"
      aria-label={segments.map((segment) => `${segment.label}: ${segment.value}`).join(', ')}
    >
      {segments.map((segment) => (
        <div
          key={segment.key}
          title={`${segment.label}: ${segment.value}`}
          style={{
            width: total > 0 ? `${(segment.value / total) * 100}%` : '0%',
            background: segment.color,
          }}
        />
      ))}
    </div>
  );
}

export interface DailyActivityChartProps {
  data: readonly { date: string; count: number }[];
}

export function DailyActivityChart({ data }: DailyActivityChartProps): ReactElement {
  const width = 720;
  const height = 220;
  const padLeft = 8;
  const padRight = 28;
  const padTop = 12;
  const padBottom = 28;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;
  const max = Math.max(1, ...data.map((item) => item.count));
  const step = data.length > 0 ? innerWidth / data.length : innerWidth;
  const barWidth = Math.max(2, step * 0.6);
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  const points = data.map((item, index) => {
    const x = padLeft + step * index + step / 2;
    const y = padTop + (1 - item.count / max) * innerHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      className="h-56 w-full overflow-visible"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Daily aggregate analytics events"
      preserveAspectRatio="none"
    >
      <title>Daily aggregate analytics events</title>
      {[0, 1, 2, 3, 4].map((tick) => {
        const y = padTop + (innerHeight / 4) * tick;
        const value = Math.round(max - (max / 4) * tick);
        return (
          <g key={tick}>
            <line
              x1={padLeft}
              x2={padLeft + innerWidth}
              y1={y}
              y2={y}
              stroke="var(--grey-100)"
            />
            <text
              x={padLeft + innerWidth + 6}
              y={y + 3}
              fontSize="10"
              fill="var(--text-tertiary)"
            >
              {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
            </text>
          </g>
        );
      })}

      {data.map((item, index) => {
        const h = (item.count / max) * innerHeight;
        const x = padLeft + step * index + (step - barWidth) / 2;
        const y = padTop + innerHeight - h;
        return (
          <rect
            key={item.date}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx="1.5"
            fill="var(--color-pale-mint)"
          />
        );
      })}

      {points.length > 0 && (
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="var(--color-interactive)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {data.map((item, index) => {
        if (index % labelEvery !== 0 && index !== data.length - 1) return null;
        const date = new Date(`${item.date}T00:00:00`);
        const label = `${date.toLocaleString('en', { month: 'short' })} ${date.getDate()}`;
        return (
          <text
            key={`${item.date}-label`}
            x={padLeft + step * index + step / 2}
            y={height - 8}
            fontSize="10"
            fill="var(--text-tertiary)"
            textAnchor="middle"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
