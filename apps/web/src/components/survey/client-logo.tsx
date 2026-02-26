import { useState } from 'react';
import { Building2 } from 'lucide-react';

const SIZE_MAP = {
  sm: 24,
  md: 32,
  lg: 48,
} as const;

type LogoSize = keyof typeof SIZE_MAP;

interface ClientLogoProps {
  /** URL of the organization logo image. */
  src?: string;
  /** Organization name, used for initials fallback. */
  orgName: string;
  /** Display size. Defaults to 'md'. */
  size?: LogoSize;
  /** Additional CSS classes. */
  className?: string;
}

/**
 * Extracts up to two uppercase initials from an organization name.
 *
 * "River Valley" -> "RV", "Acme" -> "AC", "" -> ""
 */
export function extractInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/);

  if (words.length >= 2) {
    return `${words[0]![0]!.toUpperCase()}${words[1]![0]!.toUpperCase()}`;
  }

  const single = words[0]!;
  if (single.length >= 2) {
    return `${single[0]!.toUpperCase()}${single[1]!.toUpperCase()}`;
  }

  return single[0]!.toUpperCase();
}

/**
 * Renders an organization logo image with an initials fallback.
 * Falls back to a building icon when orgName is empty.
 */
export function ClientLogo({
  src,
  orgName,
  size = 'md',
  className = '',
}: ClientLogoProps): React.ReactElement {
  const [imgError, setImgError] = useState(false);
  const px = SIZE_MAP[size];
  const initials = extractInitials(orgName);

  const showImage = src && !imgError;

  if (showImage) {
    return (
      <img
        src={src}
        alt={`${orgName} logo`}
        width={px}
        height={px}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  if (!initials) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-[var(--color-core)] text-white ${className}`}
        style={{ width: px, height: px }}
        aria-hidden="true"
      >
        <Building2 size={px * 0.5} />
      </span>
    );
  }

  const fontSize = px * 0.4;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[var(--color-core)] text-white font-semibold select-none ${className}`}
      style={{ width: px, height: px, fontSize }}
      role="img"
      aria-label={`${orgName} initials`}
    >
      {initials}
    </span>
  );
}
