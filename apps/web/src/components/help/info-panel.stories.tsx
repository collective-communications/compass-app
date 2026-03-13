import type { Meta, StoryObj } from '@storybook/react-vite';
import { InfoPanel, InfoPanelGroup } from './info-panel';

const meta = {
  title: 'Components/Help/InfoPanel',
  component: InfoPanel,
  args: {
    id: 'demo',
    title: 'What is a culture compass?',
    content: 'The culture compass is a visual representation of your organization\'s culture across four key dimensions.',
  },
} satisfies Meta<typeof InfoPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DefaultOpen: Story = {
  args: {
    id: 'open-demo',
    title: 'Scoring methodology',
    content: 'Each dimension is scored on a 4-point scale. Scores are aggregated across all respondents and weighted equally.',
    defaultOpen: true,
  },
};

export const WithinGroup: Story = {
  render: () => (
    <InfoPanelGroup>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <InfoPanel
          id="panel-1"
          title="Core dimension"
          content="Core represents the foundational values and beliefs of your organization."
        />
        <InfoPanel
          id="panel-2"
          title="Clarity dimension"
          content="Clarity measures how well goals, roles, and expectations are communicated."
        />
        <InfoPanel
          id="panel-3"
          title="Connection dimension"
          content="Connection reflects the strength of relationships and trust within teams."
        />
      </div>
    </InfoPanelGroup>
  ),
};
