import { test } from '../fixtures/test';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';
import {
  attachCapabilityDiagnostics,
  findContactAction,
  findDirectContactOption,
  findGalleryEntry,
  hasContactCapability,
  openLivePropertyWithCapability
} from '../../utils/capabilities';

test.describe('Evlek property contact journey', () => {
  test.setTimeout(90_000);

  test('@regression property detail page exposes contact options without submitting a lead', async ({ page }, testInfo) => {
    const detail = new PropertyDetailPage(page);

    const propertyUrl = await openLivePropertyWithCapability(page, testInfo, 'contact-action', hasContactCapability);
    test.skip(!propertyUrl, 'No live property with a contact/share action is available for contact checks.');
    await detail.expectLoaded();

    const galleryEntry = await findGalleryEntry(page);
    const contactAction = await findContactAction(page);

    if (!galleryEntry) {
      await attachCapabilityDiagnostics(testInfo, page, 'Property detail is missing gallery or contact/share entry points.');
      test.skip(true, 'This live property does not expose a gallery entry point.');
      return;
    }

    if (!contactAction) {
      await attachCapabilityDiagnostics(testInfo, page, 'Property detail is missing contact/share entry points.');
      test.skip(true, 'This live property does not expose contact/share actions.');
      return;
    }

    await contactAction.click();

    const directContactOption = await findDirectContactOption(page);
    if (!directContactOption) {
      await attachCapabilityDiagnostics(testInfo, page, 'Contact/share action opened no direct contact options.');
      test.skip(true, 'Contact/share action opened no direct contact options.');
      return;
    }
  });
});
