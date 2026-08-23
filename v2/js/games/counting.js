// counting.js — 数一数: tap-to-count, find-N, ten frames, tens & ones.
import { renderBlockChar, renderTensOnes, renderTenFrame } from '../core/blocks.js';
import { el, bi } from '../core/ui.js';
import { numWords, fmtPair } from '../core/i18n.js';
import { randInt, pick, pickN, numberChoices } from '../core/util.js';

const S = {
  tap: { zh: '点方块，数一数！', en: 'Tap the blocks and count!' },
  howMany: { zh: '一共有几个？', en: 'How many are there?' },
  find: { zh: '找到数字 {n}！', en: 'Find number {n}!' },
  what: { zh: '这是多少？', en: 'What number is this?' },
  next: { zh: '下一个是几？{seq} …', en: 'What comes next? {seq} …' },
  after: { zh: '{n} 后面是哪个数？', en: 'What comes right after {n}?' },
  before: { zh: '{n} 前面是哪个数？', en: 'What comes right before {n}?' },
  rowFive: { zh: '一行有五个！', en: 'A row is five!' },
  tensOnes: { zh: '{t}个十和{o}个一是{n}', en: '{t} tens and {o} ones make {n}' },
};

const LEVEL_MAX = { 1: 5, 2: 10, 3: 20, 4: 50, 5: 100 };

function tapRound(n) {
  let count = 0;
  return {
    prompt: S.tap,
    speak: S.tap,
    input: 'custom',
    answer: n,
    board(boardEl, api) {
      const colorOf = Math.min(n, 10);
      const size = n <= 10 ? 56 : 46;
      const cols = n <= 5 ? n : n <= 10 ? 5 : 6;
      const scatter = el('div', {
        class: 'count-scatter',
        style: { gridTemplateColumns: `repeat(${cols}, auto)` },
      });
      const counter = el('div', { class: 'count-progress' }, '·');
      const col = el('div', { class: 'board-col' }, counter, scatter);

      for (let k = 0; k < n; k++) {
        const cell = el('button', { class: 'cell-btn' },
          renderBlockChar(1, { size, colorOf, say: false, feet: false }));
        cell.addEventListener('click', () => {
          if (cell.classList.contains('counted')) return;
          count++;
          cell.classList.add('counted');
          cell.appendChild(el('span', { class: 'count-tag' }, String(count)));
          api.sfx.pop(count - 1);
          api.speak(numWords(count));
          counter.textContent = String(count);
          if (count === n) setTimeout(showChoices, 650);
        });
        scatter.appendChild(cell);
      }

      function showChoices() {
        api.speak(S.howMany);
        const grid = el('div', { class: 'choice-grid' });
        for (const v of numberChoices(n, { min: 1, max: Math.max(10, n + 3) })) {
          const btn = el('button', { class: 'choice-btn' }, String(v));
          btn.dataset.value = String(v);
          btn.addEventListener('click', () => api.submit(v, btn));
          grid.appendChild(btn);
        }
        col.appendChild(grid);
      }
      boardEl.appendChild(col);
    },
    explain: numWords(n),
    answerText: { zh: String(n), en: String(n) },
  };
}

function findRound(n, max) {
  const options = pickN(
    Array.from({ length: Math.min(max, 10) }, (_, k) => k + 1).filter((v) => v !== n),
    2
  ).concat(n);
  const w = numWords(n);
  return {
    prompt: fmtPair(S.find, { n }),
    speak: fmtPair(S.find, { n: w }),
    input: 'custom',
    answer: n,
    board(boardEl, api) {
      const row = el('div', { class: 'board-row' });
      // one fixed unit size — characters compare honestly, no round-to-round jumps
      const size = 34;
      for (const v of pickN(options, options.length)) {
        const btn = el('button', { class: 'char-pick-btn' },
          renderBlockChar(v, { size, say: false }));
        btn.addEventListener('click', () => {
          if (api.isLocked()) return;
          if (v === n) {
            btn.classList.add('picked-right');
            api.submit(v, null);
          } else {
            btn.classList.add('picked-wrong');
            api.submit(v, null);
          }
        });
        row.appendChild(btn);
      }
      boardEl.appendChild(row);
    },
    hint(boardEl) {
      boardEl.querySelectorAll('.char-pick-btn').forEach((b) => b.classList.add('nb-pulse'));
    },
    explain: { zh: `${w.zh}在这里！`, en: `Here is ${w.en}!` },
    answerText: { zh: String(n), en: String(n) },
  };
}

function frameRound(n, max) {
  return {
    prompt: S.howMany,
    speak: S.howMany,
    choices: numberChoices(n, { min: 1, max: Math.max(10, Math.min(max, n + 5)) }).map((v) => ({ value: v })),
    answer: n,
    board(boardEl) {
      const row = el('div', { class: 'board-row' });
      if (n > 10) {
        row.appendChild(renderTenFrame(10, { colorOf: 10, cell: 34 }));
        row.appendChild(renderTenFrame(n - 10, { colorOf: n - 10, cell: 34 }));
      } else {
        row.appendChild(renderTenFrame(n, { cell: 40 }));
      }
      boardEl.appendChild(row);
    },
    hint(boardEl) {
      boardEl.querySelector('.board-row')?.classList.add('nb-pulse');
    },
    explain: numWords(n),
    answerText: { zh: String(n), en: String(n) },
  };
}

function tensOnesRound(n) {
  const t10 = Math.floor(n / 10);
  const o = n % 10;
  const near = [n + 10, n - 10, n + 1, n - 1, Number(`${o}${t10}`)].filter((v) => v > 0 && v !== n);
  const w = numWords(n);
  const explain = fmtPair(S.tensOnes, { t: numWords(t10), o: numWords(o), n: w });
  return {
    prompt: S.what,
    speak: S.what,
    choices: numberChoices(n, { min: 1, max: 110, near }).map((v) => ({ value: v })),
    answer: n,
    board(boardEl) {
      boardEl.appendChild(el('div', { class: 'board-col' },
        renderTensOnes(n, { unit: 18 }),
        el('div', { class: 'board-note' }, bi({ zh: '每根红白条是10', en: 'Each red & white rod is 10' }))
      ));
    },
    hint(boardEl) {
      boardEl.classList.add('nb-pulse');
    },
    explain,
    answerText: { zh: String(n), en: String(n) },
  };
}

function seqRound(step, max) {
  const len = 4;
  const start = step * randInt(1, Math.max(1, Math.floor((max - step * len) / step)));
  const seq = Array.from({ length: len }, (_, k) => start + k * step);
  const answer = start + len * step;
  const seqText = seq.join(', ');
  return {
    prompt: fmtPair(S.next, { seq: seqText }),
    speak: fmtPair(S.next, { seq: { zh: seq.map((v) => numWords(v).zh).join('，'), en: seq.map((v) => numWords(v).en).join(', ') } }),
    choices: numberChoices(answer, { min: 1, max: max + step, near: [answer - step, answer + step, answer - 1, answer + 1] }).map((v) => ({ value: v })),
    answer,
    board(boardEl) {
      const row = el('div', { class: 'board-row' });
      for (const v of seq) {
        row.appendChild(el('div', {
          class: 'compare-card',
          style: { cursor: 'default', pointerEvents: 'none' },
        }, String(v)));
      }
      row.appendChild(el('div', { class: 'compare-card', style: { cursor: 'default', pointerEvents: 'none' } }, '?'));
      boardEl.appendChild(row);
    },
    explain: { zh: `每次加${numWords(step).zh}，下一个是${numWords(answer).zh}`, en: `Add ${numWords(step).en} each time — next is ${numWords(answer).en}` },
    answerText: { zh: String(answer), en: String(answer) },
  };
}

function neighborRound(n, dir, max) {
  const answer = n + dir;
  const key = dir > 0 ? 'after' : 'before';
  const w = numWords(n);
  return {
    prompt: fmtPair(S[key], { n }),
    speak: fmtPair(S[key], { n: w }),
    choices: numberChoices(answer, { min: 0, max: max + 1, near: [n, answer + dir, answer - dir] }).map((v) => ({ value: v })),
    answer,
    board(boardEl) {
      const col = el('div', { class: 'board-col' });
      col.appendChild(n <= 10
        ? renderBlockChar(n, { size: 30, label: true })
        : n <= 20
          ? renderBlockChar(n, { size: 30, arrangement: 'tenframe', label: true })
          : renderTensOnes(n, { unit: 17 }));
      boardEl.appendChild(col);
    },
    explain: numWords(answer),
    answerText: { zh: String(answer), en: String(answer) },
  };
}

export default {
  id: 'counting',
  rounds: 8,
  levelHints: {
    1: { zh: '数到5', en: 'Count to 5' },
    2: { zh: '数到10', en: 'Count to 10' },
    3: { zh: '数到20 · 十和一', en: 'To 20 · tens & ones' },
    4: { zh: '数到50 · 跳着数', en: 'To 50 · skip counting' },
    5: { zh: '数到100', en: 'Count to 100' },
  },
  celebrants: () => pickN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3),
  makeRound(level) {
    const max = LEVEL_MAX[level] || 10;
    if (level === 1) {
      const type = pick(['tap', 'tap', 'find']);
      if (type === 'find') return findRound(randInt(1, 5), 5);
      return tapRound(randInt(1, 5));
    }
    if (level === 2) {
      const type = pick(['tap', 'tap', 'find', 'frame']);
      if (type === 'find') return findRound(randInt(2, 10), 10);
      if (type === 'frame') return frameRound(randInt(3, 10), 10);
      return tapRound(randInt(3, 10));
    }
    if (level === 3) {
      const type = pick(['tap', 'frame', 'tens', 'neighbor']);
      if (type === 'tap') return tapRound(randInt(6, 12));
      if (type === 'frame') return frameRound(randInt(11, 20), 20);
      if (type === 'tens') return tensOnesRound(randInt(11, 20));
      return neighborRound(randInt(2, 19), pick([1, -1]), 20);
    }
    if (level === 4) {
      const type = pick(['tens', 'tens', 'seq', 'neighbor']);
      if (type === 'seq') return seqRound(pick([2, 5, 10]), max);
      if (type === 'neighbor') return neighborRound(randInt(10, 49), pick([1, -1]), 50);
      return tensOnesRound(randInt(21, 50));
    }
    const type = pick(['tens', 'tens', 'seq', 'neighbor']);
    if (type === 'seq') return seqRound(pick([5, 10]), max);
    if (type === 'neighbor') return neighborRound(randInt(30, 99), pick([1, -1]), 100);
    return tensOnesRound(randInt(31, 100));
  },
};
