import { CompassLogo } from '../../../components/brand/compass-logo';

/**
 * Desktop-only brand panel shown on the left half of the login screen.
 * Displays the compass logo with gradient headline, COLLECTIVE wordmark,
 * and secondary tagline on a navy-teal background.
 */
export function BrandPanel(): React.ReactElement {
  return (
    <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-[var(--color-navy-teal)]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <CompassLogo size="lg" variant="on-dark" className="mb-6" />

        <h1
          className="text-[26px] font-[800] tracking-wide"
          style={{
            fontFamily: 'var(--font-display)',
            backgroundImage: 'var(--gradient-display)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Collective Culture Compass
        </h1>

        <p
          className="mt-2 text-sm font-light tracking-wide"
          style={{ fontFamily: 'var(--font-body)', color: '#C2C1C2' }}
        >
          by COLLECTIVE culture + communication
        </p>

        <p
          className="mt-6 max-w-xs text-base font-light leading-relaxed text-[#E5E4E0]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Understand your organization&apos;s culture.
          <br />
          Make communication that lands.
        </p>
      </div>

      <div className="px-10 pb-8">
        <p className="text-[10px] font-semibold tracking-[3px] text-[#8AC3A9]">
          COLLECTIVE
        </p>
        <p className="mt-1 text-[9px] text-[#C2C1C2]">
          culture + communication
        </p>
        <p className="mt-3 text-[8px] font-semibold tracking-[1.5px] text-white/25">
          YOUR PEOPLE. YOUR STORY.
        </p>
      </div>
    </div>
  );
}
