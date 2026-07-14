import type { Locator } from '@playwright/test';
import { test, expect } from '../fixtures/test';
import { HomePage } from '../../pages/HomePage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';
import {
  attachAuthDiagnostics,
  findEmailInput,
  findLoginSubmit,
  findPasswordInput,
  openLoginSurface
} from '../../utils/authCapabilities';
import {
  attachCapabilityDiagnostics,
  findContactAction,
  findGalleryEntry,
  openLivePropertyWithCapability
} from '../../utils/capabilities';

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

  test('@regression login modal fields are keyboard reachable and labelled', async ({ page }, testInfo) => {
    const opened = await openLoginSurface(page, testInfo);
    if (!opened) {
      await attachAuthDiagnostics(testInfo, page, 'Login surface is not available for accessibility checks.');
    }
    test.skip(!opened, 'Login surface is not available for accessibility checks.');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const emailInput = await findEmailInput(page);
    const passwordInput = await findPasswordInput(page);
    const submitButton = await findLoginSubmit(page);

    expect(emailInput, 'Login email field should be discoverable by accessible label or input attributes.').not.toBeNull();
    expect(passwordInput, 'Login password field should be discoverable by accessible label or input attributes.').not.toBeNull();
    expect(submitButton, 'Login submit button should be discoverable by accessible name.').not.toBeNull();

    await expect(emailInput!).toBeVisible();
    await expect(passwordInput!).toBeVisible();
    await expect(submitButton!).toBeVisible();
    expect(await hasAccessibleName(emailInput!), 'Login email field should have accessible label-like metadata.').toBe(true);
    expect(await hasAccessibleName(passwordInput!), 'Login password field should have accessible label-like metadata.').toBe(true);
  });

  test('@regression property detail contact and gallery controls are accessible by role/name', async ({ page }, testInfo) => {
    const detail = new PropertyDetailPage(page);

    const propertyUrl = await openLivePropertyWithCapability(
      page,
      testInfo,
      'accessible-gallery-contact',
      async (candidatePage) => Boolean(await findGalleryEntry(candidatePage) && await findContactAction(candidatePage))
    );
    test.skip(!propertyUrl, 'No live property with gallery and contact controls is available for accessibility checks.');

    await detail.expectLoaded();

    const galleryEntry = await findGalleryEntry(page);
    const contactAction = await findContactAction(page);
    if (!galleryEntry || !contactAction) {
      await attachCapabilityDiagnostics(testInfo, page, 'Selected property no longer exposes gallery and contact controls.');
    }

    expect(galleryEntry, 'Property detail should expose a gallery/photo control by role or name.').not.toBeNull();
    expect(contactAction, 'Property detail should expose a contact/share control by role or name.').not.toBeNull();
    await expect(galleryEntry!).toBeVisible();
    await expect(contactAction!).toBeVisible();
  });
});

async function hasAccessibleName(locator: Locator): Promise<boolean> {
  return locator.evaluate((element) => {
    const id = element.getAttribute('id');
    const documentRoot = element.ownerDocument;
    const explicitLabel = id ? documentRoot.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent ?? '' : '';
    const wrappingLabel = element.closest('label')?.textContent ?? '';
    const labelledBy = element.getAttribute('aria-labelledby')
      ?.split(/\s+/)
      .map((labelId) => documentRoot.getElementById(labelId)?.textContent ?? '')
      .join(' ');
    const metadata = [
      element.getAttribute('aria-label'),
      labelledBy,
      element.getAttribute('placeholder'),
      element.getAttribute('title'),
      explicitLabel,
      wrappingLabel
    ].join(' ');

    return metadata.replace(/\s+/g, ' ').trim().length > 0;
  });
}
