// memory.js — 记忆配对: flip-and-match board (a custom-mount game).
import { el, bi, fracEl } from '../core/ui.js';
import { renderBlockChar } from '../core/blocks.js';
import { numWords, stateEq, fracWords, pctWords, decWords, t } from '../core/i18n.js';
import { randInt, pick, pickN, shuffle } from '../core/util.js';
import { speak, stopSpeech, sfx } from '../core/audio.js';
import { confettiBurst } from '../core/confetti.js';
import { recordResult } from '../core/progress.js';
import { endScreen, openLevelPicker } from '../core/quiz.js';
import { getGameOpt } from '../core/settings.js';

function charFace(n) {
  return renderBlockChar(n, {
    arrangement: n > 5 ? 'tenframe' : 'tower',
    size: n > 5 ? 17 : Math.min(22, Math.floor(96 / n)),
    say: false, feet: false,
  });
}

function numbersDeck(maxN, pairs) {
  const values = pickN(Array.from({ length: maxN }, (_, i) => i + 1), pairs);
  return values.flatMap((n) => {
    const w = numWords(n);
    return [
      { pairId: n, face: () => el('span', {}, String(n)), say: w },
      { pairId: n, face: () => charFace(n), say: w },
    ];
  });
}

function additionDeck(pairs) {
  const sums = new Set();
  const deck = [];
  let guard = 0;
  while (deck.length < pairs * 2 && guard++ < 200) {
    const a = randInt(1, 9);
    const b = randInt(1, Math.min(9, 10 - a) + 4);
    const sum = a + b;
    if (sums.has(sum)) continue;
    sums.add(sum);
    deck.push(
      {
        pairId: sum,
        face: () => el('span', {}, `${a}+${b}`),
        say: { zh: `${numWords(a).zh}加${numWords(b).zh}`, en: `${numWords(a).en} plus ${numWords(b).en}` },
        matchSay: stateEq(a, '+', b, sum),
      },
      { pairId: sum, face: () => el('span', {}, String(sum)), say: numWords(sum) }
    );
  }
  return deck;
}

function multiplicationDeck(pairs) {
  const products = new Set();
  const deck = [];
  let guard = 0;
  while (deck.length < pairs * 2 && guard++ < 300) {
    const a = randInt(2, 9);
    const b = randInt(2, 9);
    const p = a * b;
    if (products.has(p)) continue;
    products.add(p);
    deck.push(
      {
        pairId: p,
        face: () => el('span', {}, `${a}×${b}`),
        say: { zh: `${numWords(a).zh}乘${numWords(b).zh}`, en: `${numWords(a).en} times ${numWords(b).en}` },
        matchSay: stateEq(a, '×', b, p),
      },
      { pairId: p, face: () => el('span', {}, String(p)), say: numWords(p) }
    );
  }
  return deck;
}

const TRIPLES = [
  [1, 2, 0.5, 50], [1, 4, 0.25, 25], [3, 4, 0.75, 75], [1, 5, 0.2, 20],
  [2, 5, 0.4, 40], [3, 5, 0.6, 60], [1, 10, 0.1, 10], [3, 10, 0.3, 30], [7, 10, 0.7, 70],
];

function fracPctDeck(pairs) {
  const triples = pickN(TRIPLES, Math.min(pairs, TRIPLES.length));
  return triples.flatMap(([n, d, dec, pct]) => {
    const forms = pickN(['frac', 'dec', 'pct'], 2);
    const card = (form) => {
      if (form === 'frac') return { pairId: pct, face: () => fracEl(n, d), say: fracWords(n, d) };
      if (form === 'dec') return { pairId: pct, face: () => el('span', {}, String(dec)), say: decWords(dec) };
      return { pairId: pct, face: () => el('span', {}, `${pct}%`), say: pctWords(pct) };
    };
    return [card(forms[0]), card(forms[1])];
  });
}

function buildDeck(level, theme) {
  const pairs = level === 1 ? 3 : level <= 3 ? 6 : 8;
  const kind = theme && theme !== 'auto'
    ? theme
    : level === 1 || level === 2 ? 'numbers' : level === 3 ? 'addition' : level === 4 ? 'multiplication' : 'fractions';
  if (kind === 'numbers') return numbersDeck(level === 1 ? 5 : 10, pairs);
  if (kind === 'addition') return additionDeck(pairs);
  if (kind === 'multiplication') return multiplicationDeck(pairs);
  return fracPctDeck(pairs);
}

const game = {
  id: 'memory',
  levelHints: {
    1: { zh: '数字配方块 1-5', en: 'Numbers & blocks 1-5' },
    2: { zh: '数字配方块 1-10', en: 'Numbers & blocks 1-10' },
    3: { zh: '加法配得数', en: 'Sums & totals' },
    4: { zh: '乘法配得数', en: 'Products & totals' },
    5: { zh: '分数=小数=百分数', en: 'Fraction · decimal · percent' },
  },
  extraSettings: [
    {
      key: 'theme',
      type: 'choice',
      label: { zh: '配对主题', en: 'Pair theme' },
      options: [
        { value: 'auto', label: { zh: '跟随等级', en: 'By level' } },
        { value: 'numbers', label: { zh: '数字', en: 'Numbers' } },
        { value: 'addition', label: { zh: '加法', en: 'Sums' } },
        { value: 'multiplication', label: { zh: '乘法', en: 'Products' } },
        { value: 'fractions', label: { zh: '分数', en: 'Fractions' } },
      ],
    },
  ],
  mount(container, ctx) {
    const { level } = ctx;
    const deck = shuffle(buildDeck(level, getGameOpt('memory', 'theme', 'auto')));
    const pairs = deck.length / 2;
    const cols = deck.length <= 6 ? 3 : 4;

    let first = null;
    let lock = false;
    let moves = 0;
    let matched = 0;
    let destroyed = false;
    const timeouts = new Set();
    const schedule = (fn, ms) => {
      const id = setTimeout(() => { timeouts.delete(id); if (!destroyed) fn(); }, ms);
      timeouts.add(id);
    };

    const movesEl = el('span', {}, '0');
    const pairsEl = el('span', {}, `0/${pairs}`);
    const hud = el('div', { class: 'mem-hud' },
      el('span', { style: { display: 'inline-flex', gap: '7px', alignItems: 'baseline' } },
        bi({ zh: '步数', en: 'Moves' }, { row: true }), movesEl),
      el('span', { style: { display: 'inline-flex', gap: '7px', alignItems: 'baseline' } },
        bi({ zh: '配对', en: 'Pairs' }, { row: true }), pairsEl)
    );

    const levelPill = el('button', { class: 'level-pill' }, bi(t('levelN', { n: level }), { row: true }));
    levelPill.addEventListener('click', () =>
      openLevelPicker(game, level, (lvl) => ctx.onLevelChange(lvl)));

    const rows = Math.ceil(deck.length / cols);
    const grid = el('div', {
      class: 'mem-grid',
      style: {
        gridTemplateColumns: `repeat(${cols}, minmax(60px, 124px))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      },
    });

    deck.forEach((card) => {
      const backFace = el('div', { class: 'mem-face mem-back' });
      backFace.appendChild(card.face());
      const btn = el('button', { class: 'mem-card', style: { width: '100%', height: '100%', maxHeight: '150px' } },
        el('div', { class: 'mem-inner' },
          el('div', { class: 'mem-face mem-front' }, '?'),
          backFace
        )
      );
      btn.addEventListener('click', () => {
        if (destroyed || lock || btn.classList.contains('open') || btn.classList.contains('matched')) return;
        sfx.flip();
        btn.classList.add('open');
        speak(card.say);
        if (!first) {
          first = { btn, card };
          return;
        }
        moves++;
        movesEl.textContent = String(moves);
        const prev = first;
        first = null;
        if (prev.card.pairId === card.pairId) {
          matched++;
          pairsEl.textContent = `${matched}/${pairs}`;
          prev.btn.classList.add('matched');
          btn.classList.add('matched');
          sfx.correct();
          confettiBurst(btn);
          const ms = card.matchSay || prev.card.matchSay;
          if (ms) speak(ms);
          if (matched === pairs) schedule(finish, 900);
        } else {
          lock = true;
          schedule(() => {
            prev.btn.classList.remove('open');
            btn.classList.remove('open');
            sfx.wrong();
            lock = false;
          }, 950);
        }
      });
      grid.appendChild(btn);
    });

    function finish() {
      const ratio = moves / pairs;
      const stars = ratio <= 1.7 ? 3 : ratio <= 2.5 ? 2 : 1;
      recordResult('memory', level, { stars, scorePct: Math.max(0, Math.round(200 - ratio * 100)) });
      endScreen(container, {
        stars,
        score: t('movesLine', { n: moves }),
        canLevelUp: level < 5 && stars >= 2,
        onReplay: () => ctx.onLevelChange(level),
        onNext: () => ctx.onLevelChange(level + 1),
        onHome: () => ctx.onHome(),
      });
    }

    container.replaceChildren(
      el('div', { class: 'quiz' },
        el('div', { class: 'quiz-top' }, hud, levelPill),
        el('div', { class: 'quiz-board' }, grid)
      )
    );

    return {
      destroy() {
        destroyed = true;
        for (const id of timeouts) clearTimeout(id);
        timeouts.clear();
        stopSpeech();
      },
    };
  },
};

export default game;
