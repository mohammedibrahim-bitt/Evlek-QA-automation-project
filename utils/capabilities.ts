import type { Locator, Page, TestInfo } from '@playwright/test';
import { visiblePropertyDetailHrefs } from './propertyUrls';

const unavailableListingPattern = /ilan bulunamad|not found|404/i;

export async function openFirstLiveProperty(page: Page, testInfo: TestInfo, startPath = '/satilik'): Promise<string | null> {
  await page.goto(startPath, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

  const hrefs = await visiblePropertyDetailHrefs(page, 8);
  await testInfo.attach('candidate-property-links', {
    body: hrefs.length > 0 ? hrefs.join('\n') : 'No candidate property detail links found.',
    contentType: 'text/plain'
  });

  for (const href of hrefs) {
    const detailUrl = new URL(href, page.url()).toString();
    const response = await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => null);
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

    const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
    if ((response?.status() ?? 0) < 400 && !unavailableListingPattern.test(bodyText) && bodyText.trim().length > 100) {
      await testInfo.attach('selected-property-url', {
        body: page.url(),
        contentType: 'text/plain'
      });
      return page.url();
    }
  }

  await attachCapabilityDiagnostics(testInfo, page, 'No live property detail page could be opened from listing candidates.');
  return null;
}

export async function attachCapabilityDiagnostics(testInfo: TestInfo, page: Page, reason: string): Promise<void> {
  const title = await page.title().catch(() => '');
  const url = page.url();
  const visibleButtons = await visibleTexts(page.locator('button, [role="button"]'), 30);
  const visibleLinks = await visibleTexts(page.locator('a[href]'), 30);

  await testInfo.attach('capability-diagnostics', {
    body: [
      `Reason: ${reason}`,
      `URL: ${url}`,
      `Title: ${title}`,
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

export async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const requiredOnly = page.getByRole('button', { name: /zorunlu|required only|necessary only/i }).first();
  const acceptAll = page.getByRole('button', { name: /kabul et|accept all|accept/i }).first();

  if (await requiredOnly.isVisible().catch(() => false)) {
    await requiredOnly.click({ timeout: 5_000 }).catch(() => undefined);
    return;
  }

  if (await acceptAll.isVisible().catch(() => false)) {
    await acceptAll.click({ timeout: 5_000 }).catch(() => undefined);
  }
}

export async function findCurrencyButton(page: Page, currency: 'GBP' | 'EUR' | 'USD' | 'TRY'): Promise<Locator | null> {
  return firstVisible([
    page.getByRole('button', { name: new RegExp(`^${currency}$`, 'i') }),
    page.getByRole('radio', { name: new RegExp(`^${currency}$`, 'i') })
  ]);
}

export async function findContactAction(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.getByRole('button', { name: /whatsapp|telefon|ileti\S*im|payla\S*|contact|phone/i }),
    page.getByRole('link', { name: /whatsapp|telefon|ileti\S*im|payla\S*|contact|phone/i })
  ]);
}

export async function findDirectContactOption(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.getByRole('button', { name: /whatsapp|telefon|contact|phone/i }),
    page.getByRole('link', { name: /whatsapp|telefon|contact|phone/i })
  ]);
}

export async function findGalleryEntry(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.getByRole('region', { name: /ilan foto\S*raf|photos|gallery/i })
      .getByRole('button', { name: /foto\S*raf|photo|t\S*m .*foto|gallery|galeri/i }),
    page.getByRole('button', { name: /foto\S*raf|photo|gallery|galeri|t\S*m .*foto/i }),
    page.getByText(/foto\S*raf|photo|gallery|galeri/i)
  ]);
}

export async function findGalleryNextButton(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.locator('button[aria-label*="Sonraki"]:not(.card-photo-nav), button[aria-label*="Next"]:not(.card-photo-nav)'),
    page.locator('[role="dialog"] button[aria-label*="Sonraki"], [role="dialog"] button[aria-label*="Next"]'),
    page.locator('[aria-modal="true"] button[aria-label*="Sonraki"], [aria-modal="true"] button[aria-label*="Next"]')
  ]);
}

export async function findGalleryPreviousButton(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.locator('button[aria-label*="Önceki"]:not(.card-photo-nav), button[aria-label*="Onceki"]:not(.card-photo-nav), button[aria-label*="Previous"]:not(.card-photo-nav)'),
    page.locator('[role="dialog"] button[aria-label*="Önceki"], [role="dialog"] button[aria-label*="Previous"]'),
    page.locator('[aria-modal="true"] button[aria-label*="Önceki"], [aria-modal="true"] button[aria-label*="Previous"]')
  ]);
}

export async function findFollowAction(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.getByRole('button', { name: /takip et|follow|favori|favorite|save/i }),
    page.getByRole('link', { name: /takip et|follow|favori|favorite|save/i })
  ]);
}

export async function findSaveSearchAction(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.getByRole('button', { name: /aramay\S* kaydet|save search/i }),
    page.getByRole('link', { name: /aramay\S* kaydet|save search/i })
  ]);
}

async function firstVisible(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    const candidate = locator.first();
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  return null;
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
