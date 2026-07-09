import dotenv from 'dotenv';
import { chromium } from '@playwright/test';

dotenv.config();

const baseUrl = process.env.BASE_URL;
const strict = process.env.PREFLIGHT_STRICT === '1';

if (!baseUrl) {
  console.error('Preflight failed: BASE_URL is required.');
  process.exit(1);
}

const checks = [];

function pass(name, detail) {
  checks.push({ status: 'pass', name, detail });
}

function warn(name, detail) {
  checks.push({ status: 'warn', name, detail });
}

function fail(name, detail) {
  checks.push({ status: 'fail', name, detail });
}

function absoluteUrl(pathOrUrl) {
  return new URL(pathOrUrl, baseUrl).toString();
}

async function bodyText(page) {
  return page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.setDefaultTimeout(10_000);

try {
  const response = await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const status = response?.status() ?? 0;

  if (status >= 200 && status < 400) {
    pass('BASE_URL is reachable', `${baseUrl} returned HTTP ${status}.`);
  } else {
    fail('BASE_URL is reachable', `${baseUrl} returned HTTP ${status || 'unknown'}.`);
  }

  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  const homeText = await bodyText(page);
  const title = (await page.title()).trim();

  if (title.length >= 5 && homeText.trim().length >= 50) {
    pass('Homepage has visible content', `Title: ${title}`);
  } else {
    fail('Homepage has visible content', 'Homepage title or body content is missing/too short.');
  }
} catch (error) {
  fail('BASE_URL is reachable', error instanceof Error ? error.message : String(error));
}

try {
  await page.goto(absoluteUrl('/?auth=login'), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);

  let loginVisible = await page.getByRole('dialog').isVisible().catch(() => false);

  if (!loginVisible) {
    const loginButton = page.getByRole('button', { name: /giri\S*|login|log in|sign in/i }).first();
    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click({ timeout: 5_000 }).catch(() => undefined);
      loginVisible = await page.getByRole('dialog').isVisible({ timeout: 5_000 }).catch(() => false);
    }
  }

  const emailVisible = await page.locator('input[type="email"], input[autocomplete="email"]').first().isVisible().catch(() => false);
  const passwordVisible = await page.locator('input[type="password"], input[autocomplete="current-password"]').first().isVisible().catch(() => false);

  if (loginVisible && emailVisible && passwordVisible) {
    pass('Login entry opens', 'Login dialog and email/password fields are visible.');
  } else {
    fail('Login entry opens', 'Login dialog or required email/password fields were not visible.');
  }
} catch (error) {
  fail('Login entry opens', error instanceof Error ? error.message : String(error));
}

try {
  await page.goto(absoluteUrl('/satilik'), { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);

  const hrefs = await page.locator('a[href*="/properties/"]').evaluateAll((links) =>
    [...new Set(
      links
        .map((link) => link.getAttribute('href'))
        .filter((href) => Boolean(href))
    )].slice(0, 20)
  );

  let liveListingUrl = '';

  for (const href of hrefs) {
    const listingUrl = absoluteUrl(href);
    const response = await page.goto(listingUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => null);
    const text = await bodyText(page);

    if ((response?.status() ?? 0) < 400 && !/ilan bulunamad|not found/i.test(text) && text.trim().length > 100) {
      liveListingUrl = listingUrl;
      break;
    }
  }

  if (liveListingUrl) {
    pass('At least one live property detail exists', liveListingUrl);
  } else {
    warn('At least one live property detail exists', 'No working property detail was found from /satilik. Buyer/contact/gallery tests may be blocked by site data.');
  }
} catch (error) {
  warn('At least one live property detail exists', error instanceof Error ? error.message : String(error));
}

if (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD) {
  pass('Test account variables are configured', 'TEST_USER_EMAIL and TEST_USER_PASSWORD are present locally.');
} else {
  warn('Test account variables are configured', 'Account-required tests will be skipped or fail until TEST_USER_EMAIL and TEST_USER_PASSWORD are set.');
}

await browser.close();

const failed = checks.filter((check) => check.status === 'fail');
const warnings = checks.filter((check) => check.status === 'warn');

for (const check of checks) {
  const marker = check.status === 'pass' ? 'PASS' : check.status === 'warn' ? 'WARN' : 'FAIL';
  console.log(`[${marker}] ${check.name}`);
  if (check.detail) {
    console.log(`       ${check.detail}`);
  }
}

if (failed.length > 0 || (strict && warnings.length > 0)) {
  console.error('');
  console.error(`Preflight finished with ${failed.length} failure(s) and ${warnings.length} warning(s).`);
  if (strict && warnings.length > 0) {
    console.error('PREFLIGHT_STRICT=1 turns warnings into a failing exit code.');
  }
  process.exit(1);
}

console.log('');
console.log(`Preflight passed with ${warnings.length} warning(s).`);
