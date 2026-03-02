import { generateId } from '../src/id/generateId';

describe('generateId', () => {
  it('returns a string of appropriate format', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    // simple pattern check for uuid-like
    expect(id).toMatch(/[0-9a-fA-F\-]+/);
  });

  it('generates unique values on successive calls', () => {
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
  });
});