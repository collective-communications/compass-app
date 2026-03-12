import type { Meta, StoryObj } from '@storybook/react';
import { ArchetypeCard } from './archetype-card';
import type { ArchetypeMatch } from '@compass/scoring';

const strongMatch: ArchetypeMatch = {
  archetype: {
    id: 'arch-1',
    code: 'collaborative-innovator',
    name: 'The Collaborative Innovator',
    description:
      'Organizations matching this archetype demonstrate strong cross-functional alignment and a culture of experimentation. Teams actively share knowledge, challenge assumptions constructively, and align around shared goals. Leadership fosters psychological safety, enabling risk-taking and creative problem-solving.',
    targetScores: { core: 80, clarity: 75, connection: 70, collaboration: 90 },
    displayOrder: 1,
  },
  distance: 5.2,
  confidence: 'strong',
};

const moderateMatch: ArchetypeMatch = {
  archetype: {
    id: 'arch-2',
    code: 'structured-guardian',
    name: 'The Structured Guardian',
    description:
      'This archetype reflects organizations with clear processes, well-defined roles, and strong operational discipline. While effective at execution, these cultures may need to invest in interpersonal connection and innovation.',
    targetScores: { core: 70, clarity: 90, connection: 55, collaboration: 65 },
    displayOrder: 2,
  },
  distance: 12.8,
  confidence: 'moderate',
};

const weakMatch: ArchetypeMatch = {
  archetype: {
    id: 'arch-3',
    code: 'emerging-collective',
    name: 'The Emerging COLLECTIVE',
    description:
      'Organizations in this archetype are in early stages of culture formation. Scores are uneven, suggesting pockets of strength alongside significant gaps. Focused investment in foundational trust (Core) will unlock improvements across all dimensions.',
    targetScores: { core: 50, clarity: 55, connection: 45, collaboration: 50 },
    displayOrder: 3,
  },
  distance: 22.1,
  confidence: 'weak',
};

const meta = {
  title: 'Features/Results/Compass/ArchetypeCard',
  component: ArchetypeCard,
  decorators: [(Story) => <div style={{ maxWidth: 500 }}><Story /></div>],
} satisfies Meta<typeof ArchetypeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StrongConfidence: Story = {
  args: { match: strongMatch },
};

export const ModerateConfidence: Story = {
  args: { match: moderateMatch },
};

export const WeakConfidence: Story = {
  args: { match: weakMatch },
};
