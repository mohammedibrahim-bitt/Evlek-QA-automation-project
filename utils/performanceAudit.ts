import { expect, type Page, type Request, type TestInfo } from '@playwright/test';
import { attachJson } from './qualityAudit';

export type PerformanceThresholds = {
  maxDomContentLoadedMs: number;
  maxLoadEventMs: number;
  maxFirstVisibleMs: number;
  maxFailedRequests: number;
};

export type PerformanceResult = {
  name: string;
  url: string;
  finalUrl: string;
  status: number | null;
  title: string;
  domContentLoadedMs: number;
  loadEventMs: number;
  firstVisibleMs: number;
  failedRequests: string[];
  ignoredAbortedRequests: number;
  issues: string[];
};

export async function measurePagePerformance(page: Page, options: {
  name: string;
  url: string;
  thresholds: PerformanceThresholds;
}): Promise<PerformanceResult> {
  const failedRequests: string[] = [];
  let ignoredAbortedRequests = 0;
  const onRequestFailed = (request: Request) => {
    const failureText = request.failure()?.errorText ?? 'request failed';
    if (failureText.includes('net::ERR_ABORTED')) {
      ignoredAbortedRequests += 1;
      return;
    }

    failedRequests.push(`${request.method()} ${request.url()} - ${failureText}`);
  };

  page.on('requestfailed', onRequestFailed);

  try {
    const startedAt = Date.now();
    const response = await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const domContentLoadedMs = Date.now() - startedAt;

    await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 });
    const firstVisibleMs = Date.now() - startedAt;

    await page.waitForLoadState('load', { timeout: 20_000 }).catch(() => undefined);
    const loadEventMs = Date.now() - startedAt;
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

    const result: PerformanceResult = {
      name: options.name,
      url: options.url,
      finalUrl: page.url(),
      status: response?.status() ?? null,
      title: await page.title(),
      domContentLoadedMs,
      loadEventMs,
      firstVisibleMs,
      failedRequests,
      ignoredAbortedRequests,
      issues: []
    };

    if (result.status === null) {
      result.issues.push('Navigation completed without an HTTP response.');
    } else if (result.status >= 400) {
      result.issues.push(`Page returned HTTP ${result.status}.`);
    }

    if (result.firstVisibleMs > options.thresholds.maxFirstVisibleMs) {
      result.issues.push(`First visible body content took ${result.firstVisibleMs}ms, above ${options.thresholds.maxFirstVisibleMs}ms.`);
    }

    if (result.domContentLoadedMs > options.thresholds.maxDomContentLoadedMs) {
      result.issues.push(`DOMContentLoaded took ${result.domContentLoadedMs}ms, above ${options.thresholds.maxDomContentLoadedMs}ms.`);
    }

    if (result.loadEventMs > options.thresholds.maxLoadEventMs) {
      result.issues.push(`Load event took ${result.loadEventMs}ms, above ${options.thresholds.maxLoadEventMs}ms.`);
    }

    if (result.failedRequests.length > options.thresholds.maxFailedRequests) {
      result.issues.push(`${result.failedRequests.length} failed network request(s), above ${options.thresholds.maxFailedRequests}.`);
    }

    return result;
  } finally {
    page.off('requestfailed', onRequestFailed);
  }
}

export async function attachPerformanceResults(testInfo: TestInfo, results: PerformanceResult[]): Promise<void> {
  await attachJson(testInfo, 'performance-results.json', results);
}

export function expectNoPerformanceIssues(results: PerformanceResult[]): void {
  const issues = results.flatMap((result) => result.issues.map((issue) => `${result.name} (${result.finalUrl}) - ${issue}`));

  expect(issues, issues.join('\n')).toEqual([]);
}
