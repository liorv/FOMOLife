// Minimal contacts API client shim for tests
console.log('[TEST DEBUG] tasks/lib/client/contactsApi shim loaded');
function createContactsApiClient() {
  return {
    listContacts: async () => [],
    createContact: async (input) => ({ id: 'c1', name: input?.name || 'Mock', status: 'not_linked' }),
    updateContact: async () => null,
    deleteContact: async () => true,
  };
}

module.exports = { createContactsApiClient };
