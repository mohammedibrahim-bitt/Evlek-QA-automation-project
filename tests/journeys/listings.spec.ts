import { test } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

test.describe('Evlek property listing journeys', () => {
  test('@smoke @regression sale listings show searchable and filterable property results', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    await listings.expectListingsVisible();
    await listings.expectSearchAndFilterControlsVisible();
    await listings.selectCityIfAvailable('Girne');
    if (await listings.searchIfAvailable('Girne')) {
      await listings.expectNoResultsOrListingsVisible();
    } else {
      await listings.expectListingsVisible();
    }
  });

  test('@regression rent listings show property results and browsing controls', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    test.skip(!await listings.openAvailableRentListings(testInfo), 'No live rent listing page currently exposes property cards.');
    await listings.expectListingsVisible();
    await listings.expectSearchAndFilterControlsVisible();
  });

  test('@smoke @regression user can open a property detail page from sale listings', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);

    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    await listings.expectListingsVisible();
    test.skip(!await listings.openFirstLiveProperty(testInfo), 'No live property detail page could be opened from discovered listing cards.');

    await detail.expectLoaded();
    await detail.expectCorePropertyInformation();
    await detail.expectMediaAndActionsVisible();
  });
});
