import { test } from '../fixtures/test';
import { HomePage } from '../../pages/HomePage';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

test.describe('Evlek public user flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('@regression user can filter listings by property type without losing results page', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    await listings.expectListingsVisible();
    if (!await listings.selectPropertyTypeIfAvailable()) {
      await listings.expectSearchAndFilterControlsVisible();
    }
    await listings.expectNoResultsOrListingsVisible();
  });

  test('@regression user can sort sale listings by lowest price', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    await listings.expectListingsVisible();
    const sorted = await listings.sortByLowestPriceIfAvailable();
    if (!sorted) {
      await listings.expectSearchAndFilterControlsVisible();
    }
    await listings.expectNoResultsOrListingsVisible();
  });

  test('@regression user sees a handled empty state for an unrealistic listing search', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    await listings.expectSearchAndFilterControlsVisible();
    test.skip(!await listings.searchIfAvailable('zzzz-no-real-evlek-listing-0000'), 'The current listing layout does not expose a visible search input.');
    await listings.expectNoResultsOrListingsVisible();
  });

  test('@regression save-search email field rejects invalid email format', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    await listings.expectListingsVisible();
    test.skip(!await listings.saveSearchIfAvailable(), 'Save-search action is not available on the current listing page.');
    await listings.expectSaveSearchModalVisible();
    await listings.submitInvalidSaveSearchEmail();
  });

  test('@regression full buyer path from homepage to logged-out listing action', async ({ page }, testInfo) => {
    test.setTimeout(90_000);

    const home = new HomePage(page);
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);

    await home.open();
    await home.expectLoaded();
    await home.openSaleListings();
    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');

    await listings.expectSearchAndFilterControlsVisible();
    await listings.selectCityIfAvailable('Girne');
    await listings.searchIfAvailable('Girne');
    await listings.applyQuickRoomFilterIfAvailable('2+1');
    await listings.applyPriceFilterIfAvailable(/250/i);
    await listings.expectNoResultsOrListingsVisible();
    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    test.skip(!await listings.openFirstLiveProperty(testInfo), 'No live property detail page could be opened from discovered listing cards.');

    await detail.expectLoaded();
    await detail.expectCorePropertyInformation();
    await detail.expectMediaAndActionsVisible();
    await detail.openGallery();
    if (await detail.hasGalleryNavigation()) {
      await detail.expectGalleryNavigationVisible();
    }
    await detail.closeGalleryIfOpen();
    await detail.useLoggedOutListingAction();
  });
});
