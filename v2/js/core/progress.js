// progress.js — stars & bests per game+level, persisted under nb.progress.
import { load, save, remove } from './storage.js';

let data = load('progress', {}); // { [gameId]: { [level]: {stars, best, plays} } }

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

/** Total stars collected in a game (max 3 × 5 levels = 15). */
export function gameStars(gameId) {
  const g = data[gameId];
  if (!g) return 0;
  return Object.values(g).reduce((sum, l) => sum + (l.stars || 0), 0);
}

export function resetProgress() {
  data = {};
  remove('progress');
}
