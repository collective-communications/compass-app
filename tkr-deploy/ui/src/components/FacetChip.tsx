/**
 * FacetChip — provider chip showing what a run touched.
 *
 * Each run lists its facet chips: Vault → Supabase → Vercel → Resend → GitHub,
 * so you see at a glance what changed where. Status of `down` puts a red
 * border on the chip; `running` puts a cyan border.
 *
 * @module components/FacetChip
 */

import type { JSX } from 'preact';

export type FacetProvider = 'Vault' | 'Supabase' | 'Vercel' | 'Resend' | 'GitHub';
export type FacetStatus = 'ok' | 'running' | 'down' | 'queued' | 'skipped';

export interface FacetChipProps {
  provider: FacetProvider;
  /** Short human description of what changed (e.g. "+3 secrets", "migrate db", "deploy"). */
  change?: string;
  status?: FacetStatus;
}

const GLYPHS: Record<FacetProvider, string> = {
  Vault: '◇',
  Supabase: '◐',
  Vercel: '▲',
  Resend: '✉',
  GitHub: '◆',
};

export function FacetChip(props: FacetChipProps): JSX.Element {
  const { provider, change, status = 'ok' } = props;
  const cls = [
    'facet-chip',
    status === 'down' ? 'facet-chip--down' : '',
    status === 'running' ? 'facet-chip--running' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span class={cls}>
      <span class="facet-chip__glyph" aria-hidden="true">
        {GLYPHS[provider]}
      </span>
      <span class="facet-chip__provider">{provider}</span>
      {change !== undefined && <span class="facet-chip__change">{change}</span>}
      {status === 'down' && (
        <span class="facet-chip__status facet-chip__status--down">· failed</span>
      )}
      {status === 'running' && (
        <span class="facet-chip__status facet-chip__status--running">· running</span>
      )}
    </span>
  );
}
