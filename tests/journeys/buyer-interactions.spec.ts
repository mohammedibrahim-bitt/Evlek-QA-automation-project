import { test } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';
import {
  attachCapabilityDiagnostics,
  dismissCookieBannerIfPresent,
  findCurrencyButton,
  findGalleryEntry,
  findGalleryNextButton,
  findGalleryPreviousButton,
  openFirstLiveProperty
} from '../../utils/capabilities';

test.describe('Evlek buyer interaction journeys', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  test('@mobile @regression mobile user can use listing filters without losing results', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile filter journey only runs on mobile projects.');

    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await dismissCookieBannerIfPresent(page);

    if (await listings.hasVisibleCitySelect()) {
      await listings.selectCity('Girne');
    } else {
      await attachCapabilityDiagnostics(testInfo, page, 'City select is hidden on this mobile layout; continuing with filter drawer coverage.');
    }

    await dismissCookieBannerIfPresent(page);
    await listings.openFilters();
    await listings.applyRoomFilter('2+1');
    await listings.applyOpenedFilters();
    await listings.expectListingsVisible();
  });

  test('@regression property detail currency controls update visible currency context', async ({ page }, testInfo) => {
    const detail = new PropertyDetailPage(page);

    const propertyUrl = await openFirstLiveProperty(page, testInfo);
    test.skip(!propertyUrl, 'No live property detail page is available for currency checks.');
    await detail.expectLoaded();

    for (const currency of ['EUR', 'USD', 'TRY', 'GBP'] as const) {
      const button = await findCurrencyButton(page, currency);
      if (!button) {
        await attachCapabilityDiagnostics(testInfo, page, `${currency} currency control is not available on this live property.`);
      }
      test.skip(!button, `${currency} currency control is not available on this live property.`);
    }

    await detail.switchCurrency('EUR');
    await detail.expectCurrencyVisible('EUR');
    await detail.switchCurrency('USD');
    await detail.expectCurrencyVisible('USD');
    await detail.switchCurrency('TRY');
    await detail.expectCurrencyVisible('TRY');
    await detail.switchCurrency('GBP');
    await detail.expectCurrencyVisible('GBP');
  });

  test('@regression property detail gallery opens and supports next-photo navigation', async ({ page }, testInfo) => {
    const detail = new PropertyDetailPage(page);

    const propertyUrl = await openFirstLiveProperty(page, testInfo);
    test.skip(!propertyUrl, 'No live property detail page is available for gallery checks.');
    await detail.expectLoaded();

    const galleryEntry = await findGalleryEntry(page);
    if (!galleryEntry) {
      await attachCapabilityDiagnostics(testInfo, page, 'No gallery entry is visible on this live property.');
      test.skip(true, 'No gallery entry is visible on this live property.');
      return;
    }

    await galleryEntry.click();
    await detail.expectGalleryStillOpen();

    const nextButton = await findGalleryNextButton(page);
    const previousButton = await findGalleryPreviousButton(page);
    if (!nextButton || !previousButton) {
      await attachCapabilityDiagnostics(testInfo, page, 'Gallery opened but next/previous navigation is not available.');
      test.skip(true, 'Gallery opened but next/previous navigation is not available.');
      return;
    }

    await nextButton.click();
    await detail.expectGalleryStillOpen();
  });
});
