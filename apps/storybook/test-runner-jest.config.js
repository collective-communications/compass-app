/** @type {import('@storybook/test-runner').TestRunnerConfig} */
const config = {
  async postVisit(page, context) {
    // Collect console errors during story render
    const errors = [];
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
