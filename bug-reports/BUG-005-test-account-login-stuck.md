# BUG-005: Provided QA test account login does not complete after submit

## Summary

The login modal opens and validation works, but signing in with the provided QA test account does not complete. After submitting valid test-account credentials, the modal remains visible and the submit button stays in a disabled loading state.

## URL

- https://evlek.app/?auth=login

## Device / Browser

- Desktop Chrome / Playwright `desktop-chromium`

## Preconditions

- `BASE_URL` is set to `https://evlek.app/`
- `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` are set locally in `.env`
- Do not publish or commit credentials

## Steps To Reproduce

1. Open https://evlek.app/?auth=login.
2. Enter the provided QA test account email and password.
3. Submit the login form.
4. Or run:

   ```bash
   npm run test:forms -- --project=desktop-chromium --grep "provided test user can sign in"
   ```

## Expected Result

The login modal should close and the page should show an authenticated signal such as profile/account access.

## Actual Result

The login modal remains visible after submit. The form shows a disabled loading-style submit button and does not reach an authenticated state within the test timeout.

## Severity

High

## Screenshot / Video

Evidence is available in local Playwright reports under `test-results/`.

Do not commit generated evidence files such as `test-results/`, `playwright-report/`, videos, traces, screenshots, or `.env` credentials to the public repo.

## Suggested Fix

Check the authentication endpoint and the QA test account status. Confirm the account is active, password login is enabled, and the UI handles auth API errors by showing a visible error instead of leaving the form in a loading state.

## Status

New
