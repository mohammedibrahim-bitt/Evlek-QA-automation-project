import type { Locator, Page, TestInfo } from '@playwright/test';

export const propertyDetailLinkSelector = [
  'a[href*="/properties/"]',
  'a[href*="/satilik/"]',
  'a[href*="/kiralik/"]',
  'a[href*="/for-sale/"]',
  'a[href*="/for-rent/"]',
  'a[href*="evl-"]'
].join(', ');

const unavailableListingPattern = /ilan bulunamad|not found|404/i;

export function propertyDetailLinks(page: Page): Locator {
  return page.locator(propertyDetailLinkSelector).filter({ hasText: /\S/ });
}

export function isPropertyDetailHref(href: string, baseUrl: string): boolean {
  const path = new URL(href, baseUrl).pathname.replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments.at(-1) ?? '';

  if (/\/properties\/[^/]+$/i.test(path)) {
    return true;
  }

  if (/evl[-\w]*\d/i.test(lastSegment)) {
    return segments.length >= 3;
  }

  return /\/(?:[a-z]{2}\/)?(?:for-sale|for-rent|satilik|kiralik)\/[^/]+\/[^/]+$/i.test(path);
}

export async function visiblePropertyDetailHrefs(page: Page, limit = 12): Promise<string[]> {
  let hrefs: string[] = [];

  for (let attempt = 0; attempt < 8; attempt += 1) {
    hrefs = await page.locator(propertyDetailLinkSelector).evaluateAll((links) =>
      [...new Set(
        links
          .map((link) => link.getAttribute('href'))
          .filter((href): href is string => Boolean(href))
      )]
    );

    if (hrefs.some((href) => isPropertyDetailHref(href, page.url()))) {
      break;
    }

    await page.waitForTimeout(500);
  }

  return hrefs
    .filter((href) => isPropertyDetailHref(href, page.url()))
    .slice(0, limit);
}

export async function attachListingDiscoveryDiagnostics(
  testInfo: TestInfo,
  page: Page,
  reason: string,
  candidates: string[] = []
): Promise<void> {
  const title = await page.title().catch(() => '');
  const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');

  await testInfo.attach('listing-discovery-diagnostics', {
    body: [
      `Reason: ${reason}`,
      `URL: ${page.url()}`,
      `Title: ${title}`,
      '',
      'Candidate property links:',
      candidates.length > 0 ? candidates.join('\n') : '(none)',
      '',
      'Body preview:',
      bodyText.replace(/\s+/g, ' ').trim().slice(0, 1_000) || '(empty)'
    ].join('\n'),
    contentType: 'text/plain'
  });
}

export async function isLivePropertyDetailPage(page: Page): Promise<boolean> {
  const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');

  return !unavailableListingPattern.test(bodyText)
    && bodyText.trim().length > 100
    && /fiyat|price|gbp|eur|usd|try|ilan|property|listing|\S*atak|bed|m2|m\S*/i.test(bodyText);
}

export async function openFirstLivePropertyFromCurrentPage(
  page: Page,
  testInfo?: TestInfo,
  limit = 12
): Promise<string | null> {
  const hrefs = await visiblePropertyDetailHrefs(page, limit);

  if (testInfo) {
    await testInfo.attach('candidate-property-links', {
      body: hrefs.length > 0 ? hrefs.join('\n') : 'No candidate property detail links found.',
      contentType: 'text/plain'
    });
  }

  for (const href of hrefs) {
    const detailUrl = new URL(href, page.url()).toString();
    const response = await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 }).catch(() => null);
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

    if ((response?.status() ?? 0) < 400 && await isLivePropertyDetailPage(page)) {
      if (testInfo) {
        await testInfo.attach('selected-property-url', {
          body: page.url(),
          contentType: 'text/plain'
        });
      }

      return page.url();
    }
  }

  if (testInfo) {
    await attachListingDiscoveryDiagnostics(testInfo, page, 'No live property detail page opened from current listing candidates.', hrefs);
  }

  return null;
}
