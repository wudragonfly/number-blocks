// util.js — randomness & small helpers shared by all games.

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** n distinct random picks from arr */
export function pickN(arr, n) {
  return shuffle(arr).slice(0, n);
}

/**
 * Build a shuffled list of numeric choice values including `answer`.
 * Distractors are plausible: near misses first, then random in range.
 */
export function numberChoices(answer, { count = 3, min = 0, max = null, near = null } = {}) {
  const hi = max == null ? Math.max(10, answer + 10) : max;
  const lo = Math.min(min, answer);
  const set = new Set([answer]);
  const candidates = shuffle(
    (near || [answer - 1, answer + 1, answer - 2, answer + 2, answer + 10, answer - 10, answer + 3])
      .filter((v) => v >= lo && v <= hi && v !== answer)
  );
  for (const c of candidates) {
    if (set.size >= count) break;
    set.add(c);
  }
  let guard = 0;
  while (set.size < count && guard++ < 200) {
    const v = randInt(lo, hi);
    if (v !== answer) set.add(v);
  }
  return shuffle([...set]);
}

/** greatest common divisor */
export function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
