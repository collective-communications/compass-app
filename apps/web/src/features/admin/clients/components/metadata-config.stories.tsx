import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MetadataConfig } from './metadata-config';

const meta = {
  title: 'Features/Admin/Clients/MetadataConfig',
  component: MetadataConfig,
  args: {
    category: 'departments',
    label: 'Departments',
    description: 'Configure the department options available in survey metadata dropdowns.',
    items: [
      { id: '1', label: 'Engineering', sortOrder: 0 },
      { id: '2', label: 'Marketing', sortOrder: 1 },
      { id: '3', label: 'Finance', sortOrder: 2 },
      { id: '4', label: 'Human Resources', sortOrder: 3 },
    ],
    inUseLabels: new Set(['Engineering', 'Marketing']),
    saveStatus: 'saved',
    onUpdate: fn(),
  },
} satisfies Meta<typeof MetadataConfig>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    items: [],
    inUseLabels: new Set(),
  },
};

export const Roles: Story = {
  args: {
    category: 'roles',
    label: 'Roles',
    description: 'Configure the role options available in survey metadata dropdowns.',
    items: [
      { id: '1', label: 'Manager', sortOrder: 0 },
      { id: '2', label: 'Individual Contributor', sortOrder: 1 },
      { id: '3', label: 'Director', sortOrder: 2 },
    ],
    inUseLabels: new Set(['Manager']),
  },
};

export const Locations: Story = {
  args: {
    category: 'locations',
    label: 'Locations',
    description: 'Configure the location options available in survey metadata dropdowns.',
    items: [
      { id: '1', label: 'Toronto', sortOrder: 0 },
      { id: '2', label: 'Vancouver', sortOrder: 1 },
    ],
    inUseLabels: new Set(),
  },
};

export const TenureBands: Story = {
  args: {
    category: 'tenureBands',
    label: 'Tenure Bands',
    description: 'Configure the tenure band options available in survey metadata dropdowns.',
    items: [
      { id: '1', label: '0-1 years', sortOrder: 0 },
      { id: '2', label: '1-3 years', sortOrder: 1 },
      { id: '3', label: '3-5 years', sortOrder: 2 },
      { id: '4', label: '5+ years', sortOrder: 3 },
    ],
    inUseLabels: new Set(['0-1 years', '1-3 years', '3-5 years', '5+ years']),
  },
};

export const Saving: Story = {
  args: { saveStatus: 'saving' },
};

export const SaveError: Story = {
  args: { saveStatus: 'error' },
};
