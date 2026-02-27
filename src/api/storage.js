// we only need the Node filesystem helpers when the code is
// executing on the server.  Guarding the require calls keeps Webpack
// from trying to bundle `fs`/`path` for the client side.
let fs, path;
if (typeof window === "undefined") {
  fs = require("fs");
  path = require("path");
}

const STORAGE_KEY = "fomo_life_data";
const EMPTY_DATA = Object.freeze({ tasks: [], projects: [], people: [] });

// Environment flags for backing store selection.
const isServer = typeof window === "undefined";
const shouldUseLocalStorage = !isServer && process.env.NODE_ENV === "test";

// When running on the server we keep a JSON file under /data.  This
// mirrors the shape of the object that the old localStorage-based
// helper returned, so the rest of the app doesn't need to change.
const DATA_DIR =
  typeof window === "undefined" ? path.join(process.cwd(), "data") : null;
const DATA_FILE =
  typeof window === "undefined"
    ? path.join(DATA_DIR, "fomo_life_data.json")
    : null;

function ensureDataDir() {
  if (!fs) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

const DEFAULT_USER = "default";

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
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    // swallow errors and fall back to empty object
    console.error("storage.readFile failed", e);
    return null;
  }
}

function writeFile(data, userId) {
  if (!fs) return;
  try {
    ensureDataDir();
    const file = dataFileFor(userId);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("storage.writeFile failed", e);
  }
}

/**
 * Load the entire persisted dataset.  In the browser this reads from
 * localStorage, on the server it reads from a JSON file.  The return
 * value is always an object with the same shape used throughout the
 * app ({tasks, projects, people}).
 */
export async function loadData(userId) {
  const id = userId || DEFAULT_USER;

  if (isServer) {
    const fileData = readFile(id);
    return fileData || { ...EMPTY_DATA };
  }

  if (shouldUseLocalStorage) {
    const key = STORAGE_KEY + `_${id}`;
    try {
      return JSON.parse(localStorage.getItem(key)) || { ...EMPTY_DATA };
    } catch {
      return { ...EMPTY_DATA };
    }
  }

  // Client: hit the API, fall back to localStorage on failure.
  try {
    const res = await fetch(`/api/storage?userId=${encodeURIComponent(id)}`);
    if (res.ok) {
      return (await res.json()) || { ...EMPTY_DATA };
    }
  } catch {
    // fall through to localStorage
  }

  const key = STORAGE_KEY + `_${id}`;
  try {
    return JSON.parse(localStorage.getItem(key)) || { ...EMPTY_DATA };
  } catch {
    return { ...EMPTY_DATA };
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
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        // only backup the default namespace; user-specific files are
        // considered disposable during testing and should not be
        // preserved by global helpers.
        if (id === DEFAULT_USER) {
          const bak = file + ".bak";
          try {
            fs.copyFileSync(file, bak);
          } catch {}
        }
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
      method: "DELETE",
    });
    return;
  } catch (e) {
    // fall back to localStorage
  }

  const key = STORAGE_KEY + `_${id}`;
  localStorage.removeItem(key);
}

// helpers used by tests to restore a backed-up file after clearData ran
export async function restoreData(userId) {
  const id = userId || DEFAULT_USER;
  if (!isServer) return;
  try {
    const file = dataFileFor(id);
    const bak = file + ".bak";
    if (fs.existsSync(bak)) {
      fs.copyFileSync(bak, file);
      fs.unlinkSync(bak);
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// global helpers used by jest setup/teardown so the original dataset is
// preserved once at the start of the entire test run and restored at the end.
// This should only operate on the default user file; other namespaces are
// considered test-only and may be created/removed freely by individual tests.
export async function backupAllData() {
  if (!isServer) return;
  ensureDataDir();
  try {
    const defaultFile = dataFileFor(DEFAULT_USER);
    if (fs.existsSync(defaultFile)) {
      const dest = defaultFile + ".orig";
      try {
        fs.copyFileSync(defaultFile, dest);
      } catch {}
    }
  } catch {
    // ignore
  }
}

export async function restoreAllData() {
  if (!isServer) return;
  ensureDataDir();
  try {
    const defaultOrig = dataFileFor(DEFAULT_USER) + ".orig";
    if (fs.existsSync(defaultOrig)) {
      const target = defaultOrig.slice(0, -5);
      try {
        fs.copyFileSync(defaultOrig, target);
        fs.unlinkSync(defaultOrig);
      } catch {}
    }
  } catch {
    // ignore
  }
}
