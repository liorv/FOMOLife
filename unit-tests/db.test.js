/** @jest-environment node */
import * as db from '../src/api/db';

describe('db module (CRUD with GUIDs)', () => {
  beforeEach(async () => {
    // clear underlying storage
    const { clearData } = require('../src/api/storage');
    clearData();
  });

  test('loadData returns empty shape when nothing stored', async () => {
    const d = await db.loadData();
    expect(d).toEqual({ tasks: [], projects: [], dreams: [], people: [] });
  });

  test('create automatically assigns id and persists', async () => {
    const task = await db.create('tasks', { text: 'hello' });
    expect(task.id).toBeDefined();
    const all = await db.getAll('tasks');
    expect(all).toEqual([task]);

    // subsequent loadData should include the id as well
    const d2 = await db.loadData();
    expect(d2.tasks[0].id).toBe(task.id);
  });

  test('update modifies existing record and returns updated', async () => {
    const p = await db.create('people', { name: 'Alice' });
    const updated = await db.update('people', p.id, { name: 'Alice2' });
    expect(updated.name).toBe('Alice2');
    expect(updated.id).toBe(p.id);

    const all = await db.getAll('people');
    expect(all[0].name).toBe('Alice2');
  });

  test('remove deletes by id', async () => {
    const item = await db.create('dreams', { text: 'big' });
    const removed = await db.remove('dreams', item.id);
    expect(removed).toBe(true);
    const all = await db.getAll('dreams');
    expect(all).toEqual([]);
  });

  test('ensureIds migrates data missing ids', async () => {
    // write raw storage object without ids
    const { saveData } = require('../src/api/storage');
    saveData({ tasks: [{ text: 'noid' }], projects: [], dreams: [], people: [] });
    const d = await db.loadData();
    expect(d.tasks[0].id).toBeDefined();
  });

  test('operations respect user namespace', async () => {
    const a1 = await db.create('tasks', { text: 'foo' }, 'u1');
    const b1 = await db.create('tasks', { text: 'bar' }, 'u2');
    expect(a1.id).not.toBe(b1.id);
    const allA = await db.getAll('tasks', 'u1');
    const allB = await db.getAll('tasks', 'u2');
    expect(allA.length).toBe(1);
    expect(allA[0].text).toBe('foo');
    expect(allB.length).toBe(1);
    expect(allB[0].text).toBe('bar');

    // updates and removals should be scoped
    await db.update('tasks', a1.id, { text: 'foo2' }, 'u1');
    const a2 = await db.getById('tasks', a1.id, 'u1');
    expect(a2.text).toBe('foo2');
    const removed = await db.remove('tasks', a1.id, 'u2');
    expect(removed).toBe(false);
    expect((await db.getAll('tasks', 'u1')).length).toBe(1);
  });

  test('default namespace is implicitly used', async () => {
    const t = await db.create('tasks', { text: 'baz' });
    const all = await db.getAll('tasks');
    expect(all.length).toBe(1);
    expect(all[0].text).toBe('baz');
    // explicit "default" gives same result
    const allDef = await db.getAll('tasks', 'default');
    expect(allDef.length).toBe(1);
    expect(allDef[0].id).toBe(t.id);
  });
});