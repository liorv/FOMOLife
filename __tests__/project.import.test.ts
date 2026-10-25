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

  describe('project import task risks', () => {
    function imported(risks: unknown) {
      return validateProjectImportJson(JSON.stringify({
        name: 'Launch', sub_projects: [{ title: 'Supplies', tasks: [{ text: 'Order parts', risks }] }],
      }));
    }

    it('preserves and sanitizes risks with fresh identities', () => {
      const result = imported([
        { id: 'r', name: '<b>Delay</b>', description: 'Vendor lead time', mitigations: [{ id: 'm', text: '<i>Reserve stock</i>' }] },
        { id: 'r2', name: 'Damage', description: '', mitigations: [] },
      ]);
      expect(result.ok).toBe(true);
      const risks = result.data!.subprojects[0]!.tasks[0]!.risks!;
      expect(risks).toEqual([
        { id: expect.any(String), name: 'Delay', description: 'Vendor lead time', mitigations: [{ id: expect.any(String), text: 'Reserve stock' }] },
        { id: expect.any(String), name: 'Damage', description: '', mitigations: [] },
      ]);
      expect(risks[0]!.id).not.toBe('r');
      expect(risks[0]!.mitigations[0]!.id).not.toBe('m');
    });

    it('reports malformed risks rather than silently dropping them', () => {
      for (const risks of [
        null, [null], [{ name: '', description: '', mitigations: [] }],
        [{ name: 'Delay', description: '', mitigations: [{ text: '  ' }] }],
      ]) {
        expect(imported(risks)).toMatchObject({ ok: false, error: expect.any(String) });
      }
    });
  });
});