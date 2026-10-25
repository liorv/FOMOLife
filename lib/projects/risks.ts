export function validateTaskRisks(subprojects: unknown): string | null {
  if (subprojects === undefined) return null;
  if (!Array.isArray(subprojects)) return 'Project sections must be an array.';
  for (const section of subprojects) {
    if (!section || !Array.isArray(section.tasks)) return 'Project sections must contain tasks.';
    for (const task of section.tasks) {
      if (!task || typeof task !== 'object') return 'Invalid project task.';
      if (task.risks === undefined) continue;
      if (!Array.isArray(task.risks)) return 'Task risks must be an array.';
      const riskIds = new Set<string>();
      for (const risk of task.risks) {
        if (!risk || typeof risk.id !== 'string' || !risk.id.trim() || riskIds.has(risk.id) ||
          typeof risk.name !== 'string' || !risk.name.trim() || typeof risk.description !== 'string' ||
          !Array.isArray(risk.mitigations)) {
          return 'Each risk needs a unique ID, a name, a description, and a mitigation list.';
        }
        riskIds.add(risk.id);
        const mitigationIds = new Set<string>();
        for (const mitigation of risk.mitigations) {
          if (!mitigation || typeof mitigation.id !== 'string' || !mitigation.id.trim() ||
            mitigationIds.has(mitigation.id) || typeof mitigation.text !== 'string' || !mitigation.text.trim()) {
            return 'Each mitigation needs a unique ID and non-empty text.';
          }
          mitigationIds.add(mitigation.id);
        }
      }
    }
  }
  return null;
}
