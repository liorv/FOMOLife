import { advanceRecurringTask, getNextTaskDueDate } from '../lib/tasks/recurrence';
import type { ProjectTask } from '@myorg/types';

describe('task recurrence', () => {
  it('advances overdue tasks once from their last due date without skipping occurrences', () => {
    const completedAt = new Date('2026-10-21T12:00:00');
    expect(getNextTaskDueDate('2026-10-18', 'daily', completedAt)).toBe('2026-10-19');
    expect(getNextTaskDueDate('2026-10-14', 'weekly', completedAt)).toBe('2026-10-21');
  });

  it('clamps month-end and leap-day dates without skipping occurrences', () => {
    expect(getNextTaskDueDate('2026-01-31', 'monthly', new Date('2026-02-28T12:00:00'))).toBe('2026-02-28');
    expect(getNextTaskDueDate('2024-02-29', 'yearly', new Date('2024-03-01T12:00:00'))).toBe('2025-02-28');
  });

  it.each([
    ['daily', '2026-10-22', '2026-10-23'],
    ['weekly', '2026-10-28', '2026-11-04'],
    ['monthly', '2026-11-21', '2026-12-21'],
    ['yearly', '2027-10-21', '2028-10-21'],
  ] as const)('advances every early completion of a %s task from the current due date', (recurrence, firstDate, secondDate) => {
    const completedAt = new Date('2026-10-20T12:00:00');
    const first = advanceRecurringTask({
      id: 'recurring', done: false, dueDate: '2026-10-21', recurrence,
      recurrenceAnchorDate: '2025-10-21',
    }, completedAt)!;
    const second = advanceRecurringTask(first, completedAt)!;
    expect(first.dueDate).toBe(firstDate);
    expect(second.dueDate).toBe(secondDate);
    expect(second.done).toBe(false);
  });

  it('uses the local completion date only when no due date exists', () => {
    expect(getNextTaskDueDate(null, 'daily', new Date('2026-10-21T23:30:00'))).toBe('2026-10-22');
  });

  it('does not advance non-recurring tasks', () => {
    expect(advanceRecurringTask({ id: 'once', done: true, dueDate: '2026-10-21' })).toBeNull();
  });

  it('keeps month-end recurrence anchored across multiple occurrences', () => {
    const first = advanceRecurringTask({
      id: 'monthly', done: true, dueDate: '2026-01-31', recurrence: 'monthly',
    }, new Date('2026-01-31T12:00:00'))!;
    const second = advanceRecurringTask(first, new Date('2026-02-28T12:00:00'))!;
    expect(first).toMatchObject({ dueDate: '2026-02-28', recurrenceAnchorDate: '2026-01-31' });
    expect(second).toMatchObject({ dueDate: '2026-03-31', recurrenceAnchorDate: '2026-01-31' });
    expect(second.id).toBe('monthly');
  });

  it('advances the same task while preserving its details and creation date', () => {
    const task: ProjectTask = {
      id: 'task-1', text: 'Water plants', done: true, dueDate: '2026-10-20',
      recurrence: 'weekly', favorite: true, people: [{ name: 'Alex' }],
      createdAt: '2026-10-01T12:00:00.000Z',
      completedAt: '2026-10-21T12:00:00.000Z',
    };

    const next = advanceRecurringTask(task, new Date('2026-10-21T12:00:00.000Z'));
    expect(next).toMatchObject({
      text: 'Water plants', done: false, dueDate: '2026-10-27',
      recurrence: 'weekly', favorite: true, people: [{ name: 'Alex' }],
      id: 'task-1', createdAt: '2026-10-01T12:00:00.000Z', completedAt: null,
    });
    expect(next?.id).toBe(task.id);
  });
});