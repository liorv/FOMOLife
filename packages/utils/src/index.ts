export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function isValidExternalUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value.trim())) return false;
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}


// filters
export { applyFilters } from './taskFilters';

// id
export { generateId, default as generateIdDefault } from './id/generateId';

export {
  createInviteLink,
  isNonEmptyString,
  isValidInviteToken,
  parseInviteTokenFromUrl,
} from "./invite";

export { preloadImages } from './client';

export { withKeyedLock } from './async/keyedMutex';
