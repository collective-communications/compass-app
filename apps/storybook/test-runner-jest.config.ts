import type { TestRunnerConfig } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  async postVisit(page, context) {
    // Collect console errors during story render
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    if (errors.length > 0) {
      throw new Error(
        `Console errors in ${context.id}:\n${errors.join('\n')}`
      );
    }
  },
};

export default config;
