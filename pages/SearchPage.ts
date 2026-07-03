import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { firstVisible, textOrRoleLink } from '../utils/locators';

export class SearchPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openSearch(): Promise<void> {
    const searchControl = await firstVisible([
      this.page.getByRole('searchbox'),
      ...textOrRoleLink(this.page, /search|find/i),
      this.page.locator('input[type="search"]')
    ]);

    await searchControl.click();
  }

  async searchFor(term: string): Promise<void> {
    await this.openSearch();

    const input = await firstVisible([
      this.page.getByRole('searchbox'),
      this.page.locator('input[type="search"]'),
      this.page.getByPlaceholder(/search|find/i)
    ]);

    await input.fill(term);
    await input.press('Enter');
    await this.waitForPageReady();
  }

  async expectResultsOrEmptyState(): Promise<void> {
    await expect(
      this.page.getByText(/result|found|no .*found|no .*results|try again/i).first()
        .or(this.page.locator('main, [role="main"], body').first())
    ).toBeVisible();
  }
}
