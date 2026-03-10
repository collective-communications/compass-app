import { CompassLogo } from '../../../components/brand/compass-logo';

/**
 * Desktop-only brand panel shown on the left half of the login screen.
 * Displays the compass logo, product title, and COLLECTIVE wordmark.
 */
export function BrandPanel(): React.ReactElement {
  return (
    <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center bg-[var(--color-core)]">
      <div className="flex flex-col items-center text-center text-white">
        <CompassLogo size="lg" className="mb-6 [--color-core:white] [--color-clarity:rgba(255,255,255,0.6)]" />

        <h1
          className="text-3xl font-bold tracking-wide"
          style={{ fontFamily: 'var(--font-headings)' }}
        >
          Culture Compass
        </h1>

        <p
          className="mt-2 text-sm font-light tracking-wide opacity-80"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          by COLLECTIVE culture + communication
        </p>

        <p
          className="mt-6 max-w-xs text-sm font-light leading-relaxed opacity-60"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Understand your organization's culture. Align your teams. Drive meaningful change.
        </p>
      </div>
    </div>
  );
}
