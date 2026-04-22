/**
 * Card — the universal container.
 *
 * Severity prop adds a coloured left border via the existing `.card--healthy`,
 * `.card--warning`, `.card--error` modifiers.
 *
 * @module components/Card
 */

import type { ComponentChildren, JSX } from 'preact';

export interface CardProps {
  severity?: 'healthy' | 'warning' | 'error';
  class?: string;
  children: ComponentChildren;
}

export function Card(props: CardProps): JSX.Element {
  const { severity, children } = props;
  const classes = ['card', severity ? `card--${severity}` : '', props.class ?? '']
    .filter(Boolean)
    .join(' ');

  return <div class={classes}>{children}</div>;
}
