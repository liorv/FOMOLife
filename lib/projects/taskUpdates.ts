import type { ProjectSubproject, ProjectTask } from "@myorg/types";

export function updateProjectTask<TSubproject extends ProjectSubproject>(
  subprojects: TSubproject[],
  subprojectId: string,
  taskId: string,
  updateTask: (task: ProjectTask) => ProjectTask,
): TSubproject[] {
  return subprojects.map((subproject) =>
    subproject.id === subprojectId
      ? {
          ...subproject,
          tasks: (subproject.tasks ?? []).map((task) =>
            task.id === taskId ? updateTask(task) : task,
          ),
        }
      : subproject,
  );
}

export function deleteProjectTask<TSubproject extends ProjectSubproject>(
  subprojects: TSubproject[],
  subprojectId: string,
  taskId: string,
): TSubproject[] {
  return subprojects.map((subproject) =>
    subproject.id === subprojectId
      ? {
          ...subproject,
          tasks: (subproject.tasks ?? []).filter((task) => task.id !== taskId),
        }
      : subproject,
  );
}
