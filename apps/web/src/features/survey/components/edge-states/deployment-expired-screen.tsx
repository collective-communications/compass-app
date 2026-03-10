/** Screen shown when a deployment link has expired (token is no longer valid). */
export function DeploymentExpiredScreen(): React.ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4" data-testid="deployment-expired">
      <div className="w-full max-w-[600px] rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[var(--grey-900)]">
          Survey Link Expired
        </h1>
        <p className="text-[#616161]">
          This survey link is no longer valid. Please contact the person who shared
          it with you to request a new link.
        </p>
      </div>
    </div>
  );
}
