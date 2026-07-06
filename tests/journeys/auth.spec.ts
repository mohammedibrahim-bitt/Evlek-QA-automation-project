import { test } from '../fixtures/test';
import { AuthPage } from '../../pages/AuthPage';
import { hasTestAccount } from '../../utils/env';
import { loginAsTestUser } from '../../utils/auth';

test.describe('Evlek authentication journey', () => {
  test('@smoke @regression login modal validates required credentials without submitting real user data', async ({ page }) => {
    const auth = new AuthPage(page);

    await auth.openLoginModal();
    await auth.submitEmptyLogin();
    await auth.expectRequiredFieldValidation();
  });

  test('@regression login modal rejects invalid fake credentials', async ({ page }) => {
    const auth = new AuthPage(page);

    await auth.openLoginModal();
    await auth.login('invalid.qa.user@example.com', 'wrong-password-123');
    await auth.expectInvalidLoginMessage();
  });

  test('@regression @requires-account provided test user can sign in', async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');

    await loginAsTestUser(page);
  });
});
