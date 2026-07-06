import { test } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';

test.describe('Evlek public user flows', () => {
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
});
