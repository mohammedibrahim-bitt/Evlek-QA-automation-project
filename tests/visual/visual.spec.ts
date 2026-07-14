import { type Locator, type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test';
import { AuthPage } from '../../pages/AuthPage';
import { HomePage } from '../../pages/HomePage';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

const screenshotOptions = {
  animations: 'disabled' as const,
  fullPage: false,
  maskColor: '#f3f4f6',
  maxDiffPixelRatio: 0.04
};

const viewportScreenshotOptions = {
  ...screenshotOptions
};

async function stabilizePage(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }

      iframe[src*="chat"],
      iframe[src*="intercom"],
      iframe[src*="crisp"],
      [class*="chat" i],
      [class*="intercom" i],
      [class*="crisp" i],
      [aria-label*="chat" i] {
        visibility: hidden !important;
      }
    `
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(500);
}

function dynamicVisualMasks(page: Page): Locator[] {
  return [
    page.locator('iframe[src*="chat"], iframe[src*="intercom"], iframe[src*="crisp"]'),
    page.locator('[class*="chat" i], [class*="intercom" i], [class*="crisp" i], [aria-label*="chat" i]'),
    page.locator('[aria-live], [role="status"], [role="progressbar"]'),
    page.locator('time, [datetime]'),
    page.locator('.mapboxgl-map, [class*="map" i][class*="container" i]')
  ];
}

async function dismissCookieBannerIfPresent(page: Page): Promise<void> {
  const requiredOnly = page.getByRole('button', { name: /required|zorunlu/i }).first();
  const acceptAll = page.getByRole('button', { name: /accept|kabul/i }).first();

  if (await requiredOnly.isVisible().catch(() => false)) {
    await requiredOnly.click();
  } else if (await acceptAll.isVisible().catch(() => false)) {
    await acceptAll.click();
  }
}

test.describe('Evlek visual regression @visual', () => {
  test('@visual home page remains visually stable', async ({ page }) => {
    const home = new HomePage(page);

    await home.open();
    await home.expectLoaded();
    await dismissCookieBannerIfPresent(page);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('home-page.png', {
      ...screenshotOptions,
      mask: dynamicVisualMasks(page)
    });
  });

  test('@visual cookie banner remains visually stable', async ({ page }) => {
    const home = new HomePage(page);

    await home.open();
    await home.expectLoaded();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('cookie-banner.png', {
      ...screenshotOptions,
      mask: dynamicVisualMasks(page)
    });
  });

  test('@visual sale listings page remains visually stable', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    const opened = await listings.openAvailableSaleListings(testInfo);
    test.skip(!opened, 'No live sale listings page with property cards was available.');
    await listings.expectListingsVisible();
    await dismissCookieBannerIfPresent(page);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('sale-listings-page.png', {
      ...screenshotOptions,
      mask: dynamicVisualMasks(page)
    });
  });

  test('@visual property detail page remains visually stable', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);
    const property = new PropertyDetailPage(page);

    const opened = await listings.openAvailableSaleListings(testInfo);
    test.skip(!opened, 'No live sale listings page with property cards was available.');
    await dismissCookieBannerIfPresent(page);
    const propertyUrl = await listings.openFirstLiveProperty(testInfo);
    test.skip(!propertyUrl, 'No live property detail page could be opened from current listing candidates.');
    await property.expectLoaded();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('property-detail-page.png', {
      ...viewportScreenshotOptions,
      mask: dynamicVisualMasks(page)
    });
  });

  test('@visual login modal remains visually stable', async ({ page }, testInfo) => {
    const auth = new AuthPage(page);

    await auth.open();
    await dismissCookieBannerIfPresent(page);
    const opened = await auth.openLoginModalIfAvailable(testInfo);
    test.skip(!opened, 'Login modal was not available in the current live UI/browser profile.');
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('login-modal.png', {
      ...screenshotOptions,
      mask: dynamicVisualMasks(page)
    });
  });

  test('@visual filter dialog remains visually stable', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    const opened = await listings.openAvailableSaleListings(testInfo);
    test.skip(!opened, 'No live sale listings page with property cards was available.');
    await listings.expectListingsVisible();
    await dismissCookieBannerIfPresent(page);
    const filtersOpened = await listings.openFiltersIfAvailable();
    test.skip(!filtersOpened, 'No filter dialog was available on the current live listing UI.');
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('filter-dialog.png', {
      ...screenshotOptions,
      mask: dynamicVisualMasks(page)
    });
  });

  test('@visual English home page remains visually stable', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/.+/);
    await dismissCookieBannerIfPresent(page);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('english-home-page.png', {
      ...screenshotOptions,
      mask: dynamicVisualMasks(page)
    });
  });
});
