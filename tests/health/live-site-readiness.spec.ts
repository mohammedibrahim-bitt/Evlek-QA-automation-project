import { test, expect } from '../fixtures/test';
import { ListingsPage } from '../../pages/ListingsPage';
import { attachCapabilityDiagnostics, findContactAction, findGalleryEntry } from '../../utils/capabilities';

test.describe('Evlek live-site readiness', () => {
  test('@readiness listing data supports deeper public journeys', async ({ page }, testInfo) => {
    const listings = new ListingsPage(page);

    await test.step('a sale listing page loads with visible content', async () => {
      const opened = await listings.openAvailableSaleListings(testInfo);

      expect(
        opened,
        'At least one known sale listing route should expose property cards.'
      ).toBe(true);
      await listings.expectListingsVisible();
    });

    let liveDetailUrl: string | null = '';

    await test.step('at least one listing card opens a live property detail page', async () => {
      liveDetailUrl = await listings.openFirstLiveProperty(testInfo);
      expect(
        liveDetailUrl,
        'At least one discovered listing should open a live property detail page. If this fails, deeper buyer/contact/gallery tests are blocked by live site data.'
      ).not.toBeNull();
    });

    await test.step('live detail page exposes buyer journey entry points', async () => {
      const contactAction = await findContactAction(page);
      const mediaAction = await findGalleryEntry(page);

      if (!contactAction || !mediaAction) {
        await attachCapabilityDiagnostics(testInfo, page, 'Live detail page is missing buyer/contact or gallery entry points.');
      }

      expect(contactAction, `${liveDetailUrl} should show a contact/favorite/share action`).not.toBeNull();
      expect(mediaAction, `${liveDetailUrl} should show a gallery or photo entry point`).not.toBeNull();
    });
  });
});
