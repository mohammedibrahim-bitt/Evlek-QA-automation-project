import { test, expect } from '../fixtures/test';
import { AuthPage } from '../../pages/AuthPage';
import { hasTestAccount } from '../../utils/env';
import { loginAsTestUser } from '../../utils/auth';
import { attachAuthDiagnostics, openLoginSurface } from '../../utils/authCapabilities';

test.describe('Evlek authentication journey', () => {
  test('@smoke @regression login modal validates required credentials without submitting real user data', async ({ page }, testInfo) => {
    const auth = new AuthPage(page);

    expect(await openLoginSurface(page, testInfo), 'Login surface could not be opened.').toBe(true);
    await auth.submitEmptyLogin();
    await auth.expectRequiredFieldValidation();
  });

  test('@regression login modal rejects invalid fake credentials', async ({ page }, testInfo) => {
    const auth = new AuthPage(page);

    expect(await openLoginSurface(page, testInfo), 'Login surface could not be opened.').toBe(true);
    await auth.login('invalid.qa.user@example.com', 'wrong-password-123');
    await auth.expectInvalidLoginMessage();
  });

  test('@regression @requires-account provided test user can sign in', async ({ page }, testInfo) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');

    try {
      await loginAsTestUser(page);
    } catch (error) {
      await attachAuthDiagnostics(testInfo, page, error instanceof Error ? error.message : String(error));
      throw error;
    }
  });
});
