import type { Locator, Page } from '@playwright/test';

export const propertyDetailLinkSelector = [
  'a[href*="/properties/"]',
  'a[href*="/satilik/"]',
  'a[href*="/kiralik/"]',
  'a[href*="/for-sale/"]',
  'a[href*="/for-rent/"]',
  'a[href*="evl-"]'
].join(', ');

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
  const hrefs = await page.locator(propertyDetailLinkSelector).evaluateAll((links) =>
    [...new Set(
      links
        .map((link) => link.getAttribute('href'))
        .filter((href): href is string => Boolean(href))
    )]
  );

  return hrefs
    .filter((href) => isPropertyDetailHref(href, page.url()))
    .slice(0, limit);
}
