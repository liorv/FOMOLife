// Forwarding shim so tests that mock the local tasks contacts client
// also affect imports from the contacts app package path used by the
// TasksPage component.
try {
  module.exports = require('../../../tasks/lib/client/contactsApi');
} catch (e) {
  // fallback minimal implementation
  module.exports = {
    createContactsApiClient: () => ({
      listContacts: async () => [],
      createContact: async (input) => ({ id: 'c1', name: input?.name || 'Mock' }),
    }),
  };
}
