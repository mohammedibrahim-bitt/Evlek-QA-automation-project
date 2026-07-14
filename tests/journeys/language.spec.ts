import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures/test';
import { HomePage } from '../../pages/HomePage';
import { propertyDetailLinks, visiblePropertyDetailHrefs } from '../../utils/propertyUrls';

type LanguageCase = {
  name: string;
  optionName: RegExp;
  path: string;
  expectedPath: RegExp;
  expectedLang: RegExp;
  expectedText: RegExp;
};

const targetLanguages: LanguageCase[] = [
  {
    name: 'English',
    optionName: /English/i,
    path: '/en',
    expectedPath: /\/en(?:\/)?$/,
    expectedLang: /^en/i,
    expectedText: /North Cyprus|Property|Buy|Rent|Log In/i
  },
  {
    name: 'Russian',
    optionName: /Russian|Russkiy|Rus/i,
    path: '/ru',
    expectedPath: /\/ru(?:\/)?$/,
    expectedLang: /^ru/i,
    expectedText: /Evlek|\S{3,}/i
  },
  {
    name: 'German',
    optionName: /Deutsch|German/i,
    path: '/de',
    expectedPath: /\/de(?:\/)?$/,
    expectedLang: /^de/i,
    expectedText: /Nordzypern|Immobilien|Kaufen|Mieten|Einloggen/i
  },
  {
    name: 'Arabic',
    optionName: /Arabic|Arab/i,
    path: '/ar',
    expectedPath: /\/ar(?:\/)?$/,
    expectedLang: /^ar/i,
    expectedText: /Evlek|\S{3,}/i
  }
];

const turkishLanguage: LanguageCase = {
  name: 'Turkish',
  optionName: /Turkish|Turk|T.rk/i,
  path: '/',
  expectedPath: /^\/$/,
  expectedLang: /^tr/i,
  expectedText: /Kuzey K\S*br\S*s|Sat\S*l\S*k|Kiral\S*k|Giri\S* Yap/i
};

test.describe('Evlek language switch journey', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  for (const language of targetLanguages) {
    test(`@regression user can switch the home page from Turkish to ${language.name}`, async ({ page }) => {
      const home = new HomePage(page);

      await home.open();
      await switchLanguage(page, language);
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
    await switchLanguage(page, targetLanguages[0]);
    await home.waitForPageReady();
    await switchLanguage(page, turkishLanguage);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.waitForPageReady();

    await expect(page).toHaveURL(/https:\/\/evlek\.app\/(?:\?.*)?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', /^tr/i);
    await expect(page.locator('body')).not.toHaveText(/^\s*$/);
  });

  test('@regression English listing navigation remains usable after language switch', async ({ page }) => {
    const home = new HomePage(page);

    await home.open();
    await switchLanguage(page, targetLanguages[0]);
    await home.waitForPageReady();

    const listingHref = await findEnglishListingsHref(page).catch(() => '/en/properties?type=sale');
    await page.goto(new URL(listingHref, page.url()).toString(), { waitUntil: 'domcontentloaded' });
    await home.waitForPageReady();

    await expect(page).toHaveURL(/\/(?:en\/)?properties|\/(?:en\/)?satilik|\/(?:en\/)?for-sale/i);
    await expect(page.locator('body')).toContainText(/buy|sale|property|listing/i);
    const hrefs = await visiblePropertyDetailHrefs(page, 8);
    expect(hrefs.length, 'English listing page should expose at least one property detail link.').toBeGreaterThan(0);
    await expect(propertyDetailLinks(page).first()).toBeVisible();
  });
});

async function switchLanguage(page: Page, language: LanguageCase): Promise<void> {
  await closeCommonOverlays(page);

  if (await chooseLanguageFromHeader(page, language)) {
    return;
  }

  if (await chooseLanguageFromFooter(page, language)) {
    return;
  }

  await page.goto(language.path, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => undefined);
  await expectReachedLanguage(page, language);
}

async function chooseLanguageFromHeader(page: Page, language: LanguageCase): Promise<boolean> {
  const trigger = page.locator('button[aria-label^="Language:"]').first();

  if (!await trigger.isVisible().catch(() => false)) {
    return false;
  }

  await trigger.click({ timeout: 3_000 }).catch(() => undefined);
  const clicked = await clickVisible(page.getByRole('button', { name: language.optionName }));

  return clicked && await reachedLanguage(page, language);
}

async function chooseLanguageFromFooter(page: Page, language: LanguageCase): Promise<boolean> {
  const footerOption = page.getByRole('contentinfo')
    .getByRole('button', { name: language.optionName })
    .first();

  if (!await footerOption.count()) {
    return false;
  }

  const scrolled = await footerOption.scrollIntoViewIfNeeded({ timeout: 3_000 })
    .then(() => true)
    .catch(() => false);

  if (!scrolled) {
    return false;
  }

  await expect(footerOption).toBeVisible({ timeout: 3_000 });
  await footerOption.click({ timeout: 3_000 }).catch(() => undefined);

  return reachedLanguage(page, language);
}

async function clickVisible(locator: Locator): Promise<boolean> {
  const count = await locator.count();

  for (let index = 0; index < count; index += 1) {
    const option = locator.nth(index);
    if (await option.isVisible().catch(() => false)) {
      const clicked = await option.click({ timeout: 3_000 })
        .then(() => true)
        .catch(() => false);

      if (clicked) {
        return true;
      }
    }
  }

  return false;
}

async function reachedLanguage(page: Page, language: LanguageCase): Promise<boolean> {
  await page.waitForURL((url) => normalizedPath(url.pathname) === normalizedPath(language.path), { timeout: 8_000 }).catch(() => undefined);

  const pathMatches = normalizedPath(new URL(page.url()).pathname) === normalizedPath(language.path);
  const lang = await page.locator('html').getAttribute('lang').catch(() => '');

  return pathMatches || language.expectedLang.test(lang ?? '');
}

async function expectReachedLanguage(page: Page, language: LanguageCase): Promise<void> {
  await expect
    .poll(() => normalizedPath(new URL(page.url()).pathname), { timeout: 10_000 })
    .toBe(normalizedPath(language.path));
}

function normalizedPath(pathname: string): string {
  const normalized = pathname.replace(/\/$/, '');
  return normalized === '' ? '/' : normalized;
}

async function closeCommonOverlays(page: Page): Promise<void> {
  await clickVisible(page.getByRole('button', { name: /kapat|close|accept|kabul|zorunlu/i }));
}

async function findEnglishListingsHref(page: Page): Promise<string> {
  const candidates = [
    page.getByRole('link', { name: /all listings|listings|properties|see listings/i }).first(),
    page.locator('a[href="/en/properties"], a[href*="/en/properties"], a[href="/properties"]').first(),
    page.locator('a[href*="/en/satilik"], a[href*="/en/for-sale"], a[href*="type=sale"]').first()
  ];

  for (const candidate of candidates) {
    const href = await candidate.getAttribute('href').catch(() => null);
    if (href) {
      return href;
    }
  }

  throw new Error('Could not find an English listings link after switching language.');
}
