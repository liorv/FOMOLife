import {
  isNonEmptyString,
  isValidInviteToken,
  createInviteLink,
  parseInviteTokenFromUrl,
} from '../src/invite';

describe('invite utilities', () => {
  it('checks non-empty strings', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString(123)).toBe(false);
  });

  it('validates tokens', () => {
    expect(isValidInviteToken('abc123_-')).toBe(true);
    expect(isValidInviteToken('')).toBe(false);
    expect(isValidInviteToken('in valid')).toBe(false);
    expect(isValidInviteToken('x'.repeat(129))).toBe(false);
  });

  it('creates and parses links', () => {
    const link = createInviteLink('http://example.com/', 'tok');
    expect(link).toContain('/invite?token=tok');
    expect(parseInviteTokenFromUrl(link)).toBe('tok');
    expect(parseInviteTokenFromUrl('not a url')).toBe(null);
  });
});