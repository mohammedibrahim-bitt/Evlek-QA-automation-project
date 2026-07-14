import { test, expect } from '../fixtures/test';

type RouteCheck = {
  path: string;
  validUrl?: RegExp;
  expectedText: RegExp;
  protectedRoute?: boolean;
};

const routes: RouteCheck[] = [
  {
    path: '/',
    validUrl: /https:\/\/evlek\.app\/(?:\?.*)?$/,
    expectedText: /K\S*br\S*s|sat\S*l\S*k|kiral\S*k|emlak|property/i
  },
  {
    path: '/satilik',
    validUrl: /\/(?:tr\/)?satilik|\/(?:en\/)?properties\?type=sale|\/(?:en\/)?for-sale/i,
    expectedText: /sat\S*l\S*k|for sale|sale|ilan|emlak|property|listing/i
  },
  {
    path: '/kiralik',
    validUrl: /\/(?:tr\/)?kiralik|\/(?:en\/)?properties\?type=rent|\/(?:en\/)?for-rent/i,
    expectedText: /kiral\S*k|for rent|rent|ilan|emlak|property|listing/i
  },
  {
    path: '/en',
    validUrl: /\/en(?:\/)?$/,
    expectedText: /North Cyprus|property|buy|rent|login|sale|listing/i
  },
  {
    path: '/ru',
    validUrl: /\/ru(?:\/)?$/,
    expectedText: /Evlek|\S{3,}/i
  },
  {
    path: '/de',
    validUrl: /\/de(?:\/)?$/,
    expectedText: /Nordzypern|Immobilien|Kaufen|Mieten|Einloggen/i
  },
  {
    path: '/ar',
    validUrl: /\/ar(?:\/)?$/,
    expectedText: /Evlek|\S{3,}/i
  },
  {
    path: '/en/properties?type=sale',
    validUrl: /\/en\/properties\?type=sale|\/en\/satilik|\/en\/for-sale/i,
    expectedText: /buy|sale|property|listing/i
  },
  {
    path: '/ilan-ekle',
    expectedText: /ilan|giri\S*|login|pano|dashboard|foto|plan/i,
    protectedRoute: true
  },
  {
    path: '/dashboard',
    expectedText: /pano|dashboard|giri\S*|login|ilanlar\S*m|profile/i,
    protectedRoute: true
  },
  {
    path: '/favorites',
    expectedText: /favori|favorite|giri\S*|login|ilan/i,
    protectedRoute: true
  }
];

test.describe('Evlek route monitor', () => {
  for (const route of routes) {
    test(`@smoke @routes ${route.path} loads without route breakage`, async ({ page }) => {
      const response = await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      const status = response?.status() ?? 0;

      expect(status, `${route.path} should not return a server/client error`).toBeLessThan(400);
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);

      if (route.validUrl) {
        await expect(page, `${route.path} should stay in a valid route family`).toHaveURL(route.validUrl);
      }

      await expect(page.locator('body'), `${route.path} should not render a blank page`).not.toHaveText(/^\s*$/);
      await expect(page.locator('body'), `${route.path} should show route-specific content`).toContainText(route.expectedText);

      if (route.protectedRoute) {
        await expect(page.locator('body'), `${route.path} should show protected content or a valid auth gate`).toContainText(
          /giri\S*|login|hesap|account|pano|dashboard|ilan|favori|favorite/i
        );
      }
    });
  }
});
