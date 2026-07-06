import { test } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

test.describe('Evlek buyer interaction journeys', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(90_000);

  test('@mobile @regression mobile user can use listing filters without losing results', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'Mobile filter journey only runs on mobile projects.');

    const listings = new ListingsPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await listings.selectCity('Girne');
    await listings.openFilters();
    await listings.applyRoomFilter('2+1');
    await listings.applyOpenedFilters();
    await listings.expectListingsVisible();
  });

  test('@regression property detail currency controls update visible currency context', async ({ page }) => {
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);

    await listings.openSale();
    await listings.openFirstProperty();
    await detail.expectLoaded();

    await detail.switchCurrency('EUR');
    await detail.expectCurrencyVisible('EUR');
    await detail.switchCurrency('USD');
    await detail.expectCurrencyVisible('USD');
    await detail.switchCurrency('TRY');
    await detail.expectCurrencyVisible('TRY');
    await detail.switchCurrency('GBP');
    await detail.expectCurrencyVisible('GBP');
  });

  test('@regression property detail gallery opens and supports next-photo navigation', async ({ page }) => {
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);

    await listings.openSale();
    await listings.openFirstProperty();
    await detail.expectLoaded();

    await detail.openGallery();
    await detail.expectGalleryNavigationVisible();
    await detail.goToNextGalleryPhoto();
    await detail.expectGalleryStillOpen();
  });
});
