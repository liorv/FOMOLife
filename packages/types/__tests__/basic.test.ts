// simple compile-time check; runtime just asserts truth
import type { Contact } from '../src/index';

describe('types package', () => {
  it('exports Contact type', () => {
    const contact: Contact = { id: '1', name: 'a', status: 'linked' };
    expect(contact.name).toBe('a');
  });
});