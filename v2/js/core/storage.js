// storage.js — namespaced, JSON, failure-safe localStorage helpers.
const PREFIX = 'nb.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* private mode / quota — the app still works, just won't persist */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch { /* ignore */ }
}
