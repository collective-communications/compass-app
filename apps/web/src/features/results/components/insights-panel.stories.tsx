import type { Meta, StoryObj } from '@storybook/react-vite';
import { InsightsPanel } from './insights-panel';

const meta = {
  title: 'Features/Results/InsightsPanel',
  component: InsightsPanel,
} satisfies Meta<typeof InsightsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-4 p-4">
        <h3 className="text-sm font-semibold">Key Findings</h3>
        <p className="text-sm text-[var(--grey-500)]">
          Core is your strongest dimension at 82%. Connection needs the most
          attention at 54%.
        </p>
      </div>
    ),
  },
};

export const WithMultipleSections: Story = {
  args: {
    children: (
      <div className="flex flex-col gap-6 p-4">
        <div>
          <h3 className="text-sm font-semibold">Observations</h3>
          <ul className="mt-2 space-y-2 text-sm text-[var(--grey-500)]">
            <li>Core is your strongest dimension at 82%.</li>
            <li>Connection needs the most attention at 54%.</li>
            <li>There is a 28-point gap between strongest and weakest.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Priority Actions</h3>
          <ul className="mt-2 space-y-2 text-sm text-[var(--grey-500)]">
            <li>Address low Connection scores through team-building.</li>
            <li>Review Clarity communication channels.</li>
          </ul>
        </div>
      </div>
    ),
  },
};
