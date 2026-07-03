import { test } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';

test.describe('Evlek property contact journey', () => {
  test('@regression property detail page exposes contact options without submitting a lead', async ({ page }) => {
    const listings = new ListingsPage(page);
    const detail = new PropertyDetailPage(page);

    await listings.openSale();
    await listings.expectListingsVisible();
    await listings.openFirstProperty();

    await detail.expectLoaded();
    await detail.expectMediaAndActionsVisible();
    await detail.openContactOptions();
    await detail.expectContactOptionsVisible();
  });
});
