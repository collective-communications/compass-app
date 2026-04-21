import { afterEach, describe, expect, mock, test } from 'bun:test';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AppErrorFallback } from './app-error-fallback';

describe('AppErrorFallback', () => {
  afterEach(cleanup);

  test('renders Error instance message', () => {
    render(<AppErrorFallback error={new Error('boom')} />);
    expect(screen.getByText('boom')).toBeTruthy();
  });

  test('renders string error as-is', () => {
    render(<AppErrorFallback error="oh no" />);
    expect(screen.getByText('oh no')).toBeTruthy();
  });

  test('renders plain object via JSON.stringify', () => {
    render(<AppErrorFallback error={{ code: 500, message: 'server' }} />);
    const body = screen.getByText(/500/);
    expect(body).toBeTruthy();
    expect(body.textContent).toContain('server');
  });

  test('renders null without throwing', () => {
    expect(() => render(<AppErrorFallback error={null} />)).not.toThrow();
    expect(screen.getByText('null')).toBeTruthy();
  });

  test('renders Retry button and wires onClick exactly once', () => {
    const onRetry = mock(() => {});
    render(<AppErrorFallback error="err" onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: 'Retry' });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('omits Retry button when onRetry is not provided', () => {
    const { container } = render(<AppErrorFallback error="err" />);
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(0);
  });

  test('renders custom title as heading', () => {
    render(<AppErrorFallback error="err" title="Totally broken" />);
    const heading = screen.getByRole('heading', { name: 'Totally broken' });
    expect(heading).toBeTruthy();
  });
});
