# BUG-002: Fiyat Endeksi page meta description is longer than recommended SEO threshold

## Summary

The `/fiyat-endeksi` page has a meta description longer than the configured 180-character SEO threshold.

## URL

https://evlek.app/fiyat-endeksi

## Device / Browser

- Desktop Chrome / Playwright `desktop-chromium`

## Preconditions

- `BASE_URL` is set to `https://evlek.app/`
- No real user account is required

## Steps To Reproduce

1. Run:

   ```bash
   npm run test:seo -- --project=desktop-chromium
   ```

2. Review the attached `seo-encoding-results.json` evidence in the Playwright HTML report.
3. Find the result for `https://evlek.app/fiyat-endeksi`.

## Expected Result

The meta description should be concise and stay at or under the configured 180-character SEO threshold.

## Actual Result

The meta description is 182 characters, which is slightly over the configured threshold.

## Severity

Low

## Screenshot / Video

Evidence is available in local Playwright reports or GitHub Actions artifacts from the SEO audit run.

Do not commit generated evidence files such as `test-results/`, `playwright-report/`, videos, traces, or screenshots to the public repo.

## Suggested Fix

Shorten the meta description slightly while preserving the main keywords. Removing one adjective or tightening the methodology phrase should be enough.

## Status

New
