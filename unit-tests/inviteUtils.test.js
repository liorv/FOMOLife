import {
  createInviteLink,
  isNonEmptyString,
  isValidInviteToken,
  parseInviteTokenFromUrl,
} from '@myorg/utils';

describe('invite utils', () => {
  test('createInviteLink builds invite URL with encoded token', () => {
    const link = createInviteLink('https://example.com/', 'abc_123-XYZ');
    expect(link).toBe('https://example.com/invite?token=abc_123-XYZ');
  });

  test('parseInviteTokenFromUrl returns token for absolute URL', () => {
    const token = parseInviteTokenFromUrl('https://example.com/invite?token=my_token-1');
    expect(token).toBe('my_token-1');
  });

  test('parseInviteTokenFromUrl returns token for relative path', () => {
    const token = parseInviteTokenFromUrl('/invite?token=token_42');
    expect(token).toBe('token_42');
  });

  test('parseInviteTokenFromUrl returns null for missing or invalid token', () => {
    expect(parseInviteTokenFromUrl('/invite')).toBeNull();
    expect(parseInviteTokenFromUrl('/invite?token=bad token')).toBeNull();
  });

  test('isValidInviteToken validates allowed token format', () => {
    expect(isValidInviteToken('abc-XYZ_123')).toBe(true);
    expect(isValidInviteToken('')).toBe(false);
    expect(isValidInviteToken('not valid')).toBe(false);
  });

  test('isNonEmptyString validates non-empty text', () => {
    expect(isNonEmptyString('hello')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString(null)).toBe(false);
  });
});
