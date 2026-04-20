import type { ReactElement } from 'react';
import { neutralCharcoal } from '@compass/tokens';

interface CompassLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'on-dark';
  className?: string;
}

const SIZES = { sm: 24, md: 32, lg: 48 } as const;

/**
 * 3-segment compass logo mark.
 * Clarity (coral) top, Connection (seafoam) bottom-left, Collaboration (salmon) bottom-right.
 *
 * - `default` variant: solid fills with dark outline — for light backgrounds.
 * - `on-dark` variant: reduced-opacity fills with translucent halo rings — for brand panel.
 */
export function CompassLogo({ size = 'md', variant = 'default', className }: CompassLogoProps): ReactElement {
  const px = SIZES[size];
  const onDark = variant === 'on-dark';

  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Collective Culture Compass logo"
      className={className}
    >
      {onDark && (
        <>
          <circle cx="24" cy="24" r="23" fill="rgba(255,255,255,0.06)" />
          <circle cx="24" cy="24" r="22.5" fill="rgba(255,255,255,0.08)" />
        </>
      )}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="var(--color-core)"
        stroke={onDark ? 'none' : neutralCharcoal}
        strokeWidth={onDark ? 0 : 1}
      />
      {/* Clarity — top */}
      <path
        d="M6.68,14 A20,20 0 0,1 41.32,14 L24,24 Z"
        fill="var(--color-clarity)"
        opacity={onDark ? 0.85 : 1}
      />
      {/* Connection — bottom-left */}
      <path
        d="M24,44 A20,20 0 0,1 6.68,14 L24,24 Z"
        fill="var(--color-connection)"
        opacity={onDark ? 0.85 : 1}
      />
      {/* Collaboration — bottom-right */}
      <path
        d="M41.32,14 A20,20 0 0,1 24,44 L24,24 Z"
        fill="var(--color-collaboration)"
        opacity={onDark ? 0.85 : 1}
      />
      {/* Divider lines */}
      <line x1="24" y1="24" x2="24" y2="44" stroke="var(--color-core)" strokeWidth="1.5" />
      <line x1="24" y1="24" x2="6.68" y2="14" stroke="var(--color-core)" strokeWidth="1.5" />
      <line x1="24" y1="24" x2="41.32" y2="14" stroke="var(--color-core)" strokeWidth="1.5" />
    </svg>
  );
}
