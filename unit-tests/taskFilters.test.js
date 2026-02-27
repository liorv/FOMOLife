import { applyFilters } from '../src/utils/taskFilters';

describe('applyFilters helper', () => {
  const baseTasks = [
    { id: '1', text: 'foo', done: false, favorite: false, starred: false },
    { id: '2', text: 'bar', done: true, favorite: false, starred: false },
    { id: '3', text: 'baz', done: true, favorite: true, starred: false },
  ];

  it('shows all tasks when no filters are active', () => {
    const result = applyFilters(baseTasks, [], '');
    expect(result.map((t) => t.id)).toEqual(['1','2','3']);
  });

  it('respects completed filter', () => {
    const result = applyFilters(baseTasks, ['completed'], '');
    expect(result.map((t) => t.id)).toEqual(['2','3']);
  });

  it('requires all active filters (intersection)', () => {
    const now = new Date();
    const past = new Date(now);
    past.setDate(now.getDate() - 2);
    const tasks = [
      { id: 'a', text: 'a', done: true, dueDate: past.toISOString(), favorite: false },
      { id: 'b', text: 'b', done: true, dueDate: null, favorite: false },
    ];
    const result = applyFilters(tasks, ['completed','overdue'], '');
    expect(result.map((t) => t.id)).toEqual(['a']);
  });

  it('filters by search query as well', () => {
    const result = applyFilters(baseTasks, [], 'ba');
    // baseTasks contains "bar" and "baz" which both match the query
    expect(result.map((t) => t.id)).toEqual(['2','3']);
  });
});
