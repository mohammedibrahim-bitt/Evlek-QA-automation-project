import { test } from '../fixtures/test';
import { AuthPage } from '../../pages/AuthPage';
import { HomePage } from '../../pages/HomePage';
import { env, hasTestAccount } from '../../utils/env';

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

    const auth = new AuthPage(page);

    if (env.loginUrl) {
      await auth.open(env.loginUrl);
    } else {
      const home = new HomePage(page);
      await home.open();
      await home.openLogin();
    }

    await auth.login(env.testUserEmail!, env.testUserPassword!);
    await auth.expectAuthenticatedSignal();
  });
});
