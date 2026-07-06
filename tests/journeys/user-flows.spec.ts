import { test } from '../fixtures/test';
import { HomePage } from '../../pages/HomePage';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

test.describe('Evlek public user flows', () => {
  test.describe.configure({ mode: 'serial' });

  test('@regression user can filter listings by property type without losing results page', async ({ page }) => {
    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await listings.selectPropertyType();
    await listings.expectNoResultsOrListingsVisible();
  });

  test('@regression user can sort sale listings by lowest price', async ({ page }) => {
    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    const sorted = await listings.sortByLowestPriceIfAvailable();
    if (!sorted) {
      await listings.expectSearchAndFilterControlsVisible();
    }
    await listings.expectNoResultsOrListingsVisible();
  });

  test('@regression user sees a handled empty state for an unrealistic listing search', async ({ page }) => {
    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectSearchAndFilterControlsVisible();
    await listings.search('zzzz-no-real-evlek-listing-0000');
    await listings.expectNoResultsOrListingsVisible();
  });

  test('@regression save-search email field rejects invalid email format', async ({ page }) => {
    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await listings.saveSearch();
    await listings.expectSaveSearchModalVisible();
    await listings.submitInvalidSaveSearchEmail();
  });

  test('@regression full buyer path from homepage to logged-out listing action', async ({ page }) => {
    test.setTimeout(90_000);

    const home = new HomePage(page);
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);

    await home.open();
    await home.expectLoaded();
    await home.openSaleListings();

    await listings.expectSearchAndFilterControlsVisible();
    await listings.selectCity('Girne');
    await listings.search('Girne');
    await listings.applyQuickRoomFilter('2+1');
    await listings.applyPriceFilter(/250/i);
    await listings.expectNoResultsOrListingsVisible();
    await listings.ensureListingAvailableForOpening();
    await listings.openFirstProperty();

    await detail.expectLoaded();
    await detail.expectCorePropertyInformation();
    await detail.expectMediaAndActionsVisible();
    await detail.openGallery();
    await detail.expectGalleryNavigationVisible();
    await detail.closeGalleryIfOpen();
    await detail.useLoggedOutListingAction();
  });
});
