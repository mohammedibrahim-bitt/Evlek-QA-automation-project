export const env = {
  baseUrl: required('BASE_URL'),
  loginUrl: process.env.LOGIN_URL,
  testUserEmail: process.env.TEST_USER_EMAIL,
  testUserPassword: process.env.TEST_USER_PASSWORD,
  searchTerm: process.env.TEST_SEARCH_TERM ?? 'test',
  fullName: process.env.TEST_FULL_NAME ?? 'QA Test User',
  phone: process.env.TEST_PHONE ?? '+10000000000',
  auditMaxPages: numberFromEnv('AUDIT_MAX_PAGES', 30),
  auditPageDelayMs: numberFromEnv('AUDIT_PAGE_DELAY_MS', 500),
  auditMaxLinks: numberFromEnv('AUDIT_MAX_LINKS', 100),
  perfMaxDomContentLoadedMs: numberFromEnv('PERF_MAX_DOM_CONTENT_LOADED_MS', 8000),
  perfMaxLoadEventMs: numberFromEnv('PERF_MAX_LOAD_EVENT_MS', 15000),
  perfMaxFirstVisibleMs: numberFromEnv('PERF_MAX_FIRST_VISIBLE_MS', 5000),
  perfMaxFailedRequests: numberFromEnv('PERF_MAX_FAILED_REQUESTS', 5)
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function hasTestAccount(): boolean {
  return Boolean(env.testUserEmail && env.testUserPassword);
}

function numberFromEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive number.`);
  }

  return parsed;
}
