# BUG-004: Public property cards link to deleted or unavailable property pages

## Summary

The homepage and sale listing page render property cards, but their `/properties/{id}` links return HTTP 404 or the client-side "İlan bulunamadı" state. This breaks real user navigation and blocks property-detail journeys such as contact controls, currency controls, and gallery navigation.

## URL

- https://evlek.app/
- https://evlek.app/satilik

## Device / Browser

- Desktop Chrome / Playwright `desktop-chromium`
- Desktop Firefox / Playwright `desktop-firefox`
- Mobile Chrome / Playwright `mobile-chrome`
- Mobile Safari / Playwright `mobile-safari`

## Preconditions

- `BASE_URL` is set to `https://evlek.app/`
- No user account is required

## Steps To Reproduce

1. Open https://evlek.app/.
2. Scroll to the featured listings section or open https://evlek.app/satilik.
3. Click a property card.
4. Or run:

   ```bash
   npm run test:links -- --project=desktop-chromium
   ```

## Expected Result

Each public property card should open a live property detail page with listing information, photos, and contact actions.

## Actual Result

The property card links return HTTP 404 / "İlan bulunamadı".

Examples observed by the automated broken-link audit and property-detail journeys:

- https://evlek.app/properties/86b39e07-8b08-45af-9ed7-468552ad901e
- https://evlek.app/properties/ff1d3e53-03fe-40eb-82ff-899dc9aeaee8
- https://evlek.app/properties/c18ab90d-ce93-4a54-818b-8c6907678f84
- https://evlek.app/properties/19a817e7-e5fb-413a-91e7-fe44ac86a93b
- https://evlek.app/properties/e5387550-bdd5-4cfd-a07d-df44000945d2
- https://evlek.app/properties/68912996-4fa5-4ae9-98cb-44652ee9d1b1
- https://evlek.app/properties/46769ab8-0cfa-4297-ad4d-7bf764dd1f3d
- https://evlek.app/properties/710d9620-5515-4ecb-ac68-a5cbdf4b3071
- https://evlek.app/properties/9712c4b5-97b3-4098-8498-cc6d78e0690e

## Severity

High

## Screenshot / Video

Evidence is available in local Playwright reports under `test-results/` from the broken-link and property-detail runs.

Do not commit generated evidence files such as `test-results/`, `playwright-report/`, videos, traces, or screenshots to the public repo.

## Suggested Fix

Refresh the public listing data so it only includes active, publicly accessible listings. If a listing is deleted, unpublished, or under moderation, exclude it from homepage modules, listing pages, and API responses used by public pages.

## Status

New
