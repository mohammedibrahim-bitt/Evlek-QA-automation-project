import type { Locator, Page } from '@playwright/test';

export async function firstVisible(locators: Locator[]): Promise<Locator> {
  for (const locator of locators) {
    if (await locator.first().isVisible().catch(() => false)) {
      return locator.first();
    }
  }

  throw new Error('No matching visible locator was found.');
}

export function textOrRoleLink(page: Page, names: RegExp): Locator[] {
  return [
    page.getByRole('link', { name: names }),
    page.getByRole('button', { name: names }),
    page.getByText(names)
  ];
}
