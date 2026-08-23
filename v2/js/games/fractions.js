// fractions.js — 分数: bars, pies and sets; shade, identify, compare, add.
import { el, bi, fracEl, mixedEl } from '../core/ui.js';
import { fracBar, fracPie } from '../core/shapes.js';
import { renderBlockChar } from '../core/blocks.js';
import { fracWords, mixedWords, numWords } from '../core/i18n.js';
import { randInt, pick, pickN, shuffle } from '../core/util.js';

const PURPLE = '#8e5bd1';
const key = (n, d) => `${n}/${d}`;

function fracChoices(num, den, makeWrong) {
  const seen = new Set([key(num, den)]);
  const out = [{ value: key(num, den), label: fracEl(num, den), say: fracWords(num, den) }];
  let guard = 0;
  while (out.length < 3 && guard++ < 40) {
    const [n, d] = makeWrong();
    if (n < 1 || d < 2 || n > d) continue;
    const k = key(n, d);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ value: k, label: fracEl(n, d), say: fracWords(n, d) });
  }
  return shuffle(out);
}

function modelFor(num, den, big = true) {
  if (den <= 8 && pick([true, false])) return fracPie(den, num, { size: big ? 170 : 120, color: PURPLE });
  return fracBar(den, num, { width: big ? 440 : 320, height: 60, color: PURPLE });
}

function identifyRound(num, den) {
  const w = fracWords(num, den);
  return {
    prompt: { zh: '涂色部分是几分之几？', en: 'What fraction is shaded?' },
    speak: { zh: '涂色部分是几分之几？', en: 'What fraction is shaded?' },
    choices: fracChoices(num, den, () => pick([
      [den - num, den], [num, den + 1], [num + 1, den], [Math.max(1, num - 1), den], [num, den - 1],
    ])),
    answer: key(num, den),
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' }, modelFor(num, den)));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.querySelector('.board-col')?.appendChild(
        el('div', { class: 'board-note anim-pop' },
          bi({ zh: `一共 ${den} 份，涂了 ${num} 份`, en: `${den} parts in all — ${num} are shaded` })));
    },
    explain: { zh: `是${w.zh}`, en: `It is ${w.en}` },
    answerText: { zh: `${num}/${den}`, en: `${num}/${den}` },
  };
}

function shadeRound(num, den) {
  const w = fracWords(num, den);
  return {
    prompt: { zh: `涂出 ${num}/${den}！`, en: `Shade ${num}/${den}!` },
    speak: { zh: `请涂出${w.zh}！`, en: `Shade ${w.en}!` },
    input: 'custom',
    answer: num,
    board(boardEl, api) {
      const bar = fracBar(den, 0, { width: 460, height: 72, color: PURPLE, interactive: true });
      const checkBtn = el('button', { class: 'big-btn green' }, '✓ ', bi({ zh: '好了！', en: 'Done!' }));
      checkBtn.addEventListener('click', () => {
        if (api.isLocked()) return;
        api.submit(bar.getShaded(), null);
      });
      boardEl.appendChild(el('div', { class: 'board-col' },
        bar,
        el('div', { class: 'board-note' }, bi({ zh: '点一点涂颜色', en: 'Tap segments to shade them' })),
        checkBtn
      ));
    },
    hint(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: `分母 ${den} 是总份数，分子 ${num} 是要涂的份数`, en: `The ${den} on the bottom is total parts; shade ${num} of them` })));
    },
    reveal(boardEl) {
      const segs = boardEl.querySelectorAll('.frac-seg');
      segs.forEach((s, i) => {
        s.classList.toggle('shaded', i < num);
        s.setAttribute('disabled', 'true');
      });
    },
    explain: { zh: `${w.zh}是${den}份里的${num}份`, en: `${w.en} means ${num} out of ${den} parts` },
    answerText: { zh: `${num}/${den}`, en: `${num}/${den}` },
  };
}

function compareRound(n1, d1, n2, d2) {
  const bigger = n1 / d1 > n2 / d2 ? key(n1, d1) : key(n2, d2);
  const cards = shuffle([[n1, d1], [n2, d2]]);
  return {
    prompt: { zh: '哪个分数大？点一点！', en: 'Which fraction is bigger? Tap it!' },
    speak: { zh: '哪个分数大？', en: 'Which fraction is bigger?' },
    input: 'custom',
    answer: bigger,
    board(boardEl, api) {
      const row = el('div', { class: 'compare-row' });
      for (const [n, d] of cards) {
        const card = el('button', { class: 'compare-card' },
          fracPie(d, n, { size: 130, color: PURPLE }),
          fracEl(n, d)
        );
        card.addEventListener('click', () => {
          if (api.isLocked()) return;
          card.classList.add(key(n, d) === bigger ? 'picked-right' : 'picked-wrong');
          api.submit(key(n, d), null);
        });
        row.appendChild(card);
      }
      boardEl.appendChild(row);
    },
    hint(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: '看看哪个涂色部分更大！', en: 'Look at which shaded part is larger!' })));
    },
    explain: (() => {
      const [bn, bd] = bigger.split('/').map(Number);
      const w = fracWords(bn, bd);
      return { zh: `${w.zh}更大`, en: `${w.en} is bigger` };
    })(),
    answerText: { zh: bigger, en: bigger },
  };
}

function equivalentRound() {
  const base = pick([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5]]);
  const m = randInt(2, 3);
  const [n, d] = base;
  const target = [n * m, d * m];
  return {
    prompt: { zh: '哪个和它相等？', en: 'Which one is equal?' },
    speak: {
      zh: `哪个分数和${fracWords(n, d).zh}相等？`,
      en: `Which fraction equals ${fracWords(n, d).en}?`,
    },
    choices: fracChoices(target[0], target[1], () => pick([
      [n * m + 1, d * m], [n * m - 1, d * m], [n * m, d * m + 1], [n + 1, d * m], [n * m, d * m - 1],
    ])),
    answer: key(target[0], target[1]),
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' },
        el('div', { class: 'board-row' },
          el('div', { class: 'board-col', style: { gap: '6px' } },
            fracBar(d, n, { width: 330, height: 52, color: PURPLE }),
            fracEl(n, d)
          )
        ),
        el('div', { class: 'board-note' }, bi({ zh: '找一个一样大的分数', en: 'Find a fraction the same size' }))
      ));
    },
    hint(boardEl) {
      const [tn, td] = target;
      boardEl.appendChild(el('div', { class: 'board-col anim-pop', style: { gap: '6px' } },
        fracBar(td, tn, { width: 330, height: 52, color: '#f7941d' })));
    },
    explain: {
      zh: `${fracWords(n, d).zh}等于${fracWords(target[0], target[1]).zh}`,
      en: `${fracWords(n, d).en} equals ${fracWords(target[0], target[1]).en}`,
    },
    answerText: { zh: key(target[0], target[1]), en: key(target[0], target[1]) },
  };
}

function ofSetRound() {
  const d = pick([2, 3, 4]);
  const per = randInt(2, 4);
  const n = d * per;
  return {
    prompt: { zh: `${n} 个的 1/${d} 是几个？`, en: `What is 1/${d} of ${n}?` },
    speak: {
      zh: `${numWords(n).zh}个方块的${fracWords(1, d).zh}是几个？`,
      en: `What is ${fracWords(1, d).en} of ${numWords(n).en} blocks?`,
    },
    choices: shuffle([
      per,
      ...pickN([...new Set([per + 1, Math.max(1, per - 1), per + 2, d].filter((v) => v !== per))], 2),
    ]).map((v) => ({ value: v })),
    answer: per,
    board(boardEl) {
      const row = el('div', { class: 'board-row' });
      for (let g = 0; g < d; g++) {
        row.appendChild(renderBlockChar(per, { size: 32, colorOf: g === 0 ? 7 : 9, say: false }));
      }
      boardEl.appendChild(el('div', { class: 'board-col' },
        row,
        el('div', { class: 'board-note' }, bi({ zh: `${n} 个分成 ${d} 组`, en: `${n} split into ${d} groups` }))
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: '彩色的那一组就是答案！', en: 'The colorful group is the answer!' })));
    },
    explain: {
      zh: `${numWords(n).zh}的${fracWords(1, d).zh}是${numWords(per).zh}`,
      en: `${fracWords(1, d).en} of ${numWords(n).en} is ${numWords(per).en}`,
    },
    answerText: { zh: String(per), en: String(per) },
  };
}

function addRound() {
  const d = pick([4, 5, 6, 8]);
  const a = randInt(1, d - 2);
  const b = randInt(1, d - a - 1);
  const sum = a + b;
  return {
    prompt: { zh: `${a}/${d} + ${b}/${d} = ?`, en: `${a}/${d} + ${b}/${d} = ?` },
    speak: {
      zh: `${fracWords(a, d).zh}加${fracWords(b, d).zh}等于几分之几？`,
      en: `What is ${fracWords(a, d).en} plus ${fracWords(b, d).en}?`,
    },
    choices: fracChoices(sum, d, () => pick([
      [sum + 1, d], [Math.max(1, sum - 1), d], [sum, d + d], [a * b === sum ? sum + 2 : a * b, d],
    ])),
    answer: key(sum, d),
    board(boardEl) {
      const bar = fracBar(d, a, { width: 440, height: 64, color: PURPLE });
      const segs = bar.querySelectorAll('.frac-seg');
      for (let i = a; i < a + b; i++) {
        segs[i]?.classList.add('shaded');
        if (segs[i]) segs[i].style.background = '#f7941d';
      }
      boardEl.appendChild(el('div', { class: 'board-col' },
        bar,
        el('div', { class: 'board-note' },
          bi({ zh: `紫色 ${a} 份 + 橙色 ${b} 份`, en: `${a} purple parts + ${b} orange parts` }))
      ));
    },
    hint(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-note anim-pop' },
        bi({ zh: '分母不变，分子相加！', en: 'Same denominator — just add the tops!' })));
    },
    explain: {
      zh: `等于${fracWords(sum, d).zh}`,
      en: `It equals ${fracWords(sum, d).en}`,
    },
    answerText: { zh: key(sum, d), en: key(sum, d) },
  };
}

function mixedRound() {
  const d = pick([2, 3, 4]);
  const whole = 1;
  const rem = randInt(1, d - 1);
  const improper = d * whole + rem;
  const w = mixedWords(whole, rem, d);
  const wrong = () => pick([
    [whole, Math.max(1, rem - 1), d], [whole, Math.min(d - 1, rem + 1), d], [whole + 1, rem, d], [rem, whole, d],
  ]);
  const seen = new Set([`${whole}|${rem}`]);
  const choices = [{ value: 'right', label: mixedEl(whole, rem, d) }];
  let guard = 0;
  while (choices.length < 3 && guard++ < 30) {
    const [ww, nn, dd] = wrong();
    const k = `${ww}|${nn}`;
    if (seen.has(k) || nn < 1 || nn >= dd) continue;
    seen.add(k);
    choices.push({ value: `w${ww}n${nn}`, label: mixedEl(ww, nn, dd) });
  }
  return {
    prompt: { zh: `${improper}/${d} 是多少？`, en: `What is ${improper}/${d}?` },
    speak: {
      zh: `${fracWords(improper, d).zh}等于一又几分之几？`,
      en: `${fracWords(improper, d).en} is one and how many ${d === 2 ? 'halves' : 'parts'}?`,
    },
    choices: shuffle(choices),
    answer: 'right',
    board(boardEl) {
      const row = el('div', { class: 'board-row' },
        fracPie(d, d, { size: 120, color: PURPLE }),
        fracPie(d, rem, { size: 120, color: PURPLE })
      );
      boardEl.appendChild(el('div', { class: 'board-col' },
        row,
        el('div', { class: 'board-note' },
          bi({ zh: `一个整圆是 ${d}/${d}`, en: `A whole circle is ${d}/${d}` }))
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
    },
    explain: { zh: `等于${w.zh}`, en: `It equals ${w.en}` },
    answerText: { zh: `${whole}又${rem}/${d}`, en: `${whole} and ${rem}/${d}` },
  };
}

export default {
  id: 'fractions',
  rounds: 8,
  levelHints: {
    1: { zh: '一半和四分之一', en: 'Halves & quarters' },
    2: { zh: '认识 1/2 到 1/8 · 自己涂', en: 'Unit fractions · shade it' },
    3: { zh: '比大小 · 几分之几', en: 'Compare · non-unit fractions' },
    4: { zh: '相等分数 · 一组的几分之一', en: 'Equivalents · fraction of a set' },
    5: { zh: '同分母加法 · 带分数', en: 'Add fractions · mixed numbers' },
  },
  celebrants: () => pickN([2, 4, 8, 3, 6], 3),
  makeRound(level) {
    if (level === 1) {
      const d = pick([2, 4]);
      return identifyRound(d === 2 ? 1 : pick([1, 3]), d);
    }
    if (level === 2) {
      if (pick([true, false])) return identifyRound(1, pick([2, 3, 4, 5, 6, 8]));
      return shadeRound(randInt(1, 3), pick([4, 5, 6, 8]));
    }
    if (level === 3) {
      if (pick([true, false])) {
        const d = pick([5, 6, 8]);
        return identifyRound(randInt(2, d - 1), d);
      }
      const d = pick([4, 5, 6, 8]);
      const n1 = randInt(1, d - 1);
      let n2 = randInt(1, d - 1);
      if (n2 === n1) n2 = n1 === d - 1 ? n1 - 1 : n1 + 1;
      return compareRound(n1, d, n2, d);
    }
    if (level === 4) {
      const kind = pick(['equiv', 'ofSet', 'compareUnit']);
      if (kind === 'equiv') return equivalentRound();
      if (kind === 'ofSet') return ofSetRound();
      const d1 = pick([2, 3, 4]);
      let d2 = pick([3, 4, 5, 6]);
      if (d2 === d1) d2 = d1 + 2;
      return compareRound(1, d1, 1, d2);
    }
    return pick([addRound, addRound, mixedRound])();
  },
};
