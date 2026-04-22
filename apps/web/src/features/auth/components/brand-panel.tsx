/**
 * Desktop-only brand panel shown on the left half of the login screen.
 * Displays the compass logo with gradient headline, COLLECTIVE wordmark,
 * and secondary tagline on a navy-teal background.
 */
export function BrandPanel(): React.ReactElement {
  return (
    <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-[var(--color-navy-teal)]">
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <img
          src="/compass-brand-panel.svg"
          alt="The Collective Culture Compass"
          className="mb-6 h-28 w-28"
        />

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
          The Collective Culture Compass&#8482;
        </h1>

        <p
          className="mt-6 max-w-xs text-base font-light leading-relaxed text-[var(--grey-100)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Know where your culture stands.
          <br />
          Navigate where you&apos;re going.
        </p>
      </div>

      <div className="px-10 pb-8">
        <img
          src="/wordmark-white.png"
          alt="COLLECTIVE culture + communication"
          className="h-10 w-auto opacity-80"
        />
      </div>
    </div>
  );
}
