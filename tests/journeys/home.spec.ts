import { test, expect } from '../fixtures/test';
import { HomePage } from '../../pages/HomePage';

test.describe('Evlek home journey', () => {
  test('@smoke @regression loads the home page with visible content', async ({ page, consoleErrors }) => {
    const home = new HomePage(page);

    await home.open();
    await home.expectLoaded();

    expect(consoleErrors, 'No browser console errors should appear on initial load').toEqual([]);
  });

  test('@smoke @regression shows usable primary navigation', async ({ page }) => {
    const home = new HomePage(page);

    await home.open();
    await home.openMobileMenuIfPresent();

    const links = home.navigationLinks();
    await expect(links.first()).toBeVisible();
    await expect.soft(links.first()).toHaveAttribute('href', /.+/);
  });
});
