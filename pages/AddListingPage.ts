import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class AddListingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/ilan-ekle');
  }

  async expectLoggedOutGateVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/ilan-ekle|auth=login.*redirect=%2Filan-ekle/i);
    await expect(this.page.locator('body')).toContainText(/giriş yap|login|ilan eklemek|yeni ilan/i);
    await expect(
      this.page.getByRole('button', { name: /giriş yap|login/i })
        .or(this.page.getByRole('link', { name: /giriş yap|login/i }))
        .first()
    ).toBeVisible();
  }

  async openLoginFromGate(): Promise<void> {
    const login = this.page.getByRole('button', { name: /giriş yap|login/i })
      .or(this.page.getByRole('link', { name: /giriş yap|login/i }))
      .first();

    await expect(login).toBeVisible();
    await login.click();
    await expect(
      this.page.getByRole('dialog')
        .or(this.page.locator('body'))
        .first()
    ).toContainText(/e-posta|email|şifre|password|giriş yap|login/i);
  }
}
