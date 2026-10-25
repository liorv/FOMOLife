import type { ProjectSubproject } from '@myorg/types';
import { getSectionSequence } from '@/lib/projects/planning';
import { sortSectionTasks } from '@/lib/projects/taskOrder';

const section: ProjectSubproject = {
  id: 's', text: 'Section', tasks: [
    { id: 'z', text: 'Zulu', dueDate: null, done: true, people: [], favorite: false },
    { id: 'a', text: 'alpha', dueDate: '2026-11-02', done: false, people: [], favorite: false },
    { id: 'r', text: 'Recurring', dueDate: '2026-11-01', recurrence: 'weekly', done: false, people: [], favorite: false },
    { id: 'b', text: 'Bravo', dueDate: '2026-11-01', done: false, people: [], favorite: false },
  ],
};

it.each([
  ['none', ['z', 'a', 'b']],
  ['alphabetical', ['a', 'b', 'z']],
  ['due_date', ['b', 'a', 'z']],
] as const)('chains all non-recurring tasks in %s display order', (sortMode, expected) => {
  const sequence = getSectionSequence({ ...section, sortMode }, []);
  expect(sequence.tasks.map(task => task.id)).toEqual(expected);
  expect(sequence.excluded.map(task => task.id)).toEqual(['r']);
  expect(sequence.additions).toEqual(expected.slice(1).map((id, index) => ({
    prerequisite: { kind: 'task', id: expected[index] },
    dependent: { kind: 'task', id },
  })));
  expect(section.tasks.map(task => task.id)).toEqual(['z', 'a', 'r', 'b']);
});

it('skips existing adjacent links', () => {
  const sequence = getSectionSequence(section, []);
  expect(getSectionSequence(section, sequence.additions).additions).toEqual([]);
});

it('does not add links for empty, single-task, or recurring-only sections', () => {
  for (const tasks of [[], section.tasks.slice(0, 1), section.tasks.filter(task => task.recurrence)]) {
    expect(getSectionSequence({ ...section, tasks }, []).additions).toEqual([]);
  }
});

it('keeps equal-date and equal-name tasks in their original order', () => {
  const tasks = section.tasks.map(task => ({ ...task, text: 'Same', dueDate: '2026-11-01' }));
  expect(sortSectionTasks(tasks, 'due_date')).toEqual(tasks);
  expect(sortSectionTasks(tasks, 'alphabetical')).toEqual(tasks);
  expect(sortSectionTasks(tasks, undefined)).toBe(tasks);
});
