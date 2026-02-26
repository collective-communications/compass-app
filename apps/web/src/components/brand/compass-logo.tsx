import type { ReactElement } from 'react';

interface CompassLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 24, md: 32, lg: 48 } as const;

export function CompassLogo({ size = 'md', className }: CompassLogoProps): ReactElement {
  const px = SIZES[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 32 32"
      role="img"
      aria-label="COLLECTIVE culture + communication logo"
      className={className}
    >
      <circle cx="16" cy="16" r="15" fill="none" stroke="var(--color-core)" strokeWidth="2" />
      <polygon points="16,4 20,16 16,28 12,16" fill="var(--color-core)" opacity="0.8" />
      <polygon points="4,16 16,12 28,16 16,20" fill="var(--color-clarity)" opacity="0.6" />
      <circle cx="16" cy="16" r="3" fill="var(--color-core)" />
    </svg>
  );
}
