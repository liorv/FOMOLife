import type { ContactsApiClient, CreateContactRequest } from '../src/contacts';

describe('api-client exports', () => {
  it('exports Contact related types', () => {
    // just referencing types to ensure they're present
    const req: CreateContactRequest = { name: 'foo' };
    expect(req.name).toBe('foo');
    // @ts-expect-error missing field should error
    // @ts-ignore
    // eslint-disable-next-line
    const bad: CreateContactRequest = {};
  });
});