import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/test';
import { HomePage } from '../../pages/HomePage';

type LanguageCase = {
  name: string;
  optionName: RegExp;
  expectedPath: RegExp;
  expectedLang: RegExp;
  expectedText: RegExp;
};

const targetLanguages: LanguageCase[] = [
  {
    name: 'English',
    optionName: /English/i,
    expectedPath: /\/en(?:\/)?$/,
    expectedLang: /^en/i,
    expectedText: /North Cyprus|Property|Buy|Rent|Log In/i
  },
  {
    name: 'Russian',
    optionName: /Русский/i,
    expectedPath: /\/ru(?:\/)?$/,
    expectedLang: /^ru/i,
    expectedText: /Север|Кипр|Недвижимость|Войти|Продажа|Аренда/i
  },
  {
    name: 'German',
    optionName: /Deutsch/i,
    expectedPath: /\/de(?:\/)?$/,
    expectedLang: /^de/i,
    expectedText: /Nordzypern|Immobilien|Kaufen|Mieten|Einloggen/i
  },
  {
    name: 'Arabic',
    optionName: /العربية/i,
    expectedPath: /\/ar(?:\/)?$/,
    expectedLang: /^ar/i,
    expectedText: /قبرص|العقارات|شراء|إيجار|تسجيل/i
  }
];

test.describe('Evlek language switch journey', () => {
  for (const language of targetLanguages) {
    test(`@regression user can switch the home page from Turkish to ${language.name}`, async ({ page }) => {
      const home = new HomePage(page);

      await home.open();
      await switchLanguage(page, language.optionName);
      await home.waitForPageReady();

      await expect(page).toHaveURL(language.expectedPath);
      await expect(page.locator('html')).toHaveAttribute('lang', language.expectedLang);
      await expect(page).toHaveTitle(/Evlek/i);
      await expect(page.locator('body')).toContainText(language.expectedText);
      await expect(page.locator('body')).not.toHaveText(/^\s*$/);
    });
  }

  test('@regression user can switch from English back to Turkish', async ({ page }) => {
    const home = new HomePage(page);

    await home.open();
    await switchLanguage(page, /English/i);
    await home.waitForPageReady();
    await switchLanguage(page, /Türkçe/i);
    await home.waitForPageReady();

    await expect(page).toHaveURL(/https:\/\/evlek\.app\/(?:\?.*)?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', /^tr/i);
    await expect(page.locator('body')).toContainText(/Kuzey Kıbrıs|Satılık|Kiralık|Giriş Yap/i);
  });

  test('@regression English listing navigation remains usable after language switch', async ({ page }) => {
    const home = new HomePage(page);

    await home.open();
    await switchLanguage(page, /English/i);
    await home.waitForPageReady();

    const allListings = page.getByRole('link', { name: /all listings/i }).first();
    const listingHref = await allListings.getAttribute('href');
    expect(listingHref).toBeTruthy();
    await page.goto(new URL(listingHref!, page.url()).toString(), { waitUntil: 'domcontentloaded' });
    await home.waitForPageReady();

    await expect(page).toHaveURL(/\/(?:en\/)?properties|\/(?:en\/)?satilik/i);
    await expect(page.locator('body')).toContainText(/buy|sale|property|listing/i);
    await expect(page.locator('a[href*="/properties/"], a[href*="/en/properties/"]').filter({ hasText: /\S/ }).first()).toBeVisible();
  });
});

async function switchLanguage(page: Page, optionName: RegExp): Promise<void> {
  await page.locator('button[aria-label^="Language:"], button', { hasText: /^(TR|EN|RU|DE|AR)$/ }).first().click({ force: true });
  await page.getByRole('button', { name: optionName }).first().click({ force: true });
}
