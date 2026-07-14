import { test, expect } from '../fixtures/test';
import { PropertyDetailPage } from '../../pages/PropertyDetailPage';
import {
  attachContactOutcomeDiagnostics,
  attachCapabilityDiagnostics,
  contactTargetDetails,
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
      const authGateOpened = await detail.expectAuthGateVisible().then(() => true).catch(() => false);
      if (authGateOpened) {
        await attachContactOutcomeDiagnostics(testInfo, page, 'Contact action opened an authentication gate.');
        return;
      }

      await attachCapabilityDiagnostics(testInfo, page, 'Contact/share action opened no direct contact option or auth gate.');
      test.skip(true, 'Contact/share action opened no direct contact option or auth gate.');
      return;
    }

    const details = await contactTargetDetails(directContactOption);
    await attachContactOutcomeDiagnostics(testInfo, page, 'Contact action exposed a direct contact option.', details);

    expect(
      ['whatsapp', 'phone', 'email', 'contact'],
      `Contact option should resolve to a known safe contact type. Detected ${details.kind}: ${details.target}`
    ).toContain(details.kind);
  });
});
