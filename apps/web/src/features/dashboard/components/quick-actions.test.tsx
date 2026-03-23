import { afterEach, describe, expect, test, mock } from 'bun:test';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { QuickActions } from './quick-actions';

describe('QuickActions', () => {
  afterEach(cleanup);

  const defaultProps = {
    deploymentUrl: 'https://example.com/s/abc123',
  };

  test('renders Copy Link button', () => {
    render(<QuickActions {...defaultProps} />);
    expect(screen.getByLabelText('Copy survey link to clipboard')).toBeTruthy();
    expect(screen.getByText('Copy Link')).toBeTruthy();
  });

  test('disables Copy Link button when deploymentUrl is null', () => {
    render(<QuickActions deploymentUrl={null} />);
    const btn = screen.getByLabelText('Copy survey link to clipboard');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  test('Copy Link button is enabled when deploymentUrl is provided', () => {
    render(<QuickActions {...defaultProps} />);
    const btn = screen.getByLabelText('Copy survey link to clipboard');
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  test('clicking Copy Link calls clipboard API and shows Copied! feedback', async () => {
    const writeText = mock(() => Promise.resolve());
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    render(<QuickActions {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Copy survey link to clipboard'));

    // Wait for async clipboard call to resolve and UI to update
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://example.com/s/abc123');
      expect(screen.getByText('Copied!')).toBeTruthy();
    });

    // Restore
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });
});
