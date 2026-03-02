import { applyFilters } from '../src/taskFilters';
import type { TaskItem } from '@myorg/types';

describe('applyFilters', () => {
  const sample: TaskItem[] = [
    { id: '1', text: 'foo', done: false, favorite: false, description: '', people: [] },
    { id: '2', text: 'bar', done: true, favorite: false, description: '', people: [] },
    { id: '3', text: 'baz', done: false, favorite: true, description: '', people: [] },
  ];

  it('returns all tasks when no filter', () => {
    expect(applyFilters(sample, [], '')).toHaveLength(3);
  });

  it('filters completed', () => {
    expect(applyFilters(sample, ['completed'], '')).toEqual([sample[1]]);
  });

  it('filters starred', () => {
    expect(applyFilters(sample, ['starred'], '')).toEqual([sample[2]]);
  });

  it('searches text', () => {
    expect(applyFilters(sample, [], 'ba')).toHaveLength(2);
  });
});