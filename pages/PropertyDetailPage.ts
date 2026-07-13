import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { firstVisible } from '../utils/locators';

export class PropertyDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded(): Promise<void> {
    await this.expectNoBlankPage();
    await expect(this.page.locator('h1').first()).toContainText(
      /sat\S*l\S*k|kiral\S*k|g\S*nl\S*k|ilan|for sale|for rent|sale|rent|property|listing/i
    );
    await expect(this.page.locator('body')).toContainText(/fiyat|price|galeri|gallery|emlak|ilan|property/i);
  }

  async expectCorePropertyInformation(): Promise<void> {
    const body = this.page.locator('body');

    await expect(body).toContainText(/sat\S*l\S*k|kiral\S*k|g\S*nl\S*k|for sale|for rent|sale|rent/i);
    await expect(body).toContainText(/£|€|\$|₺|GBP|EUR|USD|TRY/i);
    await expect(body).toContainText(/yatak|bed|banyo|bath|m²|m2|a\S*iklama|description|\S*zellik|feature/i);
    await expect(body).toContainText(
      /konum|location|lefkosa|lefko\S*a|nicosia|girne|kyrenia|gazima\S*usa|famagusta|iskele|g\S*zelyurt|lefke/i
    );
  }

  async expectMediaAndActionsVisible(): Promise<void> {
    await expect(
      this.page.getByRole('button', { name: /foto\S*raf|\S*nizleme|galeri|photo|gallery/i })
        .or(this.page.getByText(/foto\S*raf|galeri|photo|gallery/i))
        .first()
    ).toBeVisible();

    await expect(
      this.page.getByRole('button', { name: /whatsapp|telefon|phone|contact|ileti\S*im|payla\S*|share|takip|follow/i })
        .or(this.page.getByRole('link', { name: /whatsapp|telefon|phone|contact|ileti\S*im|payla\S*|share|takip|follow/i }))
        .first()
    ).toBeVisible();
  }

  async openContactOptions(): Promise<void> {
    const contactOptions = this.page.getByRole('button', {
      name: /payla\S* \/ ileti\S*im se\S*enekleri|ileti\S*im|payla\S*|contact|share/i
    }).first();
    if (await contactOptions.isVisible().catch(() => false)) {
      await contactOptions.click();
    }
  }

  async expectContactOptionsVisible(): Promise<void> {
    await expect(
      this.page.getByRole('button', { name: /whatsapp|telefon|phone|contact/i })
        .or(this.page.getByRole('link', { name: /whatsapp|telefon|phone|contact/i }))
        .first()
    ).toBeVisible();
  }

  async followListing(): Promise<void> {
    const action = await firstVisible([
      this.page.getByRole('button', { name: /takip et|follow|favori|favorite|save/i }),
      this.page.getByRole('link', { name: /takip et|follow|favori|favorite|save/i })
    ]);

    await action.click();
  }

  async useLoggedOutListingAction(): Promise<void> {
    const favoriteAction = this.page.getByRole('button', { name: /takip et|follow|favori|favorite|save/i }).first();
    if (await favoriteAction.isVisible().catch(() => false)) {
      await favoriteAction.click();
      await this.expectAuthGateVisible();
      return;
    }

    await this.openContactOptions();
    await this.expectContactOptionsVisible();
  }

  async expectAuthGateVisible(): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /hesap|giri\S*|\S*ye|account|login|sign up/i }).first();

    if (await dialog.isVisible().catch(() => false)) {
      await expect(dialog).toContainText(/giri\S*|\S*ye|hesap|login|sign up/i);
      return;
    }

    await this.waitForPageReady();
    await expect(this.page.locator('body')).toContainText(/giri\S*|\S*ye|hesap|login|sign up|favori|favorite/i);
  }

  async switchCurrency(currency: 'GBP' | 'EUR' | 'USD' | 'TRY'): Promise<void> {
    await this.currencyButton(currency).click();
    await this.waitForPageReady();
  }

  async expectCurrencyVisible(currency: 'GBP' | 'EUR' | 'USD' | 'TRY'): Promise<void> {
    const symbolPattern = {
      GBP: /£|GBP/i,
      EUR: /€|EUR/i,
      USD: /\$|USD/i,
      TRY: /₺|TRY/i
    }[currency];

    await expect(this.page.locator('body')).toContainText(symbolPattern);
  }

  async openGallery(): Promise<void> {
    const galleryButton = this.page.getByRole('region', { name: /ilan foto\S*raf|photos|gallery/i })
      .getByRole('button', { name: /foto\S*raf|photo|t\S*m .*foto|gallery/i })
      .or(this.page.getByRole('button', { name: /foto\S*raf|photo|gallery|galeri|t\S*m .*foto/i }))
      .first();

    await expect(galleryButton).toBeVisible();
    await galleryButton.click();
    await this.expectGalleryStillOpen();
  }

  async expectGalleryNavigationVisible(): Promise<void> {
    await expect(this.nextGalleryButton()).toBeVisible();
    await expect(this.previousGalleryButton()).toBeVisible();
  }

  async hasGalleryNavigation(): Promise<boolean> {
    return Boolean(await firstVisible([
      this.nextGalleryButton(),
      this.previousGalleryButton()
    ]).catch(() => null));
  }

  async goToNextGalleryPhoto(): Promise<void> {
    const nextButton = this.nextGalleryButton();

    await expect(nextButton).toBeVisible();
    await nextButton.click();
  }

  async expectGalleryStillOpen(): Promise<void> {
    await expect(
      this.page.getByRole('button', { name: /foto|photo|\S*nceki|onceki|previous|sonraki|next|kapat|close/i })
        .or(this.page.locator('[aria-modal="true"], [role="dialog"]'))
        .first()
    ).toBeVisible();
  }

  async closeGalleryIfOpen(): Promise<void> {
    const closeButton = this.page.getByRole('button', { name: /close|kapat/i }).first();
    if (await closeButton.isVisible().catch(() => false)) {
      await closeButton.click();
    } else {
      await this.page.keyboard.press('Escape');
    }

    await expect(this.page.locator('body')).toBeVisible();
  }

  private nextGalleryButton(): Locator {
    return this.page.locator(
      'button[aria-label*="Sonraki"]:not(.card-photo-nav), button[aria-label*="Next"]:not(.card-photo-nav), [role="dialog"] button[aria-label*="Sonraki"], [role="dialog"] button[aria-label*="Next"], [aria-modal="true"] button[aria-label*="Sonraki"], [aria-modal="true"] button[aria-label*="Next"]'
    )
      .first();
  }

  private previousGalleryButton(): Locator {
    return this.page.locator(
      'button[aria-label*="Onceki"]:not(.card-photo-nav), button[aria-label*="Previous"]:not(.card-photo-nav), [role="dialog"] button[aria-label*="Onceki"], [role="dialog"] button[aria-label*="Previous"], [aria-modal="true"] button[aria-label*="Onceki"], [aria-modal="true"] button[aria-label*="Previous"]'
    )
      .first();
  }

  private currencyButton(currency: 'GBP' | 'EUR' | 'USD' | 'TRY'): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${currency}$`, 'i') }).first();
  }
}
