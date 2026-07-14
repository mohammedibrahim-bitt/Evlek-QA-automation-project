import type { Locator, Page, TestInfo } from '@playwright/test';
import { isLivePropertyDetailPage, visiblePropertyDetailHrefs } from './propertyUrls';

type PropertyCapabilityCheck = (page: Page) => Promise<boolean>;

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

export async function openLivePropertyWithCapability(
  page: Page,
  testInfo: TestInfo,
  capabilityName: string,
  hasCapability: PropertyCapabilityCheck,
  startPath = '/satilik',
  limit = 12
): Promise<string | null> {
  await page.goto(startPath, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

  const hrefs = await visiblePropertyDetailHrefs(page, limit);
  const attempted: string[] = [];

  await testInfo.attach(`candidate-property-links-${capabilityName}`, {
    body: hrefs.length > 0 ? hrefs.join('\n') : 'No candidate property detail links found.',
    contentType: 'text/plain'
  });

  for (const href of hrefs) {
    const detailUrl = new URL(href, page.url()).toString();
    const response = await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => null);
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

    const live = (response?.status() ?? 0) < 400 && await isLivePropertyDetailPage(page);
    const capabilityAvailable = live && await hasCapability(page).catch(() => false);
    attempted.push(`${capabilityAvailable ? 'MATCH' : 'skip'} ${response?.status() ?? 'navigation failed'} ${page.url()}`);

    if (capabilityAvailable) {
      await testInfo.attach(`selected-property-url-${capabilityName}`, {
        body: page.url(),
        contentType: 'text/plain'
      });
      return page.url();
    }
  }

  await testInfo.attach(`property-capability-attempts-${capabilityName}`, {
    body: attempted.length > 0 ? attempted.join('\n') : 'No property candidates were attempted.',
    contentType: 'text/plain'
  });
  await attachCapabilityDiagnostics(
    testInfo,
    page,
    `No live property with ${capabilityName} was found from ${hrefs.length} candidate(s).`
  );
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
    page.getByRole('button', { name: /whatsapp|telefon|ileti\S*im|payla\S*|contact|phone|share/i }),
    page.getByRole('link', { name: /whatsapp|telefon|ileti\S*im|payla\S*|contact|phone|share/i })
  ]);
}

export async function findDirectContactOption(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.locator('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me"], a[href*="whatsapp"]'),
    page.getByRole('button', { name: /whatsapp|telefon|contact|phone/i }),
    page.getByRole('link', { name: /whatsapp|telefon|contact|phone/i })
  ]);
}

export async function contactTargetDetails(locator: Locator): Promise<{ kind: string; target: string }> {
  const href = await locator.getAttribute('href').catch(() => null);
  const text = await locator.innerText({ timeout: 3_000 }).catch(() => '');
  const target = (href || text).replace(/\s+/g, ' ').trim();

  if (/wa\.me|whatsapp/i.test(target)) {
    return { kind: 'whatsapp', target };
  }

  if (/^tel:|telefon|phone/i.test(target)) {
    return { kind: 'phone', target };
  }

  if (/^mailto:|e-?posta|email|mail/i.test(target)) {
    return { kind: 'email', target };
  }

  if (/contact|ileti\S*im/i.test(target)) {
    return { kind: 'contact', target };
  }

  return { kind: 'unknown', target };
}

export async function attachContactOutcomeDiagnostics(
  testInfo: TestInfo,
  page: Page,
  reason: string,
  details?: { kind: string; target: string }
): Promise<void> {
  const title = await page.title().catch(() => '');
  const visibleContactLinks = await visibleTexts(
    page.locator('a[href^="tel:"], a[href^="mailto:"], a[href*="wa.me"], a[href*="whatsapp"], button, [role="button"]'),
    30
  );

  await testInfo.attach('contact-outcome-diagnostics', {
    body: [
      `Reason: ${reason}`,
      `URL: ${page.url()}`,
      `Title: ${title}`,
      details ? `Detected kind: ${details.kind}` : 'Detected kind: (none)',
      details ? `Detected target: ${details.target || '(empty)'}` : 'Detected target: (none)',
      '',
      'Visible contact/action text:',
      visibleContactLinks.length > 0 ? visibleContactLinks.join('\n') : '(none)'
    ].join('\n'),
    contentType: 'text/plain'
  });
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
    page.locator('.fixed.inset-0 button').filter({ hasText: '›' }),
    page.locator('[aria-modal="true"] button[aria-label*="Next"], [role="dialog"] button[aria-label*="Next"]'),
    page.locator('button[aria-label*="Sonraki"]:not(.card-photo-nav), button[aria-label*="Next"]:not(.card-photo-nav)'),
    page.locator('button[aria-label*="Sonraki"], button[aria-label*="Next photo"], button[aria-label*="Next"]'),
    page.locator('button[aria-label^="Preview"], button[aria-label="Photo 2"]')
  ]);
}

export async function findGalleryPreviousButton(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.locator('.fixed.inset-0 button').filter({ hasText: '‹' }),
    page.locator('[aria-modal="true"] button[aria-label*="Previous"], [role="dialog"] button[aria-label*="Previous"]'),
    page.locator('button[aria-label*="Onceki"]:not(.card-photo-nav), button[aria-label*="Previous"]:not(.card-photo-nav)'),
    page.locator('button[aria-label*="Onceki"], button[aria-label*="Previous photo"], button[aria-label*="Previous"]')
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

export async function hasAllCurrencyControls(page: Page): Promise<boolean> {
  for (const currency of ['EUR', 'USD', 'TRY', 'GBP'] as const) {
    if (!await findCurrencyButton(page, currency)) {
      return false;
    }
  }

  return true;
}

export async function hasContactCapability(page: Page): Promise<boolean> {
  return Boolean(await findContactAction(page));
}

export async function hasFollowCapability(page: Page): Promise<boolean> {
  return Boolean(await findFollowAction(page));
}

export async function hasGalleryNavigationCapability(page: Page): Promise<boolean> {
  const galleryEntry = await findGalleryEntry(page);
  if (!galleryEntry) {
    return false;
  }

  await galleryEntry.click();
  await page.waitForTimeout(500);

  const hasNavigation = Boolean(
    await findGalleryNextButton(page)
      || await page.locator('button[aria-label^="Preview"], button[aria-label^="Photo 1 of"], button[aria-label^="View all"]').count()
        .then((count) => count > 1)
        .catch(() => false)
  );
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(250);
  return hasNavigation;
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
