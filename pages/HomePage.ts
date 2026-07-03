import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { firstVisible, textOrRoleLink } from '../utils/locators';

export class HomePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/');
  }

  async expectLoaded(): Promise<void> {
    await this.expectNoBlankPage();
    await expect(this.page).toHaveTitle(/.+/);
  }

  async openLogin(): Promise<void> {
    const login = await firstVisible(textOrRoleLink(this.page, /log in|login|sign in|account/i));
    await login.click();
    await this.waitForPageReady();
  }

  navigationLinks(): Locator {
    return this.page.locator('nav a[href], header a[href]').filter({ hasNot: this.page.locator('[aria-hidden="true"]') });
  }

  async openMobileMenuIfPresent(): Promise<void> {
    const menuButton = this.page.getByRole('button', { name: /menu|navigation|open/i }).first();
    if (await menuButton.isVisible().catch(() => false)) {
      await menuButton.click();
    }
  }
}
