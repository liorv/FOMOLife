import { validateProjectImportJson } from '../lib/projects/importProject';

describe('project import task recurrence', () => {
  it('preserves supported recurrence values and rejects unknown values', () => {
    const result = validateProjectImportJson(JSON.stringify({
      name: 'Routines',
      sub_projects: [{
        title: 'Home',
        tasks: [
          { text: 'Water plants', recurrence: 'monthly', recurrenceAnchorDate: '2026-01-31' },
          { text: 'Invalid cadence', recurrence: 'hourly' },
        ],
      }],
    }));

    expect(result.ok).toBe(true);
    const tasks = result.data?.subprojects[0]?.tasks ?? [];
    expect(tasks.map(task => task.recurrence)).toEqual(['monthly', undefined]);
    expect(tasks[0]?.recurrenceAnchorDate).toBe('2026-01-31');
  });
});