import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { firstVisible } from '../utils/locators';
import { propertyDetailLinks, visiblePropertyDetailHrefs } from '../utils/propertyUrls';

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
    return propertyDetailLinks(this.page);
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
    await this.expectResultsOrEmptyState();
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

  async applyQuickRoomFilter(room = '2+1'): Promise<void> {
    const roomButton = this.page.getByRole('button', { name: room, exact: true }).first();
    await expect(roomButton).toBeVisible();
    await roomButton.click();
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
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

  async selectPropertyType(typePattern = /daire|apartment/i): Promise<void> {
    const typeTab = this.page.getByRole('tab', { name: typePattern }).first();
    await expect(typeTab).toBeVisible();
    await typeTab.click();
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
  }

  async sortByLowestPriceIfAvailable(): Promise<boolean> {
    const sortButton = this.page.getByRole('button', { name: /s.rala|sort/i }).first();
    if (!await sortButton.isVisible().catch(() => false)) {
      return false;
    }

    await sortButton.click();

    const lowestPrice = await firstVisible([
      this.page.getByRole('option', { name: /fiyat|lowest price|price.*low/i }),
      this.page.getByRole('button', { name: /fiyat|lowest price|price.*low/i }),
      this.page.locator('button').filter({ hasText: /en d.+k fiyat|fiyat/i })
    ]);

    await lowestPrice.click();
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
    return true;
  }

  async expectResultsOrEmptyState(): Promise<void> {
    await this.expectNoBlankPage();
    await expect(this.page.locator('body')).toContainText(/ilan|emlak|sonu.|bulunamad.|no .*result|no .*found|property/i);
  }

  async expectNoResultsOrListingsVisible(): Promise<void> {
    await this.expectResultsOrEmptyState();
  }

  async ensureListingAvailableForOpening(): Promise<void> {
    if (await this.propertyLinks().first().isVisible().catch(() => false)) {
      return;
    }

    await this.openSale();
    await this.expectListingsVisible();
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

  async submitInvalidSaveSearchEmail(email = 'not-an-email'): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ has: this.page.locator('input[type="email"]') }).first();
    const emailInput = dialog.locator('input[type="email"]').first();
    const submitButton = dialog.getByRole('button', { name: /bildirimleri|enable notifications|notify/i }).first();

    await emailInput.fill(email);

    const isInvalid = await emailInput.evaluate((input) => !(input as HTMLInputElement).validity.valid);
    expect(isInvalid).toBe(true);
    await expect(submitButton).toBeDisabled();
    await expect(dialog).toBeVisible();
  }

  async openFirstProperty(): Promise<void> {
    const hrefs = await visiblePropertyDetailHrefs(this.page, 12);

    for (const href of hrefs) {
      await this.page.goto(new URL(href, this.page.url()).toString(), { waitUntil: 'domcontentloaded', timeout: 15_000 });
      await this.waitForPageReady();

      const loadedProperty = await this.page.locator('body').innerText({ timeout: 5_000 })
        .then((text) => !/[iİ]lan bulunamad|not found/i.test(text) && text.trim().length > 0)
        .catch(() => false);

      if (loadedProperty) {
        return;
      }
    }

    throw new Error('Could not find a property listing that opens a live property detail page.');
  }

  private searchInput(): Locator {
    return this.page.locator('input[aria-label*="İlan ara" i], input[placeholder*="Şehir" i], input[placeholder*="semt" i], input[type="search"]')
      .first();
  }

  private citySelect(): Locator {
    return this.page.locator('select[aria-label*="Şehir" i], select[aria-label*="City" i], select')
      .first();
  }
}
