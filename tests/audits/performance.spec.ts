import { test } from '../fixtures/test';
import { env } from '../../utils/env';
import {
  attachPerformanceResults,
  expectNoPerformanceIssues,
  measurePagePerformance,
  type PerformanceThresholds
} from '../../utils/performanceAudit';

const thresholds: PerformanceThresholds = {
  maxDomContentLoadedMs: env.perfMaxDomContentLoadedMs,
  maxLoadEventMs: env.perfMaxLoadEventMs,
  maxFirstVisibleMs: env.perfMaxFirstVisibleMs,
  maxFailedRequests: env.perfMaxFailedRequests
};

test.describe('Evlek performance smoke audit', () => {
  test('@smoke @audit core public pages load within configured smoke thresholds', async ({ page }, testInfo) => {
    test.setTimeout(120_000);

    const results = [];

    results.push(await measurePagePerformance(page, {
      name: 'Home page',
      url: '/',
      thresholds
    }));

    results.push(await measurePagePerformance(page, {
      name: 'Sale listings',
      url: '/satilik',
      thresholds
    }));

    results.push(await measurePagePerformance(page, {
      name: 'Property detail',
      url: '/properties/86b39e07-8b08-45af-9ed7-468552ad901e',
      thresholds
    }));

    await attachPerformanceResults(testInfo, results);
    expectNoPerformanceIssues(results);
  });
});
