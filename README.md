# Evlek QA Automation

Black-box QA automation for Evlek using Playwright, TypeScript, and GitHub Actions. These tests run only through the browser against the configured live or staging Evlek website, the same way a real user would use it.

## Scope

- Main user journeys for desktop and mobile viewports.
- Page Object Model for reusable page actions.
- Playwright HTML reports, JUnit output, screenshots, videos, and traces on failure.
- Bug reporting templates in `bug-reports/`.
- No real user data. Use fake data and provided test accounts only.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install Playwright browsers:

   ```bash
   npx playwright install
   ```

3. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and set `BASE_URL` to the Evlek live or staging URL. Add only provided fake/test account credentials.

5. Optional: create a saved signed-in browser session for account-only tests:

   ```bash
   npm run auth:setup
   ```

   This writes `.auth/test-user.json` locally. It can contain session cookies, so `.auth/` is ignored from Git.

## Run Tests

All commands should be run from the project folder after `npm install`, `npx playwright install`, and `.env` setup.

### Main Commands

| Command | What it does | When to use it | Account needed |
| --- | --- | --- | --- |
| `npm test` | Runs the normal QA suite across configured desktop and mobile projects, excluding visual snapshot tests. This includes journeys, audits, accessibility, language, links, SEO, and performance. | Main local or GitHub Actions command. | Optional |
| `npm run test:all` | Runs absolutely every Playwright test, including visual regression snapshots. | Full local verification before a big release. | Optional |
| `npm run test:headed` | Runs Playwright with visible browser windows. | Debugging a test step by watching the browser. | Optional |
| `npm run auth:setup` | Logs in once with the provided test account and saves local browser storage state to `.auth/test-user.json`. | Preparing saved-session account tests. | Yes |
| `npm run test:account` | Creates a fresh saved login session, then runs `@requires-account` tests on desktop Chromium. | Checking signed-in journeys with less repeated login noise. | Yes |
| `npm run test:desktop` | Runs all tests in the `desktop-chromium` project only. | Checking desktop behavior quickly. | Optional |
| `npm run test:mobile` | Runs all tests in the `mobile-chrome` project only. | Checking mobile behavior quickly. | Optional |
| `npm run report` | Opens the Playwright HTML report from the last run. | Reviewing screenshots, videos, traces, and failures. | No |
| `npm run lint` | Runs TypeScript validation with `tsc --noEmit`. | Checking that the test code compiles. | No |

### Journey Tests

| Command | What it tests | Account needed |
| --- | --- | --- |
| `npm run test:smoke` | Homepage loads, core navigation is visible, and the basic public site is reachable. | No |
| `npm run test:listings` | Sale/rent listing pages, listing cards, search/filter controls, and opening a property detail page. | No |
| `npm run test:forms` | Login validation, invalid-login handling, optional successful login, and contact CTA behavior. | Only for successful login |
| `npm run test:buyer` | Buyer-style interactions such as mobile filters, currency switching, and gallery navigation. | No |
| `npm run test:gated` | Cookie consent, save-search modal, and logged-out gated actions such as following a listing. | No |
| `npm run test:user-flows` | Normal public user flows: property-type filtering, sorting, unrealistic search empty state, and save-search email validation. | No |
| `npm run test:agent-flows` | Property lister/agent-style flows: logged-out add-listing gate, login entry, and saved-session add-listing access without publishing. | Only for signed-in add-listing check |
| `npm run test:a11y` | Keyboard focus and accessible-name smoke checks for important UI areas. | No |
| `npm run test:language` | Language switching and localized page smoke checks for Turkish, English, Russian, German, and Arabic. | No |

### Audit And Quality Tests

| Command | What it tests | Account needed |
| --- | --- | --- |
| `npm run test:audit` | Browser-level site crawl for page load status, blank pages, console errors, page errors, and internal links discovered during browsing. | No |
| `npm run test:links` | Internal broken-link checks using discovered site links and HTTP status validation. | No |
| `npm run test:seo` | SEO and encoding checks such as page title, meta description, canonical URL, `html lang`, and obvious mojibake. | No |
| `npm run test:performance` | Core-page performance smoke checks using DOMContentLoaded, load event, first visible content, and failed request counts. | No |
| `npm run test:quality` | Runs the broken-link and SEO/encoding audits together. | No |

### Visual Regression Tests

| Command | What it does | Account needed |
| --- | --- | --- |
| `npm run test:visual` | Compares screenshots for the home page, cookie banner, sale listings, property detail, login modal, filter dialog, and English home page. | No |
| `npm run test:visual -- --update-snapshots` | Creates or refreshes approved visual baseline screenshots after an intentional design change. | No |

Visual baselines are OS and browser-rendering sensitive. Baseline screenshots are ignored from Git for the public repo, so create them locally with `npm run test:visual -- --update-snapshots` in the same environment you plan to use for visual checks.

### Run By Tag

| Command | What it runs |
| --- | --- |
| `npm run test:tag:smoke` | Tests marked `@smoke`, usually fast critical-path checks. |
| `npm run test:tag:regression` | Tests marked `@regression`, usually reusable journey coverage. |
| `npm run test:tag:audit` | Tests marked `@audit`, including crawl, quality, SEO, link, and performance checks. |
| `npm run test:tag:visual` | Tests marked `@visual`, the screenshot comparison suite. |
| `npm run test:tag:mobile` | Tests marked `@mobile`, mobile-specific behavior checks. |
| `npm run test:tag:requires-account` | Tests marked `@requires-account`, which need provided Evlek test credentials. Use `npm run test:account` when you want saved-session setup first. |

### Useful Playwright Options

Add these after any test command when needed:

```bash
npm run test:listings -- --project=desktop-chromium
npm run test:buyer -- --project=mobile-chrome
npm run test:smoke -- --headed
npm run test:visual -- --update-snapshots
```

## Test Matrix

| Command | Tags | Coverage | Projects | Account needed | Typical runtime |
| --- | --- | --- | --- | --- | --- |
| `npm test` | all except `@visual` | Normal full QA suite without visual snapshots | Desktop + mobile | Optional | Long |
| `npm run test:all` | all | Full configured suite including visual checks | Desktop + mobile | Optional | Long |
| `npm run auth:setup` | setup only | Creates `.auth/test-user.json` saved browser session | Desktop Chromium login | Yes | Short |
| `npm run test:account` | `@requires-account` | Fresh saved-session setup plus account-required tests | Desktop Chromium | Yes | Medium |
| `npm run test:desktop` | all | All tests in desktop Chromium | Desktop Chromium | Optional | Medium |
| `npm run test:mobile` | all | All tests in mobile Chrome | Mobile Chrome | Optional | Medium |
| `npm run test:smoke` | `@smoke` subset | Home smoke checks | All configured projects | No | Short |
| `npm run test:listings` | `@smoke`, `@regression` | Sale/rent listings and property detail open | All configured projects | No | Medium |
| `npm run test:forms` | `@smoke`, `@regression`, `@requires-account` | Login validation, invalid login, optional successful login, contact CTA | All configured projects | Only for successful login | Medium |
| `npm run test:buyer` | `@mobile`, `@regression` | Mobile filters, currency switching, gallery navigation | All configured projects unless filtered | No | Medium |
| `npm run test:gated` | `@smoke`, `@regression` | Cookie consent, save-search modal, logged-out follow gate | All configured projects | No | Medium |
| `npm run test:user-flows` | `@regression` | Property-type filtering, sorting, empty search, save-search email validation | All configured projects | No | Medium |
| `npm run test:agent-flows` | `@regression`, `@requires-account` | Logged-out add-listing gate, lister login entry, and saved-session add-listing access without publishing | All configured projects | Only for signed-in add-listing check | Short |
| `npm run test:a11y` | `@regression` | Keyboard focus and accessible-name smoke checks | All configured projects | No | Medium |
| `npm run test:language` | `@regression` | TR, EN, RU, DE, AR language switch smoke checks | All configured projects | No | Medium |
| `npm run test:audit` | `@audit` | Browser-level page audit, console errors, blank pages | All configured projects | No | Long |
| `npm run test:links` | `@audit` | Internal broken-link status audit | All configured projects | No | Long |
| `npm run test:seo` | `@audit` | SEO metadata and encoding audit | All configured projects | No | Long |
| `npm run test:performance` | `@smoke`, `@audit` | Core-page performance smoke checks | All configured projects | No | Short |
| `npm run test:quality` | `@audit` | Broken-link and SEO/encoding checks together | All configured projects | No | Long |
| `npm run test:visual` | `@visual` | Visual baselines for core pages, modals, and dialogs | All configured projects | No | Medium |

## Test Tags

- `@smoke`: fast checks for core availability and critical paths.
- `@regression`: reusable journey and UI behavior coverage.
- `@audit`: broad crawl, quality, SEO, link, and performance audits.
- `@visual`: screenshot comparison coverage for approved UI baselines.
- `@mobile`: mobile-specific behavior.
- `@requires-account`: tests that need provided Evlek test credentials. Some use direct login to test auth itself; saved-session flows use `.auth/test-user.json` created by `npm run auth:setup`.

## Reports And Evidence

- HTML report: `playwright-report/`
- JUnit report: `test-results/junit.xml`
- Failure screenshots, videos, and traces: `test-results/`
- Visual snapshots: `tests/visual/visual.spec.ts-snapshots/` locally, ignored from Git

When a test exposes a product issue, add a short row to `bug-reports/bugs.csv` and create a full Markdown report in `bug-reports/BUG-###-short-title.md`. Keep generated evidence files out of Git; reference local Playwright report paths or GitHub Actions artifact names instead.

The audit tests save and attach JSON evidence to the Playwright report:

- `site-audit-results.json`: visited URL, status code, title, discovered internal links, browser console errors, uncaught page errors, and audit issues.
- `broken-link-results.json`: discovered internal links and their HTTP status checks.
- `seo-encoding-results.json`: title, meta description, canonical URL, HTML language, and encoding findings.
- `performance-results.json`: DOMContentLoaded, load event, first visible content timing, status code, and failed network requests for core pages.

Control breadth with `AUDIT_MAX_PAGES`, crawler pacing with `AUDIT_PAGE_DELAY_MS`, broken-link breadth with `AUDIT_MAX_LINKS`, and performance thresholds with `PERF_MAX_DOM_CONTENT_LOADED_MS`, `PERF_MAX_LOAD_EVENT_MS`, `PERF_MAX_FIRST_VISIBLE_MS`, and `PERF_MAX_FAILED_REQUESTS`.

## Known Issues

These are current product findings documented in `bug-reports/bugs.csv`:

| ID | Severity | Summary | Current status |
| --- | --- | --- | --- |
| `BUG-001` | Medium | [Regional listing and city guide pages can emit `429` resource errors in the browser console.](bug-reports/BUG-001-regional-pages-429.md) | New |
| `BUG-002` | Low | [`/fiyat-endeksi` meta description is 182 characters, over the configured 180-character SEO threshold.](bug-reports/BUG-002-meta-description-too-long.md) | New |
| `BUG-003` | Info | [Signed-in add-listing access passes with saved browser session.](bug-reports/BUG-003-signed-in-add-listing-redirects-login.md) | Closed - automation timing |

## Project Structure

```text
.
├── .github/workflows/playwright.yml
├── bug-reports/
├── pages/
├── tests/journeys/
├── utils/
├── playwright.config.ts
└── package.json
```

## Test Data Rules

- Do not use real customer, staff, payment, address, or personal data.
- Do not create destructive records unless the environment and test account are explicitly intended for QA.
- The site audit deliberately skips URLs that look destructive, such as logout, delete, remove, destroy, and cancel paths.
- Prefer fake data from `utils/fakeData.ts` or environment variables.
- Keep secrets out of Git and store credentials in `.env` locally or GitHub Actions secrets in CI.
- Keep `.auth/test-user.json` out of Git; it is a local saved browser session and may contain auth cookies.

## Adding Bugs

Use two layers for bug reports:

1. Add a short tracker row to `bug-reports/bugs.csv`.
2. Create a readable Markdown report from `bug-reports/bug-template.md`.

The CSV stays short and easy to scan:

`ID, Title, Severity, Status, Primary URL, Devices/Browsers, Full Report`

The Markdown file should include:

- URL or affected URLs
- Device/browser
- Preconditions
- Steps to reproduce
- Expected result
- Actual result
- Severity
- Screenshot/video or artifact reference
- Suggested fix
- Status

Do not commit generated Playwright evidence files. Keep screenshots, videos, traces, and reports in `test-results/`, `playwright-report/`, or GitHub Actions artifacts.
