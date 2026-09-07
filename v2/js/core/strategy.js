// strategy.js — interactive, step-by-step arithmetic strategy board.
import { renderBlockChar, renderTensOnes } from './blocks.js';
import { el, bi } from './ui.js';
import { numberChoices } from './util.js';

function compactNumber(n, size = 14) {
  if (n <= 10) {
    return renderBlockChar(n, {
      size,
      arrangement: n > 5 ? 'tenframe' : 'tower',
      label: true,
      say: false,
    });
  }
  return renderTensOnes(n, { unit: Math.min(size, 8) });
}

function splitPart(n, revealed, size) {
  const value = el('div', { class: 'strategy-part-value' }, compactNumber(n, size));
  const ghost = el('div', { class: 'strategy-part-ghost', 'aria-hidden': 'true' }, '?');
  return el('div', { class: `strategy-part${revealed ? ' is-revealed' : ''}` }, ghost, value);
}

/**
 * Run a small question at every calculation step. A correct answer unlocks the
 * next step and its animation; a wrong answer gives a non-revealing hint and
 * leaves the child in control.
 *
 * config: {
 *   method, splitLabel, splitValue, splitParts: [a, b, ...], initialVisibleParts?,
 *   steps: [{prompt, question, answer, equation, hint, revealParts?, focusPart?}],
 *   answer
 * }
 */
export function renderStrategyDemo(boardEl, api, config) {
  const revealedParts = new Set(config.initialVisibleParts || []);
  const source = el('div', { class: 'strategy-source' }, compactNumber(config.splitValue, 13));
  const partSize = config.splitParts.length > 2 ? 7 : 12;
  const partEls = config.splitParts.map((n, index) => splitPart(n, revealedParts.has(index), partSize));
  const partChildren = [];
  partEls.forEach((part, index) => {
    if (index > 0) partChildren.push(el('span', { class: 'strategy-part-op' }, '+'));
    partChildren.push(part);
  });
  const parts = el('div', { class: 'strategy-parts' }, partChildren);

  const stepCount = el('div', { class: 'strategy-step-count', hidden: '' });
  const trail = el('div', {
    class: 'strategy-trail',
    'aria-label': 'Completed steps 已完成步骤',
    'aria-live': 'polite',
  });
  const challenge = el('div', { class: 'strategy-challenge' });
  const result = el('div', { class: 'strategy-result', hidden: '' },
    el('span', { class: 'strategy-result-mark' }, '✓'),
    compactNumber(config.answer, 11)
  );
  const directToggle = el('button', {
    class: 'strategy-direct-toggle', 'aria-expanded': 'false',
  }, bi({ zh: '我需要帮助', en: 'I need help' }));
  const directFeedback = el('div', { class: 'strategy-feedback', 'aria-live': 'polite' });
  const directChoices = el('div', { class: 'strategy-choice-grid' });
  const directPanel = el('div', { class: 'strategy-direct-panel' },
    bi({ zh: '请选择原题的最终答案', en: 'Choose the final answer to the original problem' }),
    directChoices,
    directFeedback
  );
  const guidedPanel = el('div', { class: 'strategy-guided', hidden: '' },
    el('div', { class: 'strategy-split-row' },
      el('div', { class: 'strategy-source-wrap' }, bi(config.splitLabel), source),
      el('div', { class: 'strategy-arrow' }, '➜'),
      parts
    ),
    trail,
    challenge
  );

  const demo = el('div', { class: 'strategy-demo' },
    el('div', { class: 'strategy-head' },
      el('div', { class: 'strategy-method' }, '✨ ', bi(config.method, { row: true })),
      stepCount
    ),
    directToggle,
    directPanel,
    guidedPanel,
    result
  );

  let stepIndex = 0;
  let settling = false;
  let finished = false;
  let activeButtons = [];
  let directMode = true;
  let speechVersion = 0;
  const finalButtons = numberChoices(config.answer, {
    count: 3, min: 0, max: Math.max(10, config.answer + 10),
  }).map((value, index) => {
    const button = el('button', {
      class: 'strategy-choice',
      'aria-label': `${value}, choice ${index + 1}`,
      'aria-keyshortcuts': String(index + 1),
    }, String(value));
    button.addEventListener('click', () => {
      if (!directMode || settling || finished || api.isLocked() || button.disabled) return;
      if (value !== config.answer) {
        api.registerAttempt();
        api.sfx.wrong();
        button.disabled = true;
        button.classList.add('is-wrong', 'anim-wobble');
        const hint = { zh: '再想一想，也可以点击“我需要帮助”。', en: 'Try again, or tap “I need help”.' };
        directFeedback.replaceChildren(bi(hint));
        api.speak(hint);
        return;
      }
      button.classList.add('is-correct');
      complete();
    });
    directChoices.appendChild(button);
    return button;
  });

  directToggle.addEventListener('click', () => {
    if (settling || finished || api.isLocked()) return;
    directMode = !directMode;
    speechVersion++;
    directPanel.hidden = !directMode;
    guidedPanel.hidden = directMode;
    stepCount.hidden = directMode;
    directToggle.setAttribute('aria-expanded', String(!directMode));
    directToggle.replaceChildren(bi(directMode
      ? { zh: '我需要帮助', en: 'I need help' }
      : { zh: '我会了，直接答题', en: 'I know it — answer directly' }));
    api.sfx.tap();
    if (directMode) api.speakIntro([]);
    else speakStep();
  });

  function complete() {
    finished = true;
    settling = true;
    speechVersion++;
    directToggle.disabled = true;
    [...activeButtons, ...finalButtons].forEach((button) => { button.disabled = true; });
    focusPart(null);
    result.removeAttribute('hidden');
    void result.offsetWidth;
    result.classList.add('is-visible');
    demo.classList.add('is-complete');
    api.correct();
  }

  function revealParts(indices = []) {
    for (const index of indices) {
      revealedParts.add(index);
      partEls[index]?.classList.add('is-revealed', 'anim-pop');
    }
  }

  function focusPart(index) {
    partEls.forEach((part, i) => part.classList.toggle('is-focus', i === index));
  }

  function speakStep(step = config.steps[stepIndex], includeOriginal = false) {
    const prompt = typeof step.prompt === 'object' ? step.prompt : { zh: step.prompt, en: step.prompt };
    const question = typeof step.speak === 'object' ? step.speak : { zh: step.speak, en: step.speak };
    const say = includeOriginal ? api.speakIntro : api.speak;
    say([prompt, question]);
  }

  function addTrail(step) {
    const replay = el('button', {
      class: 'strategy-trail-item anim-pop',
      'aria-label': `Replay completed equation ${step.equation}`,
    },
      el('span', { class: 'strategy-trail-check', 'aria-hidden': 'true' }, '✓'),
      el('span', { class: 'strategy-trail-voice', 'aria-hidden': 'true' }, '🔊'),
      step.equation
    );
    replay.addEventListener('click', () => {
      api.sfx.tap();
      api.speak(step.doneSpeak || step.speak || step.prompt);
    });
    trail.appendChild(replay);
  }

  function answerStep(value, button) {
    if (directMode || settling || finished || api.isLocked() || button.disabled) return;
    const step = config.steps[stepIndex];
    if (String(value) !== String(step.answer)) {
      api.registerAttempt();
      api.sfx.wrong();
      button.classList.add('is-wrong', 'anim-wobble');
      button.disabled = true;
      challenge.querySelector('.strategy-feedback')?.replaceChildren(
        bi(step.hint || { zh: '再想一想，数一数方块。', en: 'Try again and count the blocks.' })
      );
      challenge.classList.add('has-hint');
      source.classList.remove('is-hinting');
      void source.offsetWidth;
      source.classList.add('is-hinting');
      api.speak(step.hint || { zh: '再想一想，数一数方块。', en: 'Try again and count the blocks.' });
      return;
    }

    settling = true;
    directToggle.disabled = true;
    button.classList.add('is-correct');
    activeButtons.forEach((btn) => { btn.disabled = true; });
    api.sfx.pop(stepIndex + 2);
    source.classList.remove('is-hinting');
    addTrail(step);
    revealParts(step.revealParts);
    focusPart(step.focusPart);
    source.classList.remove('is-splitting');
    if (step.revealParts?.length) {
      void source.offsetWidth;
      source.classList.add('is-splitting');
    }

    const isLast = stepIndex === config.steps.length - 1;
    if (isLast) {
      complete();
      return;
    }

    api.schedule(() => {
      stepIndex++;
      settling = false;
      directToggle.disabled = false;
      renderStep();
    }, 620);
  }

  function renderStep() {
    const step = config.steps[stepIndex];
    stepCount.replaceChildren(bi({
      zh: `第 ${stepIndex + 1}/${config.steps.length} 步`,
      en: `Step ${stepIndex + 1} of ${config.steps.length}`,
    }));

    const values = step.choices || numberChoices(step.answer, {
      count: 3,
      min: step.min ?? 0,
      max: step.max ?? Math.max(10, step.answer + 4),
    });
    const choiceGrid = el('div', { class: 'strategy-choice-grid' });
    activeButtons = values.map((value, index) => {
      const btn = el('button', {
        class: 'strategy-choice',
        'aria-label': `${value}, choice ${index + 1}`,
        'aria-keyshortcuts': String(index + 1),
      }, String(value));
      btn.addEventListener('click', () => answerStep(value, btn));
      choiceGrid.appendChild(btn);
      return btn;
    });
    const sayButton = el('button', {
      class: 'strategy-step-say',
      'aria-label': `听本步 Listen to step ${stepIndex + 1}`,
    }, '🔊');
    sayButton.addEventListener('click', () => {
      api.sfx.tap();
      speakStep(step);
    });

    challenge.classList.remove('has-hint');
    challenge.replaceChildren(
      el('div', { class: 'strategy-instruction' },
        sayButton,
        el('div', { class: 'strategy-prompt' }, bi(step.prompt))
      ),
      el('div', { class: 'strategy-question' }, step.question),
      choiceGrid,
      el('div', { class: 'strategy-feedback', 'aria-live': 'polite' })
    );
    focusPart(step.focusPart);
    const speakingStep = stepIndex;
    const speakingVersion = ++speechVersion;
    api.schedule(() => {
      if (!finished && speechVersion === speakingVersion && stepIndex === speakingStep) {
        if (directMode) api.speakIntro([]);
        else speakStep(step);
      }
    }, 180);
  }

  api.setKeyHandler?.((key) => {
    if (!/^[1-3]$/.test(key) || settling || finished) return false;
    const button = (directMode ? finalButtons : activeButtons)[Number(key) - 1];
    if (!button || button.disabled) return false;
    button.click();
    return true;
  });

  boardEl.appendChild(demo);
  renderStep();
  return { revealParts };
}
