/** Axe-core result shape as emitted by @storybook/addon-a11y. */
export interface AxeNode {
  html: string;
  target: string[];
  failureSummary?: string;
}

export interface AxeRule {
  id: string;
  impact?: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: AxeNode[];
  tags: string[];
}

export interface AxeResults {
  violations: AxeRule[];
  passes: AxeRule[];
  incomplete: AxeRule[];
  inapplicable?: AxeRule[];
}

/** Per-story collected result. */
export interface StoryA11yResult {
  storyId: string;
  title: string;
  name: string;
  status: 'pass' | 'fail' | 'incomplete' | 'error' | 'pending';
  violations: AxeRule[];
  passes: AxeRule[];
  incomplete: AxeRule[];
  timestamp: string;
}

/** Full report shape exported as JSON. */
export interface A11yReport {
  generatedAt: string;
  storybookVersion: string;
  totalStories: number;
  summary: {
    passed: number;
    failed: number;
    incomplete: number;
    errors: number;
  };
  stories: StoryA11yResult[];
}
