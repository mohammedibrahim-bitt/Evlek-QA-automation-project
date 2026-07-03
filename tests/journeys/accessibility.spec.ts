import { test, expect } from '../fixtures/test';
import { AuthPage } from '../../pages/AuthPage';
import { HomePage } from '../../pages/HomePage';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

test.describe('Evlek accessibility smoke checks', () => {
  test('@regression home page exposes keyboard focus on interactive elements', async ({ page }) => {
    const home = new HomePage(page);

    await home.open();
    await page.keyboard.press('Tab');

    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    const tagName = await focused.evaluate((element) => element.tagName);
    expect(tagName).toMatch(/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/);
  });

  test('@regression visible primary controls have accessible names', async ({ page }) => {
    const home = new HomePage(page);

    await home.open();

    const unnamedControls = await page.locator('a[href], button, input, select, textarea').evaluateAll((elements) =>
      elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
        })
        .map((element) => {
          const label = [
            element.getAttribute('aria-label'),
            element.getAttribute('title'),
            element.getAttribute('placeholder'),
            element.textContent
          ].join(' ').trim();

          return { tag: element.tagName, label };
        })
        .filter((element) => element.label.length === 0)
    );

    expect(unnamedControls, JSON.stringify(unnamedControls, null, 2)).toEqual([]);
  });

  test('@regression login modal fields are keyboard reachable and labelled', async ({ page }) => {
    const auth = new AuthPage(page);

    await auth.openLoginModal();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    await expect(page.getByRole('dialog').getByLabel(/e-posta|email/i)).toBeVisible();
    await expect(page.getByRole('dialog').locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('button', { name: 'Devam et', exact: true })).toBeVisible();
  });

  test('@regression property detail contact and gallery controls are accessible by role/name', async ({ page }) => {
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);

    await listings.openSale();
    await listings.openFirstProperty();

    await detail.expectLoaded();
    await expect(page.getByRole('button', { name: /foto|photo|galeri|gallery/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /whatsapp|telefon|phone|call|paylaş|share/i }).first()).toBeVisible();
  });
});
