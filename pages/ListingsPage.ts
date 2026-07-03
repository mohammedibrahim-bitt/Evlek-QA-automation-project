import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { firstVisible } from '../utils/locators';

export class ListingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async openSale(): Promise<void> {
    await this.goto('/satilik');
  }

  async openRent(): Promise<void> {
    await this.goto('/kiralik');
  }

  propertyLinks(): Locator {
    return this.page.locator('a[href*="/properties/"]').filter({ hasText: /\S/ });
  }

  async expectListingsVisible(): Promise<void> {
    await this.expectNoBlankPage();
    await expect(this.propertyLinks().first()).toBeVisible();
    await expect(this.page.locator('body')).toContainText(/satılık|kiralık|ilan|emlak/i);
  }

  async expectSearchAndFilterControlsVisible(): Promise<void> {
    await expect(this.searchInput()).toBeVisible();
    await expect(this.citySelect()).toBeVisible();
    await expect(this.page.getByRole('button', { name: /ara/i }).first()).toBeVisible();
    await expect(this.page.getByRole('button', { name: /filtre|en yeni|liste|harita/i }).first()).toBeVisible();
  }

  async search(term: string): Promise<void> {
    const input = this.searchInput();
    await input.fill(term);

    const searchButton = this.page.getByRole('button', { name: /^ara$/i }).first();
    if (await searchButton.isVisible().catch(() => false)) {
      await searchButton.click();
    } else {
      await input.press('Enter');
    }

    await this.waitForPageReady();
    await expect(this.page.locator('body')).toContainText(/sonuç|ilan|emlak|bulunamadı|arama|satılık|kiralık/i);
  }

  async selectCity(city: string): Promise<void> {
    const select = this.citySelect();
    await select.selectOption({ label: city });
    await this.waitForPageReady();
    await expect(select).toHaveValue(city);
  }

  async openFilters(): Promise<void> {
    const filterButton = this.page.getByRole('button', { name: /^(filtre|filtreler|filters)$/i }).first();
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    await expect(this.page.getByRole('dialog', { name: /filtre|filters/i })).toBeVisible();
  }

  async applyRoomFilter(room = '2+1'): Promise<void> {
    const roomButton = this.page.getByRole('dialog', { name: /filtre|filters/i })
      .getByRole('button', { name: room, exact: true })
      .first();
    await expect(roomButton).toBeVisible();
    await roomButton.click();
  }

  async applyOpenedFilters(): Promise<void> {
    await this.page.getByRole('dialog', { name: /filtre|filters/i })
      .getByRole('button', { name: /ilan|show|results/i })
      .first()
      .click();
    await this.waitForPageReady();
  }

  async applyPriceFilter(labelPattern = /100/i): Promise<void> {
    const priceButton = this.page.getByRole('button', { name: labelPattern }).first();
    await expect(priceButton).toBeVisible();
    await priceButton.click();
    await this.waitForPageReady();
  }

  async saveSearch(): Promise<void> {
    await this.page.getByRole('button', { name: /aramayı kaydet|save search/i }).first().click();
  }

  async expectSaveSearchModalVisible(): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /aramayı kaydet|save this search/i }).first();

    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[type="email"]').first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: /bildirimleri aç|enable notifications|notify/i }).first()).toBeVisible();
  }

  async openFirstProperty(): Promise<void> {
    const firstProperty = await firstVisible([this.propertyLinks()]);
    await firstProperty.click();
    await this.waitForPageReady();
  }

  private searchInput(): Locator {
    return this.page.locator('input[aria-label*="İlan ara" i], input[placeholder*="Şehir" i], input[placeholder*="semt" i], input[type="search"]')
      .first();
  }

  private citySelect(): Locator {
    return this.page.getByLabel(/şehir/i)
      .or(this.page.locator('select').first())
      .first();
  }
}
