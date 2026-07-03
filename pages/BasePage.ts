import { expect, type Locator, type Page } from '@playwright/test';

export abstract class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path = '/'): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.waitForPageReady();
  }

  async waitForPageReady(): Promise<void> {
    await expect(this.page.locator('body')).toBeVisible();
    await this.page.waitForLoadState('networkidle').catch(() => undefined);
  }

  async expectNoBlankPage(): Promise<void> {
    await expect(this.page.locator('body')).not.toHaveText(/^\s*$/);
  }

  visible(locator: Locator): Promise<boolean> {
    return locator.first().isVisible().catch(() => false);
  }
}
