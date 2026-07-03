import { test } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

test.describe('Evlek logged-out gated actions', () => {
  test('@regression logged-out user can open save-search notification modal', async ({ page }) => {
    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await listings.saveSearch();
    await listings.expectSaveSearchModalVisible();
  });

  test('@regression logged-out user is prompted to authenticate before following a listing', async ({ page }) => {
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);

    await listings.openSale();
    await listings.openFirstProperty();
    await detail.expectLoaded();
    await detail.followListing();
    await detail.expectAuthGateVisible();
  });
});
