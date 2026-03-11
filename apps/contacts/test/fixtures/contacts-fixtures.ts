export const testUserId = 'test-user';

export const sampleContacts = [
  { id: 'c1', name: 'Alice', status: 'linked' },
  { id: 'c2', name: 'Bob', status: 'not_linked' },
];

export const createdContact = (name: string) => ({ id: 'c3', name, status: 'not_linked' });
