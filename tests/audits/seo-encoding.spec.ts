import { test } from '../fixtures/test';
import { env } from '../../utils/env';
import { attachJson, checkSeoAndEncoding, discoverInternalPages, expectNoSeoIssues } from '../../utils/qualityAudit';

test.describe('Evlek SEO and encoding audit', () => {
  test('@audit public pages expose basic SEO metadata without obvious encoding issues', async ({ page }, testInfo) => {
    test.setTimeout(Math.max(120_000, env.auditMaxPages * 10_000));

    const pages = await discoverInternalPages(page, {
      baseUrl: env.baseUrl,
      maxPages: env.auditMaxPages,
      pageDelayMs: env.auditPageDelayMs
    });

    const results = await checkSeoAndEncoding(page, pages);

    await attachJson(testInfo, 'seo-encoding-results.json', { pages, results });
    expectNoSeoIssues(results);
  });
});
