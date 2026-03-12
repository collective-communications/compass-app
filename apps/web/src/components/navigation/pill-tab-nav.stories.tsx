import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PillTabNav } from './pill-tab-nav';
import type { PillTab } from './pill-tab-nav';

const tabs: PillTab[] = [
  { id: 'compass', label: 'Compass' },
  { id: 'survey', label: 'Survey' },
  { id: 'groups', label: 'Groups' },
  { id: 'dialogue', label: 'Dialogue' },
  { id: 'recommendations', label: 'Recommendations' },
];

const meta = {
  title: 'Components/Navigation/PillTabNav',
  component: PillTabNav,
  args: {
    tabs,
    activeId: 'compass',
    onSelect: fn(),
  },
} satisfies Meta<typeof PillTabNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MiddleActive: Story = {
  args: { activeId: 'groups' },
};

export const WithDisabledTabs: Story = {
  args: {
    tabs: [
      { id: 'compass', label: 'Compass' },
      { id: 'survey', label: 'Survey' },
      { id: 'groups', label: 'Groups', disabled: true },
      { id: 'dialogue', label: 'Dialogue', disabled: true },
      { id: 'recommendations', label: 'Recommendations', disabled: true },
    ],
    activeId: 'compass',
  },
};

export const TwoTabs: Story = {
  args: {
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'details', label: 'Details' },
    ],
    activeId: 'overview',
  },
};
