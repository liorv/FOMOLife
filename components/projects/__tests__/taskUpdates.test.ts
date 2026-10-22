import type { ProjectSubproject } from "@myorg/types";
import { deleteProjectTask, updateProjectTask } from "@/lib/projects/taskUpdates";

const subprojects: ProjectSubproject[] = [
  {
    id: "planning",
    text: "Planning",
    collapsed: true,
    tasks: [
      { id: "first", text: "Write brief", done: false, favorite: false, dueDate: null, people: [] },
      { id: "second", text: "Review plan", done: false, favorite: false, dueDate: null, people: [] },
    ],
  },
  {
    id: "launch",
    text: "Launch",
    tasks: [{ id: "third", text: "Publish", done: false, favorite: false, dueDate: null, people: [] }],
  },
];

it("updates one task without changing other tasks or subproject state", () => {
  const updated = updateProjectTask(subprojects, "planning", "first", (task) => ({
    ...task,
    done: true,
  }));

  expect(updated).not.toBe(subprojects);
  expect(updated[0]).toMatchObject({
    id: "planning",
    collapsed: true,
    tasks: [
      { id: "first", done: true },
      { id: "second", done: false },
    ],
  });
  expect(updated[1]).toBe(subprojects[1]);
  expect(subprojects[0]?.tasks[0]?.done).toBe(false);
});

it("deletes only the selected task from its subproject", () => {
  const updated = deleteProjectTask(subprojects, "planning", "first");

  expect(updated[0]?.tasks.map((task) => task.id)).toEqual(["second"]);
  expect(updated[0]?.collapsed).toBe(true);
  expect(updated[1]).toBe(subprojects[1]);
  expect(subprojects[0]?.tasks).toHaveLength(2);
});
