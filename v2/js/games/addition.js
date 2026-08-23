// addition.js — 加法: characters walk together and merge into the sum.
import { renderBlockChar, renderTensOnes } from '../core/blocks.js';
import { el, bi } from '../core/ui.js';
import { askEq, stateEq, numWords } from '../core/i18n.js';
import { randInt, pick, pickN, numberChoices } from '../core/util.js';

// `unit` is the block size for BOTH branches, so numbers standing side by
// side in one equation always have identical blocks
function charOrComposite(n, unit) {
  return n <= 10
    ? renderBlockChar(n, { size: unit, label: true })
    : renderTensOnes(n, { unit });
}

function mergeOnCorrect(boardEl, sum) {
  const row = boardEl.querySelector('.board-row');
  if (!row) return;
  const kids = [...row.children];
  kids[0]?.classList.add('merge-left');
  kids[2]?.classList.add('merge-right');
  setTimeout(() => {
    row.replaceChildren(
      el('span', { class: 'anim-pop' },
        sum <= 10
          ? renderBlockChar(sum, { size: 40, label: true, mood: 'excited', limbs: true })
          : renderTensOnes(sum, { unit: 22 })
      )
    );
  }, 680);
}

function sumRound(a, b, { useNumpad = false, hintNote = null, charSize = 36 } = {}) {
  const sum = a + b;
  const size = charSize; // fixed per level — no big/small jumps between rounds
  return {
    prompt: `${a} + ${b} = ?`,
    speak: askEq(a, '+', b),
    input: useNumpad ? 'numpad' : 'choices',
    choices: useNumpad ? undefined
      : numberChoices(sum, { min: Math.max(0, sum - 6), max: sum + 6 }).map((v) => ({ value: v })),
    answer: sum,
    board(boardEl) {
      // one block unit for the whole equation — a "10" next to an "86"
      // must not have bigger blocks than the 86
      const unit = a > 10 || b > 10 ? 22 : size;
      boardEl.appendChild(el('div', { class: 'board-col' },
        el('div', { class: 'board-row no-wrap' },
          charOrComposite(a, unit),
          el('span', { class: 'op-sign' }, '+'),
          charOrComposite(b, unit),
          el('span', { class: 'op-sign' }, '='),
          renderBlockChar(1, { ghost: true, size: 46, say: false })
        )
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      const note = hintNote
        || (sum <= 20
          ? { zh: '数一数所有的方块！', en: 'Count all the blocks!' }
          : { zh: '先加十位，再加个位', en: 'Add the tens first, then the ones' });
      boardEl.querySelector('.board-col')?.appendChild(
        el('div', { class: 'board-note anim-pop' }, bi(note)));
    },
    onCorrect(boardEl) {
      mergeOnCorrect(boardEl, sum);
    },
    reveal(boardEl) {
      mergeOnCorrect(boardEl, sum);
    },
    explain: stateEq(a, '+', b, sum),
    correctDelay: 2300,
    answerText: { zh: String(sum), en: String(sum) },
  };
}

function missingAddendRound(a, c) {
  const missing = c - a;
  return {
    prompt: `${a} + ? = ${c}`,
    speak: {
      zh: `${numWords(a).zh}加几等于${numWords(c).zh}？`,
      en: `${numWords(a).en} plus what equals ${numWords(c).en}?`,
    },
    choices: numberChoices(missing, { min: 0, max: Math.max(10, c) }).map((v) => ({ value: v })),
    answer: missing,
    board(boardEl) {
      const unit = 22; // every level-5 round shares one medium unit
      boardEl.appendChild(el('div', { class: 'board-row no-wrap' },
        charOrComposite(a, unit),
        el('span', { class: 'op-sign' }, '+'),
        renderBlockChar(1, { ghost: true, size: 46, say: false }),
        el('span', { class: 'op-sign' }, '='),
        charOrComposite(c, unit)
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `想一想：${a}和几合成${c}？`, en: `Think: ${a} and what make ${c}?` })));
    },
    explain: stateEq(a, '+', missing, c),
    answerText: { zh: String(missing), en: String(missing) },
  };
}

function threeAddendRound() {
  const a = randInt(1, 8);
  const b = randInt(1, 8);
  const c = randInt(1, 8);
  const sum = a + b + c;
  return {
    prompt: `${a} + ${b} + ${c} = ?`,
    speak: {
      zh: `${numWords(a).zh}加${numWords(b).zh}再加${numWords(c).zh}等于几？`,
      en: `What is ${numWords(a).en} plus ${numWords(b).en} plus ${numWords(c).en}?`,
    },
    choices: numberChoices(sum, { min: 3, max: 26 }).map((v) => ({ value: v })),
    answer: sum,
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-row no-wrap' },
        renderBlockChar(a, { size: 22, label: true }),
        el('span', { class: 'op-sign' }, '+'),
        renderBlockChar(b, { size: 22, label: true }),
        el('span', { class: 'op-sign' }, '+'),
        renderBlockChar(c, { size: 22, label: true })
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `先算 ${a} + ${b} = ${a + b}`, en: `First ${a} + ${b} = ${a + b}` })));
    },
    explain: { zh: `等于${numWords(sum).zh}`, en: `It equals ${numWords(sum).en}` },
    answerText: { zh: String(sum), en: String(sum) },
  };
}

export default {
  id: 'addition',
  rounds: 8,
  levelHints: {
    1: { zh: '和 ≤ 5', en: 'Sums to 5' },
    2: { zh: '和 ≤ 10', en: 'Sums to 10' },
    3: { zh: '和 ≤ 20 · 过十', en: 'To 20 · crossing ten' },
    4: { zh: '两位数 · 键盘输入', en: 'Two-digit · type it' },
    5: { zh: '缺数 · 三个数', en: 'Missing number · 3 addends' },
  },
  celebrants: () => pickN([3, 4, 5, 6, 7, 8, 9, 10], 3),
  makeRound(level) {
    if (level === 1) {
      const a = randInt(1, 4);
      return sumRound(a, randInt(1, 5 - a), { charSize: 44 });
    }
    if (level === 2) {
      const a = randInt(1, 9);
      return sumRound(a, randInt(1, 10 - a), { charSize: 36 });
    }
    if (level === 3) {
      const a = randInt(5, 9);
      const b = randInt(11 - a, 10);
      const ten = 10 - a;
      return sumRound(a, b, {
        charSize: 34,
        hintNote: { zh: `先凑十：${a} + ${ten} = 10，再加 ${b - ten}`, en: `Make ten: ${a} + ${ten} = 10, then add ${b - ten}` },
      });
    }
    if (level === 4) {
      const a = randInt(11, 88);
      const b = randInt(2, 99 - a);
      return sumRound(a, b, { useNumpad: true });
    }
    const kind = pick(['missing', 'missing', 'three']);
    if (kind === 'three') return threeAddendRound();
    const c = randInt(6, 18);
    return missingAddendRound(randInt(1, c - 1), c);
  },
};
