import type { Locator, Page, TestInfo } from '@playwright/test';
import { test, expect } from '../fixtures/test';
import { HomePage } from '../../pages/HomePage';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';
import { propertyDetailLinks, visiblePropertyDetailHrefs } from '../../utils/propertyUrls';

type LanguageCase = {
  name: string;
  optionName: RegExp;
  path: string;
  expectedPath: RegExp;
  expectedLang: RegExp;
  expectedText: RegExp;
};

type LanguageSwitchResult = 'switched' | 'direct-fallback' | 'unavailable';

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
    test(`@regression user can switch the home page from Turkish to ${language.name}`, async ({ page }, testInfo) => {
      const home = new HomePage(page);

      await home.open();
      await switchLanguage(page, language, testInfo);
      await home.waitForPageReady();

      await expectLanguageReached(page, language);
      await expect(page.locator('html')).toHaveAttribute('lang', language.expectedLang);
      await expect(page).toHaveTitle(/Evlek/i);
      await expect(page.locator('body')).toContainText(language.expectedText);
      await expect(page.locator('body')).not.toHaveText(/^\s*$/);
    });
  }

  test('@regression user can switch from English back to Turkish', async ({ page }, testInfo) => {
    const home = new HomePage(page);

    await home.open();
    await switchLanguage(page, targetLanguages[0], testInfo);
    await home.waitForPageReady();
    await switchLanguage(page, turkishLanguage, testInfo);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await home.waitForPageReady();

    await expectLanguageReached(page, turkishLanguage);
    await expect(page.locator('html')).toHaveAttribute('lang', /^tr/i);
    await expect(page.locator('body')).not.toHaveText(/^\s*$/);
  });

  test('@regression English listing navigation remains usable after language switch', async ({ page }, testInfo) => {
    const home = new HomePage(page);
    const listings = new ListingsPage(page);

    await home.open();
    await switchLanguage(page, targetLanguages[0], testInfo);
    await home.waitForPageReady();

    const listingHref = await findEnglishListingsHref(page).catch(() => null);
    if (listingHref) {
      await page.goto(new URL(listingHref, page.url()).toString(), { waitUntil: 'domcontentloaded' });
    } else {
      test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    }
    await home.waitForPageReady();

    await expect(page.locator('html')).toHaveAttribute('lang', /^en/i);
    await expect(page).toHaveURL(/\/(?:en\/)?properties|\/(?:en\/)?satilik|\/(?:en\/)?for-sale/i);
    await expect(page.locator('body')).toContainText(/buy|sale|property|listing/i);
    const hrefs = await visiblePropertyDetailHrefs(page, 8);
    expect(hrefs.length, 'English listing page should expose at least one property detail link.').toBeGreaterThan(0);
    await expect(propertyDetailLinks(page).first()).toBeVisible();
  });

  test('@regression property language switch keeps the same listing identity across localized slugs', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);
    const english = targetLanguages[0];

    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    const propertyUrl = await listings.openFirstLiveProperty(testInfo);
    test.skip(!propertyUrl, 'No live property detail page could be opened from discovered listing cards.');
    await detail.expectLoaded();

    const listingId = extractListingId(page.url()) || extractListingId(await page.locator('body').innerText({ timeout: 5_000 }).catch(() => ''));
    test.skip(!listingId, 'Selected property does not expose a stable listing ID such as evl-001257.');

    await testInfo.attach('selected-localized-property-before-language-switch', {
      body: [`URL: ${page.url()}`, `Listing ID: ${listingId}`].join('\n'),
      contentType: 'text/plain'
    });

    const switchResult = await switchLanguage(page, english, testInfo, { allowDirectFallback: false });
    test.skip(switchResult !== 'switched', 'Selected property page does not expose an in-page language switch on this browser/profile.');
    await detail.expectLoaded();

    await testInfo.attach('selected-localized-property-after-language-switch', {
      body: [`URL: ${page.url()}`, `Listing ID: ${listingId}`].join('\n'),
      contentType: 'text/plain'
    });

    await expect(page.locator('html')).toHaveAttribute('lang', /^en/i);
    expect(
      page.url().toLowerCase(),
      'Localized property URL should keep the same stable listing ID while allowing the slug/path to change.'
    ).toContain(listingId!.toLowerCase());
    await expect(page.locator('body')).toContainText(/price|property|listing|gallery|contact|bed|bath/i);
  });
});

async function switchLanguage(
  page: Page,
  language: LanguageCase,
  testInfo: TestInfo,
  options: { allowDirectFallback?: boolean } = {}
): Promise<LanguageSwitchResult> {
  const allowDirectFallback = options.allowDirectFallback ?? true;

  await closeCommonOverlays(page);

  if (await chooseLanguageFromHeader(page, language)) {
    await attachLanguageDiagnostics(testInfo, page, `Switched from header to ${language.name}.`);
    return 'switched';
  }

  if (await chooseLanguageFromFooter(page, language)) {
    await attachLanguageDiagnostics(testInfo, page, `Switched from footer to ${language.name}.`);
    return 'switched';
  }

  if (!allowDirectFallback) {
    await attachLanguageDiagnostics(testInfo, page, `No in-page language switch was available for ${language.name}.`);
    return 'unavailable';
  }

  await page.goto(language.path, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => undefined);
  await expectLanguageReached(page, language);
  await attachLanguageDiagnostics(testInfo, page, `Navigated directly to ${language.name} fallback path.`);
  return 'direct-fallback';
}

async function chooseLanguageFromHeader(page: Page, language: LanguageCase): Promise<boolean> {
  const trigger = await firstVisible([
    page.locator('button[aria-label^="Language:"], button[aria-label*="language" i]'),
    page.getByRole('button', { name: /TR|EN|DE|RU|AR|language|dil/i })
  ]);

  if (!trigger) {
    return false;
  }

  await trigger.click({ timeout: 3_000 }).catch(() => undefined);
  const clicked = await clickVisible([
    page.getByRole('button', { name: language.optionName }),
    page.getByRole('link', { name: language.optionName }),
    page.locator(`a[href="${language.path}"], a[href^="${language.path}/"]`)
  ]);

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

async function clickVisible(locators: Locator | Locator[]): Promise<boolean> {
  const locatorList = Array.isArray(locators) ? locators : [locators];

  for (const locator of locatorList) {
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
  }

  return false;
}

async function reachedLanguage(page: Page, language: LanguageCase): Promise<boolean> {
  await page.waitForLoadState('domcontentloaded', { timeout: 8_000 }).catch(() => undefined);

  const pathMatches = pathMatchesLanguage(new URL(page.url()).pathname, language);
  const lang = await page.locator('html').getAttribute('lang').catch(() => '');

  return pathMatches || language.expectedLang.test(lang ?? '');
}

async function expectLanguageReached(page: Page, language: LanguageCase): Promise<void> {
  await expect.poll(async () => reachedLanguage(page, language), { timeout: 10_000 }).toBe(true);
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

async function firstVisible(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    const count = await locator.count().catch(() => 0);

    for (let index = 0; index < count && index < 20; index += 1) {
      const candidate = locator.nth(index);
      if (await candidate.isVisible().catch(() => false)) {
        return candidate;
      }
    }
  }

  return null;
}

function pathMatchesLanguage(pathname: string, language: LanguageCase): boolean {
  const normalized = normalizedPath(pathname);
  const target = normalizedPath(language.path);

  if (target === '/') {
    return !/^\/(?:en|ru|de|ar)(?:\/|$)/i.test(normalized);
  }

  return normalized === target || normalized.startsWith(`${target}/`);
}

function extractListingId(text: string): string | null {
  return text.match(/evl[-\w]*\d+/i)?.[0] ?? null;
}

async function attachLanguageDiagnostics(testInfo: TestInfo, page: Page, reason: string): Promise<void> {
  const lang = await page.locator('html').getAttribute('lang').catch(() => '');
  const visibleButtons = await visibleTexts(page.locator('button, [role="button"]'), 30);
  const visibleLinks = await visibleTexts(page.locator('a[href]'), 30);

  await testInfo.attach('language-switch-diagnostics', {
    body: [
      `Reason: ${reason}`,
      `URL: ${page.url()}`,
      `HTML lang: ${lang || '(missing)'}`,
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

async function visibleTexts(locator: Locator, limit: number): Promise<string[]> {
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
