import { test } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';
import {
  attachCapabilityDiagnostics,
  findFollowAction,
  findSaveSearchAction,
  hasFollowCapability,
  openLivePropertyWithCapability
} from '../../utils/capabilities';

test.describe('Evlek logged-out gated actions', () => {
  test.setTimeout(90_000);

  test('@regression logged-out user can open save-search notification modal', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    const opened = await listings.openAvailableSaleListings(testInfo);
    test.skip(!opened, 'No live sale listings page with property cards was available for save-search checks.');
    await listings.expectListingsVisible();

    const saveSearchAction = await findSaveSearchAction(page);
    if (!saveSearchAction) {
      await attachCapabilityDiagnostics(testInfo, page, 'Save-search action is not available on the current listing page.');
      test.skip(true, 'Save-search action is not available on the current listing page.');
      return;
    }

    await saveSearchAction.click();
    await listings.expectSaveSearchModalVisible();
  });

  test('@regression logged-out user is prompted to authenticate before following a listing', async ({ page }, testInfo) => {
    const detail = new PropertyDetailPage(page);

    const propertyUrl = await openLivePropertyWithCapability(page, testInfo, 'follow-action', hasFollowCapability);
    test.skip(!propertyUrl, 'No live property with a follow/favorite action is available for follow-gate checks.');
    await detail.expectLoaded();

    const followAction = await findFollowAction(page);
    if (!followAction) {
      await attachCapabilityDiagnostics(testInfo, page, 'Follow/favorite action is not available on this live property.');
      test.skip(true, 'Follow/favorite action is not available on this live property.');
      return;
    }

    await followAction.click();
    await detail.expectAuthGateVisible();
  });
});
