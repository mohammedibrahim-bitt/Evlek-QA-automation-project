export const propertyDetailLinkSelector = [
  'a[href*="/properties/"]',
  'a[href*="/satilik/"]',
  'a[href*="/kiralik/"]',
  'a[href*="/for-sale/"]',
  'a[href*="/for-rent/"]',
  'a[href*="evl-"]'
].join(', ');

export function isPropertyDetailHref(href, baseUrl) {
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
