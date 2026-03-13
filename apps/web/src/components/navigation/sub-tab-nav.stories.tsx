import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { SubTabNav } from './sub-tab-nav';
import type { SubTab } from './sub-tab-nav';

const tabs: SubTab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'by-question', label: 'By Question' },
  { id: 'trends', label: 'Trends' },
];

const meta = {
  title: 'Components/Navigation/SubTabNav',
  component: SubTabNav,
  args: {
    tabs,
    activeId: 'overview',
    onSelect: fn(),
  },
} satisfies Meta<typeof SubTabNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondActive: Story = {
  args: { activeId: 'by-question' },
};

export const WithDisabledTab: Story = {
  args: {
    tabs: [
      { id: 'overview', label: 'Overview' },
      { id: 'by-question', label: 'By Question' },
      { id: 'trends', label: 'Trends', disabled: true },
    ],
    activeId: 'overview',
  },
};
