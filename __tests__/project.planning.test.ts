import type { ProjectItem, ProjectTask } from '@myorg/types';
import {
  getLinkWarning, getPlanLayers, getPlanNodes, isRequirement, parsePlanLinks,
  validatePlanLinks, type PlanLink,
} from '@/lib/projects/planning';

const task = (id: string, patch: Partial<ProjectTask> = {}): ProjectTask => ({
  id, text: id, done: false, dueDate: null, favorite: false, people: [], ...patch,
});
const project = (tasks: ProjectTask[]): ProjectItem => ({
  id: 'p', text: 'Plan', color: '#123456',
  subprojects: [{ id: 's', text: 'Preparation', tasks }, { id: 'empty', text: 'Launch', tasks: [] }],
});
const edge = (from: string, to: string): PlanLink => ({
  prerequisite: { kind: 'task', id: from }, dependent: { kind: 'task', id: to },
});

it('layers a diamond once, preserving parallel branches and isolated items', () => {
  const nodes = getPlanNodes(project(['a', 'b', 'c', 'd'].map(id => task(id)))).filter(node => node.ref.kind === 'task');
  const links = [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')];
  expect(validatePlanLinks(nodes, links)).toBeNull();
  expect(getPlanLayers(nodes, links).map(layer => layer.map(node => node.ref.id))).toEqual([['a'], ['b', 'c'], ['d']]);
});

it('rejects self links, duplicates, dangling references and cycles including hints', () => {
  const nodes = getPlanNodes(project([task('a'), task('b')]));
  expect(validatePlanLinks(nodes, [edge('a', 'a')])).toMatch(/itself/);
  expect(validatePlanLinks(nodes, [edge('a', 'b'), edge('a', 'b')])).toMatch(/already linked/);
  expect(validatePlanLinks(nodes, [edge('missing', 'b')])).toMatch(/no longer exists/);
  expect(validatePlanLinks(nodes, [edge('a', 'b'), edge('b', 'a')])).toMatch(/cycle/);
  const hint: PlanLink = { prerequisite: { kind: 'section', id: 's' }, dependent: { kind: 'task', id: 'b' } };
  expect(validatePlanLinks(nodes, [hint, { prerequisite: hint.dependent, dependent: hint.prerequisite }])).toMatch(/cycle/);
});

it('distinguishes hints from requirements and excludes recurring hard endpoints', () => {
  const nodes = getPlanNodes(project([task('repeat', { recurrence: 'weekly' }), task('b')]));
  expect(isRequirement(edge('repeat', 'b'))).toBe(true);
  expect(validatePlanLinks(nodes, [edge('repeat', 'b')])).toMatch(/Recurring/);
  const hint: PlanLink = { prerequisite: { kind: 'task', id: 'repeat' }, dependent: { kind: 'section', id: 'empty' } };
  expect(isRequirement(hint)).toBe(false);
  expect(validatePlanLinks(nodes, [hint])).toBeNull();
});

it('summarizes live sections without treating empty or recurring-only sections as done', () => {
  const input = project([task('a', { done: true }), task('b'), task('repeat', { recurrence: 'daily' })]);
  const nodes = getPlanNodes(input);
  expect(nodes.find(node => node.key === 'section:s')).toMatchObject({ summary: '1 of 2 tasks done', done: false, incompleteTiming: true });
  expect(nodes.find(node => node.key === 'section:empty')).toMatchObject({ summary: 'Not broken down yet', done: false });
  expect(getPlanNodes(project([task('r', { recurrence: 'daily' })]))[0]).toMatchObject({ done: false, dueDate: null, summary: 'Recurring tasks only; excluded from progress' });
});

it('flags deadline inversions, not equal dates or completed tasks, and never invents dates', () => {
  const input = project([task('a', { dueDate: '2026-11-03' }), task('b', { dueDate: '2026-11-01' })]);
  expect(getLinkWarning(edge('a', 'b'), getPlanNodes(input))).toMatch(/Deadline conflict/);
  input.subprojects[0]!.tasks[1]!.dueDate = '2026-11-03';
  expect(getLinkWarning(edge('a', 'b'), getPlanNodes(input))).toBeNull();
  input.subprojects[0]!.tasks[1]!.dueDate = null;
  expect(getLinkWarning(edge('a', 'b'), getPlanNodes(input))).toBeNull();
  input.subprojects[0]!.tasks[1]!.done = true;
  expect(getLinkWarning(edge('a', 'b'), getPlanNodes(input))).toBeNull();
});

it('reports incomplete section timing rather than claiming a known finish date', () => {
  const nodes = getPlanNodes(project([task('a'), task('b', { dueDate: '2026-11-01' })]));
  expect(getLinkWarning({ prerequisite: { kind: 'section', id: 's' }, dependent: { kind: 'task', id: 'b' } }, nodes)).toMatch(/timing is incomplete/);
});

it.each([null, {}, [null], [{ prerequisite: { kind: 'project', id: 'p' }, dependent: { kind: 'task', id: 'a' } }], [{ prerequisite: { kind: 'task', id: '' } }]])(
  'rejects malformed link payloads: %j', value => expect(parsePlanLinks(value)).toBeNull(),
);

it('round-trips typed links without mutating task completion or deadlines', () => {
  const input = project([task('a'), task('b')]);
  const before = JSON.stringify(input);
  const parsed = parsePlanLinks([edge('a', 'b')]);
  expect(parsed).toEqual([edge('a', 'b')]);
  getPlanLayers(getPlanNodes(input), parsed!);
  expect(JSON.stringify(input)).toBe(before);
});
