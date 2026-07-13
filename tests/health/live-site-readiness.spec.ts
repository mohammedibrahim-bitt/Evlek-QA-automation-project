import { test, expect } from '../fixtures/test';
import { propertyDetailLinks, visiblePropertyDetailHrefs } from '../../utils/propertyUrls';

const unavailableListingPattern = /ilan bulunamad|not found|404/i;

test.describe('Evlek live-site readiness', () => {
  test('@readiness listing data supports deeper public journeys', async ({ page }) => {
    await test.step('sale listing page loads with visible content', async () => {
      const response = await page.goto('/satilik', { waitUntil: 'domcontentloaded' });

      expect(response?.status(), '/satilik should return a successful HTTP response').toBeLessThan(400);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await expect(page.locator('body'), '/satilik should not render a blank page').not.toHaveText(/^\s*$/);
      await expect(page.locator('body'), '/satilik should show listing-related content').toContainText(/ilan|emlak|sat/i);
    });

    const propertyLinkCandidates = propertyDetailLinks(page);

    await expect.poll(
      () => propertyLinkCandidates.count(),
      { message: '/satilik should expose listing links after the page settles.' }
    ).toBeGreaterThan(0);

    const propertyHrefs = await visiblePropertyDetailHrefs(page, 12);

    expect(
      propertyHrefs.length,
      '/satilik should expose at least one property detail link before buyer/contact/gallery tests run'
    ).toBeGreaterThan(0);

    let liveDetailUrl = '';

    await test.step('at least one listing card opens a live property detail page', async () => {
      for (const href of propertyHrefs) {
        const detailUrl = new URL(href, page.url()).toString();
        const response = await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
        const bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');

        if ((response?.status() ?? 0) < 400 && !unavailableListingPattern.test(bodyText) && bodyText.trim().length > 100) {
          liveDetailUrl = detailUrl;
          break;
        }
      }

      expect(
        liveDetailUrl,
        'At least one listing from /satilik should open a live property detail page. If this fails, deeper buyer/contact/gallery tests are blocked by live site data.'
      ).not.toBe('');
    });

    await test.step('live detail page exposes buyer journey entry points', async () => {
      const contactAction = page.getByRole('button', { name: /whatsapp|telefon|ileti\S*im|payla\S*|takip|contact|phone/i })
        .or(page.getByRole('link', { name: /whatsapp|telefon|ileti\S*im|payla\S*|takip|contact|phone/i }))
        .first();
      const mediaAction = page.getByRole('button', { name: /foto|photo|gallery|galeri/i })
        .or(page.getByText(/foto|photo|gallery|galeri/i))
        .first();

      await expect(contactAction, `${liveDetailUrl} should show a contact/favorite/share action`).toBeVisible();
      await expect(mediaAction, `${liveDetailUrl} should show a gallery or photo entry point`).toBeVisible();
    });
  });
});
