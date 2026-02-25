import { loadData as rawLoad, saveData as rawSave } from "./supabaseStorage";
import generateId from "../utils/generateId";

const DEFAULT_USER = "default";

// Make sure every object in the dataset has a stable `id` property.  This
// is invoked on every load so that existing datasets (which previously
// contained plain arrays) are automatically migrated the first time they
// are opened.  If a migration occurs we immediately persist the updated
// structure so that subsequent loads are fast.
function ensureIds(data) {
  let changed = false;
  ["tasks", "projects", "dreams", "people"].forEach((type) => {
    if (!Array.isArray(data[type])) data[type] = [];
    data[type] = data[type].map((item) => {
      if (!item.id) {
        changed = true;
        return { ...item, id: generateId() };
      }
      return item;
    });
  });
  if (changed) {
    rawSave(data);
  }
  return data;
}

/**
 * Load the full dataset, ensuring every record has an `id` field.
 * Returns a plain object `{tasks,projects,dreams,people}`.
 */
export async function loadData(userId) {
  const d = await rawLoad(userId);
  return ensureIds(d);
}

// internal helper used by mutation methods
export async function saveData(data, userId) {
  // simply forward to the underlying storage layer; kept async for
  // API consistency.
  return rawSave(data, userId);
}

/**
 * Return all items of the given `type` ("tasks", "people", etc).
 */
export async function getAll(type, userId) {
  const d = await loadData(userId || DEFAULT_USER);
  return d[type] || [];
}

export async function getById(type, id, userId) {
  const arr = await getAll(type, userId || DEFAULT_USER);
  return arr.find((i) => i.id === id) || null;
}

/**
 * Create a new object in the specified collection.  The record is
 * assigned a GUID if it doesn't already have one.  The entire dataset is
 * immediately persisted and the created item is returned.  This mirrors a
 * simple RESTful POST behaviour.
 */
export async function create(type, item, userId) {
  const id = userId || DEFAULT_USER;
  const data = await loadData(id);
  const arr = data[type] || [];
  const newItem = { ...item, id: item.id || generateId() };
  arr.push(newItem);
  data[type] = arr;
  saveData(data, id);
  return newItem;
}

/**
 * Update an existing item by id.  Returns the updated item or null if the
 * id wasn't found.
 */
export async function update(type, id, changes, userId) {
  const uid = userId || DEFAULT_USER;
  const data = await loadData(uid);
  const arr = data[type] || [];
  let found = false;
  const newArr = arr.map((i) => {
    if (i.id === id) {
      found = true;
      return { ...i, ...changes, id };
    }
    return i;
  });
  if (!found) return null;
  data[type] = newArr;
  saveData(data, uid);
  return newArr.find((i) => i.id === id);
}

export async function remove(type, id, userId) {
  const uid = userId || DEFAULT_USER;
  const data = await loadData(uid);
  const arr = data[type] || [];
  const newArr = arr.filter((i) => i.id !== id);
  if (newArr.length === arr.length) return false;
  data[type] = newArr;
  saveData(data, uid);
  return true;
}
