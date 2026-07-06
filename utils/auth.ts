import type { Page } from '@playwright/test';
import path from 'node:path';
import { AuthPage } from '../pages/AuthPage';
import { env, hasTestAccount } from './env';

export const AUTH_STATE_PATH = path.resolve(process.cwd(), '.auth/test-user.json');

export async function loginAsTestUser(page: Page): Promise<void> {
  if (!hasTestAccount()) {
    throw new Error('Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');
  }

  const auth = new AuthPage(page);

  await auth.openLoginModal();
  await auth.loginAndWaitForAuthenticatedSession(env.testUserEmail!, env.testUserPassword!);
}
