import type { Contact } from '@myorg/types';

export function createContactsApiClient(baseUrl = '') {
  return {
    async listContacts(): Promise<Contact[]> {
      return [];
    },
    async createContact(input: { name: string }) {
      return { id: 'c2', name: input.name, status: 'not_linked' } as Contact;
    },
  };
}
