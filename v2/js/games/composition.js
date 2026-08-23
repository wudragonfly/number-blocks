// composition.js — 分与合: the signature split — find the missing part.
import { renderBlockChar, renderTensOnes } from '../core/blocks.js';
import { el } from '../core/ui.js';
import { numWords, stateEq, fmtPair } from '../core/i18n.js';
import { randInt, pick, pickN, numberChoices } from '../core/util.js';

const S = {
  ask: { zh: '{a} 和几合成 {n}？', en: '{a} and what make {n}?' },
  ask3: { zh: '{a}、{b} 和几合成 {n}？', en: '{a}, {b} and what make {n}?' },
};

const SVG_NS = 'http://www.w3.org/2000/svg';

function armsSvg() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 220 44');
  svg.setAttribute('width', '220');
  svg.setAttribute('height', '44');
  for (const x2 of [40, 180]) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '110');
    line.setAttribute('y1', '4');
    line.setAttribute('x2', String(x2));
    line.setAttribute('y2', '40');
    line.setAttribute('class', 'bond-line');
    svg.appendChild(line);
  }
  return svg;
}

// `unit` is the block size for BOTH branches — whole and parts share blocks
function charOrComposite(n, unit) {
  return n <= 10
    ? renderBlockChar(n, { size: unit, label: true })
    : renderTensOnes(n, { unit });
}

function bondRound(N, knownParts, maxN = 10) {
  const known = knownParts.reduce((s, v) => s + v, 0);
  const missing = N - known;
  const prompt = knownParts.length === 1
    ? fmtPair(S.ask, { a: knownParts[0], n: N })
    : fmtPair(S.ask3, { a: knownParts[0], b: knownParts[1], n: N });
  const speak = knownParts.length === 1
    ? fmtPair(S.ask, { a: numWords(knownParts[0]), n: numWords(N) })
    : fmtPair(S.ask3, { a: numWords(knownParts[0]), b: numWords(knownParts[1]), n: numWords(N) });
  const ghostSize = N <= 6 ? 50 : 44;

  return {
    prompt,
    speak,
    choices: numberChoices(missing, {
      min: N >= 100 ? 10 : 1,
      max: N >= 100 ? 90 : Math.max(10, N),
      near: N >= 100 ? [missing - 10, missing + 10, missing - 20, missing + 20] : undefined,
    }).map((v) => ({ value: v })),
    answer: missing,
    board(boardEl) {
      // ONE unit size for whole and parts (they're the same blocks, split!),
      // sized by the level's biggest number so every round at a level matches
      const unit = Math.min(38, Math.max(14, Math.floor(300 / (2 * maxN - 1))));
      const topSize = unit;
      const partSize = unit;
      const parts = el('div', { class: 'bond-arms' },
        ...knownParts.map((p) => charOrComposite(p, partSize)),
        el('span', { class: 'ghost-slot' },
          renderBlockChar(1, { ghost: true, size: ghostSize, say: false }))
      );
      boardEl.appendChild(el('div', { class: 'bond-diagram' },
        N >= 100
          ? el('div', { class: 'compare-card', style: { pointerEvents: 'none' } }, String(N))
          : charOrComposite(N, topSize),
        armsSvg(),
        parts
      ));
    },
    hint(boardEl) {
      if (N <= 10) {
        // show the whole with the missing part glowing on top
        const diagram = boardEl.querySelector('.bond-diagram');
        diagram?.prepend(el('div', { class: 'board-note anim-pop' },
          renderBlockChar(N, { size: 20, markTop: missing, say: false, label: true })));
      }
      boardEl.classList.add('nb-pulse');
    },
    onCorrect(boardEl) {
      const slot = boardEl.querySelector('.ghost-slot');
      if (slot) {
        slot.replaceChildren(
          missing <= 10
            ? renderBlockChar(missing, { size: ghostSize, label: true, mood: 'excited' })
            : el('div', { class: 'compare-card anim-pop', style: { pointerEvents: 'none' } }, String(missing))
        );
        slot.firstChild.classList?.add('anim-pop');
      }
    },
    reveal(boardEl) {
      this.onCorrect(boardEl);
    },
    explain: knownParts.length === 1
      ? stateEq(knownParts[0], '+', missing, N)
      : { zh: `${numWords(known).zh}加${numWords(missing).zh}等于${numWords(N).zh}`, en: `${numWords(known).en} plus ${numWords(missing).en} equals ${numWords(N).en}` },
    correctDelay: 2100,
    answerText: { zh: String(missing), en: String(missing) },
  };
}

export default {
  id: 'composition',
  rounds: 8,
  levelHints: {
    1: { zh: '分小数（到5）', en: 'Split up to 5' },
    2: { zh: '分到8', en: 'Split up to 8' },
    3: { zh: '凑十', en: 'Make ten' },
    4: { zh: '分到20', en: 'Split up to 20' },
    5: { zh: '三部分 · 凑100', en: 'Three parts · make 100' },
  },
  celebrants: () => pickN([2, 3, 4, 5, 6, 7, 8, 9, 10], 3),
  makeRound(level) {
    if (level === 1) {
      const N = randInt(3, 5);
      return bondRound(N, [randInt(1, N - 1)], 5);
    }
    if (level === 2) {
      const N = randInt(5, 8);
      return bondRound(N, [randInt(1, N - 1)], 8);
    }
    if (level === 3) {
      const N = pick([10, 10, 10, randInt(6, 9)]);
      return bondRound(N, [randInt(1, N - 1)], 10);
    }
    if (level === 4) {
      const N = randInt(11, 20);
      return bondRound(N, [randInt(2, N - 2)], 20);
    }
    if (pick([true, false])) {
      const N = randInt(8, 15);
      const a = randInt(1, N - 4);
      const b = randInt(1, N - a - 2);
      return bondRound(N, [a, b], 15);
    }
    const a = 10 * randInt(1, 9);
    return bondRound(100, [a], 100);
  },
};
