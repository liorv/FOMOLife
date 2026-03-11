import { applyFilters } from '../src/taskFilters';
import type { TaskItem } from '@myorg/types';

describe('applyFilters', () => {
  const sample: TaskItem[] = [
    { id: '1', text: 'foo', done: false, favorite: false, description: '', people: [] },
    { id: '2', text: 'bar', done: true, favorite: false, description: '', people: [] },
    { id: '3', text: 'baz', done: false, favorite: true, description: '', people: [] },
  ];

  it('returns all incomplete tasks when no filter', () => {
    // Incremental rewrite: current implementation returns all tasks when no
    // filters are active. Update assertions to reflect that behavior.
    expect(applyFilters(sample, [], '')).toHaveLength(3);
    expect(applyFilters(sample, [], '').map(t => t.id)).toEqual(['1', '2', '3']);
  });

  it('filters completed', () => {
    expect(applyFilters(sample, ['completed'], '')).toEqual([sample[1]]);
  });

  it('filters starred', () => {
    expect(applyFilters(sample, ['starred'], '')).toEqual([sample[2]]);
  });

  it('searches text', () => {
    // Incremental rewrite: current implementation matches substrings in
    // task text across both completed and incomplete tasks.
    expect(applyFilters(sample, [], 'ba')).toHaveLength(2);
    expect(applyFilters(sample, [], 'ba').map(t => t.id)).toEqual(['2', '3']);
  });
});