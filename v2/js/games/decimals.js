// decimals.js — 小数·百分数: the hundred-grid links fractions ↔ decimals ↔ percent.
import { el, bi, fracEl } from '../core/ui.js';
import { fracBar, hundredGrid, numberLine } from '../core/shapes.js';
import { decWords, pctWords, fracWords, numWords } from '../core/i18n.js';
import { randInt, pick, pickN, shuffle } from '../core/util.js';

const PINK = '#ec008c';

// [num, den, decimal, percent]
const TRIPLES = [
  [1, 2, 0.5, 50], [1, 4, 0.25, 25], [3, 4, 0.75, 75], [1, 5, 0.2, 20],
  [2, 5, 0.4, 40], [3, 5, 0.6, 60], [1, 10, 0.1, 10], [3, 10, 0.3, 30],
  [7, 10, 0.7, 70], [9, 10, 0.9, 90],
];

function tenthsRound() {
  const s = randInt(1, 9);
  const useLine = pick([true, false]);
  const answer = `0.${s}`;
  const wrongPool = [...new Set([`0.${s === 9 ? 1 : s + 1}`, `0.${s === 1 ? 9 : s - 1}`, `${s}`, `0.0${s}`])];
  return {
    prompt: useLine
      ? { zh: '箭头指的是哪个小数？', en: 'What decimal is the arrow pointing to?' }
      : { zh: '涂色部分是哪个小数？', en: 'What decimal is shaded?' },
    speak: useLine
      ? { zh: '箭头指的是哪个小数？', en: 'What decimal is the arrow pointing to?' }
      : { zh: '涂色部分是哪个小数？', en: 'What decimal is shaded?' },
    choices: shuffle([answer, ...pickN(wrongPool.filter((v) => v !== answer), 2)]).map((v) => ({ value: v })),
    answer,
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' },
        useLine
          ? numberLine({ max: 1, ticks: 10, mark: s / 10, labelEvery: 5 })
          : fracBar(10, s, { width: 460, height: 60, color: PINK }),
        el('div', { class: 'board-note' },
          bi({ zh: '一共10份，每份是0.1', en: '10 parts — each part is 0.1' }))
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `数一数：有 ${s} 份`, en: `Count: there are ${s} parts` })));
    },
    explain: decWords(s / 10),
    answerText: { zh: answer, en: answer },
  };
}

function hundredthsRound(asPercent) {
  const c = pick([randInt(5, 95), pick([25, 50, 75, 10, 30])]);
  const answer = asPercent ? `${c}%` : String(c / 100);
  const mk = (v) => (asPercent ? `${v}%` : String(v / 100));
  const wrongs = [...new Set([mk(c + 10), mk(Math.max(1, c - 10)), mk(c + 1), mk(Math.max(1, c - 1)), asPercent ? `0.${c}%` : String(c / 10)])]
    .filter((v) => v !== answer);
  return {
    prompt: asPercent
      ? { zh: '涂色部分是百分之几？', en: 'What percent is shaded?' }
      : { zh: '涂色部分是哪个小数？', en: 'What decimal is shaded?' },
    speak: asPercent
      ? { zh: '一百个小格子里，涂色的占百分之几？', en: 'Out of one hundred little squares, what percent is shaded?' }
      : { zh: '一百个小格子里，涂色部分是哪个小数？', en: 'What decimal of the hundred squares is shaded?' },
    choices: shuffle([answer, ...pickN(wrongs, 2)]).map((v) => ({ value: v })),
    answer,
    board(boardEl) {
      const grid = hundredGrid(c, { cellPx: 22, color: PINK });
      boardEl.appendChild(el('div', { class: 'board-col' }, grid.el));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `涂了 ${c} 个格子，一共 100 个`, en: `${c} squares shaded out of 100` })));
    },
    explain: asPercent ? pctWords(c) : decWords(c / 100),
    answerText: { zh: answer, en: answer },
  };
}

function shadeGridRound() {
  const target = pick([randInt(2, 9) * 10, pick([25, 45, 62, 38, 55, 73])]);
  const asPct = pick([true, false]);
  const label = asPct ? `${target}%` : String(target / 100);
  return {
    prompt: { zh: `涂出 ${label}！`, en: `Shade ${label}!` },
    speak: asPct
      ? { zh: `请涂出${pctWords(target).zh}`, en: `Shade ${pctWords(target).en}` }
      : { zh: `请涂出${decWords(target / 100).zh}`, en: `Shade ${decWords(target / 100).en}` },
    input: 'custom',
    answer: target,
    board(boardEl, api) {
      const grid = hundredGrid(0, { cellPx: 20, color: PINK });
      let count = 0;
      const counter = el('span', { class: 'shade-count' }, '0');
      const set = (v) => {
        count = Math.max(0, Math.min(100, v));
        grid.setShaded(count);
        counter.textContent = String(count);
        api.sfx.tap();
      };
      const btn = (txt, d) => el('button', { class: 'shade-btn', onClick: () => set(count + d) }, txt);
      const checkBtn = el('button', { class: 'big-btn green', onClick: () => { if (!api.isLocked()) api.submit(count, null); } },
        '✓ ', bi({ zh: '好了！', en: 'Done!' }));
      boardEl.appendChild(el('div', { class: 'board-col' },
        grid.el,
        el('div', { class: 'shade-controls' },
          btn('−10', -10), btn('−1', -1), counter, btn('+1', 1), btn('+10', 10), checkBtn)
      ));
    },
    hint(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `${label} 就是 100 格里的 ${target} 格`, en: `${label} means ${target} out of 100 squares` })));
    },
    reveal(boardEl) {
      boardEl.querySelectorAll('.hg-cell').forEach((cell, i) => cell.classList.toggle('shaded', i < target));
    },
    explain: { zh: `${label}是100份里的${numWords(target).zh}份`, en: `${label} is ${numWords(target).en} out of one hundred` },
    answerText: { zh: label, en: label },
  };
}

function tripleRound() {
  const [n, d, dec, pct] = pick(TRIPLES);
  const forms = ['frac', 'dec', 'pct'];
  const given = pick(forms);
  const asked = pick(forms.filter((f) => f !== given));
  const fmt = {
    frac: { label: () => fracEl(n, d), text: `${n}/${d}`, words: fracWords(n, d) },
    dec: { label: () => String(dec), text: String(dec), words: decWords(dec) },
    pct: { label: () => `${pct}%`, text: `${pct}%`, words: pctWords(pct) },
  };
  const others = pickN(TRIPLES.filter((t) => t[3] !== pct), 2);
  const wrongVal = (t) => (asked === 'frac' ? `${t[0]}/${t[1]}` : asked === 'dec' ? String(t[2]) : `${t[3]}%`);
  const wrongLabel = (t) => (asked === 'frac' ? fracEl(t[0], t[1]) : wrongVal(t));
  const answer = fmt[asked].text;
  return {
    prompt: { zh: `${fmt[given].text} 等于哪个？`, en: `Which one equals ${fmt[given].text}?` },
    speak: { zh: `${fmt[given].words.zh}等于哪个？`, en: `Which one equals ${fmt[given].words.en}?` },
    choices: shuffle([
      { value: answer, label: fmt[asked].label() },
      ...others.map((t) => ({ value: wrongVal(t), label: wrongLabel(t) })),
    ]),
    answer,
    board(boardEl) {
      const shaded = Math.round(dec * 100);
      boardEl.appendChild(el('div', { class: 'board-col' },
        hundredGrid(shaded, { cellPx: 18, color: PINK }).el,
        el('div', { class: 'board-note' },
          bi({ zh: '同一个大小，三种写法！', en: 'Same amount — three ways to write it!' }))
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `图里涂了 ${Math.round(dec * 100)} / 100`, en: `The grid shows ${Math.round(dec * 100)} out of 100` })));
    },
    explain: {
      zh: `${fmt[given].words.zh}等于${fmt[asked].words.zh}`,
      en: `${fmt[given].words.en} equals ${fmt[asked].words.en}`,
    },
    answerText: { zh: answer, en: answer },
  };
}

function compareDecRound() {
  const pairs = [[0.35, 0.4], [0.7, 0.65], [0.09, 0.2], [0.5, 0.45], [0.8, 0.08], [0.3, 0.29]];
  const [x, y] = pick(pairs);
  const bigger = Math.max(x, y);
  const cards = shuffle([x, y]);
  return {
    prompt: { zh: '哪个小数大？点一点！', en: 'Which decimal is bigger? Tap it!' },
    speak: { zh: '哪个小数大？', en: 'Which decimal is bigger?' },
    input: 'custom',
    answer: String(bigger),
    board(boardEl, api) {
      const row = el('div', { class: 'compare-row' });
      for (const v of cards) {
        const grid = hundredGrid(Math.round(v * 100), { cellPx: 13, color: PINK });
        const card = el('button', { class: 'compare-card' }, grid.el, String(v));
        card.addEventListener('click', () => {
          if (api.isLocked()) return;
          card.classList.add(v === bigger ? 'picked-right' : 'picked-wrong');
          api.submit(String(v), null);
        });
        row.appendChild(card);
      }
      boardEl.appendChild(row);
    },
    hint(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: '看格子：谁涂得多？', en: 'Look at the grids — which has more shaded?' })));
    },
    explain: { zh: `${decWords(bigger).zh}更大`, en: `${decWords(bigger).en} is bigger` },
    answerText: { zh: String(bigger), en: String(bigger) },
  };
}

function pctOfRound({ useNumpad = false } = {}) {
  const combos = [
    [50, () => randInt(1, 12) * 2], [25, () => randInt(1, 6) * 4], [10, () => randInt(1, 10) * 10],
    [20, () => randInt(1, 8) * 5], [75, () => randInt(1, 5) * 4],
  ];
  const [pct, gen] = pick(combos);
  const n = gen();
  const answer = (n * pct) / 100;
  const hints = {
    50: { zh: '50% 就是一半', en: '50% means one half' },
    25: { zh: '25% 就是四分之一', en: '25% means one quarter' },
    10: { zh: '10% 就是十分之一', en: '10% means one tenth' },
    20: { zh: '20% 就是五分之一', en: '20% means one fifth' },
    75: { zh: '75% 是四分之三', en: '75% means three quarters' },
  };
  return {
    prompt: { zh: `${n} 的 ${pct}% 是多少？`, en: `What is ${pct}% of ${n}?` },
    speak: {
      zh: `${numWords(n).zh}的${pctWords(pct).zh}是多少？`,
      en: `What is ${pctWords(pct).en} of ${numWords(n).en}?`,
    },
    input: useNumpad ? 'numpad' : 'choices',
    choices: useNumpad ? undefined : shuffle([
      answer,
      ...pickN([...new Set([answer + pct / 10, Math.max(1, answer - pct / 10), answer * 2, Math.round(answer / 2), n - answer].map(Math.round).filter((v) => v > 0 && v !== answer))], 2),
    ]).map((v) => ({ value: v })),
    answer,
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' },
        hundredGrid(pct, { cellPx: 18, color: PINK }).el,
        el('div', { class: 'board-note' },
          bi({ zh: `把 ${n} 看成 100 格`, en: `Imagine ${n} split into 100 squares` }))
      ));
    },
    hint(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' }, bi(hints[pct])));
    },
    explain: {
      zh: `${numWords(n).zh}的${pctWords(pct).zh}是${numWords(answer).zh}`,
      en: `${pctWords(pct).en} of ${numWords(n).en} is ${numWords(answer).en}`,
    },
    answerText: { zh: String(answer), en: String(answer) },
  };
}

function decAddRound() {
  const x = randInt(1, 8);
  const y = randInt(1, Math.min(9, 10 - x));
  const sum = (x + y) / 10;
  const answer = sum === 1 ? '1' : String(sum);
  const wrongs = [...new Set([`0.${x + y}`, String((x + y) / 100), `1.${x + y - 10 >= 0 ? x + y - 10 : x + y}`, `0.${Math.abs(x - y) || 2}`])]
    .filter((v) => v !== answer && Number(v) !== sum);
  return {
    prompt: { zh: `0.${x} + 0.${y} = ?`, en: `0.${x} + 0.${y} = ?` },
    speak: {
      zh: `${decWords(x / 10).zh}加${decWords(y / 10).zh}等于几？`,
      en: `What is ${decWords(x / 10).en} plus ${decWords(y / 10).en}?`,
    },
    choices: shuffle([answer, ...pickN(wrongs, 2)]).map((v) => ({ value: v })),
    answer,
    board(boardEl) {
      const bar = fracBar(10, x, { width: 440, height: 58, color: PINK });
      const segs = bar.querySelectorAll('.frac-seg');
      for (let i = x; i < x + y; i++) {
        segs[i]?.classList.add('shaded');
        if (segs[i]) segs[i].style.background = '#f7941d';
      }
      boardEl.appendChild(el('div', { class: 'board-col' },
        bar,
        el('div', { class: 'board-note' },
          bi({ zh: `粉色 0.${x} + 橙色 0.${y}`, en: `Pink 0.${x} + orange 0.${y}` }))
      ));
    },
    hint(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `${x} 份加 ${y} 份，共 ${x + y} 份（每份0.1）`, en: `${x} tenths + ${y} tenths = ${x + y} tenths` })));
    },
    explain: { zh: `等于${decWords(sum).zh}`, en: `It equals ${decWords(sum).en}` },
    answerText: { zh: answer, en: answer },
  };
}

export default {
  id: 'decimals',
  rounds: 8,
  levelHints: {
    1: { zh: '十分之几 · 0.1到0.9', en: 'Tenths · 0.1 to 0.9' },
    2: { zh: '百格图 · 百分数', en: 'Hundred-grid · percent' },
    3: { zh: '分数=小数=百分数', en: 'Fraction = decimal = percent' },
    4: { zh: '比大小 · 求百分之几', en: 'Compare · percent of' },
    5: { zh: '小数加法 · 百分数应用', en: 'Decimal sums · percent problems' },
  },
  celebrants: () => pickN([10, 5, 2, 4, 8], 3),
  makeRound(level) {
    if (level === 1) return tenthsRound();
    if (level === 2) return pick([() => hundredthsRound(false), () => hundredthsRound(true), shadeGridRound])();
    if (level === 3) return tripleRound();
    if (level === 4) return pick([compareDecRound, () => pctOfRound()])();
    return pick([decAddRound, () => pctOfRound({ useNumpad: true }), decAddRound])();
  },
};
