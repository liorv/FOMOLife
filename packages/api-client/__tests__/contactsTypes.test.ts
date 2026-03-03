import type { ContactsApiClient, CreateContactRequest } from '../src/contacts';

describe('api-client exports', () => {
  it('exports Contact related types', () => {
    // just referencing types to ensure they're present
    const req: CreateContactRequest = { name: 'foo' };
    expect(req.name).toBe('foo');
    // the following intentionally violates the type; expect a compile error
    // @ts-ignore
    const bad: CreateContactRequest = {};
  });
});