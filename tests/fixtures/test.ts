import { test as base, expect } from '@playwright/test';

type TestFixtures = {
  consoleErrors: string[];
  failureContext: void;
};

export const test = base.extend<TestFixtures>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await use(errors);
  },

  failureContext: [async ({ page }, use, testInfo) => {
    await use();

    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('current-url', {
        body: page.url(),
        contentType: 'text/plain'
      });
    }
  }, { auto: true }]
});

export { expect };
