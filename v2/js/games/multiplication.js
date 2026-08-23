// multiplication.js — 乘法: arrays & equal groups, tables, missing factors.
import { renderBlockChar, renderTensOnes } from '../core/blocks.js';
import { el, bi } from '../core/ui.js';
import { askEq, stateEq, numWords } from '../core/i18n.js';
import { randInt, pick, pickN, numberChoices } from '../core/util.js';
import { getGameOpt } from '../core/settings.js';
import { sfx } from '../core/audio.js';

function tablesFor(level) {
  const chosen = getGameOpt('multiplication', 'tables', null);
  if (Array.isArray(chosen) && chosen.length) return chosen;
  return level <= 2 ? [2, 3, 4, 5, 10] : [2, 3, 4, 5, 6, 7, 8, 9];
}

/** rows appear one by one with rising notes — counting in rows */
function animateArray(boardEl, rows, cols) {
  const svg = boardEl.querySelector('.nb-char svg');
  if (!svg) return;
  const cells = [...svg.querySelectorAll('g[data-cell]')];
  cells.forEach((g) => { g.style.opacity = '0'; });
  for (let r = 0; r < rows; r++) {
    setTimeout(() => {
      cells
        .filter((g) => {
          const i = Number(g.dataset.cell);
          return i >= r * cols && i < (r + 1) * cols;
        })
        .forEach((g) => {
          g.style.transition = 'opacity 0.18s ease';
          g.style.opacity = '1';
        });
      sfx.pop(r);
    }, 170 * r + 120);
  }
}

function arrayBoard(a, b) {
  const s = Math.max(16, Math.min(34, Math.floor(280 / Math.max(a, b))));
  return renderBlockChar(a * b, {
    arrangement: 'array', cols: b, size: s,
    colorOf: Math.min(a, 10), say: false, feet: false,
  });
}

function factRound(a, b, { useNumpad = false } = {}) {
  const p = a * b;
  const near = [p + a, p - a, p + b, p - b, a * (b + 1), a * (b - 1)].filter((v) => v > 0 && v !== p);
  return {
    prompt: `${a} × ${b} = ?`,
    speak: askEq(a, '×', b),
    input: useNumpad ? 'numpad' : 'choices',
    choices: useNumpad ? undefined
      : numberChoices(p, { min: 1, max: p + Math.max(a, b) + 2, near }).map((v) => ({ value: v })),
    answer: p,
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' },
        arrayBoard(a, b),
        el('div', { class: 'board-note' },
          bi({ zh: `${a} 行，每行 ${b} 个`, en: `${a} rows of ${b}` }))
      ));
      animateArray(boardEl, a, b);
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      const skip = Array.from({ length: Math.min(a, 5) }, (_, k) => (k + 1) * b).join(', ');
      boardEl.querySelector('.board-col')?.appendChild(
        el('div', { class: 'board-note anim-pop' },
          bi({ zh: `一行一行数：${skip}…`, en: `Count by rows: ${skip}…` })));
    },
    explain: stateEq(a, '×', b, p),
    answerText: { zh: String(p), en: String(p) },
  };
}

function groupsRound() {
  const k = randInt(2, 4);
  const m = randInt(2, 5);
  const total = k * m;
  return {
    prompt: { zh: `${k} 组 ${m}，一共几个？`, en: `${k} groups of ${m} — how many in all?` },
    speak: {
      zh: `${numWords(k).zh}组${numWords(m).zh}，一共几个？`,
      en: `${numWords(k).en} groups of ${numWords(m).en} — how many in all?`,
    },
    choices: numberChoices(total, { min: 2, max: total + 5, near: [total - m, total + m, total - 1, total + 1] }).map((v) => ({ value: v })),
    answer: total,
    board(boardEl) {
      const row = el('div', { class: 'board-row' });
      for (let i = 0; i < k; i++) {
        row.appendChild(renderBlockChar(m, { size: 40, colorOf: m, label: true }));
      }
      boardEl.appendChild(row);
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      const skip = Array.from({ length: k }, (_, i) => (i + 1) * m).join(', ');
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `跳着数：${skip}！`, en: `Skip count: ${skip}!` })));
    },
    explain: stateEq(k, '×', m, total),
    answerText: { zh: String(total), en: String(total) },
  };
}

function skipRound() {
  const step = pick([2, 5, 10]);
  const start = step * randInt(1, 3);
  const seq = [start, start + step, start + 2 * step, start + 3 * step];
  const answer = start + 4 * step;
  return {
    prompt: { zh: `跳着数：${seq.join('、')}，下一个？`, en: `Skip count: ${seq.join(', ')} — what's next?` },
    speak: {
      zh: `跳着数：${seq.map((v) => numWords(v).zh).join('，')}，下一个是几？`,
      en: `Skip count: ${seq.map((v) => numWords(v).en).join(', ')} — what comes next?`,
    },
    choices: numberChoices(answer, { min: 1, max: answer + step, near: [answer - step, answer + step, answer - 1] }).map((v) => ({ value: v })),
    answer,
    board(boardEl) {
      const row = el('div', { class: 'board-row' });
      for (const v of seq) {
        row.appendChild(el('div', { class: 'compare-card', style: { pointerEvents: 'none' } }, String(v)));
      }
      row.appendChild(el('div', { class: 'compare-card', style: { pointerEvents: 'none' } }, '?'));
      boardEl.appendChild(row);
    },
    explain: { zh: `每次加${numWords(step).zh}`, en: `Add ${numWords(step).en} each time` },
    answerText: { zh: String(answer), en: String(answer) },
  };
}

function missingFactorRound(a, c) {
  const missing = c / a;
  return {
    prompt: `${a} × ? = ${c}`,
    speak: {
      zh: `${numWords(a).zh}乘几等于${numWords(c).zh}？`,
      en: `${numWords(a).en} times what equals ${numWords(c).en}?`,
    },
    choices: numberChoices(missing, { min: 1, max: 10 }).map((v) => ({ value: v })),
    answer: missing,
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' },
        arrayBoard(a, missing),
        el('div', { class: 'board-note' },
          bi({ zh: `${a} 行 — 每行几个？`, en: `${a} rows — how many in each row?` }))
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
    },
    explain: stateEq(a, '×', missing, c),
    answerText: { zh: String(missing), en: String(missing) },
  };
}

function bigRound() {
  const a = randInt(12, 29);
  const b = randInt(2, Math.min(9, Math.floor(99 / a) + 3));
  const p = a * b;
  const tens = Math.floor(a / 10) * 10;
  const ones = a % 10;
  return {
    prompt: `${a} × ${b} = ?`,
    speak: askEq(a, '×', b),
    input: 'numpad',
    maxLen: 3,
    answer: p,
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' },
        renderTensOnes(a, { unit: 17 }),
        el('div', { class: 'board-note' }, bi({ zh: `这样的一份，共 ${b} 份`, en: `One set like this — ${b} sets in all` }))
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.querySelector('.board-col')?.appendChild(
        el('div', { class: 'board-note anim-pop' },
          bi({
            zh: `拆开算：${tens} × ${b} = ${tens * b}，${ones} × ${b} = ${ones * b}`,
            en: `Split it: ${tens} × ${b} = ${tens * b}, ${ones} × ${b} = ${ones * b}`,
          })));
    },
    explain: stateEq(a, '×', b, p),
    answerText: { zh: String(p), en: String(p) },
  };
}

export default {
  id: 'multiplication',
  rounds: 8,
  levelHints: {
    1: { zh: '几组几 · 跳着数', en: 'Groups & skip counting' },
    2: { zh: '乘法表 2·3·4·5·10', en: 'Tables 2, 3, 4, 5, 10' },
    3: { zh: '乘法表到 9×9', en: 'All tables to 9×9' },
    4: { zh: '缺数 · 平方数', en: 'Missing factor & squares' },
    5: { zh: '两位数 × 一位数', en: '2-digit × 1-digit' },
  },
  extraSettings: [
    {
      key: 'tables',
      type: 'multi',
      label: { zh: '练习哪些乘法表', en: 'Practice which tables' },
      options: [2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => ({ value: v, label: String(v) })),
    },
  ],
  celebrants: () => pickN([4, 6, 8, 9, 10], 3),
  makeRound(level) {
    if (level === 1) {
      return pick([groupsRound, groupsRound, skipRound])();
    }
    if (level === 2 || level === 3) {
      const t = pick(tablesFor(level));
      return factRound(t, randInt(2, level === 2 ? 5 : 9));
    }
    if (level === 4) {
      const kind = pick(['missing', 'missing', 'square']);
      if (kind === 'square') {
        const a = randInt(2, 9);
        return factRound(a, a);
      }
      const a = pick(tablesFor(level));
      const m = randInt(2, 9);
      return missingFactorRound(a, a * m);
    }
    return pick([bigRound, bigRound, () => {
      const a = pick(tablesFor(level));
      return factRound(a, randInt(6, 9), { useNumpad: true });
    }])();
  },
};
