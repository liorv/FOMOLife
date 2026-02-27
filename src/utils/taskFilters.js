// Utility for filtering a list of tasks according to active filters and an
// optional text query.  The logic is shared between App (global list) and
// ProjectEditor (flat view).  Filters are applied conjunctively: a task must
// satisfy every active filter.  No special case is applied to completed tasks
// – they are shown unless the "completed" filter is used.

export function applyFilters(tasks = [], filters = [], searchQuery = "") {
  const active = filters || [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const inSeven = new Date(now);
  inSeven.setDate(now.getDate() + 7);

  return tasks.filter((t) => {
        // only apply completed filter when explicitly requested
    if (active.includes("completed") && !t.done) return false;
    if (active.includes("overdue")) {
      if (!(t.dueDate && new Date(t.dueDate) < now)) return false;
    }
    if (active.includes("upcoming")) {
      if (t.done || !t.dueDate) return false;
      const d = new Date(t.dueDate);
      if (d < now || d > inSeven) return false;
    }
    if (active.includes("starred")) {
      if (!(t.starred || t.favorite)) return false;
    }
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!((t.text || "").toLowerCase().includes(q))) return false;
    }
    return true;
  });
}
