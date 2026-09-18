/**
 * Serializes async operations that share the same key, so a load-modify-save
 * sequence for a given key cannot race with another one for the same key and
 * clobber each other's writes (lost update problem).
 */
const chains = new Map<string, Promise<unknown>>();

export function withKeyedLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = chains.get(key) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  // Swallow errors here so the chain keeps moving; the real error still
  // propagates to the caller via the returned `run` promise.
  chains.set(key, run.catch(() => undefined));
  return run;
}
