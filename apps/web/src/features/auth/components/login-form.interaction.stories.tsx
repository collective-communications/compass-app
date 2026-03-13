import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, expect, within, userEvent, waitFor } from 'storybook/test';
import { LoginForm } from './login-form';
import { PublicShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';
import {
  fillForm,
  expectDisabled,
  expectEnabled,
} from '../../../../../../apps/storybook/test-utils/interaction-helpers';

/**
 * Interaction stories for LoginForm.
 *
 * These are **reference implementations** — future form-based interaction
 * stories should follow the patterns demonstrated here:
 *
 * 1. Use `fn()` spies on callback props so assertions can verify call args.
 * 2. Use `fillForm()` to populate fields by label.
 * 3. Use `expectDisabled()` / `expectEnabled()` for submit-button state.
 * 4. Use `expectInlineError()` for validation feedback.
 * 5. Name each export after the scenario it tests.
 */
const meta = {
  title: 'Features/Auth/LoginForm/Interactions',
  component: LoginForm,
  decorators: [PublicShellDecorator],
  args: {
    onSubmit: fn(),
    isLoading: false,
    error: null,
  },
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------- */
/*  Scenario: Successful submission                                           */
/* -------------------------------------------------------------------------- */

export const SubmitSuccess: Story = {
  name: 'Submit — valid credentials',
  args: {
    onSubmit: fn().mockResolvedValue(undefined),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Step 1 — Submit button starts disabled (empty form)
    await expectDisabled(canvas, 'Sign In');

    // Step 2 — Fill in email and password
    await fillForm(canvas, {
      Email: 'admin@example.com',
      Password: 'correct-password',
    });

    // Step 3 — Submit button becomes enabled
    await expectEnabled(canvas, 'Sign In');

    // Step 4 — Click submit
    await userEvent.click(canvas.getByRole('button', { name: 'Sign In' }));

    // Step 5 — Assert onSubmit called with the entered values
    await expect(args.onSubmit).toHaveBeenCalledWith(
      'admin@example.com',
      'correct-password',
    );
  },
};

/* -------------------------------------------------------------------------- */
/*  Scenario: Invalid email inline validation                                 */
/* -------------------------------------------------------------------------- */

export const InvalidEmail: Story = {
  name: 'Validation — invalid email',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1 — Type an invalid email
    await fillForm(canvas, { Email: 'not-an-email' });

    // Step 2 — Blur the field to trigger validation
    await userEvent.tab();

    // Step 3 — Inline error appears (wait for React re-render after blur)
    await waitFor(() => {
      expect(canvas.getByText('Enter a valid email address.')).toBeVisible();
    });

    // Step 4 — Submit button stays disabled
    await expectDisabled(canvas, 'Sign In');
  },
};

/* -------------------------------------------------------------------------- */
/*  Scenario: Server error displayed                                          */
/* -------------------------------------------------------------------------- */

export const ServerError: Story = {
  name: 'Error — invalid credentials',
  args: {
    error: 'Invalid email or password.',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1 — The error alert is visible
    const alert = canvas.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).toHaveTextContent('Invalid email or password.');
  },
};

/* -------------------------------------------------------------------------- */
/*  Scenario: Loading state                                                   */
/* -------------------------------------------------------------------------- */

export const Loading: Story = {
  name: 'State — loading',
  args: {
    isLoading: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1 — Button shows loading text and is disabled
    const button = canvas.getByRole('button', { name: /signing in/i });
    await expect(button).toBeVisible();
    await expect(button).toBeDisabled();
  },
};
