import { test } from '../fixtures/test';
import { env } from '../../utils/env';
import { attachJson, checkInternalLinks, discoverInternalPages, expectNoBrokenLinks } from '../../utils/qualityAudit';

test.describe('Evlek broken link audit', () => {
  test('@audit discovered internal links do not return HTTP errors', async ({ page, request }, testInfo) => {
    test.setTimeout(Math.max(180_000, env.auditMaxPages * 8_000));

    const pages = await discoverInternalPages(page, {
      baseUrl: env.baseUrl,
      maxPages: env.auditMaxPages,
      pageDelayMs: env.auditPageDelayMs
    });

    const results = await checkInternalLinks(request, pages, {
      maxLinks: env.auditMaxLinks
    });

    await attachJson(testInfo, 'broken-link-results.json', { pages, results });
    expectNoBrokenLinks(results);
  });
});
