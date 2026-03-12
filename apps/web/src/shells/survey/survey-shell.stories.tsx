import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SurveyShell } from './survey-shell';

const meta = {
  title: 'Components/Shells/SurveyShell',
  component: SurveyShell,
  args: {
    orgName: 'Acme Corp',
    onSave: fn(),
  },
} satisfies Meta<typeof SurveyShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default shell with sample content. */
export const Default: Story = {
  args: {
    children: (
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--grey-400)' }}>
        Survey content area
      </div>
    ),
  },
};

/** With a logo URL. */
export const WithLogo: Story = {
  args: {
    logoUrl: 'https://placehold.co/36x36/0A3B4F/white?text=A',
    children: (
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--grey-400)' }}>
        Survey content area
      </div>
    ),
  },
};

/** Without save callback — save button hidden in header. */
export const NoSaveAction: Story = {
  args: {
    onSave: undefined,
    children: (
      <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--grey-400)' }}>
        Survey content area (no save)
      </div>
    ),
  },
};

/** With realistic survey content. */
export const WithContent: Story = {
  args: {
    children: (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '32px 0',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--grey-900)' }}>
          Our leadership team communicates a clear vision for the future.
        </h2>
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          {['Strongly Disagree', 'Disagree', 'Agree', 'Strongly Agree'].map((label) => (
            <div
              key={label}
              style={{
                padding: '12px 16px',
                border: '1px solid var(--grey-200)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--grey-600)',
                cursor: 'pointer',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
  },
};
