# BUG-001: Regional listing pages emit 429 and failed data/resource errors

## Summary

Regional listing and city guide pages load with HTTP 200, but the browser console reports failed dependent resource or data requests with HTTP 429 on some pages.

## URLs

- https://evlek.app/kiralik/girne
- https://evlek.app/satilik/lefkosa
- https://evlek.app/kiralik/lefkosa
- https://evlek.app/satilik/iskele
- https://evlek.app/satilik/gazimagusa
- https://evlek.app/kiralik/gazimagusa
- https://evlek.app/satilik/guzelyurt
- https://evlek.app/kiralik/guzelyurt
- https://evlek.app/satilik/lefke
- https://evlek.app/kiralik/lefke
- https://evlek.app/girne
- https://evlek.app/lefkosa
- https://evlek.app/gazimagusa
- https://evlek.app/iskele

## Device / Browser

- Desktop Chrome / Playwright `desktop-chromium`
- Mobile Chrome / Playwright `mobile-chrome`

## Preconditions

- `BASE_URL` is set to `https://evlek.app/`
- No real user account is required

## Steps To Reproduce

1. Open https://evlek.app/.
2. Navigate through internal regional listing and city guide links.
3. Or run:

   ```bash
   npm run test:audit -- --project=desktop-chromium
   npm run test:audit -- --project=mobile-chrome
   ```

4. Review browser console errors in the Playwright HTML report or audit JSON attachment.

## Expected Result

Regional listing and city guide pages should load without failed dependent resources, failed data fetches, or browser console errors.

## Actual Result

The affected pages return HTTP 200, but the browser console logs failed dependent resource or data requests with HTTP 429 on regional pages. Mobile `/kiralik/girne` also logs property-count and property-fetch failures.

## Severity

Medium

## Screenshot / Video

Evidence is available in local Playwright reports or GitHub Actions artifacts from the audit run.

Do not commit generated evidence files such as `test-results/`, `playwright-report/`, videos, traces, or screenshots to the public repo.

## Suggested Fix

Review backend/API rate limiting and cache behavior for resources loaded by regional listing pages. Ensure normal browsing and QA crawling do not trigger 429s for required page assets or data requests. Consider caching, request batching, retry/backoff, or adjusted throttling where appropriate.

## Status

New
