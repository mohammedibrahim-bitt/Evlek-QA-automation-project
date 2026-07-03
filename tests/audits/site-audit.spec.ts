import { test } from '../fixtures/test';
import { env } from '../../utils/env';
import { crawlAndAuditSite, expectNoAuditIssues } from '../../utils/siteAudit';

test.describe('Evlek site audit', () => {
  test('@audit internal pages load without obvious browser-level failures', async ({ page }, testInfo) => {
    test.setTimeout(Math.max(120_000, env.auditMaxPages * 10_000));

    const results = await crawlAndAuditSite(page, {
      baseUrl: env.baseUrl,
      maxPages: env.auditMaxPages,
      pageDelayMs: env.auditPageDelayMs,
      testInfo
    });

    expectNoAuditIssues(results);
  });
});
