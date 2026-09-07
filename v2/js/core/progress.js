// progress.js — stars & bests per game+level, persisted under nb.progress.
import { load, save } from './storage.js';

let data = load('progress', {}); // { [gameId]: { [level]: {stars, best, plays} } }
const PROGRESS_SCHEMA = 4;
const storedSchema = data.__schemaVersion || 1;

// Clear replaced level slots once so old stars are not assigned to new games.
if (storedSchema < 2) {
  if (data.subtraction) delete data.subtraction[7];
}
if (storedSchema < 3) {
  if (data.addition) delete data.addition[6];
}
if (storedSchema < 4 && data.memory) {
  // Two new number-matching levels move the existing themes from 3–5 to 5–7.
  for (let level = 5; level >= 3; level--) {
    if (data.memory[level]) data.memory[level + 2] = data.memory[level];
    delete data.memory[level];
  }
}
if (storedSchema < PROGRESS_SCHEMA) {
  data.__schemaVersion = PROGRESS_SCHEMA;
  save('progress', data);
}

export function recordResult(gameId, level, { stars, scorePct }) {
  const g = (data[gameId] = data[gameId] || {});
  const l = (g[level] = g[level] || { stars: 0, best: 0, plays: 0 });
  l.stars = Math.max(l.stars, stars);
  l.best = Math.max(l.best, Math.round(scorePct));
  l.plays += 1;
  save('progress', data);
}

export function levelStars(gameId, level) {
  return data[gameId]?.[level]?.stars || 0;
}

/** Total stars collected in a game across all of its levels. */
export function gameStars(gameId) {
  const g = data[gameId];
  if (!g) return 0;
  return Object.values(g).reduce((sum, l) => sum + (l.stars || 0), 0);
}

export function resetProgress() {
  data = { __schemaVersion: PROGRESS_SCHEMA };
  save('progress', data);
}
