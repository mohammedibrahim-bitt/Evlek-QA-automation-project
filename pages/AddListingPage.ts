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
    await expect(this.page.locator('body')).toContainText(/giri\S* yap|login|ilan eklemek|yeni ilan/i);
    await expect(
      this.page.getByRole('button', { name: /giri\S* yap|login/i })
        .or(this.page.getByRole('link', { name: /giri\S* yap|login/i }))
        .first()
    ).toBeVisible();
  }

  async openLoginFromGate(): Promise<void> {
    const login = this.page.getByRole('button', { name: /giri\S* yap|login/i })
      .or(this.page.getByRole('link', { name: /giri\S* yap|login/i }))
      .first();

    await expect(login).toBeVisible();
    await login.click();
    await expect(
      this.page.getByRole('dialog')
        .or(this.page.locator('body'))
        .first()
    ).toContainText(/e-posta|email|\S*ifre|password|giri\S* yap|login/i);
  }

  async expectSignedInListerCanAccessForm(): Promise<void> {
    await expect(this.page).toHaveURL(/\/ilan-ekle/i);
    await expect(this.page).not.toHaveURL(/auth=login/i);
    await expect(this.page.locator('body')).toContainText(
      /ilan|emlak|property|listing|ba\S*l\S*k|fiyat|\S*ehir|sat\S*l\S*k|kiral\S*k/i
    );
  }

  async expectNoPublishOrDraftActionTaken(): Promise<void> {
    await expect(this.page).not.toHaveURL(/published|success|complete|tamamlandi|yayinda/i);
    await expect(this.page.locator('body')).not.toContainText(/ilan\S*z yay\S*nda|yay\S*na al\S*nd\S*/i);
  }
}
