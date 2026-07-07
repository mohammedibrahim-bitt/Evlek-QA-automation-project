import { expect, type Page } from '@playwright/test';

export class CookieBanner {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async expectVisible(): Promise<void> {
    await expect(this.acceptAllButton()).toBeVisible();
    await expect(this.requiredOnlyButton()).toBeVisible();
  }

  async acceptAll(): Promise<void> {
    await this.acceptAllButton().click();
    await this.expectHidden();
  }

  async acceptRequiredOnly(): Promise<void> {
    await this.requiredOnlyButton().click();
    await this.expectHidden();
  }

  async expectHidden(): Promise<void> {
    await expect(this.acceptAllButton()).toBeHidden();
    await expect(this.requiredOnlyButton()).toBeHidden();
  }

  private acceptAllButton() {
    return this.page.getByRole('button', { name: /kabul et|accept all|accept/i }).first();
  }

  private requiredOnlyButton() {
    return this.page.getByRole('button', { name: /zorunlu|required only|necessary only/i }).first();
  }
}
