# BUG-003: Signed-in add-listing access passes with saved browser session

## URL

- https://evlek.app/ilan-ekle
- Redirect observed: https://evlek.app/?auth=login&redirect=%2Filan-ekle

## Device / Browser

- Desktop Chrome via Playwright Chromium

## Preconditions

- Use the provided Evlek QA test account.
- Do not use real user data.

## Steps To Reproduce

1. Open https://evlek.app/?auth=login.
2. Sign in with the provided QA test account.
3. Confirm the profile menu is visible after login.
4. Navigate directly to https://evlek.app/ilan-ekle.

## Expected Result

The signed-in user should reach the add-listing form or an authorized onboarding step for creating a property listing.

## Original Automated Result

The user is redirected back to the home page login modal URL:

`https://evlek.app/?auth=login&redirect=%2Filan-ekle`

The page still shows the public home page content instead of an add-listing form.

Manual re-check note: the add-listing page was reported to work in a normal browser session, so this was treated as a possible automation/session timing issue rather than a confirmed product bug.

## Re-Test Result

Passed after adding reusable account login and saved browser session setup.

Command:

```bash
npm run test:account
```

Result:

```text
2 passed
```

The signed-in `/ilan-ekle` test passed on desktop Chromium without publishing, saving, or submitting a listing.

## Severity

Info. This is no longer treated as a product bug because the saved-session account test passes.

## Screenshot / Video

Automated evidence is captured by Playwright when the account-based agent test fails:

- `test-results/`
- `playwright-report/`
- GitHub Actions Playwright report artifact, when run in CI

## Suggested Fix

Keep signed-in account tests on saved browser session setup when the goal is to test post-login journeys instead of the login flow itself.

## Status

Closed - automation timing
