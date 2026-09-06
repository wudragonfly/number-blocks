// subtraction.js — 减法: blocks hop away — how many are left?
import { renderBlockChar, renderTensOnes } from '../core/blocks.js';
import { renderStrategyDemo } from '../core/strategy.js';
import { el, bi } from '../core/ui.js';
import { askEq, stateEq, numWords } from '../core/i18n.js';
import { randInt, pickN, shuffle, numberChoices } from '../core/util.js';
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

// A genuine teen-number crossing-ten fact. Because b is larger than the ones
// part but smaller than ten, both 破十法 and 平十法 produce two positive parts.
function crossingTenOperands() {
  const a = randInt(11, 18);
  const b = randInt((a % 10) + 1, 9);
  return [a, b];
}

// Two two-digit numbers whose ones can be subtracted directly. Both parts of
// the subtrahend are positive, so the split is meaningful rather than "20 + 0".
function nonRegroupingOperands() {
  const aTens = randInt(2, 9);
  const aOnes = randInt(1, 9);
  const bTens = randInt(1, aTens - 1);
  const bOnes = randInt(1, aOnes);
  return [aTens * 10 + aOnes, bTens * 10 + bOnes];
}

// A genuine ones-column regroup: b is one digit and strictly larger than the
// minuend's ones digit, so borrowing a ten is necessary and never cosmetic.
function regroupingOperands() {
  const a = randInt(2, 8) * 10 + randInt(1, 8);
  const b = randInt((a % 10) + 1, 9);
  return [a, b];
}

// When a step asks for a whole-ten part, every option should be a whole ten.
// Otherwise the shape of the number gives the answer away before any thinking.
function wholeTenChoices(answer) {
  const lower = answer - 10;
  return shuffle(lower >= 10
    ? [lower, answer, answer + 10]
    : [answer, answer + 10, answer + 20]);
}

function placeValueSubRound(a, b) {
  const tensPart = Math.floor(b / 10) * 10;
  const onesPart = b % 10;
  const afterTens = a - tensPart;
  const diff = a - b;
  const correctSplit = `${tensPart} + ${onesPart}`;
  const splitChoices = shuffle([
    correctSplit,
    `${tensPart / 10} + ${onesPart}`,
    `${tensPart} + ${onesPart + 1}`,
  ]);

  return {
    prompt: `${a} − ${b} = ?`,
    speak: askEq(a, '-', b),
    completedPrompt: `${a} − ${b} = ${diff}`,
    completedSpeak: stateEq(a, '-', b, diff),
    autoSpeak: false,
    input: 'custom',
    answer: diff,
    board(boardEl, api) {
      renderStrategyDemo(boardEl, api, {
        method: { zh: '分步减法', en: 'Subtract in Parts' },
        splitLabel: { zh: `把 ${b} 拆成整十和个位`, en: `Split ${b} into tens and ones` },
        splitValue: b,
        splitParts: [tensPart, onesPart],
        steps: [
          {
            prompt: { zh: `${b} 应该拆成哪一组？`, en: `Which split correctly makes ${b}?` },
            question: `${b} = ? + ?`,
            answer: correctSplit,
            choices: splitChoices,
            equation: `${b} = ${correctSplit}`,
            speak: {
              zh: `${numWords(b).zh}等于多少个十加多少个一？`,
              en: `${numWords(b).en} equals how many tens plus how many ones?`,
            },
            doneSpeak: {
              zh: `${numWords(b).zh}等于${numWords(tensPart).zh}加${numWords(onesPart).zh}`,
              en: `${numWords(b).en} equals ${numWords(tensPart).en} plus ${numWords(onesPart).en}.`,
            },
            hint: { zh: `看看 ${b} 的十位和个位。`, en: `Look at the tens and ones digits in ${b}.` },
            revealParts: [0, 1],
          },
          {
            prompt: { zh: `先减去整十 ${tensPart}。`, en: `First subtract ${tensPart}.` },
            question: `${a} − ${tensPart} = ?`,
            answer: afterTens,
            equation: `${a} − ${tensPart} = ${afterTens}`,
            speak: askEq(a, '-', tensPart),
            doneSpeak: stateEq(a, '-', tensPart, afterTens),
            hint: { zh: `只改变十位，个位保持 ${a % 10}。`, en: `Change the tens; keep the ${a % 10} ones.` },
            focusPart: 0,
          },
          {
            prompt: { zh: `再减去个位 ${onesPart}。`, en: `Then subtract ${onesPart}.` },
            question: `${afterTens} − ${onesPart} = ?`,
            answer: diff,
            equation: `${afterTens} − ${onesPart} = ${diff}`,
            speak: askEq(afterTens, '-', onesPart),
            doneSpeak: stateEq(afterTens, '-', onesPart, diff),
            hint: { zh: `从 ${afterTens} 倒着数 ${onesPart} 个。`, en: `Count back ${onesPart} from ${afterTens}.` },
            focusPart: 1,
          },
        ],
        answer: diff,
      });
    },
    explain: {
      zh: `把${b}分成${tensPart}和${onesPart}，${a}先减${tensPart}等于${afterTens}，再减${onesPart}等于${diff}`,
      en: `Split ${b} into ${tensPart} and ${onesPart}. ${a} minus ${tensPart} is ${afterTens}, then subtract ${onesPart} to make ${diff}.`,
    },
    correctDelay: 2100,
    answerText: { zh: String(diff), en: String(diff) },
  };
}

function strategySubRound(a, b, kind) {
  const diff = a - b;
  const ones = a % 10;
  let method;
  let splitLabel;
  let splitValue;
  let splitParts;
  let initialVisibleParts = [];
  let steps;
  let explanation;

  if (kind === 'break-ten') {
    const fromTen = 10 - b;
    method = { zh: '破十法', en: 'Break Ten' };
    splitLabel = { zh: `把 ${a} 拆开`, en: `Split ${a}` };
    splitValue = a;
    splitParts = [10, ones];
    initialVisibleParts = [0];
    steps = [
      {
        prompt: { zh: `${a} 是 10 加几？`, en: `${a} is 10 plus what?` },
        question: `${a} = 10 + ?`,
        answer: ones,
        equation: `${a} = 10 + ${ones}`,
        speak: {
          zh: `${numWords(a).zh}可以分成十和几？`,
          en: `${numWords(a).en} can be split into ten and what?`,
        },
        doneSpeak: stateEq(10, '+', ones, a),
        hint: { zh: `遮住前面的 10，看看 ${a} 的个位。`, en: `Look at the ones digit in ${a}.` },
        revealParts: [1],
        focusPart: 1,
      },
      {
        prompt: { zh: `先从 10 里拿走 ${b}，剩几？`, en: `Take ${b} away from 10. What remains?` },
        question: `10 − ${b} = ?`,
        answer: fromTen,
        equation: `10 − ${b} = ${fromTen}`,
        speak: askEq(10, '-', b),
        doneSpeak: stateEq(10, '-', b, fromTen),
        hint: { zh: `从 10 倒着数 ${b} 个。`, en: `Count back ${b} from 10.` },
        focusPart: 0,
      },
      {
        prompt: { zh: `把剩下的 ${fromTen} 和 ${ones} 合起来。`, en: `Join ${fromTen} and ${ones}.` },
        question: `${fromTen} + ${ones} = ?`,
        answer: diff,
        equation: `${fromTen} + ${ones} = ${diff}`,
        speak: askEq(fromTen, '+', ones),
        doneSpeak: stateEq(fromTen, '+', ones, diff),
        hint: { zh: `从 ${fromTen} 往后数 ${ones} 个。`, en: `Count on ${ones} from ${fromTen}.` },
        focusPart: 1,
      },
    ];
    explanation = {
      zh: `把${a}分成十和${ones}，十减${b}等于${fromTen}，再加${ones}等于${diff}`,
      en: `Split ${a} into ten and ${ones}. Ten minus ${b} is ${fromTen}, then add ${ones} to make ${diff}.`,
    };
  } else if (kind === 'flat-ten') {
    const rest = b - ones;
    const target = a - ones;
    method = { zh: '平十法', en: 'Bridge to Ten' };
    splitLabel = { zh: `把 ${b} 拆开`, en: `Split ${b}` };
    splitValue = b;
    splitParts = [ones, rest];
    steps = [
      {
        prompt: { zh: `${a} 先减几正好到 ${target}？`, en: `What should ${a} subtract to reach ${target}?` },
        question: `${a} − ? = ${target}`,
        answer: ones,
        equation: `${a} − ${ones} = ${target}`,
        speak: {
          zh: `${numWords(a).zh}减几等于${numWords(target).zh}？`,
          en: `${numWords(a).en} minus what equals ${numWords(target).en}?`,
        },
        doneSpeak: stateEq(a, '-', ones, target),
        hint: { zh: `从 ${a} 倒着数到 ${target}，数一数走了几步。`, en: `Count back from ${a} to ${target}. How many steps?` },
        revealParts: [0],
        focusPart: 0,
      },
      {
        prompt: { zh: `${b} 拿出 ${ones}，还剩几要减？`, en: `Take ${ones} out of ${b}. What remains?` },
        question: `${b} = ${ones} + ?`,
        answer: rest,
        equation: `${b} = ${ones} + ${rest}`,
        speak: {
          zh: `${numWords(b).zh}可以分成${numWords(ones).zh}和几？`,
          en: `${numWords(b).en} can be split into ${numWords(ones).en} and what?`,
        },
        doneSpeak: stateEq(ones, '+', rest, b),
        hint: { zh: `可以算 ${b} − ${ones}。`, en: `Try ${b} minus ${ones}.` },
        revealParts: [1],
        focusPart: 1,
      },
      {
        prompt: { zh: `已经到 ${target}，再减 ${rest} 是几？`, en: `Now subtract ${rest} from ${target}.` },
        question: `${target} − ${rest} = ?`,
        answer: diff,
        equation: `${target} − ${rest} = ${diff}`,
        speak: askEq(target, '-', rest),
        doneSpeak: stateEq(target, '-', rest, diff),
        hint: { zh: `从 ${target} 倒着数 ${rest} 个。`, en: `Count back ${rest} from ${target}.` },
        focusPart: 1,
      },
    ];
    explanation = {
      zh: `把${b}分成${ones}和${rest}，${a}先减${ones}到${target}，再减${rest}等于${diff}`,
      en: `Split ${b} into ${ones} and ${rest}. Subtract ${ones} from ${a} to reach ${target}, then subtract ${rest} to make ${diff}.`,
    };
  } else if (kind === 'break-ten-place') {
    const target = a - ones;
    const baseTens = target - 10;
    const fromTen = 10 - b;
    const tailResult = fromTen + ones;
    method = { zh: '破十法', en: 'Break a Ten' };
    splitLabel = { zh: `从 ${a} 里分出一个十`, en: `Break one ten out of ${a}` };
    splitValue = a;
    splitParts = [baseTens, 10, ones];
    initialVisibleParts = [1, 2];
    steps = [
      {
        prompt: { zh: `分出 10 和 ${ones} 个一，还剩多少整十？`, en: `Set aside 10 and ${ones} ones. How many tens remain?` },
        question: `${a} = ? + 10 + ${ones}`,
        answer: baseTens,
        choices: wholeTenChoices(baseTens),
        equation: `${a} = ${baseTens} + 10 + ${ones}`,
        speak: {
          zh: `${numWords(a).zh}等于几加十再加${numWords(ones).zh}？`,
          en: `${numWords(a).en} equals what plus ten plus ${numWords(ones).en}?`,
        },
        doneSpeak: {
          zh: `${numWords(a).zh}等于${numWords(baseTens).zh}加十再加${numWords(ones).zh}`,
          en: `${numWords(a).en} equals ${numWords(baseTens).en} plus ten plus ${numWords(ones).en}.`,
        },
        hint: { zh: `${target} 少一个十是多少？`, en: `What is ${target} minus one ten?` },
        revealParts: [0],
        focusPart: 0,
      },
      {
        prompt: { zh: `用分出的 10 减 ${b}。`, en: `Subtract ${b} from the ten you broke out.` },
        question: `10 − ${b} = ?`,
        answer: fromTen,
        equation: `10 − ${b} = ${fromTen}`,
        speak: askEq(10, '-', b),
        doneSpeak: stateEq(10, '-', b, fromTen),
        hint: { zh: `从 10 倒着数 ${b} 个。`, en: `Count back ${b} from 10.` },
        focusPart: 1,
      },
      {
        prompt: { zh: `把剩下的 ${fromTen} 和原来的 ${ones} 个一合起来。`, en: `Join the remaining ${fromTen} with the original ${ones} ones.` },
        question: `${fromTen} + ${ones} = ?`,
        answer: tailResult,
        equation: `${fromTen} + ${ones} = ${tailResult}`,
        speak: askEq(fromTen, '+', ones),
        doneSpeak: stateEq(fromTen, '+', ones, tailResult),
        hint: { zh: `从 ${fromTen} 往后数 ${ones} 个。`, en: `Count on ${ones} from ${fromTen}.` },
        focusPart: 2,
      },
      {
        prompt: { zh: `最后把 ${baseTens} 和 ${tailResult} 合起来。`, en: `Finally join ${baseTens} and ${tailResult}.` },
        question: `${baseTens} + ${tailResult} = ?`,
        answer: diff,
        equation: `${baseTens} + ${tailResult} = ${diff}`,
        speak: askEq(baseTens, '+', tailResult),
        doneSpeak: stateEq(baseTens, '+', tailResult, diff),
        hint: { zh: `保留 ${baseTens}，再加 ${tailResult}。`, en: `Keep ${baseTens}, then add ${tailResult}.` },
        focusPart: 0,
      },
    ];
    explanation = {
      zh: `把${a}分成${baseTens}、十和${ones}，十减${b}等于${fromTen}，加上${ones}再和${baseTens}合起来等于${diff}`,
      en: `Split ${a} into ${baseTens}, ten, and ${ones}. Ten minus ${b} is ${fromTen}; join the remaining parts to make ${diff}.`,
    };
  } else {
    const fullTens = Math.floor(a / 10) * 10;
    const baseTens = Math.floor(a / 10) * 10 - 10;
    const regrouped = ones + 10;
    const onesResult = regrouped - b;
    method = { zh: '借十法', en: 'Regroup a Ten' };
    splitLabel = { zh: `借一个十，拆开 ${a}`, en: `Regroup ${a}` };
    splitValue = a;
    splitParts = [baseTens, regrouped];
    steps = [
      {
        prompt: { zh: `从 ${fullTens} 里借走一个十，还剩多少整十？`, en: `Borrow one ten from ${fullTens}. What remains?` },
        question: `${fullTens} − 10 = ?`,
        answer: baseTens,
        choices: wholeTenChoices(baseTens),
        equation: `${fullTens} − 10 = ${baseTens}`,
        speak: askEq(fullTens, '-', 10),
        doneSpeak: stateEq(fullTens, '-', 10, baseTens),
        hint: { zh: `少一个十，就是少 10。`, en: `One fewer ten means subtract 10.` },
        revealParts: [0],
        focusPart: 0,
      },
      {
        prompt: { zh: `把借来的 10 放到 ${ones} 个一里，现在有几个一？`, en: `Add the borrowed ten to ${ones} ones.` },
        question: `${ones} + 10 = ?`,
        answer: regrouped,
        equation: `${ones} + 10 = ${regrouped}`,
        speak: askEq(ones, '+', 10),
        doneSpeak: stateEq(ones, '+', 10, regrouped),
        hint: { zh: `在 ${ones} 前面添一个十。`, en: `Add ten to ${ones}.` },
        revealParts: [1],
        focusPart: 1,
      },
      {
        prompt: { zh: `现在从 ${regrouped} 个一里减 ${b}。`, en: `Now subtract ${b} from ${regrouped} ones.` },
        question: `${regrouped} − ${b} = ?`,
        answer: onesResult,
        equation: `${regrouped} − ${b} = ${onesResult}`,
        speak: askEq(regrouped, '-', b),
        doneSpeak: stateEq(regrouped, '-', b, onesResult),
        hint: { zh: `从 ${regrouped} 倒着数 ${b} 个。`, en: `Count back ${b} from ${regrouped}.` },
        focusPart: 1,
      },
      {
        prompt: { zh: `把 ${baseTens} 和剩下的 ${onesResult} 合起来。`, en: `Join ${baseTens} and ${onesResult}.` },
        question: `${baseTens} + ${onesResult} = ?`,
        answer: diff,
        equation: `${baseTens} + ${onesResult} = ${diff}`,
        speak: askEq(baseTens, '+', onesResult),
        doneSpeak: stateEq(baseTens, '+', onesResult, diff),
        hint: { zh: `整十是 ${baseTens}，个位是 ${onesResult}。`, en: `Keep ${baseTens}, then add the remaining ${onesResult}.` },
        focusPart: 0,
      },
    ];
    explanation = {
      zh: `把${a}退一个十，分成${baseTens}和${regrouped}，${regrouped}减${b}等于${onesResult}，再加${baseTens}等于${diff}`,
      en: `Regroup ${a} as ${baseTens} and ${regrouped}. ${regrouped} minus ${b} is ${onesResult}, then add ${baseTens} to make ${diff}.`,
    };
  }

  return {
    prompt: `${a} − ${b} = ?`,
    speak: askEq(a, '-', b),
    completedPrompt: `${a} − ${b} = ${diff}`,
    completedSpeak: stateEq(a, '-', b, diff),
    autoSpeak: false,
    input: 'custom',
    answer: diff,
    board(boardEl, api) {
      renderStrategyDemo(boardEl, api, {
        method,
        splitLabel,
        splitValue,
        splitParts,
        initialVisibleParts,
        steps,
        answer: diff,
      });
    },
    explain: explanation,
    correctDelay: 2100,
    answerText: { zh: String(diff), en: String(diff) },
  };
}

export default {
  id: 'subtraction',
  levelCount: 8,
  rounds: (level) => ([3, 4, 5, 6, 7, 8].includes(level) ? 5 : 8),
  levelHints: {
    1: { zh: '5以内', en: 'Within 5' },
    2: { zh: '10以内', en: 'Within 10' },
    3: { zh: '20以内 · 破十法', en: 'Within 20 · break ten' },
    4: { zh: '20以内 · 平十法', en: 'Within 20 · bridge to ten' },
    5: { zh: '两位数不退位 · 分步互动', en: 'No regrouping · solve in parts' },
    6: { zh: '两位数退位 · 借十法', en: 'Two-digit · regroup a ten' },
    7: { zh: '两位数退位 · 破十法', en: 'Two-digit · break a ten' },
    8: { zh: '两位数退位 · 平十法', en: 'Two-digit · bridge to ten' },
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
      const [a, b] = crossingTenOperands();
      return strategySubRound(a, b, 'break-ten');
    }
    if (level === 4) {
      const [a, b] = crossingTenOperands();
      return strategySubRound(a, b, 'flat-ten');
    }
    if (level === 5) {
      const [a, b] = nonRegroupingOperands();
      return placeValueSubRound(a, b);
    }
    if (level === 6) {
      const [a, b] = regroupingOperands();
      return strategySubRound(a, b, 'regroup');
    }
    if (level === 7) {
      const [a, b] = regroupingOperands();
      return strategySubRound(a, b, 'break-ten-place');
    }
    const [a, b] = regroupingOperands();
    return strategySubRound(a, b, 'flat-ten');
  },
};
