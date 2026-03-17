import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn, expect, within, userEvent } from 'storybook/test';
import { buildLikertScale } from '@compass/types';
import { LikertScale } from './likert-scale';
import { SurveyShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';
import {
  selectLikertOption,
  expectVisible,
} from '../../../../../../apps/storybook/test-utils/interaction-helpers';

/**
 * Interaction stories for LikertScale.
 *
 * These are **reference implementations** — future survey interaction
 * stories should follow the patterns demonstrated here:
 *
 * 1. Use `SurveyShellDecorator` to wrap survey components in the anonymous shell.
 * 2. Use `selectLikertOption(canvas, n)` to click a Likert radio button.
 * 3. Use `userEvent.keyboard('{n}')` to test number-key shortcuts (when handled by parent).
 * 4. Use `expectVisible()` for state-change assertions.
 * 5. Structure play functions as sequential numbered steps.
 */
const meta = {
  title: 'Features/Survey/LikertScale/Interactions',
  component: LikertScale,
  args: {
    value: undefined,
    onChange: fn(),
    name: 'q-demo',
    scale: buildLikertScale(4),
  },
  decorators: [
    /** Wrap in a question-card-style container for visual context */
    (Story) => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--grey-700)' }}>
          Our leadership team communicates a clear vision for the future.
        </p>
        <Story />
      </div>
    ),
    SurveyShellDecorator,
  ],
} satisfies Meta<typeof LikertScale>;

export default meta;
type Story = StoryObj<typeof meta>;

/* -------------------------------------------------------------------------- */
/*  Scenario: Select an option via click                                      */
/* -------------------------------------------------------------------------- */

export const SelectViaClick: Story = {
  name: 'Select — click "Agree"',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Step 1 — No option is selected initially
    const radios = canvas.getAllByRole('radio');
    for (const radio of radios) {
      await expect(radio).toHaveAttribute('aria-checked', 'false');
    }

    // Step 2 — Click the third option (Agree)
    await selectLikertOption(canvas, 3);

    // Step 3 — onChange fires with value 3
    await expect(args.onChange).toHaveBeenCalledWith(3);
  },
};

/* -------------------------------------------------------------------------- */
/*  Scenario: Select each option sequentially                                 */
/* -------------------------------------------------------------------------- */

export const SelectEachOption: Story = {
  name: 'Select — all four options',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Step 1 — Select "Strongly Disagree" (1)
    await selectLikertOption(canvas, 1);
    await expect(args.onChange).toHaveBeenCalledWith(1);

    // Step 2 — Select "Disagree" (2)
    await selectLikertOption(canvas, 2);
    await expect(args.onChange).toHaveBeenCalledWith(2);

    // Step 3 — Select "Agree" (3)
    await selectLikertOption(canvas, 3);
    await expect(args.onChange).toHaveBeenCalledWith(3);

    // Step 4 — Select "Strongly Agree" (4)
    await selectLikertOption(canvas, 4);
    await expect(args.onChange).toHaveBeenCalledWith(4);

    // Step 5 — Total calls should be 4
    await expect(args.onChange).toHaveBeenCalledTimes(4);
  },
};

/* -------------------------------------------------------------------------- */
/*  Scenario: Pre-selected value renders correctly                            */
/* -------------------------------------------------------------------------- */

export const PreSelected: Story = {
  name: 'State — pre-selected value',
  args: {
    value: 2,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1 — "Disagree" radio is checked
    const disagreeRadio = canvas.getByRole('radio', { name: 'Disagree' });
    await expect(disagreeRadio).toHaveAttribute('aria-checked', 'true');

    // Step 2 — Label text is visible
    await expectVisible(canvas, 'Disagree');

    // Step 3 — Other options are unchecked
    const agreeRadio = canvas.getByRole('radio', { name: 'Agree' });
    await expect(agreeRadio).toHaveAttribute('aria-checked', 'false');
  },
};

/* -------------------------------------------------------------------------- */
/*  Scenario: Accessibility — all options have correct roles                  */
/* -------------------------------------------------------------------------- */

export const Accessible: Story = {
  name: 'A11y — radio group semantics',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1 — Radiogroup exists with label
    const group = canvas.getByRole('radiogroup', { name: 'Response options' });
    await expect(group).toBeVisible();

    // Step 2 — Exactly 4 radio buttons
    const radios = within(group).getAllByRole('radio');
    await expect(radios).toHaveLength(4);

    // Step 3 — Each radio has an aria-label
    await expect(radios[0]).toHaveAttribute('aria-label', 'Strongly Disagree');
    await expect(radios[1]).toHaveAttribute('aria-label', 'Disagree');
    await expect(radios[2]).toHaveAttribute('aria-label', 'Agree');
    await expect(radios[3]).toHaveAttribute('aria-label', 'Strongly Agree');
  },
};

/* -------------------------------------------------------------------------- */
/*  5-point scale variants                                                     */
/* -------------------------------------------------------------------------- */

export const FivePointSelectViaClick: Story = {
  name: '5pt — select "Neither Agree nor Disagree"',
  args: {
    scale: buildLikertScale(5),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Step 1 — 5 radio buttons rendered
    const radios = canvas.getAllByRole('radio');
    await expect(radios).toHaveLength(5);

    // Step 2 — Click the neutral option (3rd)
    await selectLikertOption(canvas, 3);

    // Step 3 — onChange fires with value 3
    await expect(args.onChange).toHaveBeenCalledWith(3);

    // Step 4 — Neutral label is visible
    await expectVisible(canvas, 'Neither Agree nor Disagree');
  },
};

export const FivePointSelectAll: Story = {
  name: '5pt — select all five options',
  args: {
    scale: buildLikertScale(5),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    // Step 1 — Select each option in order
    await selectLikertOption(canvas, 1);
    await expect(args.onChange).toHaveBeenCalledWith(1);

    await selectLikertOption(canvas, 2);
    await expect(args.onChange).toHaveBeenCalledWith(2);

    await selectLikertOption(canvas, 3);
    await expect(args.onChange).toHaveBeenCalledWith(3);

    await selectLikertOption(canvas, 4);
    await expect(args.onChange).toHaveBeenCalledWith(4);

    await selectLikertOption(canvas, 5);
    await expect(args.onChange).toHaveBeenCalledWith(5);

    // Step 2 — Total calls should be 5
    await expect(args.onChange).toHaveBeenCalledTimes(5);
  },
};

export const FivePointAccessible: Story = {
  name: '5pt A11y — radio group semantics',
  args: {
    scale: buildLikertScale(5),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Step 1 — Radiogroup exists
    const group = canvas.getByRole('radiogroup', { name: 'Response options' });
    await expect(group).toBeVisible();

    // Step 2 — Exactly 5 radio buttons
    const radios = within(group).getAllByRole('radio');
    await expect(radios).toHaveLength(5);

    // Step 3 — Each radio has correct aria-label
    await expect(radios[0]).toHaveAttribute('aria-label', 'Strongly Disagree');
    await expect(radios[1]).toHaveAttribute('aria-label', 'Disagree');
    await expect(radios[2]).toHaveAttribute('aria-label', 'Neither Agree nor Disagree');
    await expect(radios[3]).toHaveAttribute('aria-label', 'Agree');
    await expect(radios[4]).toHaveAttribute('aria-label', 'Strongly Agree');
  },
};
