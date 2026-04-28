/**
 * Annotation — Caveat-script ink annotation, used for sketchy notes / labels.
 *
 * Direction D uses these sparingly: rail "~ ops" affordance, run-banner
 * "~ pushing migrations…" status hint, "↓ live feed" arrow. Cyan accent
 * via the `.an` utility class; size variants `sm | md | lg`.
 *
 * @module components/Annotation
 */

import type { ComponentChildren, JSX } from 'preact';

export interface AnnotationProps {
  size?: 'sm' | 'md' | 'lg';
  children: ComponentChildren;
}

export function Annotation(props: AnnotationProps): JSX.Element {
  const size = props.size ?? 'md';
  return <span class={`an an-${size}`}>{props.children}</span>;
}
