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

    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible();

    await dialog.locator('input[type="email"]').fill(email);
    await dialog.locator('input[type="password"]').fill(password);
    await dialog.locator('button[type="submit"]').click();

    await expect(dialog).toBeHidden({ timeout: 15_000 });
    await expect(
      page.getByRole('button', { name: /profil|hesab|account|profile|qu/i })
        .or(page.getByRole('link', { name: /profil|hesab|account|profile/i }))
        .first()
    ).toBeVisible();

    await page.waitForTimeout(1_000);
    fs.mkdirSync(path.dirname(authStatePath), { recursive: true });
    await page.context().storageState({ path: authStatePath });
    console.log(`Saved authenticated browser state to ${authStatePath}`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
