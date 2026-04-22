/**
 * SectionRenderer — one switch over every `DetailSection.kind`.
 *
 * Provider cards on the Deploy screen feed their lazily-loaded
 * {@link DetailSection DetailSection[]} payload through this renderer; adding
 * a new provider is a config-only change as long as one of the built-in kinds
 * fits. The `custom-module` escape hatch dynamic-imports the provider-supplied
 * module (default export = a Preact component) and mounts it in place.
 *
 * @module sections/SectionRenderer
 */

import type { ComponentType, JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { StatusDot } from '../components/StatusDot.js';
import { ProgressBar } from '../components/ProgressBar.js';
import { Card } from '../components/Card.js';
import type { DetailSection } from '../types.js';

export interface SectionRendererProps {
  sections: DetailSection[];
}

export function SectionRenderer(props: SectionRendererProps): JSX.Element {
  const { sections } = props;
  return (
    <div class="section-list">
      {sections.map((section, i) => (
        <Section key={`${section.kind}:${section.title}:${i}`} section={section} />
      ))}
    </div>
  );
}

function Section(props: { section: DetailSection }): JSX.Element {
  const { section } = props;

  switch (section.kind) {
    case 'kv':
      return <KvSection section={section} />;
    case 'metric-grid':
      return <MetricGridSection section={section} />;
    case 'list':
      return <ListSection section={section} />;
    case 'progress':
      return <ProgressSection section={section} />;
    case 'table':
      return <TableSection section={section} />;
    case 'custom-module':
      return <ModuleHost section={section} />;
  }
}

// ---------------------------------------------------------------------------
// Built-in kinds
// ---------------------------------------------------------------------------

function SectionHeader(props: { title: string }): JSX.Element {
  return <h3 class="section__title">{props.title}</h3>;
}

function KvSection(props: {
  section: Extract<DetailSection, { kind: 'kv' }>;
}): JSX.Element {
  const { section } = props;
  return (
    <Card>
      <SectionHeader title={section.title} />
      <dl class="section__kv">
        {section.items.map((item) => (
          <div class="section__kv-row" key={item.label}>
            <dt class="section__kv-label">{item.label}</dt>
            <dd class="section__kv-value">{item.value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function MetricGridSection(props: {
  section: Extract<DetailSection, { kind: 'metric-grid' }>;
}): JSX.Element {
  const { section } = props;
  return (
    <Card>
      <SectionHeader title={section.title} />
      <div class="section__metric-grid">
        {section.metrics.map((metric) => (
          <div class="section__metric" key={metric.label}>
            <span class="section__metric-label">
              {metric.status && <StatusDot status={metric.status} />}
              {metric.label}
            </span>
            <span class="section__metric-value">{metric.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ListSection(props: {
  section: Extract<DetailSection, { kind: 'list' }>;
}): JSX.Element {
  const { section } = props;
  return (
    <Card>
      <SectionHeader title={section.title} />
      <ul class="section__list">
        {section.items.map((item, i) => (
          <li class="section__list-row" key={`${item.label}:${i}`}>
            <span class="section__list-label">
              {item.status && <StatusDot status={item.status} />}
              {item.label}
            </span>
            {item.meta !== undefined && (
              <span class="section__list-meta">{item.meta}</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ProgressSection(props: {
  section: Extract<DetailSection, { kind: 'progress' }>;
}): JSX.Element {
  const { section } = props;
  return (
    <Card>
      <SectionHeader title={section.title} />
      <div class="section__progress-meta">
        <span>{`${section.current} / ${section.total}`}</span>
        {section.meta !== undefined && <span>{section.meta}</span>}
      </div>
      <ProgressBar value={section.current} max={section.total} />
    </Card>
  );
}

function TableSection(props: {
  section: Extract<DetailSection, { kind: 'table' }>;
}): JSX.Element {
  const { section } = props;
  return (
    <Card>
      <SectionHeader title={section.title} />
      <div class="section__table-wrap">
        <table class="section__table">
          <thead>
            <tr>
              {section.columns.map((col) => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// custom-module — dynamic-import + mount the default-exported component
// ---------------------------------------------------------------------------

interface ModuleHostProps {
  section: Extract<DetailSection, { kind: 'custom-module' }>;
}

/**
 * Dynamic-import a provider-supplied module and mount its default-exported
 * Preact component with `{}` props. Shows a loading line while the import is
 * pending and an error message (with the module path) if the import fails.
 */
function ModuleHost(props: ModuleHostProps): JSX.Element {
  const { section } = props;
  const [state, setState] = useState<
    | { phase: 'loading' }
    | { phase: 'ready'; Component: ComponentType }
    | { phase: 'error'; message: string }
  >({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = (await import(/* @vite-ignore */ section.modulePath)) as {
          default?: ComponentType;
        };
        if (cancelled) return;
        if (!mod.default) {
          setState({
            phase: 'error',
            message: `Module ${section.modulePath} has no default export`,
          });
          return;
        }
        setState({ phase: 'ready', Component: mod.default });
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ phase: 'error', message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [section.modulePath]);

  return (
    <Card>
      <SectionHeader title={section.title} />
      {state.phase === 'loading' && (
        <p class="section__module-status">Loading module…</p>
      )}
      {state.phase === 'error' && (
        <p class="section__module-status section__module-status--error">
          Failed to load module: {state.message}
        </p>
      )}
      {state.phase === 'ready' && <state.Component />}
    </Card>
  );
}
