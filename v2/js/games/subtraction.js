// subtraction.js — 减法: blocks hop away — how many are left?
import { renderBlockChar, renderTensOnes } from '../core/blocks.js';
import { el, bi } from '../core/ui.js';
import { askEq, stateEq, numWords } from '../core/i18n.js';
import { randInt, pick, pickN, numberChoices } from '../core/util.js';
import { sfx } from '../core/audio.js';

function bigChar(n, { markTop = 0, unit = 36 } = {}) {
  if (n <= 10) return renderBlockChar(n, { size: unit, label: true, markTop });
  if (n <= 20) return renderBlockChar(n, { size: unit, arrangement: 'tenframe', label: true, markTop });
  return renderTensOnes(n, { unit });
}

function hopAway(boardEl, total, count) {
  const svg = boardEl.querySelector('.nb-char svg');
  if (!svg) return;
  const cells = [...svg.querySelectorAll('g[data-cell]')];
  cells
    .filter((g) => Number(g.dataset.cell) >= total - count)
    .forEach((g, k) => {
      g.style.animationDelay = `${k * 0.08}s`;
      g.classList.add('hop-away');
    });
  sfx.whoosh();
}

function diffRound(a, b, { useNumpad = false, hintNote = null, unit = 36 } = {}) {
  const diff = a - b;
  return {
    prompt: `${a} − ${b} = ?`,
    speak: askEq(a, '-', b),
    input: useNumpad ? 'numpad' : 'choices',
    choices: useNumpad ? undefined
      : numberChoices(diff, { min: 0, max: Math.max(10, diff + 5) }).map((v) => ({ value: v })),
    answer: diff,
    board(boardEl) {
      const col = el('div', { class: 'board-col' });
      if (a <= 20) {
        col.appendChild(bigChar(a, { markTop: b, unit }));
        col.appendChild(el('div', { class: 'board-note' },
          bi({ zh: `亮亮的 ${b} 个要跳走！`, en: `The ${b} glowing blocks are hopping away!` })));
      } else {
        col.appendChild(bigChar(a, { unit }));
        col.appendChild(el('div', { class: 'board-note' },
          bi({ zh: `${b} 个要走掉，还剩几个？`, en: `${b} leave — how many stay?` })));
      }
      boardEl.appendChild(col);
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      const note = hintNote
        || (a <= 20
          ? { zh: '数一数没有发光的方块！', en: 'Count the blocks that are not glowing!' }
          : { zh: '先减十位，再减个位', en: 'Subtract the tens first, then the ones' });
      boardEl.querySelector('.board-col')?.appendChild(
        el('div', { class: 'board-note anim-pop' }, bi(note)));
    },
    onCorrect(boardEl) {
      if (a <= 20) hopAway(boardEl, a, b);
    },
    reveal(boardEl) {
      if (a <= 20) hopAway(boardEl, a, b);
    },
    explain: stateEq(a, '-', b, diff),
    correctDelay: 2300,
    answerText: { zh: String(diff), en: String(diff) },
  };
}

function missingSubtrahendRound(a, c) {
  const missing = a - c;
  return {
    prompt: `${a} − ? = ${c}`,
    speak: {
      zh: `${numWords(a).zh}减几等于${numWords(c).zh}？`,
      en: `${numWords(a).en} minus what equals ${numWords(c).en}?`,
    },
    choices: numberChoices(missing, { min: 0, max: a }).map((v) => ({ value: v })),
    answer: missing,
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-row no-wrap' },
        bigChar(a, { unit: 22 }),
        el('span', { class: 'op-sign' }, '−'),
        renderBlockChar(1, { ghost: true, size: 46, say: false }),
        el('span', { class: 'op-sign' }, '='),
        bigChar(c, { unit: 22 })
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `想一想：${c}和几合成${a}？`, en: `Think: ${c} and what make ${a}?` })));
    },
    explain: stateEq(a, '-', missing, c),
    answerText: { zh: String(missing), en: String(missing) },
  };
}

function compareRound(a, b) {
  const diff = a - b;
  return {
    prompt: { zh: `${a} 比 ${b} 多几？`, en: `How many more is ${a} than ${b}?` },
    speak: {
      zh: `${numWords(a).zh}比${numWords(b).zh}多几？`,
      en: `How many more is ${numWords(a).en} than ${numWords(b).en}?`,
    },
    choices: numberChoices(diff, { min: 1, max: Math.max(9, diff + 3) }).map((v) => ({ value: v })),
    answer: diff,
    board(boardEl) {
      const size = 22;
      boardEl.appendChild(el('div', { class: 'board-row no-wrap', style: { alignItems: 'flex-end' } },
        renderBlockChar(a, { size, label: true }),
        renderBlockChar(b, { size, label: true })
      ));
    },
    hint(boardEl) {
      const size = 22;
      const first = boardEl.querySelector('.nb-char');
      first?.replaceWith(renderBlockChar(a, { size, label: true, markTop: diff }));
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: '发光的部分就是多出来的！', en: 'The glowing part is the extra!' })));
    },
    explain: { zh: `${numWords(a).zh}比${numWords(b).zh}多${numWords(diff).zh}`, en: `${numWords(a).en} is ${numWords(diff).en} more than ${numWords(b).en}` },
    answerText: { zh: String(diff), en: String(diff) },
  };
}

export default {
  id: 'subtraction',
  rounds: 8,
  levelHints: {
    1: { zh: '5以内', en: 'Within 5' },
    2: { zh: '10以内', en: 'Within 10' },
    3: { zh: '20以内 · 退位', en: 'To 20 · borrowing' },
    4: { zh: '两位数 · 键盘输入', en: 'Two-digit · type it' },
    5: { zh: '缺数 · 比多少', en: 'Missing number · compare' },
  },
  celebrants: () => pickN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3),
  makeRound(level) {
    if (level === 1) {
      const a = randInt(2, 5);
      return diffRound(a, randInt(1, a - 1));
    }
    if (level === 2) {
      const a = randInt(3, 10);
      return diffRound(a, randInt(1, a - 1));
    }
    if (level === 3) {
      const a = randInt(11, 18);
      const b = randInt(a - 9, 9); // crossing ten
      const ones = a - 10;
      return diffRound(a, b, {
        hintNote: { zh: `先从10里减：10 − ${b} = ${10 - b}，再加 ${ones}`, en: `Take from ten: 10 − ${b} = ${10 - b}, then add ${ones}` },
      });
    }
    if (level === 4) {
      const a = randInt(21, 99);
      return diffRound(a, randInt(2, a - 1), { useNumpad: true, unit: 22 });
    }
    const kind = pick(['missing', 'compare', 'compare']);
    if (kind === 'missing') {
      const a = randInt(6, 18);
      return missingSubtrahendRound(a, randInt(1, a - 1));
    }
    const b = randInt(1, 8);
    return compareRound(b + randInt(1, 10 - b), b);
  },
};
