import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { firstVisible } from '../utils/locators';

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
    await this.goto('/?auth=login');
    await expect(this.dialog()).toBeVisible();
  }

  async login(email: string, password: string): Promise<void> {
    const emailInput = await this.emailInput();
    const passwordInput = await this.passwordInput();

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await this.submit();
    await this.waitForPageReady();
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
    await expect(this.dialog()).toContainText(/e-posta veya şifre hatalı|hatalı|geçersiz|invalid|incorrect/i);
  }

  async expectAuthenticatedSignal(): Promise<void> {
    await expect(
      this.page.getByRole('link', { name: /account|profile|dashboard|logout|log out/i })
        .or(this.page.getByRole('button', { name: /account|profile|dashboard|logout|log out/i }))
        .first()
    ).toBeVisible();
  }

  private dialog(): Locator {
    return this.page.getByRole('dialog');
  }

  private async emailInput(): Promise<Locator> {
    return firstVisible([
      this.dialog().getByLabel(/e-posta|email|e-mail/i),
      this.dialog().locator('input[type="email"]')
    ]);
  }

  private async passwordInput(): Promise<Locator> {
    return firstVisible([
      this.dialog().getByLabel(/şifre|password/i),
      this.dialog().locator('input[type="password"]')
    ]);
  }

  private async submit(): Promise<void> {
    await this.dialog().getByRole('button', { name: 'Devam et', exact: true }).click();
  }
}
