import { expect, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

export type PageAuditResult = {
  url: string;
  status: number | null;
  title: string;
  bodyTextLength: number;
  internalLinks: string[];
  consoleErrors: string[];
  pageErrors: string[];
  issueMessages: string[];
};

const unsafePathPattern = /\/(logout|log-out|signout|sign-out|delete|remove|destroy|cancel)(\/|$|\?)/i;
const staticAssetPattern = /\.(avif|bmp|css|csv|docx?|gif|ico|jpeg|jpg|js|json|pdf|png|svg|webp|xlsx?|xml|zip)(\?|$)/i;

export async function crawlAndAuditSite(page: Page, options: {
  baseUrl: string;
  maxPages: number;
  pageDelayMs: number;
  testInfo: TestInfo;
}): Promise<PageAuditResult[]> {
  const origin = new URL(options.baseUrl).origin;
  const queue = [normalizeUrl(options.baseUrl, origin)];
  const seen = new Set<string>();
  const results: PageAuditResult[] = [];

  while (queue.length > 0 && seen.size < options.maxPages) {
    const url = queue.shift();
    if (!url || seen.has(url) || shouldSkipUrl(url, origin)) {
      continue;
    }

    seen.add(url);
    const result = await auditPage(page, url, origin);
    results.push(result);

    if (options.pageDelayMs > 0) {
      await page.waitForTimeout(options.pageDelayMs);
    }

    for (const link of result.internalLinks) {
      if (!seen.has(link) && queue.length + seen.size < options.maxPages && !shouldSkipUrl(link, origin)) {
        queue.push(link);
      }
    }
  }

  const auditJson = JSON.stringify(results, null, 2);
  const auditPath = options.testInfo.outputPath('site-audit-results.json');
  await writeFile(auditPath, auditJson, 'utf8');

  await options.testInfo.attach('site-audit-results.json', {
    path: auditPath,
    contentType: 'application/json'
  });

  return results;
}

async function auditPage(page: Page, url: string, origin: string): Promise<PageAuditResult> {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const issueMessages: string[] = [];

  const onConsole = (message: { type: () => string; text: () => string }) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  };
  const onPageError = (error: Error) => pageErrors.push(error.message);

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  let status: number | null = null;
  let title = '';
  let bodyTextLength = 0;
  let internalLinks: string[] = [];

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    status = response?.status() ?? null;
    await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);

    title = await page.title();
    bodyTextLength = (await page.locator('body').innerText({ timeout: 3_000 }).catch(() => '')).trim().length;
    internalLinks = await collectInternalLinks(page, origin);

    if (status === null) {
      issueMessages.push('Navigation completed without an HTTP response.');
    } else if (status >= 400) {
      issueMessages.push(`Page returned HTTP ${status}.`);
    }

    if (!title.trim()) {
      issueMessages.push('Page title is empty.');
    }

    if (bodyTextLength === 0) {
      issueMessages.push('Page body appears blank.');
    }

    if (consoleErrors.length > 0) {
      issueMessages.push(`${consoleErrors.length} browser console error(s) detected.`);
    }

    if (pageErrors.length > 0) {
      issueMessages.push(`${pageErrors.length} uncaught page error(s) detected.`);
    }
  } catch (error) {
    issueMessages.push(`Navigation or audit failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
  }

  return {
    url,
    status,
    title,
    bodyTextLength,
    internalLinks,
    consoleErrors: unique(consoleErrors),
    pageErrors: unique(pageErrors),
    issueMessages
  };
}

export async function collectInternalLinks(page: Page, origin: string): Promise<string[]> {
  const hrefs = await page.locator('a[href]').evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean) as string[]
  );

  return unique(
    hrefs
      .map((href) => normalizeUrl(href, origin))
      .filter((href) => href && !shouldSkipUrl(href, origin))
  );
}

export function normalizeUrl(href: string, origin: string): string {
  try {
    const url = new URL(href, origin);
    url.hash = '';

    if (url.pathname !== '/' && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return '';
  }
}

export function shouldSkipUrl(url: string, origin: string): boolean {
  if (!url) {
    return true;
  }

  const parsed = new URL(url);
  if (parsed.origin !== origin) {
    return true;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return true;
  }

  return unsafePathPattern.test(parsed.pathname) || staticAssetPattern.test(parsed.pathname);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function uniqueValues(values: string[]): string[] {
  return unique(values);
}

export function expectNoAuditIssues(results: PageAuditResult[]): void {
  const issues = results.flatMap((result) =>
    result.issueMessages.map((message) => `${result.url} - ${message}`)
  );

  expect(issues, issues.join('\n')).toEqual([]);
}
