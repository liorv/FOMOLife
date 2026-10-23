import type { ProjectItem } from '@myorg/types';
import { buildRoadmap, getRoadmapLanes } from '@/lib/projects/roadmap';

const project: ProjectItem = {
  id: 'p', text: 'Release', color: '#123', subprojects: [
    { id: 's', text: 'Prepare', tasks: [
      { id: 'a', text: 'Approve', effort: 2, done: false, dueDate: null, favorite: false, people: [] },
      { id: 'b', text: 'Publish', effort: 0.5, done: false, dueDate: '2026-11-01', favorite: false, people: [] },
      { id: 'c', text: 'Review', done: false, dueDate: null, favorite: false, people: [] },
    ] },
    { id: 'other', text: 'Other', tasks: [] },
  ],
};
const link = { prerequisite: { kind: 'task' as const, id: 'a' }, dependent: { kind: 'task' as const, id: 'b' } };

it('forecasts dependent tasks after prerequisites while unlinked tasks run in parallel', () => {
  const result = buildRoadmap(project, [link]);
  expect(result.error).toBeNull();
  expect(result.entries.map(({ start, end, estimated }) => ({ start, end, estimated }))).toEqual([
    { start: 0, end: 2, estimated: false },
    { start: 2, end: 2.5, estimated: false },
    { start: 0, end: 1, estimated: true },
  ]);
  expect(project.subprojects[0]!.tasks[1]!.dueDate).toBe('2026-11-01');
});

it('does not delay a forecast for completed prerequisites and preserves zero effort', () => {
  const modified = { ...project, subprojects: project.subprojects.map(section => ({
    ...section, tasks: section.tasks.map(task => ({ ...task, done: task.id === 'a', effort: task.id === 'b' ? 0 : task.effort ?? null })),
  })) };
  expect(buildRoadmap(modified, [link]).entries.map(entry => [entry.start, entry.end])).toEqual([[0, 0], [0, 0], [0, 1]]);
});

it('expands section hints to all member tasks and allows empty section hints', () => {
  const modified = { ...project, subprojects: [
    { ...project.subprojects[0]!, tasks: project.subprojects[0]!.tasks.slice(0, 1) },
    { ...project.subprojects[1]!, tasks: project.subprojects[0]!.tasks.slice(1) },
  ] };
  const result = buildRoadmap(modified, [{ prerequisite: { kind: 'section', id: 's' }, dependent: { kind: 'section', id: 'other' } }]);
  expect(result.entries.map(entry => entry.start)).toEqual([0, 2, 2]);
  expect(buildRoadmap(project, [{ prerequisite: { kind: 'section', id: 'other' }, dependent: { kind: 'task', id: 'a' } }]).error).toBeNull();
});

it('reports cycles introduced by expanding section hints instead of inventing dates', () => {
  const result = buildRoadmap(project, [{ prerequisite: { kind: 'section', id: 's' }, dependent: { kind: 'task', id: 'a' } }]);
  expect(result.error).toMatch(/scheduling cycle/);
  expect(result.entries).toEqual([]);
});

it('reports invalid plans and treats invalid effort as estimated', () => {
  expect(buildRoadmap(project, [{ ...link, prerequisite: { kind: 'task', id: 'deleted' } }]).error).toMatch(/no longer exists/);
  const modified = { ...project, subprojects: [{ ...project.subprojects[0]!, tasks: [{ ...project.subprojects[0]!.tasks[0]!, effort: NaN }] }] };
  expect(buildRoadmap(modified, []).entries[0]).toMatchObject({ start: 0, end: 1, estimated: true });
});

it('places a dependency chain on one lane regardless of task order', () => {
  const entries = buildRoadmap(project, [link]).entries;
  const lanes = getRoadmapLanes([...entries].reverse());
  expect(lanes.map(lane => lane.map(entry => entry.task.id))).toContainEqual(['a', 'b']);
  expect(lanes).toHaveLength(2);
  expect(entries.find(entry => entry.task.id === 'b')!.start).toBe(entries.find(entry => entry.task.id === 'a')!.end);
});

it('keeps parallel branches on separate lanes and starts joins after every prerequisite', () => {
  const modified = { ...project, subprojects: [{ ...project.subprojects[0]!, tasks: [
    ...project.subprojects[0]!.tasks,
    { ...project.subprojects[0]!.tasks[0]!, id: 'd', text: 'Finish', effort: 1 },
  ] }] };
  const result = buildRoadmap(modified, [
    link,
    { prerequisite: { kind: 'task', id: 'a' }, dependent: { kind: 'task', id: 'c' } },
    { prerequisite: { kind: 'task', id: 'b' }, dependent: { kind: 'task', id: 'd' } },
    { prerequisite: { kind: 'task', id: 'c' }, dependent: { kind: 'task', id: 'd' } },
  ]);
  const lanes = getRoadmapLanes(result.entries);
  expect(lanes).toHaveLength(2);
  expect(result.entries.find(entry => entry.task.id === 'd')).toMatchObject({ start: 3, end: 4 });
  for (const lane of lanes) {
    for (let index = 1; index < lane.length; index++) expect(lane[index]!.start).toBeGreaterThanOrEqual(lane[index - 1]!.end);
  }
});

it('keeps zero-duration dependencies in the same chain lane', () => {
  const modified = { ...project, subprojects: [{ ...project.subprojects[0]!, tasks: project.subprojects[0]!.tasks.map(task => ({ ...task, effort: 0 })) }] };
  const lanes = getRoadmapLanes(buildRoadmap(modified, [link]).entries);
  expect(lanes).toHaveLength(2);
  expect(lanes.map(lane => lane.map(entry => entry.task.id))).toContainEqual(['a', 'b']);
});

it('keeps completed prerequisites and their pending dependents in the same lane', () => {
  const modified = { ...project, subprojects: [{ ...project.subprojects[0]!, tasks: project.subprojects[0]!.tasks.map(task => ({
    ...task, done: task.id === 'a',
  })) }] };
  const entries = buildRoadmap(modified, [link]).entries;
  expect(getRoadmapLanes(entries).map(lane => lane.map(entry => entry.task.id))).toContainEqual(['a', 'b']);
});
