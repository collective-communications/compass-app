/**
 * Desktop-only brand panel shown on the left half of the login screen.
 * Displays the COLLECTIVE culture + communication wordmark.
 */
export function BrandPanel(): React.ReactElement {
  return (
    <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:items-center lg:justify-center bg-[var(--color-core)]">
      <div className="text-center text-white">
        <p
          className="text-4xl font-bold tracking-wider"
          style={{ fontFamily: 'var(--font-headings)' }}
        >
          COLLECTIVE
        </p>
        <p
          className="mt-2 text-lg font-light tracking-wide opacity-80"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          culture + communication
        </p>
      </div>
    </div>
  );
}
