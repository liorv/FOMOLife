/**
 * Generate a UUID string.
 *
 * Uses the Web Crypto API when available (browsers and Node 14+),
 * falling back to a simple random hex string when it is not. The exact
 * format is not critical — the goal is a unique identifier that looks
 * realistic.
 */
/**
 * Generate a unique ID (UUID)
 * @returns A UUID v4 string
 */
export declare function generateId(): string;
export default generateId;
//# sourceMappingURL=generateId.d.ts.map