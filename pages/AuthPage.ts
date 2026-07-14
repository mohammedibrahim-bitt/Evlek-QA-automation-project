import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { BasePage } from './BasePage';
import {
  findEmailInput,
  findLoginSubmit,
  findPasswordInput,
  isSignedIn,
  loginDialog,
  openLoginSurface
} from '../utils/authCapabilities';

export class AuthPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(loginUrl?: string): Promise<void> {
    if (loginUrl) {
      await this.goto(loginUrl);
      return;
    }

    await this.goto('/');
  }

  async openLoginModal(): Promise<void> {
    const opened = await openLoginSurface(this.page);
    expect(opened, 'Login modal should open from the configured login entry.').toBe(true);
  }

  async openLoginModalIfAvailable(testInfo?: TestInfo): Promise<boolean> {
    return openLoginSurface(this.page, testInfo);
  }

  async login(email: string, password: string): Promise<void> {
    const emailInput = await this.emailInput();
    const passwordInput = await this.passwordInput();

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await this.submit();
    await this.waitForPageReady();
  }

  async loginAndWaitForAuthenticatedSession(email: string, password: string): Promise<void> {
    await this.login(email, password);
    await expect.poll(() => isSignedIn(this.page), { timeout: 15_000 }).toBe(true);

    await this.page.waitForFunction(() => {
      const storageKeys = [
        ...Object.keys(window.localStorage),
        ...Object.keys(window.sessionStorage)
      ].join(' ').toLowerCase();
      const cookies = document.cookie.toLowerCase();

      return /auth|session|token|supabase|user/.test(storageKeys)
        || /auth|session|token|supabase|user/.test(cookies);
    }, undefined, { timeout: 5_000 }).catch(() => undefined);
  }

  async submitEmptyLogin(): Promise<void> {
    await this.submit();
  }

  async expectRequiredFieldValidation(): Promise<void> {
    const emailInvalid = await (await this.emailInput()).evaluate((input) => {
      const field = input as HTMLInputElement;
      return !field.validity.valid;
    });

    expect(emailInvalid).toBe(true);
  }

  async expectInvalidLoginMessage(): Promise<void> {
    await expect(this.dialog()).toContainText(/e-posta veya \S*ifre hatal\S*|hatal\S*|ge\S*ersiz|invalid|incorrect/i);
  }

  async expectAuthenticatedSignal(): Promise<void> {
    await expect.poll(() => isSignedIn(this.page), { timeout: 15_000 }).toBe(true);
  }

  private dialog(): Locator {
    return loginDialog(this.page);
  }

  private async emailInput(): Promise<Locator> {
    const input = await findEmailInput(this.page);
    expect(input, 'Login email field should be visible.').not.toBeNull();
    return input!;
  }

  private async passwordInput(): Promise<Locator> {
    const input = await findPasswordInput(this.page);
    expect(input, 'Login password field should be visible.').not.toBeNull();
    return input!;
  }

  private async submit(): Promise<void> {
    const submit = await findLoginSubmit(this.page);
    expect(submit, 'Login submit button should be visible.').not.toBeNull();
    await submit!.click();
  }
}
