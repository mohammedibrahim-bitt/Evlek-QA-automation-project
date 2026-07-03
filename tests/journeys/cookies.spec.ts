import { test } from '../fixtures/test';
import { HomePage } from '../../pages/HomePage';
import { CookieBanner } from '../../pages/CookieBanner';

test.describe('Evlek cookie consent journey', () => {
  test('@smoke @regression user can accept all cookies', async ({ page }) => {
    const home = new HomePage(page);
    const cookies = new CookieBanner(page);

    await home.open();
    await cookies.expectVisible();
    await cookies.acceptAll();
  });

  test('@regression user can accept required-only cookies', async ({ page }) => {
    const home = new HomePage(page);
    const cookies = new CookieBanner(page);

    await home.open();
    await cookies.expectVisible();
    await cookies.acceptRequiredOnly();
  });
});
