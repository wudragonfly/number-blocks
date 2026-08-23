// quiz.js — the shared round-loop engine every quiz game runs on (DESIGN.md §10).
import { el, bi, numpad as makeNumpad, progressDots, feedbackPop, starBar, modal } from './ui.js';
import { speak, stopSpeech, sfx } from './audio.js';
import { t, PRAISES, ENCOURAGEMENTS } from './i18n.js';
import { confettiBurst, confettiRain } from './confetti.js';
import { recordResult, levelStars } from './progress.js';
import { pick, pickN } from './util.js';
import { renderBlockChar } from './blocks.js';

export function openLevelPicker(game, current, onPick) {
  const list = el('div', { class: 'level-list' });
  for (let lvl = 1; lvl <= 5; lvl++) {
    const earned = levelStars(game.id, lvl);
    const item = el('button', { class: 'level-item' + (lvl === current ? ' on' : '') },
      el('span', { class: 'level-num' }, String(lvl)),
      el('span', { class: 'level-desc' }, bi(game.levelHints?.[lvl] || t('levelN', { n: lvl }))),
      el('span', { class: 'level-earned' }, earned ? '⭐'.repeat(earned) : '')
    );
    item.addEventListener('click', () => {
      close();
      onPick(lvl);
    });
    list.appendChild(item);
  }
  const close = modal({ title: t('chooseLevel'), content: list });
}

/**
 * Mounts a quiz for `game` at `level` into `container`.
 * ctx: { level, onLevelChange(lvl), onHome() }
 * Returns { destroy }.
 */
export function runQuiz(container, game, ctx) {
  const rounds = game.rounds ?? 8;
  const { level } = ctx;

  let i = 0;
  let firstTry = 0;
  let attempts = 0;
  let locked = false;
  let destroyed = false;
  let round = null;
  let pad = null;
  const results = [];
  const timeouts = new Set();

  function schedule(fn, ms) {
    const id = setTimeout(() => {
      timeouts.delete(id);
      if (!destroyed) fn();
    }, ms);
    timeouts.add(id);
  }

  // ---------------- shell ----------------
  const dots = progressDots(rounds);
  const levelPill = el('button', { class: 'level-pill' }, bi(t('levelN', { n: level }), { row: true }));
  levelPill.addEventListener('click', () => openLevelPicker(game, level, (lvl) => ctx.onLevelChange(lvl)));

  const promptText = el('span');
  const sayBtn = el('button', { class: 'say-btn', 'aria-label': 'replay audio' }, '🔊');
  sayBtn.addEventListener('click', () => speakPrompt());

  const boardEl = el('div', { class: 'quiz-board' });
  const inputEl = el('div', { class: 'quiz-input' });

  const rootEl = el('div', { class: 'quiz' },
    el('div', { class: 'quiz-top' }, dots.el, levelPill),
    el('div', { class: 'quiz-prompt' }, sayBtn, promptText),
    boardEl,
    inputEl
  );
  container.replaceChildren(rootEl);

  function speakPrompt() {
    if (round) speak(round.speak || round.prompt);
  }

  // ---------------- round lifecycle ----------------
  function startRound() {
    round = game.makeRound(level, i);
    attempts = 0;
    locked = false;
    pad = null;
    dots.update(i, results);

    promptText.replaceChildren(bi(round.prompt));
    boardEl.replaceChildren();
    inputEl.replaceChildren();

    round.board?.(boardEl, api);

    const input = round.input || (round.choices ? 'choices' : 'custom');
    if (input === 'choices') {
      const grid = el('div', { class: 'choice-grid' });
      for (const choice of round.choices) {
        const btn = el('button', { class: 'choice-btn' });
        const label = choice.label ?? choice.value;
        if (label instanceof Node) btn.appendChild(label);
        else if (typeof label === 'object') btn.appendChild(bi(label));
        else btn.textContent = String(label);
        btn.dataset.value = String(choice.value);
        btn.addEventListener('click', () => handleAnswer(choice.value, btn));
        grid.appendChild(btn);
      }
      inputEl.appendChild(grid);
    } else if (input === 'numpad') {
      pad = makeNumpad({ onSubmit: (v) => handleAnswer(v), maxLen: round.maxLen ?? 3 });
      inputEl.appendChild(pad.el);
    }
    schedule(speakPrompt, 250);
  }

  function handleAnswer(value, btn) {
    if (locked || destroyed) return;
    if (String(value) === String(round.answer)) onCorrect(btn);
    else onWrong(value, btn);
  }

  function onCorrect(btn) {
    if (locked) return;
    locked = true;
    const clean = attempts === 0;
    if (clean) firstTry++;
    results[i] = clean ? 'done' : 'miss';
    dots.update(i, results);

    if (btn) btn.classList.add('is-correct');
    sfx.correct();
    confettiBurst(btn || boardEl);
    const praise = pick(PRAISES);
    feedbackPop(boardEl, praise, 'good');
    speak(praise);
    round.onCorrect?.(boardEl);
    schedule(next, round.correctDelay ?? 1700);
  }

  function onWrong(value, btn) {
    if (locked) return;
    attempts++;
    sfx.wrong();
    if (btn) {
      btn.classList.add('is-wrong', 'anim-wobble');
    } else {
      boardEl.classList.remove('anim-wobble');
      void boardEl.offsetWidth;
      boardEl.classList.add('anim-wobble');
    }
    pad?.clear();

    if (attempts === 1) {
      const enc = pick(ENCOURAGEMENTS);
      feedbackPop(boardEl, enc, 'bad');
      speak(enc);
      round.hint?.(boardEl);
    } else {
      // second miss → reveal and move on
      locked = true;
      results[i] = 'miss';
      dots.update(i, results);
      const correctBtn = inputEl.querySelector(`[data-value="${String(round.answer)}"]`);
      correctBtn?.classList.add('is-correct');
      const answerText = round.answerText || { en: String(round.answer), zh: String(round.answer) };
      feedbackPop(boardEl, t('answerIs', { a: answerText }), 'good');
      round.reveal?.(boardEl);
      speak(round.explain || t('answerIs', { a: answerText }));
      schedule(next, round.revealDelay ?? 2600);
    }
  }

  const api = {
    speak,
    sfx,
    boardEl,
    submit: (v, btn) => handleAnswer(v, btn),
    correct: () => onCorrect(null),
    wrong: () => onWrong(null, null),
    isLocked: () => locked,
    registerAttempt: () => { attempts++; },
  };

  function next() {
    i++;
    if (i >= rounds) finish();
    else startRound();
  }

  function finish() {
    const scorePct = (firstTry / rounds) * 100;
    const stars = scorePct >= 90 ? 3 : scorePct >= 65 ? 2 : 1;
    recordResult(game.id, level, { stars, scorePct });
    endScreen(container, {
      stars,
      score: t('scoreLine', { a: firstTry, b: rounds }),
      celebrants: game.celebrants?.(level),
      canLevelUp: level < 5 && stars >= 2,
      onReplay: () => ctx.onLevelChange(level),
      onNext: () => ctx.onLevelChange(level + 1),
      onHome: () => ctx.onHome(),
    });
  }

  // ---------------- keyboard ----------------
  function onKey(e) {
    if (destroyed || locked) return;
    if (pad) {
      pad.handleKey(e.key);
      return;
    }
    if (/^[0-9]$/.test(e.key)) {
      const btns = [...inputEl.querySelectorAll('.choice-btn')].filter(
        (b) => !b.classList.contains('is-wrong'));
      // prefer matching the typed value; fall back to position (1-9)
      const byValue = btns.find((b) => b.dataset.value === e.key);
      if (byValue) byValue.click();
      else if (e.key !== '0' && btns[parseInt(e.key, 10) - 1]) btns[parseInt(e.key, 10) - 1].click();
    }
  }
  document.addEventListener('keydown', onKey);

  startRound();

  return {
    destroy() {
      destroyed = true;
      for (const id of timeouts) clearTimeout(id);
      timeouts.clear();
      document.removeEventListener('keydown', onKey);
      stopSpeech();
    },
  };
}

/**
 * Shared celebration screen (also used by board games like Memory Match).
 * opts: {stars, score, celebrants, canLevelUp, onReplay, onNext, onHome}
 */
export function endScreen(container, opts) {
  const chars = el('div', { class: 'end-chars' });
  const nums = opts.celebrants || pickN([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3);
  // one unit size for the whole line-up — a Ten's blocks match a Two's
  const size = Math.max(17, Math.min(40, Math.floor(175 / Math.max(...nums))));
  for (const n of nums) {
    chars.appendChild(renderBlockChar(n, { size, limbs: true, mood: 'excited', label: true }));
  }

  const actions = el('div', { class: 'end-actions' },
    el('button', { class: 'big-btn green', onClick: () => opts.onReplay() }, '🔁 ', bi(t('playAgain'))),
    opts.canLevelUp
      ? el('button', { class: 'big-btn orange', onClick: () => opts.onNext() }, '🚀 ', bi(t('nextLevel')))
      : null,
    el('button', { class: 'big-btn ghosted', onClick: () => opts.onHome() }, '🏠 ', bi(t('goHome')))
  );

  container.replaceChildren(
    el('div', { class: 'end-screen' },
      chars,
      el('div', { class: 'end-title' }, bi(t('wellDone'))),
      starBar(opts.stars),
      el('div', { class: 'end-score' }, bi(opts.score)),
      actions
    )
  );

  sfx.win();
  confettiRain();
  for (let s = 0; s < opts.stars; s++) setTimeout(() => sfx.star(), 500 + s * 400);
  speak(t('wellDone'));
}
