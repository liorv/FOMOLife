// we only need the Node filesystem helpers when the code is
// executing on the server.  guarding the require calls keeps Webpack
// from trying to bundle `fs`/`path` for the client side.
let fs, path;
if (typeof window === 'undefined') {
  fs = require('fs');
  path = require('path');
}

// Internal constant used when running in the browser
const STORAGE_KEY = 'fomo_life_data';

// helpers to decide which backing store to talk to.
// - isServer: running in Node (no window object)
// - shouldUseLocalStorage: explicitly force the old browser/localStorage
//   behavior, used during tests so they stay fast and don't hit the API.
const isServer = typeof window === 'undefined';
const shouldUseLocalStorage = !isServer && process.env.NODE_ENV === 'test';

// When running on the server we keep a JSON file under /data.  This
// mirrors the shape of the object that the old localStorage-based
// helper returned, so the rest of the app doesn't need to change.
const DATA_DIR = typeof window === 'undefined' ? path.join(process.cwd(), 'data') : null;
const DATA_FILE = typeof window === 'undefined' ? path.join(DATA_DIR, 'fomo_life_data.json') : null;

function ensureDataDir() {
  if (!fs) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const DEFAULT_USER = 'default';

function dataFileFor(userId) {
  if (!fs) return null;
  const finalId = userId || DEFAULT_USER;
  const name = `fomo_life_data_${finalId}.json`;
  return path.join(DATA_DIR, name);
}

function readFile(userId) {
  if (!fs) return null;
  try {
    ensureDataDir();
    const file = dataFileFor(userId);
    if (!fs.existsSync(file)) {
      return null;
    }
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    // swallow errors and fall back to empty object
    console.error('storage.readFile failed', e);
    return null;
  }
}

function writeFile(data, userId) {
  if (!fs) return;
  try {
    ensureDataDir();
    const file = dataFileFor(userId);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('storage.writeFile failed', e);
  }
}

/**
 * Load the entire persisted dataset.  In the browser this reads from
 * localStorage, on the server it reads from a JSON file.  The return
 * value is always an object with the same shape used throughout the
 * app ({tasks, projects, dreams, people}).
 */
export async function loadData(userId) {
  const id = userId || DEFAULT_USER;

  // server-only path
  if (isServer) {
    const fileData = readFile(id);
    return fileData || { tasks: [], projects: [], dreams: [], people: [] };
  }

  // tests run in jsdom; keep using localStorage rather than trying to hit
  // the network/FS layer.
  if (shouldUseLocalStorage) {
    const key = STORAGE_KEY + `_${id}`;
    try {
      return JSON.parse(localStorage.getItem(key)) || { tasks: [], projects: [], dreams: [], people: [] };
    } catch {
      return { tasks: [], projects: [], dreams: [], people: [] };
    }
  }

  // client running normally: hit the API and fall back to localStorage if
  // the network request fails for any reason.
  try {
    const res = await fetch(`/api/storage?userId=${encodeURIComponent(id)}`);
    if (res.ok) {
      return (await res.json()) || { tasks: [], projects: [], dreams: [], people: [] };
    }
  } catch (e) {
    // ignore and fall through to localStorage fallback
  }

  const key = STORAGE_KEY + `_${id}`;
  try {
    return JSON.parse(localStorage.getItem(key)) || { tasks: [], projects: [], dreams: [], people: [] };
  } catch {
    return { tasks: [], projects: [], dreams: [], people: [] };
  }
}

/**
 * Persist the provided dataset.  This overwrites whatever was stored
 * previously.  The implementation mirrors `loadData` with a file on the
 * server and localStorage in the browser.
 */
export async function saveData(data, userId) {
  const id = userId || DEFAULT_USER;

  if (isServer) {
    writeFile(data, id);
    return;
  }

  if (shouldUseLocalStorage) {
    const key = STORAGE_KEY + `_${id}`;
    localStorage.setItem(key, JSON.stringify(data));
    return;
  }

  // attempt to store via API
  try {
    await fetch(`/api/storage?userId=${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    return;
  } catch (e) {
    // fall back to localStorage if the network write fails
  }

  const key = STORAGE_KEY + `_${id}`;
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Convenience helper used by tests and scripts to wipe all stored data.
 * When running client-side this simply removes the localStorage key;
 * on the server it deletes the file if it exists.
 */
export async function clearData(userId) {
  const id = userId || DEFAULT_USER;
  if (isServer) {
    try {
      const file = dataFileFor(id);
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch {
      // ignore
    }
    return;
  }

  if (shouldUseLocalStorage) {
    const key = STORAGE_KEY + `_${id}`;
    localStorage.removeItem(key);
    return;
  }

  try {
    await fetch(`/api/storage?userId=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return;
  } catch (e) {
    // fall back to localStorage
  }

  const key = STORAGE_KEY + `_${id}`;
  localStorage.removeItem(key);
}
