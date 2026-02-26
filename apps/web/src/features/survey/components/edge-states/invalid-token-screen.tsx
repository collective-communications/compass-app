/** Screen shown when a survey token is not found or invalid */
export function InvalidTokenScreen(): React.ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-[#E5E4E0] bg-white p-8 text-center">
        <h1 className="mb-3 text-xl font-semibold text-[#212121]">
          Invalid Survey Link
        </h1>
        <p className="text-[#616161]">
          This survey link is not valid. Please check the link and try again, or
          contact the person who shared it with you.
        </p>
      </div>
    </div>
  );
}
