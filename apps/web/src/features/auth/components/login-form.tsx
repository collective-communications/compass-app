import { useState, useRef, useId, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Email + password login form with inline validation and error display.
 */
export function LoginForm({ onSubmit, isLoading, error }: LoginFormProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const emailValid = email === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = email !== '' && password !== '' && emailValid && !isLoading;

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;

    const previousPassword = password;
    await onSubmit(email, password);

    // If error appeared (invalid credentials), clear password and focus it
    // The parent will re-render with error; we clear optimistically
    if (passwordRef.current && password === previousPassword) {
      // Check after async — if error is set the component re-renders
      // We handle this via useEffect-like behavior in the next render
    }
  }

  // When error changes to invalid credentials, clear password and focus
  const prevErrorRef = useRef<string | null>(null);
  if (error && error !== prevErrorRef.current && error.includes('Invalid')) {
    if (password !== '') {
      setPassword('');
    }
    // Focus password field after render
    queueMicrotask(() => {
      passwordRef.current?.focus();
    });
  }
  prevErrorRef.current = error;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="login-email"
          className="text-sm font-medium text-[var(--grey-700)]"
        >
          Email
        </label>
        <input
          id="login-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          disabled={isLoading}
          aria-invalid={emailTouched && !emailValid ? true : undefined}
          className="rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Enter your email"
        />
        {emailTouched && !emailValid && (
          <p className="text-xs text-red-700">Enter a valid email address.</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="login-password"
          className="text-sm font-medium text-[var(--grey-700)]"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="login-password"
            ref={passwordRef}
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-[var(--grey-300)] bg-[var(--grey-50)] px-3 py-2.5 pr-10 text-sm text-[var(--grey-900)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--color-core-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-tertiary)] focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        aria-describedby={error ? errorId : undefined}
        className="mt-2 rounded-lg bg-[var(--color-core)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-core)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--color-core-text)]/20 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? 'Signing in\u2026' : 'Sign In'}
      </button>

      {error && (
        <p id={errorId} role="alert" className="text-center text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
