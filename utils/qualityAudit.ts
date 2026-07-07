import { expect, type APIRequestContext, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { collectInternalLinks, normalizeUrl, shouldSkipUrl, uniqueValues } from './siteAudit';

export type LinkCheckResult = {
  sourceUrl: string;
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
};

export type SeoCheckResult = {
  url: string;
  status: number | null;
  title: string;
  metaDescription: string;
  canonical: string;
  lang: string;
  issues: string[];
};

const mojibakePattern = /(?:Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]|â(?:€|€™|€œ|€�|€“|€”|„|€¦)|�)/;

export async function discoverInternalPages(page: Page, options: {
  baseUrl: string;
  maxPages: number;
  pageDelayMs: number;
}): Promise<string[]> {
  const origin = new URL(options.baseUrl).origin;
  const queue = [normalizeUrl(options.baseUrl, origin)];
  const seen = new Set<string>();

  while (queue.length > 0 && seen.size < options.maxPages) {
    const url = queue.shift();
    if (!url || seen.has(url) || shouldSkipUrl(url, origin)) {
      continue;
    }

    seen.add(url);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);

      const links = await collectInternalLinks(page, origin);
      for (const link of links) {
        if (!seen.has(link) && queue.length + seen.size < options.maxPages && !shouldSkipUrl(link, origin)) {
          queue.push(link);
        }
      }
    } catch {
      // Link and SEO checks below will report page-specific failures.
    }

    if (options.pageDelayMs > 0) {
      await page.waitForTimeout(options.pageDelayMs);
    }
  }

  return [...seen];
}

export async function checkInternalLinks(request: APIRequestContext, pages: string[], options: {
  maxLinks: number;
}): Promise<LinkCheckResult[]> {
  const origin = new URL(pages[0]).origin;
  const results: LinkCheckResult[] = [];
  const checked = new Set<string>();

  for (const sourceUrl of pages) {
    const response = await request.get(sourceUrl, { timeout: 30_000, failOnStatusCode: false }).catch(() => null);
    const html = response ? await response.text().catch(() => '') : '';
    const links = extractLinksFromHtml(html, sourceUrl, origin);

    for (const url of links) {
      if (checked.has(url) || checked.size >= options.maxLinks) {
        continue;
      }

      checked.add(url);
      results.push(await checkLink(request, sourceUrl, url));

      if (checked.size >= options.maxLinks) {
        break;
      }
    }

    if (checked.size >= options.maxLinks) {
      break;
    }
  }

  return results;
}

async function checkLink(request: APIRequestContext, sourceUrl: string, url: string): Promise<LinkCheckResult> {
  try {
    const response = await request.get(url, {
      timeout: 30_000,
      failOnStatusCode: false,
      maxRedirects: 5
    });
    const status = response.status();

    return {
      sourceUrl,
      url,
      status,
      ok: status < 400
    };
  } catch (error) {
    return {
      sourceUrl,
      url,
      status: null,
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function checkSeoAndEncoding(page: Page, pages: string[]): Promise<SeoCheckResult[]> {
  const results: SeoCheckResult[] = [];

  for (const url of pages) {
    const issues: string[] = [];
    let status: number | null = null;
    let title = '';
    let metaDescription = '';
    let canonical = '';
    let lang = '';
    let bodyText = '';

    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      status = response?.status() ?? null;
      await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => undefined);

      title = (await page.title()).trim();
      metaDescription = await page.locator('meta[name="description"]').first().getAttribute('content').then((value) => value?.trim() ?? '').catch(() => '');
      canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href').then((value) => value?.trim() ?? '').catch(() => '');
      lang = await page.locator('html').getAttribute('lang').then((value) => value?.trim() ?? '').catch(() => '');
      bodyText = await page.locator('body').innerText({ timeout: 3_000 }).catch(() => '');
    } catch (error) {
      issues.push(`SEO page check failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (status !== null && status >= 400) {
      issues.push(`Page returned HTTP ${status}.`);
    }

    if (title.length < 10) {
      issues.push('Title is missing or too short.');
    }

    if (title.length > 70) {
      issues.push('Title is longer than 70 characters.');
    }

    if (metaDescription.length < 40) {
      issues.push('Meta description is missing or too short.');
    }

    if (metaDescription.length > 180) {
      issues.push('Meta description is longer than 180 characters.');
    }

    if (!canonical) {
      issues.push('Canonical URL is missing.');
    }

    if (canonical && !canonical.startsWith(new URL(url).origin)) {
      issues.push(`Canonical URL points outside site origin: ${canonical}`);
    }

    if (!lang) {
      issues.push('HTML lang attribute is missing.');
    }

    const textToScan = `${title}\n${metaDescription}\n${bodyText.slice(0, 5000)}`;
    if (mojibakePattern.test(textToScan)) {
      issues.push('Possible mojibake/encoding artifact detected in visible or SEO text.');
    }

    results.push({ url, status, title, metaDescription, canonical, lang, issues });
  }

  return results;
}

export async function attachJson(testInfo: TestInfo, name: string, data: unknown): Promise<void> {
  const path = testInfo.outputPath(name);
  await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
  await testInfo.attach(name, { path, contentType: 'application/json' });
}

export function expectNoBrokenLinks(results: LinkCheckResult[]): void {
  const failures = results
    .filter((result) => !result.ok)
    .map((result) => `${result.url} from ${result.sourceUrl} returned ${result.status ?? result.error}`);

  expect(failures, failures.join('\n')).toEqual([]);
}

export function expectNoSeoIssues(results: SeoCheckResult[]): void {
  const failures = results.flatMap((result) => result.issues.map((issue) => `${result.url} - ${issue}`));

  expect(failures, failures.join('\n')).toEqual([]);
}

function extractLinksFromHtml(html: string, sourceUrl: string, origin: string): string[] {
  const links: string[] = [];
  const hrefPattern = /<a\b[^>]*\shref=(["'])(.*?)\1/gi;
  let match: RegExpExecArray | null;

  while ((match = hrefPattern.exec(html)) !== null) {
    const normalized = normalizeUrl(match[2], sourceUrl);
    if (normalized && !shouldSkipUrl(normalized, origin)) {
      links.push(normalized);
    }
  }

  return uniqueValues(links);
}
