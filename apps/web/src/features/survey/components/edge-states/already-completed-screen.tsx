/** Screen shown when a survey has already been completed on this device */
export function AlreadyCompletedScreen(): React.ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4" data-testid="already-completed">
      <div className="container-survey bg-[var(--surface-card)] p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[var(--grey-900)]">
          Survey Already Completed
        </h1>
        <p className="text-[var(--text-secondary)]">
          You've already completed this survey. Thank you for your participation!
        </p>
      </div>
    </div>
  );
}
