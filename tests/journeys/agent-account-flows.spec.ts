import { existsSync } from 'node:fs';
import { test } from '../fixtures/test';
import { AddListingPage } from '../../pages/AddListingPage';
import { AUTH_STATE_PATH } from '../../utils/auth';
import { hasTestAccount } from '../../utils/env';
import {
  attachAuthDiagnostics,
  hasAgentDraftPermission,
  isProtectedRouteGate,
  isSignedIn
} from '../../utils/authCapabilities';

const hasSavedAuthState = existsSync(AUTH_STATE_PATH);

test.describe('Evlek signed-in agent and property lister flows', () => {
  test.use(hasSavedAuthState ? { storageState: AUTH_STATE_PATH } : {});

  test('@regression @requires-account signed-in lister can open add-listing form without publishing', async ({ page }, testInfo) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');
    test.skip(!hasSavedAuthState, 'Run npm run auth:setup before saved-session account flows.');

    const addListing = new AddListingPage(page);

    await addListing.open();
    if (!await isSignedIn(page) || await isProtectedRouteGate(page)) {
      await attachAuthDiagnostics(testInfo, page, 'Saved session is missing or expired on /ilan-ekle.');
      test.skip(true, 'Saved session is missing or expired. Run npm run auth:setup.');
      return;
    }
    await addListing.expectSignedInListerCanAccessForm();
    await addListing.expectNoPublishOrDraftActionTaken();
  });

  test('@regression @requires-account add-listing page exposes expected form structure', async ({ page }, testInfo) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');
    test.skip(!hasSavedAuthState, 'Run npm run auth:setup before saved-session account flows.');

    const addListing = new AddListingPage(page);

    await addListing.open();
    if (!await isSignedIn(page) || await isProtectedRouteGate(page)) {
      await attachAuthDiagnostics(testInfo, page, 'Saved session is missing or expired on /ilan-ekle.');
      test.skip(true, 'Saved session is missing or expired. Run npm run auth:setup.');
      return;
    }
    await addListing.expectFormStructureVisible();
    await addListing.expectNoPublishOrDraftActionTaken();
  });

  test('@regression @requires-account signed-in lister can prepare fake draft details without publishing', async ({ page }, testInfo) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');
    test.skip(!hasSavedAuthState, 'Run npm run auth:setup before saved-session account flows.');

    const addListing = new AddListingPage(page);

    await addListing.open();
    if (!await isSignedIn(page) || await isProtectedRouteGate(page)) {
      await attachAuthDiagnostics(testInfo, page, 'Saved session is missing or expired on /ilan-ekle.');
      test.skip(true, 'Saved session is missing or expired. Run npm run auth:setup.');
      return;
    }

    if (!await hasAgentDraftPermission(page)) {
      await attachAuthDiagnostics(testInfo, page, 'The current test account is not Solo/Ekip.');
      test.skip(true, 'The current test account is not Solo/Ekip, so Evlek does not expose fillable draft listing fields.');
      return;
    }
    await addListing.prepareDraftDataWithoutPublishing();
  });

  test('@regression @requires-account add-listing empty continue shows validation without publishing', async ({ page }, testInfo) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');
    test.skip(!hasSavedAuthState, 'Run npm run auth:setup before saved-session account flows.');

    const addListing = new AddListingPage(page);

    await addListing.open();
    if (!await isSignedIn(page) || await isProtectedRouteGate(page)) {
      await attachAuthDiagnostics(testInfo, page, 'Saved session is missing or expired on /ilan-ekle.');
      test.skip(true, 'Saved session is missing or expired. Run npm run auth:setup.');
      return;
    }
    await addListing.expectDangerousActionsAreNotClickable();
    await addListing.attemptEmptyContinueWithoutPublishing();
  });
});
