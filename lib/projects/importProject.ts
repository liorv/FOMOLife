/**
 * Client-safe validation/sanitization for importing a project from JSON
 * (matching the shape produced by the project "Export" button).
 *
 * Security notes:
 * - Uses JSON.parse only (never eval/new Function), so no arbitrary code can run.
 * - Never spreads the parsed object into app state — every field is read
 *   individually, type-checked, length-capped, and copied into a brand-new
 *   object. This prevents prototype pollution (e.g. `__proto__`/`constructor`
 *   keys) and stops unexpected/extra fields from reaching the backend.
 * - All string fields are stripped of HTML tags and control characters and
 *   length-capped before being stored, as defense-in-depth against stored XSS
 *   even though React already escapes rendered text.
 * - IDs are never trusted from the imported file; fresh ids are generated for
 *   every subproject/task.
 */
import { generateId } from "@myorg/utils";
import type { ProjectSubproject, ProjectTask, ProjectTaskPerson, ProjectRisk, TaskRecurrence } from "@myorg/types";
import { getTaskStatus, isScheduleHealth, isTaskStatus } from './status';

export interface ValidatedImportProject {
  text: string;
  color?: string;
  goal?: string;
  description?: string;
  dueDate?: string | null;
  aiInstructions?: string;
  subprojects: ProjectSubproject[];
}

export interface ImportValidationResult {
  ok: boolean;
  data?: ValidatedImportProject;
  error?: string;
  stats?: { subprojectCount: number; taskCount: number };
}

const MAX_RAW_LENGTH = 2_000_000; // ~2MB of JSON text
const MAX_NAME_LENGTH = 200;
const MAX_SHORT_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 5000;
const MAX_TASK_TEXT_LENGTH = 2000;
const MAX_SUBPROJECTS = 200;
const MAX_TASKS_PER_SUBPROJECT = 2000;
const MAX_PEOPLE_PER_ITEM = 50;

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

// Strips tags/control chars and caps length; returns undefined for empty results.
function sanitizeText(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const stripped = value
    .replace(/<[^>]*>/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim();
  if (!stripped) return undefined;
  return stripped.slice(0, maxLen);
}

function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : undefined;
}

function sanitizeDate(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed) || isNaN(Date.parse(trimmed))) return undefined;
  return trimmed;
}

function sanitizeBoolean(value: unknown): boolean {
  return value === true;
}

function sanitizeRecurrence(value: unknown): TaskRecurrence | undefined {
  return value === "daily" || value === "weekly" || value === "monthly" || value === "yearly"
    ? value
    : undefined;
}

function sanitizeEffort(value: unknown): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  return Math.max(0, Math.min(1000, Math.round(value)));
}

function sanitizePeople(value: unknown): ProjectTaskPerson[] {
  if (!Array.isArray(value)) return [];
  const people: ProjectTaskPerson[] = [];
  for (const raw of value.slice(0, MAX_PEOPLE_PER_ITEM)) {
    const name = sanitizeText(
      raw && typeof raw === "object" ? (raw as { name?: unknown }).name : raw,
      100
    );
    if (name) people.push({ name });
  }
  return people;
}

function sanitizeTask(raw: unknown): ProjectTask | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const text = sanitizeText(obj.description ?? obj.text, MAX_TASK_TEXT_LENGTH);
  if (!text) return null;
  const recurrence = sanitizeRecurrence(obj.recurrence);
  const status = obj.status;
  if (status !== undefined && !isTaskStatus(status)) throw new Error("Invalid task status.");
  if (obj.delayDays !== undefined && (typeof obj.delayDays !== 'number' || !Number.isFinite(obj.delayDays) || obj.delayDays < 0 || obj.delayDays > 36500)) throw new Error("Invalid delay days.");
  if (obj.scheduleHealth !== undefined && obj.scheduleHealth !== null && !isScheduleHealth(obj.scheduleHealth)) throw new Error("Invalid schedule health.");
  let statusUpdates: ProjectTask['statusUpdates'];
  if (obj.statusUpdates !== undefined) {
    if (!Array.isArray(obj.statusUpdates)) throw new Error("Task updates must be an array.");
    statusUpdates = obj.statusUpdates.map((note: unknown) => {
      const text = sanitizeText(note && typeof note === 'object' && 'text' in note ? note.text : undefined, MAX_LONG_TEXT_LENGTH);
      if (!text) throw new Error("Each task update needs non-empty text.");
      return { id: generateId(), text };
    });
  }
  return {
    id: generateId(),
    text,
    done: sanitizeBoolean(obj.done),
    ...(status !== undefined ? { status: getTaskStatus({ done: sanitizeBoolean(obj.done), status }) } : {}),
    ...(isScheduleHealth(obj.scheduleHealth) ? { scheduleHealth: obj.scheduleHealth } : {}),
    ...(statusUpdates ? { statusUpdates } : {}),
    ...(typeof obj.delayDays === 'number' ? { delayDays: obj.delayDays } : {}),
    dueDate: sanitizeDate(obj.dueDate) ?? null,
    ...(recurrence ? { recurrence } : {}),
    ...(recurrence && sanitizeDate(obj.recurrenceAnchorDate) ? { recurrenceAnchorDate: sanitizeDate(obj.recurrenceAnchorDate) as string } : {}),
    favorite: sanitizeBoolean(obj.favorite),
    people: sanitizePeople(obj.people),
    effort: sanitizeEffort(obj.effort),
    ...(obj.risks !== undefined ? { risks: sanitizeRisks(obj.risks) } : {}),
  };
}

function sanitizeRisks(value: unknown): ProjectRisk[] {
  if (!Array.isArray(value)) throw new Error("Task risks must be an array.");
  return value.map(raw => {
    if (!raw || typeof raw !== "object" || !Array.isArray(raw.mitigations) ||
      typeof raw.description !== "string") {
      throw new Error("Each risk needs a name, a description, and a mitigation list.");
    }
    const name = sanitizeText(raw.name, MAX_NAME_LENGTH);
    if (!name) throw new Error("Each risk needs a non-empty name.");
    return {
      id: generateId(),
      name,
      description: sanitizeText(raw.description, MAX_LONG_TEXT_LENGTH) ?? "",
      mitigations: raw.mitigations.map((item: unknown) => {
        const text = sanitizeText(
          item && typeof item === "object" && "text" in item ? item.text : undefined,
          MAX_LONG_TEXT_LENGTH,
        );
        if (!text) throw new Error("Each mitigation needs non-empty text.");
        return { id: generateId(), text };
      }),
    };
  });
}

function sanitizeSubproject(raw: unknown): ProjectSubproject | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const text = sanitizeText(obj.title ?? obj.text, MAX_NAME_LENGTH);
  const rawTasks = Array.isArray(obj.tasks) ? obj.tasks.slice(0, MAX_TASKS_PER_SUBPROJECT) : [];
  const tasks = rawTasks.map(sanitizeTask).filter((t): t is ProjectTask => t !== null);
  if (!text && tasks.length === 0) return null;

  const description = sanitizeText(obj.description, MAX_LONG_TEXT_LENGTH);
  const color = sanitizeColor(obj.color);
  const owners = sanitizePeople(obj.owners);

  return {
    id: generateId(),
    text: text ?? "Untitled",
    tasks,
    ...(description ? { description } : {}),
    ...(color ? { color } : {}),
    ...(owners.length > 0 ? { owners } : {}),
  };
}

export function validateProjectImportJson(raw: string): ImportValidationResult {
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, error: "Paste or select a project JSON file first." };
  }
  if (raw.length > MAX_RAW_LENGTH) {
    return { ok: false, error: "That file is too large to import." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "That doesn't look like valid JSON." };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Expected a JSON object matching the project export format." };
  }

  const obj = parsed as Record<string, unknown>;
  const name = sanitizeText(obj.name, MAX_NAME_LENGTH);
  if (!name) {
    return { ok: false, error: "The project JSON is missing a valid \"name\" field." };
  }

  const rawSubprojects = Array.isArray(obj.sub_projects) ? obj.sub_projects.slice(0, MAX_SUBPROJECTS) : [];
  let subprojects: ProjectSubproject[];
  try {
    subprojects = rawSubprojects
      .map(sanitizeSubproject)
      .filter((s): s is ProjectSubproject => s !== null);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Invalid task risks." };
  }

  const metadata = obj.metadata && typeof obj.metadata === "object" && !Array.isArray(obj.metadata)
    ? (obj.metadata as Record<string, unknown>)
    : {};

  const data: ValidatedImportProject = {
    text: name,
    subprojects,
    ...(sanitizeColor(obj.color) ? { color: sanitizeColor(obj.color) as string } : {}),
    ...(sanitizeText(metadata.goal, MAX_SHORT_TEXT_LENGTH) ? { goal: sanitizeText(metadata.goal, MAX_SHORT_TEXT_LENGTH) as string } : {}),
    ...(sanitizeText(metadata.description, MAX_LONG_TEXT_LENGTH) ? { description: sanitizeText(metadata.description, MAX_LONG_TEXT_LENGTH) as string } : {}),
    ...(sanitizeDate(metadata.dueDate) !== undefined ? { dueDate: sanitizeDate(metadata.dueDate) ?? null } : {}),
    ...(sanitizeText(metadata.aiInstructions, MAX_LONG_TEXT_LENGTH) ? { aiInstructions: sanitizeText(metadata.aiInstructions, MAX_LONG_TEXT_LENGTH) as string } : {}),
  };

  const taskCount = subprojects.reduce((sum, s) => sum + s.tasks.length, 0);
  return { ok: true, data, stats: { subprojectCount: subprojects.length, taskCount } };
}
