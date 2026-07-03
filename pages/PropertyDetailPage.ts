import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class PropertyDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/properties\/[a-z0-9-]+/i);
    await this.expectNoBlankPage();
    await expect(this.page.locator('h1').first()).toBeVisible();
  }

  async expectCorePropertyInformation(): Promise<void> {
    const body = this.page.locator('body');

    await expect(body).toContainText(/satılık|kiralık|günlük/i);
    await expect(body).toContainText(/£|€|\$|₺|GBP|EUR|USD|TRY/i);
    await expect(body).toContainText(/yatak|banyo|m²|m2|açıklama|özellik/i);
    await expect(body).toContainText(/konum|lefkosa|lefkoşa|girne|gazimağusa|iskele|güzelyurt|lefke/i);
  }

  async expectMediaAndActionsVisible(): Promise<void> {
    await expect(
      this.page.getByRole('button', { name: /fotoğraf|önizleme|galeri/i })
        .or(this.page.getByText(/fotoğraf|galeri/i))
        .first()
    ).toBeVisible();

    await expect(
      this.page.getByRole('button', { name: /whatsapp|telefon|iletişim|paylaş|takip/i })
        .or(this.page.getByRole('link', { name: /whatsapp|telefon|iletişim|paylaş|takip/i }))
        .first()
    ).toBeVisible();
  }

  async openContactOptions(): Promise<void> {
    const contactOptions = this.page.getByRole('button', { name: /paylaş \/ iletişim seçenekleri|iletişim|paylaş/i }).first();
    if (await contactOptions.isVisible().catch(() => false)) {
      await contactOptions.click();
    }
  }

  async expectContactOptionsVisible(): Promise<void> {
    await expect(
      this.page.getByRole('button', { name: /whatsapp|telefon/i })
        .or(this.page.getByRole('link', { name: /whatsapp|telefon/i }))
        .first()
    ).toBeVisible();
  }

  async followListing(): Promise<void> {
    await this.page.getByRole('button', { name: /takip et|follow/i }).first().click();
  }

  async expectAuthGateVisible(): Promise<void> {
    const dialog = this.page.getByRole('dialog').filter({ hasText: /hesap|giriş|üye|account|login|sign up/i }).first();

    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/giriş|üye|hesap|login|sign up/i);
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
    const galleryButton = this.page
      .getByRole('button', { name: /foto|photo|gallery|galeri/i })
      .first();

    await expect(galleryButton).toBeVisible();
    await galleryButton.click();
  }

  async expectGalleryNavigationVisible(): Promise<void> {
    await expect(this.page.getByRole('button', { name: /sonraki|next/i }).or(this.page.getByText('›')).first()).toBeVisible();
    await expect(this.page.getByRole('button', { name: /önceki|onceki|previous/i }).or(this.page.getByText('‹')).first()).toBeVisible();
  }

  async goToNextGalleryPhoto(): Promise<void> {
    await this.page.getByRole('button', { name: /sonraki|next/i }).or(this.page.getByText('›')).first().click();
  }

  async expectGalleryStillOpen(): Promise<void> {
    await expect(
      this.page.getByRole('button', { name: /foto|photo|önceki|onceki|sonraki|next/i }).or(this.page.getByText('✕')).first()
    ).toBeVisible();
  }

  private currencyButton(currency: 'GBP' | 'EUR' | 'USD' | 'TRY'): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${currency}$`, 'i') }).first();
  }
}
