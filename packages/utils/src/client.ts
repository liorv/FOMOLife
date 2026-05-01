// Client-only utilities
export { useAsyncState, type UseAsyncStateReturn } from './async';

/**
 * Kick off browser prefetching for a list of image URLs so they land in the
 * HTTP cache before the components that display them are rendered.
 * Safe to call on the server — it no-ops when `Image` is not available.
 */
export function preloadImages(urls: string[]): void {
  if (typeof Image === 'undefined') return;
  for (const url of urls) {
    if (url) new Image().src = url;
  }
}
