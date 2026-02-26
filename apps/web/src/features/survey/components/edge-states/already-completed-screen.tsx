/** Screen shown when a survey has already been completed on this device */
export function AlreadyCompletedScreen(): React.ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-[#E5E4E0] bg-white p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[#212121]">
          Survey Already Completed
        </h1>
        <p className="text-[#616161]">
          You've already completed this survey. Thank you for your participation!
        </p>
      </div>
    </div>
  );
}
