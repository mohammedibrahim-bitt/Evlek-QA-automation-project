import { expect, type Locator, type Page, type TestInfo } from '@playwright/test';

const loginText = /giri\S*|login|log in|sign in/i;
const accountText = /account|profile|dashboard|logout|log out|profil|hesab|pano|çıkış|cikis/i;

export function loginDialog(page: Page): Locator {
  return page.getByRole('dialog').filter({ hasText: /e-posta|email|şifre|sifre|password|giri\S*|login/i }).first();
}

export async function findLoginEntry(page: Page): Promise<Locator | null> {
  return firstVisible([
    page.getByRole('button', { name: loginText }),
    page.getByRole('link', { name: loginText }),
    page.locator('a[href*="auth=login"], button[aria-label*="login" i], button[aria-label*="giriş" i]')
  ]);
}

export async function openLoginSurface(page: Page, testInfo?: TestInfo): Promise<boolean> {
  await page.goto('/?auth=login', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);

  if (await isLoginModalVisible(page)) {
    return true;
  }

  const loginEntry = await findLoginEntry(page);
  if (loginEntry) {
    await loginEntry.click({ timeout: 5_000 }).catch(() => undefined);
    if (await isLoginModalVisible(page)) {
      return true;
    }
  }

  if (testInfo) {
    await attachAuthDiagnostics(testInfo, page, 'Login modal could not be opened.');
  }

  return false;
}

export async function isLoginModalVisible(page: Page): Promise<boolean> {
  const dialog = loginDialog(page);
  const email = await findEmailInput(page);
  const password = await findPasswordInput(page);

  return Boolean(
    await dialog.isVisible().catch(() => false)
    && email
    && password
  );
}

export async function findEmailInput(page: Page): Promise<Locator | null> {
  return firstVisible([
    loginDialog(page).getByLabel(/e-posta|email|e-mail/i),
    loginDialog(page).locator('input[type="email"], input[autocomplete="email"]'),
    page.locator('input[type="email"], input[autocomplete="email"]')
  ]);
}

export async function findPasswordInput(page: Page): Promise<Locator | null> {
  return firstVisible([
    loginDialog(page).getByLabel(/şifre|sifre|password/i),
    loginDialog(page).locator('input[type="password"], input[autocomplete="current-password"]'),
    page.locator('input[type="password"], input[autocomplete="current-password"]')
  ]);
}

export async function findLoginSubmit(page: Page): Promise<Locator | null> {
  return firstVisible([
    loginDialog(page).locator('button[type="submit"]').filter({ hasText: /devam et|giri\S* yap|log in|sign in/i }),
    loginDialog(page).getByRole('button', { name: /^devam et$|^giri\S* yap$|^log in$|^sign in$/i }),
    page.locator('button[type="submit"]').filter({ hasText: /devam et|giri\S* yap|log in|sign in/i })
  ]);
}

export async function isSignedIn(page: Page): Promise<boolean> {
  const accountAction = await firstVisible([
    page.getByRole('link', { name: accountText }),
    page.getByRole('button', { name: accountText })
  ]);

  if (accountAction) {
    return true;
  }

  const body = await page.locator('body').innerText({ timeout: 3_000 }).catch(() => '');
  return /ilanlar\S*m|profil ve g\S*ven|plan ve limitler|çıkış yap|cikis yap/i.test(body);
}

export async function isProtectedRouteGate(page: Page): Promise<boolean> {
  const url = page.url();
  if (/auth=login|login|sign-in/i.test(url)) {
    return true;
  }

  const body = await page.locator('body').innerText({ timeout: 3_000 }).catch(() => '');
  return /giri\S* yap|login|hesap|account|oturum|sign in/i.test(body) && !await isSignedIn(page);
}

export async function hasAgentDraftPermission(page: Page): Promise<boolean> {
  const body = await page.locator('body').innerText({ timeout: 3_000 }).catch(() => '');
  return !/Solo|Ekip|hesab\S* gerekir|account.*required|plan.*required/i.test(body);
}

export async function accountPlanLabel(page: Page): Promise<string> {
  const body = await page.locator('body').innerText({ timeout: 3_000 }).catch(() => '');
  const match = body.match(/Bireysel|Solo|Ekip|Evlek Üyesi|Evlek Uyesi/i);
  return match?.[0] ?? 'Unknown';
}

export async function attachAuthDiagnostics(testInfo: TestInfo, page: Page, reason: string): Promise<void> {
  const title = await page.title().catch(() => '');
  const emailVisible = Boolean(await findEmailInput(page));
  const passwordVisible = Boolean(await findPasswordInput(page));
  const signedIn = await isSignedIn(page).catch(() => false);
  const protectedGate = await isProtectedRouteGate(page).catch(() => false);
  const plan = await accountPlanLabel(page).catch(() => 'Unknown');
  const visibleButtons = await visibleTexts(page.locator('button, [role="button"]'), 25);
  const visibleLinks = await visibleTexts(page.locator('a[href]'), 25);

  await testInfo.attach('auth-diagnostics', {
    body: [
      `Reason: ${reason}`,
      `URL: ${page.url()}`,
      `Title: ${title}`,
      `Signed in: ${signedIn}`,
      `Protected gate: ${protectedGate}`,
      `Account label: ${plan}`,
      `Email field visible: ${emailVisible}`,
      `Password field visible: ${passwordVisible}`,
      '',
      'Visible buttons:',
      visibleButtons.length > 0 ? visibleButtons.join('\n') : '(none)',
      '',
      'Visible links:',
      visibleLinks.length > 0 ? visibleLinks.join('\n') : '(none)'
    ].join('\n'),
    contentType: 'text/plain'
  });
}

export async function expectLoginInputsVisible(page: Page): Promise<void> {
  const email = await findEmailInput(page);
  const password = await findPasswordInput(page);

  expect(email, 'Login email field should be visible.').not.toBeNull();
  expect(password, 'Login password field should be visible.').not.toBeNull();
}

async function firstVisible(locators: Locator[]): Promise<Locator | null> {
  for (const locator of locators) {
    const candidate = locator.first();
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  return null;
}

async function visibleTexts(locator: Locator, limit: number): Promise<string[]> {
  const texts: string[] = [];
  const count = await locator.count().catch(() => 0);

  for (let index = 0; index < count && texts.length < limit; index += 1) {
    const item = locator.nth(index);
    if (!await item.isVisible().catch(() => false)) {
      continue;
    }

    const text = await item.innerText().catch(() => '');
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (trimmed) {
      texts.push(trimmed);
    }
  }

  return texts;
}
