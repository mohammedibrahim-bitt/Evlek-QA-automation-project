import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { expectLoginInputsVisible, isLoginModalVisible, openLoginSurface } from '../utils/authCapabilities';

type DraftListingData = {
  title: string;
  description: string;
  price: string;
  area: string;
};

const defaultDraftListing: DraftListingData = {
  title: `QA draft listing ${Date.now()}`,
  description: 'Automated QA draft only. Do not publish. Fake test data for form validation.',
  price: '123456',
  area: '95'
};

export class AddListingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open(): Promise<void> {
    await this.goto('/ilan-ekle');
  }

  async expectLoggedOutGateVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/ilan-ekle|auth=login.*redirect=%2F(?:dashboard%2F)?ilan-ekle/i);
    await expect(this.page.locator('body')).toContainText(/giri\S* yap|login|ilan eklemek|yeni ilan/i);
    await expect(
      this.page.getByRole('button', { name: /giri\S* yap|login/i })
        .or(this.page.getByRole('link', { name: /giri\S* yap|login/i }))
        .first()
    ).toBeVisible();
  }

  async openLoginFromGate(): Promise<void> {
    if (await isLoginModalVisible(this.page)) {
      await expectLoginInputsVisible(this.page);
      return;
    }

    if (await openLoginSurface(this.page)) {
      await expectLoginInputsVisible(this.page);
      return;
    }

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
    await expect.poll(() => new URL(this.page.url()).pathname).toBe('/ilan-ekle');
    await expect.poll(() => new URL(this.page.url()).search).not.toContain('auth=login');
    await expect(this.page.locator('body')).toContainText(
      /ilan|emlak|property|listing|ba\S*l\S*k|fiyat|\S*ehir|sat\S*l\S*k|kiral\S*k/i
    );
  }

  async expectFormStructureVisible(): Promise<void> {
    await this.expectSignedInListerCanAccessForm();
    await expect(this.page.locator('main, form, body').first()).toContainText(
      /ilan|emlak|ba\S*l\S*k|fiyat|\S*ehir|konum|kategori|foto|a\S*iklama|description/i
    );
  }

  async hasDraftPreparationPermission(): Promise<boolean> {
    const bodyText = await this.page.locator('body').innerText().catch(() => '');

    return !/Solo|Ekip|hesab\S* gerekir|account.*required|plan.*required/i.test(bodyText);
  }

  async expectDangerousActionsAreNotClickable(): Promise<void> {
    const dangerousAction = this.page.getByRole('button', {
      name: /yay\S*nla|publish|kaydet|save|submit|g\S*nder/i
    }).or(this.page.getByRole('link', {
      name: /yay\S*nla|publish|kaydet|save|submit|g\S*nder/i
    }));

    const count = await dangerousAction.count();

    for (let index = 0; index < count; index += 1) {
      await expect(dangerousAction.nth(index)).toBeDisabled();
    }
  }

  async attemptEmptyContinueWithoutPublishing(): Promise<void> {
    await this.expectSignedInListerCanAccessForm();

    const continueButton = this.page.getByRole('button', {
      name: /\S*leri|devam|sonraki|continue|next/i
    }).first();

    await expect(continueButton).toBeVisible();
    await continueButton.click();

    await expect(this.page.locator('body')).toContainText(
      /zorunlu|gerekli|required|eksik|doldur|se\S*iniz|valid/i
    );
    await this.expectNoPublishOrDraftActionTaken();
  }

  async prepareDraftDataWithoutPublishing(data: DraftListingData = defaultDraftListing): Promise<void> {
    await this.expectFormStructureVisible();
    await this.expectNoPublishOrDraftActionTaken();

    let completedActions = await this.completeVisibleDraftFields(data);

    if (completedActions === 0) {
      await this.openSafeFormStep(/bilgiler|details|ad\S*m 2/i);
      completedActions += await this.completeVisibleDraftFields(data);
    }

    if (completedActions > 0) {
      await this.openSafeFormStep(/i\S*erik|icerik|content|ad\S*m 3/i);
      completedActions += await this.completeVisibleDraftFields(data);
    }

    expect(
      completedActions,
      'Add-listing draft flow should allow at least one safe form field or option to be completed before publishing.'
    ).toBeGreaterThan(0);

    await expect.poll(
      () => this.hasEnteredDraftValues(data),
      { message: 'At least one fake draft value should remain in a form field.' }
    ).toBe(true);
    await this.expectNoPublishOrDraftActionTaken();
  }

  async expectNoPublishOrDraftActionTaken(): Promise<void> {
    await expect(this.page).not.toHaveURL(/published|success|complete|tamamlandi|yayinda/i);
    await expect(this.page.locator('body')).not.toContainText(/ilan\S*z yay\S*nda|yay\S*na al\S*nd\S*/i);
  }

  private async fillFirstVisible(locators: Locator[], value: string): Promise<number> {
    for (const locator of locators) {
      const field = locator.first();
      if (await field.isVisible().catch(() => false)) {
        await field.fill(value);
        return 1;
      }
    }

    return 0;
  }

  private async completeVisibleDraftFields(data: DraftListingData): Promise<number> {
    let completedActions = 0;

    completedActions += await this.fillFirstVisible([
      this.page.getByLabel(/ba\S*l\S*k|title/i),
      this.page.getByPlaceholder(/ba\S*l\S*k|title/i),
      this.page.locator('input[name*="title" i], input[id*="title" i]').first()
    ], data.title);

    completedActions += await this.fillFirstVisible([
      this.page.getByLabel(/a\S*iklama|description/i),
      this.page.getByPlaceholder(/a\S*iklama|description/i),
      this.page.locator('textarea, input[name*="description" i], input[id*="description" i]').first()
    ], data.description);

    completedActions += await this.fillFirstVisible([
      this.page.getByLabel(/fiyat|price/i),
      this.page.getByPlaceholder(/fiyat|price/i),
      this.page.locator('input[name*="price" i], input[id*="price" i], input[type="number"]').first()
    ], data.price);

    completedActions += await this.fillFirstVisible([
      this.page.getByLabel(/m2|m\S*|alan|area/i),
      this.page.getByPlaceholder(/m2|m\S*|alan|area/i),
      this.page.locator('input[name*="area" i], input[id*="area" i], input[name*="size" i], input[id*="size" i]').first()
    ], data.area);

    completedActions += await this.selectFirstAvailableOption(this.page.locator('select').first());
    completedActions += await this.clickFirstSafeChoice([
      this.page.getByRole('button', { name: /sat\S*l\S*k|for sale|sale/i }),
      this.page.getByRole('radio', { name: /sat\S*l\S*k|for sale|sale/i }),
      this.page.getByRole('button', { name: /daire|apartment/i }),
      this.page.getByRole('radio', { name: /daire|apartment/i })
    ]);

    return completedActions;
  }

  private async openSafeFormStep(name: RegExp): Promise<void> {
    const tab = this.page.getByRole('tab', { name }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await this.waitForPageReady();
      await this.expectNoPublishOrDraftActionTaken();
      return;
    }

    const continueButton = this.page.getByRole('button', {
      name: /\S*leri|devam|sonraki|continue|next/i
    }).first();

    if (await continueButton.isVisible().catch(() => false)) {
      await continueButton.click();
      await this.waitForPageReady();
      await this.expectNoPublishOrDraftActionTaken();
    }
  }

  private async hasEnteredDraftValues(data: DraftListingData): Promise<boolean> {
    const values = await this.page.locator('input, textarea').evaluateAll((fields) =>
      fields.map((field) => (field as HTMLInputElement | HTMLTextAreaElement).value)
    );

    return values.some((value) =>
      value.includes(data.title)
      || value.includes(data.description)
      || value.includes(data.price)
      || value.includes(data.area)
    );
  }

  private async selectFirstAvailableOption(locator: Locator): Promise<number> {
    if (!await locator.isVisible().catch(() => false)) {
      return 0;
    }

    const options = await locator.locator('option').evaluateAll((items) =>
      items
        .map((option) => ({
          value: option.getAttribute('value') ?? '',
          label: option.textContent?.trim() ?? ''
        }))
        .filter((option) => option.value && option.label)
    );

    const option = options.at(0);
    if (!option) {
      return 0;
    }

    await locator.selectOption(option.value);
    return 1;
  }

  private async clickFirstSafeChoice(locators: Locator[]): Promise<number> {
    for (const locator of locators) {
      const choice = locator.first();
      if (!await choice.isVisible().catch(() => false)) {
        continue;
      }

      const text = await choice.innerText().catch(() => '');
      if (/yay\S*nla|publish|kaydet|save|submit|g\S*nder|devam|sonraki|continue|next/i.test(text)) {
        continue;
      }

      await choice.click();
      return 1;
    }

    return 0;
  }
}
