const { chromium, expect } = require('@playwright/test');
const dotenv = require('dotenv');
const fs = require('node:fs');
const path = require('node:path');

dotenv.config();

const baseURL = process.env.BASE_URL;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;
const authStatePath = path.resolve(process.cwd(), '.auth/test-user.json');

if (!baseURL) {
  throw new Error('BASE_URL is required.');
}

if (!email || !password) {
  throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD are required.');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ baseURL });

  try {
    page.setDefaultTimeout(15_000);

    await page.goto('/?auth=login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

    const emailInput = page.locator('input[type="email"], input[autocomplete="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[autocomplete="current-password"]').first();
    const emailVisible = await emailInput.isVisible({ timeout: 10_000 }).catch(() => false);

    if (!emailVisible) {
      await page.getByRole('button', { name: /giri\S* yap|login|sign in/i })
        .or(page.getByRole('link', { name: /giri\S* yap|login|sign in/i }))
        .first()
        .click();
    }

    await expect(emailInput).toBeVisible({ timeout: 15_000 });
    await expect(passwordInput).toBeVisible({ timeout: 15_000 });

    await emailInput.fill(email);
    await passwordInput.fill(password);
    await page.locator('button[type="submit"]')
      .filter({ hasText: /devam et|login|sign in|giri\S*/i })
      .first()
      .click();

    await expect.poll(async () => {
      const body = await page.locator('body').innerText().catch(() => '');
      return /ilanlar\S*m|profil ve g\S*ven|plan ve limitler|çıkış yap|cikis yap|dashboard|profile/i.test(body);
    }, { timeout: 15_000 }).toBe(true);

    await page.waitForTimeout(1_000);
    fs.mkdirSync(path.dirname(authStatePath), { recursive: true });
    await page.context().storageState({ path: authStatePath });
    console.log(`Saved authenticated browser state to ${authStatePath}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  console.error(`Current auth-state setup URL: ${baseURL}`);
  process.exit(1);
});
