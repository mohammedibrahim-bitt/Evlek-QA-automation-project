import { test } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

test.describe('Evlek property listing journeys', () => {
  test('@smoke @regression sale listings show searchable and filterable property results', async ({ page }) => {
    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await listings.expectSearchAndFilterControlsVisible();
    await listings.selectCity('Girne');
    await listings.search('Girne');
    await listings.expectListingsVisible();
  });

  test('@regression rent listings show property results and browsing controls', async ({ page }) => {
    const listings = new ListingsPage(page);

    await listings.openRent();
    await listings.expectListingsVisible();
    await listings.expectSearchAndFilterControlsVisible();
  });

  test('@smoke @regression user can open a property detail page from sale listings', async ({ page }) => {
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await listings.openFirstProperty();

    await detail.expectLoaded();
    await detail.expectCorePropertyInformation();
    await detail.expectMediaAndActionsVisible();
  });
});
