// addition.js — 加法: characters walk together and merge into the sum.
import { renderBlockChar, renderTensOnes } from '../core/blocks.js';
import { renderStrategyDemo } from '../core/strategy.js';
import { el, bi } from '../core/ui.js';
import { askEq, stateEq, numWords } from '../core/i18n.js';
import { randInt, pickN, numberChoices } from '../core/util.js';

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

// Proper make-ten facts: both addends are single digits, the larger/equal
// addend is first, and the sum genuinely crosses ten (never facts like 6 + 10).
function makeTenOperands() {
  const a = randInt(6, 9);
  const b = randInt(11 - a, Math.min(9, a));
  return [a, b];
}

// Introductory carrying: a two-digit number plus one digit, with positive
// pieces on both sides of the split (e.g. 36 + 7 → 36 + 4 + 3).
function nextTenCarryOperands() {
  const a = randInt(1, 8) * 10 + randInt(5, 9);
  const target = Math.ceil(a / 10) * 10;
  const b = randInt(target - a + 1, 9);
  return [a, b, target];
}

// Two two-digit addends with a genuine ones-column carry. Keeping the total
// below 100 lets the child focus on the same make-the-next-ten idea as Level 5.
function twoDigitCarryOperands() {
  const aTens = randInt(1, 7);
  const aOnes = randInt(5, 9);
  const a = aTens * 10 + aOnes;
  const target = (aTens + 1) * 10;
  const firstPart = target - a;
  const bTens = randInt(1, 8 - aTens);
  const bOnes = randInt(firstPart + 1, 9);
  return [a, bTens * 10 + bOnes, target];
}

function makeTenRound(a, b, target) {
  const firstPart = target - a;
  const rest = b - firstPart;
  const sum = a + b;
  return {
    prompt: `${a} + ${b} = ?`,
    speak: askEq(a, '+', b),
    autoSpeak: false,
    input: 'custom',
    answer: sum,
    board(boardEl, api) {
      renderStrategyDemo(boardEl, api, {
        method: { zh: '凑十法', en: target === 10 ? 'Make Ten' : 'Make the Next Ten' },
        splitLabel: { zh: `把 ${b} 拆开`, en: `Split ${b}` },
        splitValue: b,
        splitParts: [firstPart, rest],
        steps: [
          {
            prompt: { zh: `${a} 还差几就到 ${target}？`, en: `How many does ${a} need to reach ${target}?` },
            question: `${a} + ? = ${target}`,
            answer: firstPart,
            equation: `${a} + ${firstPart} = ${target}`,
            speak: {
              zh: `${numWords(a).zh}加几等于${numWords(target).zh}？`,
              en: `${numWords(a).en} plus what equals ${numWords(target).en}?`,
            },
            doneSpeak: stateEq(a, '+', firstPart, target),
            hint: { zh: `从 ${a} 往上数到 ${target}，数一数走了几步。`, en: `Count up from ${a} to ${target}. How many steps?` },
            revealParts: [0],
            focusPart: 0,
          },
          {
            prompt: { zh: `${b} 拿出 ${firstPart}，还剩几？`, en: `Take ${firstPart} out of ${b}. What remains?` },
            question: `${b} = ${firstPart} + ?`,
            answer: rest,
            equation: `${b} = ${firstPart} + ${rest}`,
            speak: {
              zh: `${numWords(b).zh}等于${numWords(firstPart).zh}加几？`,
              en: `${numWords(b).en} equals ${numWords(firstPart).en} plus what?`,
            },
            doneSpeak: {
              zh: `${numWords(b).zh}等于${numWords(firstPart).zh}加${numWords(rest).zh}`,
              en: `${numWords(b).en} equals ${numWords(firstPart).en} plus ${numWords(rest).en}.`,
            },
            hint: { zh: `可以算 ${b} − ${firstPart}。`, en: `Try ${b} minus ${firstPart}.` },
            revealParts: [1],
            focusPart: 1,
          },
          {
            prompt: { zh: `已经凑到 ${target}，再加 ${rest} 是几？`, en: `Now add ${rest} to ${target}.` },
            question: `${target} + ${rest} = ?`,
            answer: sum,
            equation: `${target} + ${rest} = ${sum}`,
            speak: askEq(target, '+', rest),
            doneSpeak: stateEq(target, '+', rest, sum),
            hint: { zh: `先看整十 ${target}，再往后数 ${rest} 个。`, en: `Start at ${target} and count on ${rest}.` },
            focusPart: 1,
          },
        ],
        answer: sum,
      });
    },
    explain: {
      zh: `把${b}分成${firstPart}和${rest}，${a}加${firstPart}等于${target}，再加${rest}等于${sum}`,
      en: `Split ${b} into ${firstPart} and ${rest}. ${a} plus ${firstPart} is ${target}, then add ${rest} to make ${sum}.`,
    },
    correctDelay: 2100,
    answerText: { zh: String(sum), en: String(sum) },
  };
}

function threeAddendRound() {
  const a = randInt(2, 8);
  const b = 10 - a;
  const c = randInt(1, 9);
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
        bi({ zh: `先找好朋友凑十：${a} + ${b} = 10，再加 ${c}`, en: `Make ten first: ${a} + ${b} = 10, then add ${c}` })));
    },
    explain: {
      zh: `${a}加${b}先凑成十，再加${c}，等于${numWords(sum).zh}`,
      en: `${a} plus ${b} makes ten. Add ${c}, and it equals ${numWords(sum).en}.`,
    },
    answerText: { zh: String(sum), en: String(sum) },
  };
}

export default {
  id: 'addition',
  levelCount: 7,
  rounds: (level) => ([3, 5, 6].includes(level) ? 5 : 8),
  levelHints: {
    1: { zh: '和 ≤ 5', en: 'Sums to 5' },
    2: { zh: '和 ≤ 10', en: 'Sums to 10' },
    3: { zh: '凑十法 · 分步互动', en: 'Make ten · solve each step' },
    4: { zh: '两位数 · 不进位', en: 'Two-digit · no carrying' },
    5: { zh: '两位数加一位数 · 分步进位', en: '2-digit + 1-digit · carrying' },
    6: { zh: '两位数加两位数 · 分步进位', en: '2-digit + 2-digit · carrying' },
    7: { zh: '三个数 · 先凑十', en: '3 addends · make ten first' },
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
      const [a, b] = makeTenOperands();
      return makeTenRound(a, b, 10);
    }
    if (level === 4) {
      const aTens = randInt(1, 7);
      const aOnes = randInt(0, 8);
      const bTens = randInt(1, 8 - aTens);
      const bOnes = randInt(0, 9 - aOnes);
      const a = aTens * 10 + aOnes;
      const b = bTens * 10 + bOnes;
      return sumRound(a, b, { useNumpad: true });
    }
    if (level === 5) {
      const [a, b, target] = nextTenCarryOperands();
      return makeTenRound(a, b, target);
    }
    if (level === 6) {
      const [a, b, target] = twoDigitCarryOperands();
      return makeTenRound(a, b, target);
    }
    return threeAddendRound();
  },
};
