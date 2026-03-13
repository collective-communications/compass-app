import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { MetadataForm } from './metadata-form';
import { SurveyShellDecorator } from '../../../../../../apps/storybook/.storybook/decorators/shells';

const meta = {
  title: 'Features/Survey/MetadataForm',
  component: MetadataForm,
  decorators: [SurveyShellDecorator],
  args: {
    onSubmit: fn(),
    isSubmitting: false,
  },
} satisfies Meta<typeof MetadataForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const fullConfig = {
  departments: ['Engineering', 'Marketing', 'Sales', 'Operations', 'Finance', 'Human Resources'],
  roles: ['Senior Leadership Team', 'Director', 'Manager', 'Individual Contributor', 'Contractor', 'Other'],
  locations: ['Toronto', 'Vancouver', 'Montreal', 'Remote'],
  tenures: ['Less than 6 months', '6 months - 1 year', '1-3 years', '3-5 years', '5+ years'],
};

/** Default state with all four metadata fields visible. */
export const Default: Story = {
  args: {
    config: fullConfig,
  },
};

/** Submitting state with the button showing a loading label. */
export const Submitting: Story = {
  args: {
    config: fullConfig,
    isSubmitting: true,
  },
};

/** Organization with no departments configured — field is hidden. */
export const NoDepartments: Story = {
  args: {
    config: {
      ...fullConfig,
      departments: [],
    },
  },
};

/** Minimal config with only roles and tenures. */
export const MinimalFields: Story = {
  args: {
    config: {
      departments: [],
      roles: ['Manager', 'Individual Contributor'],
      locations: [],
      tenures: ['Less than 1 year', '1+ years'],
    },
  },
};
