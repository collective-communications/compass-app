interface SocialSignOnButtonsProps {
  onSignIn: (provider: 'google' | 'azure') => Promise<void>;
  isLoading: boolean;
}

function GoogleIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function MicrosoftIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <rect x="0" y="0" width="8.5" height="8.5" fill="#F25022" />
      <rect x="9.5" y="0" width="8.5" height="8.5" fill="#7FBA00" />
      <rect x="0" y="9.5" width="8.5" height="8.5" fill="#00A4EF" />
      <rect x="9.5" y="9.5" width="8.5" height="8.5" fill="#FFB900" />
    </svg>
  );
}

/**
 * Google and Microsoft OAuth sign-in buttons with an "or" separator.
 */
export function SocialSignOnButtons({ onSignIn, isLoading }: SocialSignOnButtonsProps): React.ReactElement {
  const buttonClasses =
    'flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-4 py-2.5 text-sm font-medium text-[var(--grey-700)] transition-colors hover:bg-[var(--grey-50)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-[var(--grey-200)]" />
        <span className="text-xs text-[var(--text-tertiary)]">or</span>
        <div className="h-px flex-1 bg-[var(--grey-200)]" />
      </div>

      <button
        type="button"
        disabled={isLoading}
        onClick={() => onSignIn('google')}
        className={buttonClasses}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <button
        type="button"
        disabled={isLoading}
        onClick={() => onSignIn('azure')}
        className={buttonClasses}
      >
        <MicrosoftIcon />
        Continue with Microsoft
      </button>
    </div>
  );
}
