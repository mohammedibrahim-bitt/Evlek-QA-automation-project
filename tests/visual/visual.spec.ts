import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test';
import { AuthPage } from '../../pages/AuthPage';
import { HomePage } from '../../pages/HomePage';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

const screenshotOptions = {
  animations: 'disabled' as const,
  fullPage: true,
  maxDiffPixelRatio: 0.02
};

const viewportScreenshotOptions = {
  ...screenshotOptions,
  fullPage: false
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

    await expect(page).toHaveScreenshot('home-page.png', screenshotOptions);
  });

  test('@visual cookie banner remains visually stable', async ({ page }) => {
    const home = new HomePage(page);

    await home.open();
    await home.expectLoaded();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('cookie-banner.png', screenshotOptions);
  });

  test('@visual sale listings page remains visually stable', async ({ page }) => {
    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await dismissCookieBannerIfPresent(page);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('sale-listings-page.png', screenshotOptions);
  });

  test('@visual property detail page remains visually stable', async ({ page }) => {
    const listings = new ListingsPage(page);
    const property = new PropertyDetailPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await dismissCookieBannerIfPresent(page);
    await listings.openFirstProperty();
    await property.expectLoaded();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('property-detail-page.png', viewportScreenshotOptions);
  });

  test('@visual login modal remains visually stable', async ({ page }) => {
    const auth = new AuthPage(page);

    await auth.open();
    await dismissCookieBannerIfPresent(page);
    await auth.openLoginModal();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('login-modal.png', screenshotOptions);
  });

  test('@visual filter dialog remains visually stable', async ({ page }) => {
    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await dismissCookieBannerIfPresent(page);
    await listings.openFilters();
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('filter-dialog.png', screenshotOptions);
  });

  test('@visual English home page remains visually stable', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/.+/);
    await dismissCookieBannerIfPresent(page);
    await stabilizePage(page);

    await expect(page).toHaveScreenshot('english-home-page.png', screenshotOptions);
  });
});
