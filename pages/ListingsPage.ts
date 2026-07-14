import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { BasePage } from './BasePage';
import { firstVisible } from '../utils/locators';
import {
  attachListingDiscoveryDiagnostics,
  openFirstLivePropertyFromCurrentPage,
  propertyDetailLinks,
  visiblePropertyDetailHrefs
} from '../utils/propertyUrls';

const saleListingPaths = ['/satilik', '/en/for-sale', '/en/satilik', '/for-sale'];
const rentListingPaths = ['/kiralik', '/en/for-rent', '/en/kiralik', '/for-rent'];

type ListingControlSnapshot = {
  searchInput: boolean;
  compactSearchEntry: boolean;
  citySelect: boolean;
  filterDialog: boolean;
  quickRoomFilter: boolean;
  priceFilter: boolean;
  propertyType: boolean;
  sort: boolean;
  saveSearch: boolean;
};

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

  async openAvailableSaleListings(testInfo?: TestInfo): Promise<boolean> {
    return this.openFirstAvailableListingPage(saleListingPaths, testInfo);
  }

  async openAvailableRentListings(testInfo?: TestInfo): Promise<boolean> {
    return this.openFirstAvailableListingPage(rentListingPaths, testInfo);
  }

  propertyLinks(): Locator {
    return propertyDetailLinks(this.page);
  }

  async expectListingsVisible(): Promise<void> {
    await this.expectNoBlankPage();
    await expect(this.propertyLinks().first()).toBeVisible();
    await expect(this.page.locator('body')).toContainText(
      /sat\S*l\S*k|kiral\S*k|for sale|for rent|sale|rent|ilan|emlak|property|listing/i
    );
  }

  async expectSearchAndFilterControlsVisible(): Promise<void> {
    const controls = await this.detectListingControls();
    const hasSearch = controls.searchInput || controls.compactSearchEntry;
    const hasBrowsingControl = controls.citySelect
      || controls.filterDialog
      || controls.quickRoomFilter
      || controls.priceFilter
      || controls.propertyType
      || controls.sort
      || controls.saveSearch;

    expect(hasSearch || hasBrowsingControl, 'Listing page should expose at least one visible search, filter, sort, or browsing control.').toBe(true);
  }

  async attachListingControlsDiagnostics(testInfo: TestInfo, reason: string): Promise<void> {
    const controls = await this.detectListingControls();
    const visibleButtons = await this.visibleTexts(this.page.locator('button, [role="button"]'), 30);
    const visibleLinks = await this.visibleTexts(this.page.locator('a[href]'), 30);

    await testInfo.attach('listing-controls-diagnostics', {
      body: [
        `Reason: ${reason}`,
        `URL: ${this.page.url()}`,
        '',
        'Detected controls:',
        ...Object.entries(controls).map(([name, available]) => `${name}: ${available ? 'yes' : 'no'}`),
        '',
        'Visible buttons:',
        visibleButtons.length > 0 ? visibleButtons.join('\n') : '(none)',
        '',
        'Visible links:',
        visibleLinks.length > 0 ? visibleLinks.join('\n') : '(none)'
      ].join('\n'),
      contentType: 'text/plain'
    });
  }

  async exerciseAvailableSearchOrFilter(testInfo: TestInfo, term = 'Girne', maxActions = 1): Promise<string[]> {
    const exercised: string[] = [];
    await this.attachListingControlsDiagnostics(testInfo, 'Before adaptive search/filter exercise.');

    if (maxActions > 0 && await this.enterSearchTermIfAvailable(term)) {
      exercised.push('search-input-entry');
    }

    if (exercised.length < maxActions && await this.applyQuickRoomFilterIfAvailable('2+1')) {
      exercised.push('quick-room-filter');
    }

    if (exercised.length < maxActions && await this.selectPropertyTypeIfAvailable()) {
      exercised.push('property-type');
    }

    if (exercised.length < maxActions && await this.applyPriceFilterIfAvailable()) {
      exercised.push('price-filter');
    }

    if (exercised.length < maxActions && await this.sortByLowestPriceIfAvailable()) {
      exercised.push('sort');
    }

    if (exercised.length < maxActions && await this.selectCityIfAvailable(term)) {
      exercised.push('city-select');
    }

    if (exercised.length === 0 && maxActions > 0 && await this.openFiltersIfAvailable()) {
      exercised.push('filter-dialog');
    }

    await testInfo.attach('listing-controls-exercised', {
      body: exercised.length > 0 ? exercised.join('\n') : 'No visible search/filter control could be safely exercised.',
      contentType: 'text/plain'
    });

    return exercised;
  }

  async search(term: string): Promise<void> {
    const input = await this.visibleSearchInput();
    expect(input, 'Search input should be visible before entering a search term.').not.toBeNull();

    await input!.fill(term);

    const searchButton = await firstVisible([
      this.page.getByRole('button', { name: /^ara$|^search$/i }),
      this.page.getByRole('link', { name: /^ara$|^search$/i })
    ]).catch(() => null);

    if (searchButton) {
      await searchButton.click();
    } else {
      await input!.press('Enter');
    }

    await this.waitForPageReady();
    await expect(this.page.locator('body')).toContainText(
      /sonu\S*|ilan|emlak|bulunamad\S*|arama|sat\S*l\S*k|kiral\S*k|result|property|listing|search/i
    );
  }

  async searchIfAvailable(term: string): Promise<boolean> {
    const input = await this.visibleSearchInput();
    if (!input) {
      return false;
    }

    await input.fill(term);

    const searchButton = await firstVisible([
      this.page.getByRole('button', { name: /^ara$|^search$/i }),
      this.page.getByRole('link', { name: /^ara$|^search$/i })
    ]).catch(() => null);
    if (searchButton) {
      await searchButton.click();
    } else {
      await input.press('Enter');
    }

    await this.waitForPageReady();
    await expect(this.page.locator('body')).toContainText(
      /sonu\S*|ilan|emlak|bulunamad\S*|arama|sat\S*l\S*k|kiral\S*k|result|property|listing|search/i
    );
    return true;
  }

  async enterSearchTermIfAvailable(term: string): Promise<boolean> {
    const input = await this.visibleSearchInput();
    if (!input) {
      return false;
    }

    await input.fill(term, { timeout: 5_000 }).catch(() => undefined);
    const value = await input.inputValue({ timeout: 3_000 }).catch(() => '');
    return value.toLowerCase().includes(term.toLowerCase());
  }

  async selectCity(city: string): Promise<void> {
    const select = this.citySelect();
    await select.selectOption({ label: city });
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
  }

  async selectCityIfAvailable(city: string): Promise<boolean> {
    const select = this.citySelect();
    if (!await select.isVisible().catch(() => false)) {
      return false;
    }

    const matchingOption = await select.locator('option').evaluateAll((options, requestedCity) =>
      options
        .map((option) => ({
          label: option.textContent?.trim() ?? '',
          value: option.getAttribute('value') ?? ''
        }))
        .find((option) => option.label.toLowerCase().includes(String(requestedCity).toLowerCase())),
    city);

    if (!matchingOption?.value && !matchingOption?.label) {
      return false;
    }

    await select.selectOption(matchingOption.value ? { value: matchingOption.value } : { label: matchingOption.label });
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
    return true;
  }

  async hasVisibleCitySelect(): Promise<boolean> {
    return this.citySelect().isVisible().catch(() => false);
  }

  async openFilters(): Promise<void> {
    const filterButton = this.page.getByRole('button', { name: /^(filtre|filtreler|filters)$/i }).first();
    await expect(filterButton).toBeVisible();
    await filterButton.click();
    await expect(this.page.getByRole('dialog', { name: /filtre|filters/i })).toBeVisible();
  }

  async openFiltersIfAvailable(): Promise<boolean> {
    await this.dismissCookieBannerIfPresent();

    const filterButton = await firstVisible([
      this.page.getByRole('button', { name: /^(filtre|filtreler|filters)$/i }),
      this.page.getByRole('button', { name: /filtre|filters/i }),
      this.page.locator('button').filter({ hasText: /filtre|filters/i })
    ]).catch(() => null);

    if (!filterButton) {
      return false;
    }

    const clicked = await filterButton.click({ timeout: 5_000 }).then(() => true).catch(() => false);
    if (!clicked) {
      return false;
    }

    const dialog = await firstVisible([
      this.page.getByRole('dialog', { name: /filtre|filters/i }),
      this.page.getByRole('dialog').filter({ hasText: /filtre|filters|oda|room|fiyat|price/i }),
      this.page.locator('[role="dialog"], [data-state="open"]').filter({ hasText: /filtre|filters|oda|room|fiyat|price/i })
    ]).catch(() => null);

    if (!dialog) {
      return false;
    }

    await expect(dialog).toBeVisible();
    return true;
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

  async applyQuickRoomFilterIfAvailable(room = '2+1'): Promise<boolean> {
    const roomButton = this.page.getByRole('button', { name: room, exact: true }).first();
    if (!await roomButton.isVisible().catch(() => false)) {
      return false;
    }

    await roomButton.click();
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
    return true;
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

  async applyPriceFilterIfAvailable(labelPattern = /100/i): Promise<boolean> {
    const priceButton = this.page.getByRole('button', { name: labelPattern }).first();
    if (!await priceButton.isVisible().catch(() => false)) {
      return false;
    }

    await priceButton.click();
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
    return true;
  }

  async selectPropertyType(typePattern = /daire|apartment/i): Promise<void> {
    const typeTab = this.page.getByRole('tab', { name: typePattern }).first();
    await expect(typeTab).toBeVisible();
    await typeTab.click();
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
  }

  async selectPropertyTypeIfAvailable(typePattern = /daire|apartment/i): Promise<boolean> {
    const typeControl = await firstVisible([
      this.page.getByRole('tab', { name: typePattern }),
      this.page.getByRole('button', { name: typePattern }),
      this.page.getByRole('radio', { name: typePattern }),
      this.page.getByRole('button', { name: /m\S*lk tipi|property type|type/i })
    ]).catch(() => null);

    if (!typeControl) {
      return false;
    }

    await typeControl.click();
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
    return true;
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
    ]).catch(() => null);

    if (!lowestPrice) {
      await this.page.keyboard.press('Escape').catch(() => undefined);
      return false;
    }

    await lowestPrice.click();
    await this.waitForPageReady();
    await this.expectResultsOrEmptyState();
    return true;
  }

  async expectResultsOrEmptyState(): Promise<void> {
    await this.expectNoBlankPage();
    await expect(this.page.locator('body')).toContainText(
      /ilan|emlak|sonu.|bulunamad.|no .*result|no .*found|property|listing|search/i
    );
  }

  async expectNoResultsOrListingsVisible(): Promise<void> {
    await this.expectResultsOrEmptyState();
  }

  async ensureListingAvailableForOpening(): Promise<void> {
    if (await this.propertyLinks().first().isVisible().catch(() => false)) {
      return;
    }

    const opened = await this.openAvailableSaleListings();
    expect(opened, 'At least one live sale listing page should expose property detail links.').toBe(true);
  }

  async saveSearch(): Promise<void> {
    await this.page.getByRole('button', { name: /aramay\S* kaydet|save search/i }).first().click();
  }

  async saveSearchIfAvailable(): Promise<boolean> {
    const saveSearch = await firstVisible([
      this.page.getByRole('button', { name: /aramay\S* kaydet|save search/i }),
      this.page.getByRole('link', { name: /aramay\S* kaydet|save search/i })
    ]).catch(() => null);

    if (!saveSearch) {
      return false;
    }

    await saveSearch.click();
    return true;
  }

  async expectSaveSearchModalVisible(): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /aramay\S* kaydet|save this search/i }).first();

    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[type="email"]').first()).toBeVisible();
    await expect(dialog.getByRole('button', { name: /bildirimleri a\S*|enable notifications|notify/i }).first()).toBeVisible();
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

  async openFirstLiveProperty(testInfo?: TestInfo): Promise<string | null> {
    if (!await this.propertyLinks().first().isVisible().catch(() => false)) {
      const opened = await this.openAvailableSaleListings(testInfo);
      if (!opened) {
        return null;
      }
    }

    return openFirstLivePropertyFromCurrentPage(this.page, testInfo);
  }

  async openFirstProperty(): Promise<void> {
    const openedUrl = await openFirstLivePropertyFromCurrentPage(this.page);

    if (openedUrl) {
      return;
    }

    throw new Error('Could not find a property listing that opens a live property detail page.');
  }

  private async openFirstAvailableListingPage(paths: string[], testInfo?: TestInfo): Promise<boolean> {
    const visited: string[] = [];
    const candidateLinks: string[] = [];

    for (const path of paths) {
      const response = await this.page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => null);
      await this.page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
      visited.push(`${path} -> ${response?.status() ?? 'navigation failed'} ${this.page.url()}`);

      if ((response?.status() ?? 0) >= 400) {
        continue;
      }

      const hrefs = await visiblePropertyDetailHrefs(this.page, 12);
      candidateLinks.push(...hrefs.map((href) => new URL(href, this.page.url()).toString()));

      if (hrefs.length > 0 && await this.propertyLinks().first().isVisible().catch(() => false)) {
        if (testInfo) {
          await testInfo.attach('selected-listing-index', {
            body: [`Selected route: ${path}`, `URL: ${this.page.url()}`, '', 'Visited routes:', ...visited].join('\n'),
            contentType: 'text/plain'
          });
        }

        return true;
      }
    }

    if (testInfo) {
      await attachListingDiscoveryDiagnostics(
        testInfo,
        this.page,
        `No listing cards found from routes: ${paths.join(', ')}`,
        [...new Set(candidateLinks)]
      );
    }

    return false;
  }

  private searchInput(): Locator {
    return this.page.locator(
      'input[aria-label*="ilan ara" i], input[aria-label*="search" i], input[placeholder*="sehir" i], input[placeholder*="city" i], input[placeholder*="semt" i], input[placeholder*="search" i], input[type="search"]'
    ).first();
  }

  private async visibleSearchInput(): Promise<Locator | null> {
    const inputs = this.page.locator(
      'input[aria-label*="ilan ara" i], input[aria-label*="search" i], input[placeholder*="sehir" i], input[placeholder*="city" i], input[placeholder*="semt" i], input[placeholder*="search" i], input[type="search"]'
    );
    const count = await inputs.count().catch(() => 0);

    for (let index = 0; index < count; index += 1) {
      const input = inputs.nth(index);
      if (await input.isVisible().catch(() => false)) {
        return input;
      }
    }

    return null;
  }

  private citySelect(): Locator {
    return this.page.locator('select[aria-label*="sehir" i], select[aria-label*="city" i], select')
      .first();
  }

  private async detectListingControls(): Promise<ListingControlSnapshot> {
    return {
      searchInput: Boolean(await this.visibleSearchInput()),
      compactSearchEntry: await this.compactSearchEntry().isVisible().catch(() => false),
      citySelect: await this.citySelect().isVisible().catch(() => false),
      filterDialog: Boolean(await this.filterButton()),
      quickRoomFilter: await this.page.getByRole('button', { name: /^2\+1$/i }).first().isVisible().catch(() => false),
      priceFilter: await this.page.getByRole('button', { name: /100|£|€|\$|₺|GBP|EUR|USD|TRY/i }).first().isVisible().catch(() => false),
      propertyType: Boolean(await this.propertyTypeControl()),
      sort: await this.page.getByRole('button', { name: /s.rala|sort/i }).first().isVisible().catch(() => false),
      saveSearch: Boolean(await firstVisible([
        this.page.getByRole('button', { name: /aramay\S* kaydet|save search/i }),
        this.page.getByRole('link', { name: /aramay\S* kaydet|save search/i })
      ]).catch(() => null))
    };
  }

  private compactSearchEntry(): Locator {
    return this.page.getByRole('navigation', { name: /alt|bottom/i })
      .getByRole('link', { name: /ara|search/i })
      .first();
  }

  private async filterButton(): Promise<Locator | null> {
    return firstVisible([
      this.page.getByRole('button', { name: /^(filtre|filtreler|filters)$/i }),
      this.page.getByRole('button', { name: /filtre|filters/i }),
      this.page.locator('button').filter({ hasText: /filtre|filters/i })
    ]).catch(() => null);
  }

  private async propertyTypeControl(typePattern = /daire|apartment|m\S*lk tipi|property type|type/i): Promise<Locator | null> {
    return firstVisible([
      this.page.getByRole('tab', { name: typePattern }),
      this.page.getByRole('button', { name: typePattern }),
      this.page.getByRole('radio', { name: typePattern })
    ]).catch(() => null);
  }

  private async visibleTexts(locator: Locator, limit: number): Promise<string[]> {
    const texts: string[] = [];
    const count = await locator.count().catch(() => 0);

    for (let index = 0; index < count && texts.length < limit; index += 1) {
      const item = locator.nth(index);
      if (!await item.isVisible().catch(() => false)) {
        continue;
      }

      const text = await item.innerText().catch(() => '');
      const trimmed = text.replace(/\s+/g, ' ').trim();
      if (trimmed) {
        texts.push(trimmed);
      }
    }

    return texts;
  }

  private async dismissCookieBannerIfPresent(): Promise<void> {
    const requiredOnly = this.page.getByRole('button', { name: /zorunlu|required only|necessary only/i }).first();
    const acceptAll = this.page.getByRole('button', { name: /kabul et|accept all|accept/i }).first();

    if (await requiredOnly.isVisible().catch(() => false)) {
      await requiredOnly.click({ timeout: 5_000 }).catch(() => undefined);
      return;
    }

    if (await acceptAll.isVisible().catch(() => false)) {
      await acceptAll.click({ timeout: 5_000 }).catch(() => undefined);
    }
  }
}
