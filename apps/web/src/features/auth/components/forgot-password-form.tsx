import { useState, useId, type FormEvent } from 'react';

interface ForgotPasswordFormProps {
  onSubmit: (email: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Email-only form for requesting a password reset link.
 * Mirrors the styling conventions of LoginForm.
 */
export function ForgotPasswordForm({ onSubmit, isLoading, error }: ForgotPasswordFormProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const errorId = useId();

  const emailValid = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = email.trim() !== '' && emailValid && !isLoading;

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit(email.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="reset-email"
          className="text-sm font-medium text-[var(--grey-700)]"
        >
          Email
        </label>
        <input
          id="reset-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          disabled={isLoading}
          aria-invalid={emailTouched && !emailValid ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="you@example.com"
        />
        {emailTouched && !emailValid && (
          <p className="text-xs text-red-700">Enter a valid email address.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        aria-describedby={error ? errorId : undefined}
        className="mt-2 rounded-lg bg-[var(--color-interactive)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-interactive)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Sending\u2026' : 'Send Reset Link'}
      </button>

      {error && (
        <p id={errorId} role="alert" className="text-center text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
