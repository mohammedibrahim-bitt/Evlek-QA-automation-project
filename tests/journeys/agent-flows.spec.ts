import { test } from '../fixtures/test';
import { AddListingPage } from '../../pages/AddListingPage';

test.describe('Evlek agent and property lister flows', () => {
  test('@regression logged-out lister is gated before adding a property', async ({ page }) => {
    const addListing = new AddListingPage(page);

    await addListing.open();
    await addListing.expectLoggedOutGateVisible();
  });

  test('@regression logged-out lister can start login from add-listing gate', async ({ page }) => {
    const addListing = new AddListingPage(page);

    await addListing.open();
    await addListing.expectLoggedOutGateVisible();
    await addListing.openLoginFromGate();
  });
});
