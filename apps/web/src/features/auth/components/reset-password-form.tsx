import { useState, useId, type FormEvent } from 'react';

interface ResetPasswordFormProps {
  onSubmit: (newPassword: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const MIN_PASSWORD_LENGTH = 8;
const HAS_LETTER_AND_DIGIT = /(?=.*[A-Za-z])(?=.*\d)/;

/**
 * New-password + confirm-password form for the recovery-link landing page.
 * Validation matches `supabase/config.toml`:
 *   - `minimum_password_length = 8`
 *   - `password_requirements = "letters_digits"` → must contain at least
 *     one letter and one digit.
 * Client-side validation matches the server rules so the Submit button is
 * only enabled when the password will actually be accepted (per the
 * project's "make the right thing easy" UX rule in CLAUDE.md).
 */
export function ResetPasswordForm({
  onSubmit,
  isLoading,
  error,
}: ResetPasswordFormProps): React.ReactElement {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);
  const errorId = useId();

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const missingComplexity = password.length >= MIN_PASSWORD_LENGTH && !HAS_LETTER_AND_DIGIT.test(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  const passwordValid = password.length >= MIN_PASSWORD_LENGTH && HAS_LETTER_AND_DIGIT.test(password);
  const canSubmit = passwordValid && confirm === password && !isLoading;

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    await onSubmit(password);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-new-password" className="text-sm font-medium text-[var(--grey-700)]">
          New password
        </label>
        <input
          id="reset-new-password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setPasswordTouched(true)}
          disabled={isLoading}
          aria-invalid={passwordTouched && (tooShort || missingComplexity) ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="At least 8 characters, letters and numbers"
        />
        {passwordTouched && tooShort && (
          <p className="text-xs text-[var(--feedback-error-text)]">
            Password must be at least {MIN_PASSWORD_LENGTH} characters.
          </p>
        )}
        {passwordTouched && missingComplexity && (
          <p className="text-xs text-[var(--feedback-error-text)]">
            Password must include at least one letter and one number.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-confirm-password" className="text-sm font-medium text-[var(--grey-700)]">
          Confirm new password
        </label>
        <input
          id="reset-confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          onBlur={() => setConfirmTouched(true)}
          disabled={isLoading}
          aria-invalid={confirmTouched && mismatch ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="rounded-lg border border-[var(--grey-100)] bg-[var(--surface-card)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-interactive)] focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Re-enter your new password"
        />
        {confirmTouched && mismatch && (
          <p className="text-xs text-[var(--feedback-error-text)]">Passwords don't match.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        aria-describedby={error ? errorId : undefined}
        className="mt-2 rounded-lg bg-[var(--color-navy-teal)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-navy-teal)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--color-interactive)]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Updating\u2026' : 'Update password'}
      </button>

      {error && (
        <p id={errorId} role="alert" className="text-center text-sm text-[var(--feedback-error-text)]">
          {error}
        </p>
      )}
    </form>
  );
}
