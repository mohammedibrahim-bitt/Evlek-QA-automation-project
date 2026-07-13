import { test, expect } from '../fixtures/test';

type RouteCheck = {
  path: string;
  expectedUrl?: RegExp;
  expectedText: RegExp;
  protectedRoute?: boolean;
};

const routes: RouteCheck[] = [
  {
    path: '/',
    expectedUrl: /https:\/\/evlek\.app\/(?:\?.*)?$/,
    expectedText: /K\S*br\S*s|sat\S*l\S*k|kiral\S*k|emlak|property/i
  },
  {
    path: '/satilik',
    expectedText: /sat\S*l\S*k|ilan|emlak/i
  },
  {
    path: '/kiralik',
    expectedText: /kiral\S*k|ilan|emlak/i
  },
  {
    path: '/en',
    expectedUrl: /\/en(?:\/)?$/,
    expectedText: /North Cyprus|property|buy|rent|login/i
  },
  {
    path: '/ru',
    expectedUrl: /\/ru(?:\/)?$/,
    expectedText: /Evlek|\S{3,}/i
  },
  {
    path: '/de',
    expectedUrl: /\/de(?:\/)?$/,
    expectedText: /Nordzypern|Immobilien|Kaufen|Mieten|Einloggen/i
  },
  {
    path: '/ar',
    expectedUrl: /\/ar(?:\/)?$/,
    expectedText: /Evlek|\S{3,}/i
  },
  {
    path: '/en/properties?type=sale',
    expectedUrl: /\/en\/properties\?type=sale/i,
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

      if (route.expectedUrl) {
        await expect(page, `${route.path} should stay on the expected route family`).toHaveURL(route.expectedUrl);
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
