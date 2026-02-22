/** @jest-environment node */
import { loadData, saveData, clearData } from '../src/api/storage';

describe('storage API (file/localStorage abstraction)', () => {
  beforeEach(async () => {
    await clearData();
  });

  test('returns empty structure when nothing is stored', async () => {
    await expect(loadData()).resolves.toEqual({ tasks: [], projects: [], dreams: [], people: [] });
  });

  test('saveData then loadData preserves the object', async () => {
    const doc = { tasks: [{ text: 'hello', done: false }], projects: [], dreams: [], people: [] };
    await saveData(doc);
    await expect(loadData()).resolves.toEqual(doc);
  });

  test('clearData removes previously persisted data', async () => {
    await saveData({ tasks: [{ text: 'x', done: true }], projects: [], dreams: [], people: [] });
    await expect(loadData()).resolves.toHaveProperty('tasks.length', 1);
    await clearData();
    await expect(loadData()).resolves.toEqual({ tasks: [], projects: [], dreams: [], people: [] });
  });

  test('namespaces separate users', async () => {
    await saveData({ tasks: [{ text: 'a' }] }, 'userA');
    await saveData({ tasks: [{ text: 'b' }] }, 'userB');
    const a = await loadData('userA');
    const b = await loadData('userB');
    expect(a.tasks[0].text).toBe('a');
    expect(b.tasks[0].text).toBe('b');
    // ensure clearing one namespace doesn’t affect the other
    await clearData('userA');
    await expect(loadData('userA')).resolves.toHaveProperty('tasks.length', 0);
    await expect(loadData('userB')).resolves.toHaveProperty('tasks[0].text', 'b');
  });

  test('default namespace is used when no id provided', async () => {
    await saveData({ tasks: [{ text: 'def' }] });
    await expect(loadData()).resolves.toHaveProperty('tasks.0.text', 'def');
    // loading explicit "default" should match
    await expect(loadData('default')).resolves.toHaveProperty('tasks.0.text', 'def');
    await clearData();
    await expect(loadData()).resolves.toEqual({ tasks: [], projects: [], dreams: [], people: [] });
  });
});