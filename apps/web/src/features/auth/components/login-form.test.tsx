import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LoginForm } from './login-form';
import { SocialSignOnButtons } from './social-sign-on-buttons';
import { ForgotPasswordForm } from './forgot-password-form';

describe('LoginForm', () => {
  afterEach(cleanup);

  test('renders email and password fields', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={false} error={null} />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  test('renders submit button with "Sign In" text', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={false} error={null} />);
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeTruthy();
  });

  test('submit button is disabled when fields are empty', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={false} error={null} />);
    const button = screen.getByRole('button', { name: 'Sign In' });
    expect(button.getAttribute('disabled')).toBe('');
  });

  test('submit button is disabled when only email is filled', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    const button = screen.getByRole('button', { name: 'Sign In' });
    expect(button.getAttribute('disabled')).toBe('');
  });

  test('submit button enables when both fields are filled with valid email', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    const button = screen.getByRole('button', { name: 'Sign In' });
    expect(button.getAttribute('disabled')).toBeNull();
  });

  test('shows validation error for invalid email after blur', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={false} error={null} />);
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.blur(emailInput);
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  });

  test('does not show validation error before blur', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    expect(screen.queryByText('Enter a valid email address.')).toBeNull();
  });

  test('calls onSubmit with email and password on form submission', async () => {
    const onSubmit = mock(async () => {});
    render(<LoginForm onSubmit={onSubmit} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign In' }).closest('form')!);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('test@example.com', 'secret');
    });
  });

  test('shows loading state when isLoading is true', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={true} error={null} />);
    expect(screen.getByRole('button', { name: /Signing in/ })).toBeTruthy();
  });

  test('disables inputs when loading', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={true} error={null} />);
    expect(screen.getByLabelText('Email').getAttribute('disabled')).toBe('');
    expect(screen.getByLabelText('Password').getAttribute('disabled')).toBe('');
  });

  test('displays error message with alert role', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={false} error="Invalid credentials" />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Invalid credentials');
  });

  test('does not render error element when error is null', () => {
    render(<LoginForm onSubmit={async () => {}} isLoading={false} error={null} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('SocialSignOnButtons', () => {
  afterEach(cleanup);

  test('renders Google and Microsoft buttons', () => {
    render(<SocialSignOnButtons onSignIn={async () => {}} isLoading={false} />);
    expect(screen.getByRole('button', { name: /Google/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Microsoft/ })).toBeTruthy();
  });

  test('renders "or" separator', () => {
    render(<SocialSignOnButtons onSignIn={async () => {}} isLoading={false} />);
    expect(screen.getByText('or')).toBeTruthy();
  });

  test('clicking Google button calls onSignIn with "google"', () => {
    const onSignIn = mock(async () => {});
    render(<SocialSignOnButtons onSignIn={onSignIn} isLoading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Google/ }));
    expect(onSignIn).toHaveBeenCalledWith('google');
  });

  test('clicking Microsoft button calls onSignIn with "azure"', () => {
    const onSignIn = mock(async () => {});
    render(<SocialSignOnButtons onSignIn={onSignIn} isLoading={false} />);
    fireEvent.click(screen.getByRole('button', { name: /Microsoft/ }));
    expect(onSignIn).toHaveBeenCalledWith('azure');
  });

  test('disables buttons when loading', () => {
    render(<SocialSignOnButtons onSignIn={async () => {}} isLoading={true} />);
    expect(screen.getByRole('button', { name: /Google/ }).getAttribute('disabled')).toBe('');
    expect(screen.getByRole('button', { name: /Microsoft/ }).getAttribute('disabled')).toBe('');
  });
});

describe('ForgotPasswordForm', () => {
  afterEach(cleanup);

  test('renders email field and submit button', () => {
    render(<ForgotPasswordForm onSubmit={async () => {}} isLoading={false} error={null} />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeTruthy();
  });

  test('submit button is disabled when email is empty', () => {
    render(<ForgotPasswordForm onSubmit={async () => {}} isLoading={false} error={null} />);
    const button = screen.getByRole('button', { name: 'Send Reset Link' });
    expect(button.getAttribute('disabled')).toBe('');
  });

  test('submit button enables with valid email', () => {
    render(<ForgotPasswordForm onSubmit={async () => {}} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    const button = screen.getByRole('button', { name: 'Send Reset Link' });
    expect(button.getAttribute('disabled')).toBeNull();
  });

  test('calls onSubmit with trimmed email on form submission', async () => {
    const onSubmit = mock(async () => {});
    render(<ForgotPasswordForm onSubmit={onSubmit} isLoading={false} error={null} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  test@example.com  ' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Send Reset Link' }).closest('form')!);
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('test@example.com');
    });
  });

  test('shows loading state when isLoading is true', () => {
    render(<ForgotPasswordForm onSubmit={async () => {}} isLoading={true} error={null} />);
    expect(screen.getByRole('button', { name: /Sending/ })).toBeTruthy();
  });

  test('shows validation error for invalid email after blur', () => {
    render(<ForgotPasswordForm onSubmit={async () => {}} isLoading={false} error={null} />);
    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'bad-email' } });
    fireEvent.blur(emailInput);
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();
  });

  test('displays error message with alert role', () => {
    render(<ForgotPasswordForm onSubmit={async () => {}} isLoading={false} error="Something went wrong" />);
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Something went wrong');
  });

  test('disables email input when loading', () => {
    render(<ForgotPasswordForm onSubmit={async () => {}} isLoading={true} error={null} />);
    expect(screen.getByLabelText('Email').getAttribute('disabled')).toBe('');
  });
});
