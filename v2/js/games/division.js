// division.js — 除法: share blocks onto plates; leftovers shrug (remainders).
import { renderBlockChar } from '../core/blocks.js';
import { el, bi } from '../core/ui.js';
import { askEq, stateEq, numWords } from '../core/i18n.js';
import { randInt, pick, pickN, shuffle, numberChoices } from '../core/util.js';

function platesRow(k) {
  const row = el('div', { class: 'plates-row' });
  for (let i = 0; i < k; i++) {
    row.appendChild(el('div', { class: 'plate' },
      el('div', { class: 'plate-q' }, '?'),
      el('div', { class: 'plate-dish' })
    ));
  }
  return row;
}

function fillPlates(boardEl, q, r = 0) {
  boardEl.querySelectorAll('.plate').forEach((plate, i) => {
    const slot = plate.querySelector('.plate-q');
    if (!slot) return;
    const stack = el('div', { class: 'plate-stack anim-pop' },
      renderBlockChar(q, { size: Math.min(18, Math.floor(100 / q)), say: false, feet: false }));
    stack.style.animationDelay = `${i * 0.12}s`;
    slot.replaceWith(stack);
  });
  if (r > 0) {
    const leftover = el('div', { class: 'plate anim-pop' },
      el('div', { class: 'plate-stack' },
        renderBlockChar(r, { size: 18, say: false, mood: 'sad' })),
      el('div', { class: 'board-note' }, bi({ zh: `剩 ${r} 个`, en: `${r} left over` }))
    );
    boardEl.querySelector('.plates-row')?.appendChild(leftover);
  }
}

function totalDisplay(n) {
  if (n <= 10) return renderBlockChar(n, { size: 30, label: true });
  return el('div', { class: 'compare-card', style: { pointerEvents: 'none' } }, String(n));
}

function shareRound(n, k) {
  const q = Math.floor(n / k);
  return {
    prompt: { zh: `把 ${n} 个平均分给 ${k} 个朋友，每人几个？`, en: `Share ${n} equally among ${k} friends — how many each?` },
    speak: {
      zh: `把${numWords(n).zh}个方块平均分给${numWords(k).zh}个朋友，每人几个？`,
      en: `Share ${numWords(n).en} blocks equally among ${numWords(k).en} friends. How many does each friend get?`,
    },
    choices: numberChoices(q, { min: 1, max: Math.max(9, q + 3) }).map((v) => ({ value: v })),
    answer: q,
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' },
        totalDisplay(n),
        platesRow(k)
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.querySelector('.board-col')?.appendChild(
        el('div', { class: 'board-note anim-pop' },
          bi({ zh: `想乘法：${k} × 几 = ${n}？`, en: `Think multiplication: ${k} × what = ${n}?` })));
    },
    onCorrect(boardEl) { fillPlates(boardEl, q); },
    reveal(boardEl) { fillPlates(boardEl, q); },
    explain: stateEq(n, '÷', k, q),
    correctDelay: 2300,
    answerText: { zh: String(q), en: String(q) },
  };
}

function groupRound(n, b) {
  const q = n / b;
  return {
    prompt: { zh: `${n} 个方块，每组 ${b} 个，能分几组？`, en: `${n} blocks in groups of ${b} — how many groups?` },
    speak: {
      zh: `${numWords(n).zh}个方块，每组${numWords(b).zh}个，能分成几组？`,
      en: `${numWords(n).en} blocks in groups of ${numWords(b).en} — how many groups can you make?`,
    },
    choices: numberChoices(q, { min: 1, max: Math.max(9, q + 3) }).map((v) => ({ value: v })),
    answer: q,
    board(boardEl) {
      const s = Math.max(15, Math.min(30, Math.floor(250 / Math.max(q, b))));
      boardEl.appendChild(el('div', { class: 'board-col' },
        renderBlockChar(n, { arrangement: 'array', cols: b, size: s, colorOf: Math.min(b, 10), say: false, feet: false }),
        el('div', { class: 'board-note' }, bi({ zh: `每行正好 ${b} 个`, en: `Each row is exactly ${b}` }))
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.querySelector('.board-col')?.appendChild(
        el('div', { class: 'board-note anim-pop' }, bi({ zh: '数一数有几行！', en: 'Count the rows!' })));
    },
    explain: stateEq(n, '÷', b, q),
    answerText: { zh: String(q), en: String(q) },
  };
}

function remainderRound(k, q, r) {
  const n = k * q + r;
  const key = (qq, rr) => `${qq}r${rr}`;
  const label = (qq, rr) => ({ zh: `${qq} 余 ${rr}`, en: `${qq} R ${rr}` });
  const seen = new Set([key(q, r)]);
  const wrongs = [];
  for (const [qq, rr] of shuffle([
    [q, r + 1 <= k - 1 ? r + 1 : Math.max(0, r - 1)],
    [q + 1, r], [q - 1, r], [q, Math.max(0, r - 1)],
  ])) {
    const kk = key(qq, rr);
    if (qq > 0 && rr >= 0 && !seen.has(kk)) {
      seen.add(kk);
      wrongs.push([qq, rr]);
      if (wrongs.length === 2) break;
    }
  }
  const choices = shuffle([[q, r], ...wrongs]).map(([qq, rr]) => ({
    value: key(qq, rr), label: label(qq, rr),
  }));
  return {
    prompt: { zh: `${n} ÷ ${k} = ? 还剩几个？`, en: `${n} ÷ ${k} = ? What's left over?` },
    speak: {
      zh: `把${numWords(n).zh}个方块平均分给${numWords(k).zh}个朋友，每人几个，还剩几个？`,
      en: `Share ${numWords(n).en} blocks among ${numWords(k).en} friends. How many each, and how many are left?`,
    },
    choices,
    answer: key(q, r),
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' },
        totalDisplay(n),
        platesRow(k)
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.querySelector('.board-col')?.appendChild(
        el('div', { class: 'board-note anim-pop' },
          bi({ zh: `${k} × ${q} = ${k * q}，${n} 还多几个？`, en: `${k} × ${q} = ${k * q} — how many extra in ${n}?` })));
    },
    onCorrect(boardEl) { fillPlates(boardEl, q, r); },
    reveal(boardEl) { fillPlates(boardEl, q, r); },
    explain: {
      zh: `每人${numWords(q).zh}个，剩${numWords(r).zh}个`,
      en: `${numWords(q).en} each, with ${numWords(r).en} left over`,
    },
    correctDelay: 2500,
    answerText: label(q, r),
  };
}

function bigRound() {
  const b = randInt(2, 4);
  const q = randInt(11, Math.floor(96 / b));
  const n = b * q;
  return {
    prompt: `${n} ÷ ${b} = ?`,
    speak: askEq(n, '÷', b),
    input: 'numpad',
    answer: q,
    board(boardEl) {
      const tens = Math.floor(q / 10) * 10 * b;
      boardEl.appendChild(el('div', { class: 'board-col' },
        totalDisplay(n),
        el('div', { class: 'board-note' },
          bi({ zh: `拆开想：${tens} ÷ ${b} = ${tens / b}，${n - tens} ÷ ${b} = ${(n - tens) / b}`, en: `Split it: ${tens} ÷ ${b} = ${tens / b}, then ${n - tens} ÷ ${b} = ${(n - tens) / b}` }))
      ));
    },
    hint(boardEl) { boardEl.classList.add('nb-pulse'); },
    explain: stateEq(n, '÷', b, q),
    answerText: { zh: String(q), en: String(q) },
  };
}

export default {
  id: 'division',
  rounds: 8,
  levelHints: {
    1: { zh: '分成两半', en: 'Halves' },
    2: { zh: '÷2 · ÷5 · ÷10', en: 'Divide by 2, 5, 10' },
    3: { zh: '表内除法', en: 'Table facts' },
    4: { zh: '有余数', en: 'Remainders' },
    5: { zh: '两位数除法', en: '2-digit division' },
  },
  celebrants: () => pickN([2, 4, 6, 8, 10], 3),
  makeRound(level) {
    if (level === 1) {
      const q = randInt(1, 5);
      return shareRound(q * 2, 2);
    }
    if (level === 2) {
      const k = pick([2, 5, 10]);
      const q = randInt(2, 5);
      return pick([shareRound, groupRound])(k * q, k);
    }
    if (level === 3) {
      const k = randInt(2, 9);
      const q = randInt(2, 9);
      return pick([shareRound, shareRound, groupRound])(k * q, k);
    }
    if (level === 4) {
      const k = randInt(2, 5);
      const q = randInt(2, 6);
      const r = randInt(1, k - 1);
      return remainderRound(k, q, r);
    }
    if (pick([true, false])) return bigRound();
    const k = randInt(3, 7);
    const q = randInt(4, 9);
    const r = randInt(1, k - 1);
    return remainderRound(k, q, r);
  },
};
