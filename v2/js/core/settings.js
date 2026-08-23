// settings.js — one shared settings store for the whole site.
// Schema: see DESIGN.md §9. Persisted under nb.settings.
import { load, save } from './storage.js';

const DEFAULTS = {
  language: 'both', // 'zh' | 'en' | 'both'
  audio: {
    master: true,
    voice: true,
    sfx: true,
    rate: 1.0, // speech rate (0.8 slow, 1.0 normal)
    voiceEn: null, // preferred voice name, null = auto
    voiceZh: null,
  },
  defaultLevel: 1, // seeds games never played (1..5)
  perGame: {}, // { [gameId]: { level, ...gameOptions } }
};

function merged(saved) {
  return {
    ...DEFAULTS,
    ...saved,
    audio: { ...DEFAULTS.audio, ...(saved?.audio || {}) },
    perGame: { ...(saved?.perGame || {}) },
  };
}

let state = merged(load('settings', {}));
const listeners = new Set();

function persist() {
  save('settings', state);
  for (const cb of listeners) cb(state);
}

/** Live (read-only by convention) settings object. */
export function getSettings() {
  return state;
}

/** setSetting('audio.rate', 0.8) — dot-path write + persist + notify. */
export function setSetting(path, value) {
  const keys = path.split('.');
  let obj = state;
  for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
  obj[keys[keys.length - 1]] = value;
  persist();
}

/** Subscribe to any settings change. Returns unsubscribe fn. */
export function onSettings(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getGameLevel(gameId) {
  return state.perGame[gameId]?.level ?? state.defaultLevel;
}

export function setGameLevel(gameId, level) {
  state.perGame[gameId] = { ...(state.perGame[gameId] || {}), level };
  persist();
}

export function getGameOpt(gameId, key, fallback) {
  const v = state.perGame[gameId]?.[key];
  return v === undefined ? fallback : v;
}

export function setGameOpt(gameId, key, value) {
  state.perGame[gameId] = { ...(state.perGame[gameId] || {}), [key]: value };
  persist();
}
