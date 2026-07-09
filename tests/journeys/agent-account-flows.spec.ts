import { existsSync } from 'node:fs';
import { test } from '../fixtures/test';
import { AddListingPage } from '../../pages/AddListingPage';
import { AUTH_STATE_PATH } from '../../utils/auth';
import { hasTestAccount } from '../../utils/env';

const hasSavedAuthState = existsSync(AUTH_STATE_PATH);

test.describe('Evlek signed-in agent and property lister flows', () => {
  test.use(hasSavedAuthState ? { storageState: AUTH_STATE_PATH } : {});

  test('@regression @requires-account signed-in lister can open add-listing form without publishing', async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');
    test.skip(!hasSavedAuthState, 'Run npm run auth:setup before saved-session account flows.');

    const addListing = new AddListingPage(page);

    await addListing.open();
    await addListing.expectSignedInListerCanAccessForm();
    await addListing.expectNoPublishOrDraftActionTaken();
  });

  test('@regression @requires-account add-listing page exposes expected form structure', async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');
    test.skip(!hasSavedAuthState, 'Run npm run auth:setup before saved-session account flows.');

    const addListing = new AddListingPage(page);

    await addListing.open();
    await addListing.expectFormStructureVisible();
    await addListing.expectNoPublishOrDraftActionTaken();
  });

  test('@regression @requires-account signed-in lister can prepare fake draft details without publishing', async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');
    test.skip(!hasSavedAuthState, 'Run npm run auth:setup before saved-session account flows.');

    const addListing = new AddListingPage(page);

    await addListing.open();
    test.skip(
      !await addListing.hasDraftPreparationPermission(),
      'The current test account is not Solo/Ekip, so Evlek does not expose fillable draft listing fields.'
    );
    await addListing.prepareDraftDataWithoutPublishing();
  });

  test('@regression @requires-account add-listing empty continue shows validation without publishing', async ({ page }) => {
    test.skip(!hasTestAccount(), 'Set TEST_USER_EMAIL and TEST_USER_PASSWORD with a provided test account.');
    test.skip(!hasSavedAuthState, 'Run npm run auth:setup before saved-session account flows.');

    const addListing = new AddListingPage(page);

    await addListing.open();
    await addListing.expectDangerousActionsAreNotClickable();
    await addListing.attemptEmptyContinueWithoutPublishing();
  });
});
