/** Screen shown when a survey token is not found or invalid */
export function InvalidTokenScreen(): React.ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4" data-testid="invalid-token">
      <div className="w-full max-w-[600px] rounded-lg border border-[var(--grey-100)] bg-[var(--grey-50)] p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[var(--grey-900)]">
          Invalid Survey Link
        </h1>
        <p className="text-[var(--text-secondary)]">
          This survey link is not valid. Please check the link and try again, or
          contact the person who shared it with you.
        </p>
      </div>
    </div>
  );
}
