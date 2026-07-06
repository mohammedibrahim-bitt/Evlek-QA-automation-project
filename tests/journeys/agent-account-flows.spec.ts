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
});
