export function uniqueEmail(prefix = 'qa.user'): string {
  return `${prefix}+${Date.now()}@example.com`;
}

export const fakeUser = {
  fullName: 'QA Test User',
  firstName: 'QA',
  lastName: 'User',
  phone: '+10000000000',
  address: '123 Test Street',
  city: 'Test City',
  postcode: '00000'
};
