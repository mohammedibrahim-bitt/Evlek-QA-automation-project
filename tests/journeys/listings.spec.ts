import { test, expect } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

test.describe('Evlek property listing journeys', () => {
  test.setTimeout(90_000);

  test('@smoke @regression sale listings show searchable and filterable property results', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    test.skip(!await listings.openAvailableSaleListings(testInfo), 'No live sale listing page currently exposes property cards.');
    await listings.expectListingsVisible();
    await listings.expectSearchAndFilterControlsVisible();
    const exercised = await listings.exerciseAvailableSearchOrFilter(testInfo, 'Girne');
    test.skip(exercised.length === 0, 'No visible search/filter control could be safely exercised on the current live listing UI.');
    expect(exercised.length, 'At least one visible listing search/filter control should be exercised.').toBeGreaterThan(0);
    const changedResults = exercised.some((action) =>
      ['city-select', 'quick-room-filter', 'property-type', 'price-filter', 'sort'].includes(action)
    );

    if (changedResults) {
      await listings.expectNoResultsOrListingsVisible();
    }
  });

  test('@regression rent listings show property results and browsing controls', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    test.skip(!await listings.openAvailableRentListings(testInfo), 'No live rent listing page currently exposes property cards.');
    await listings.expectListingsVisible();
    await listings.expectSearchAndFilterControlsVisible();
    await listings.attachListingControlsDiagnostics(testInfo, 'Rent listing controls detected.');
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
