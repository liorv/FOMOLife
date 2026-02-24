/**
 * Generate a UUID string.
 *
 * Uses the Web Crypto API when available (browsers and Node 14+),
 * falling back to a simple random hex string when it is not.  The exact
 * format is not critical — the goal is a unique identifier that looks
 * realistic.
 */
export default function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
