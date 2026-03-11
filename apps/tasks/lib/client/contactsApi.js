// Minimal contacts API client shim for tests
console.log('[TEST DEBUG] tasks/lib/client/contactsApi shim loaded');
function createContactsApiClient() {
  return {
    listContacts: async () => [],
    createContact: async () => ({ id: 'c1', name: 'Mock' }),
    updateContact: async () => null,
    deleteContact: async () => true,
  };
}

module.exports = { createContactsApiClient };
