import { test } from '../fixtures/test';
import { HomePage } from '../../pages/HomePage';
import { SearchPage } from '../../pages/SearchPage';
import { env } from '../../utils/env';

test.describe('Evlek search journey', () => {
  test('@smoke @regression user can search and receives a results or empty-state page', async ({ page }) => {
    const home = new HomePage(page);
    const search = new SearchPage(page);

    await home.open();
    await search.searchFor(env.searchTerm);
    await search.expectResultsOrEmptyState();
  });
});
