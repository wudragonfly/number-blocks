// ui.js — DOM helpers & shared widgets.
import { sfx } from './audio.js';

/** el('div', {class: 'x', dataset: {...}, onClick: fn}, ...children) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [prop, val] of Object.entries(v)) {
        if (prop.startsWith('--')) node.style.setProperty(prop, val);
        else node.style[prop] = val;
      }
    }
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

/**
 * bi({en, zh}) → bilingual span; CSS (body[data-lang]) decides visibility.
 * Plain strings/numbers render as-is.
 */
export function bi(pair, { cls = '', row = false } = {}) {
  if (pair == null) return el('span');
  if (typeof pair !== 'object') return el('span', { class: cls }, String(pair));
  return el('span', { class: `bi${row ? ' bi-row' : ''} ${cls}`.trim() },
    el('span', { class: 'bi-zh' }, pair.zh ?? ''),
    el('span', { class: 'bi-en' }, pair.en ?? '')
  );
}

/** Make any element speak on tap. */
export function saying(node, pair) {
  if (pair && typeof pair === 'object') {
    node.dataset.sayZh = pair.zh ?? '';
    node.dataset.sayEn = pair.en ?? '';
  }
  return node;
}

/** Stacked fraction: 3/4 rendered vertically. */
export function fracEl(num, den, { cls = '' } = {}) {
  return el('span', { class: `frac ${cls}`.trim() },
    el('span', { class: 'frac-num' }, String(num)),
    el('span', { class: 'frac-den' }, String(den))
  );
}

/** Mixed number: 1¾ style — whole + stacked fraction. */
export function mixedEl(whole, num, den) {
  return el('span', { class: 'frac-mixed' }, String(whole), fracEl(num, den));
}

// ------------------------------------------------------------------ modal

/** modal({title, content}) → close(). Overlay tap or ✕ closes. */
export function modal({ title, content, onClose }) {
  const root = document.getElementById('modal-root');
  const panel = el('div', { class: 'modal-panel' },
    el('div', { class: 'modal-head' },
      title ? bi(title) : el('span'),
      el('button', { class: 'modal-close', 'aria-label': 'close', onClick: () => close() }, '✕')
    ),
    el('div', { class: 'modal-body' }, content)
  );
  const overlay = el('div', { class: 'modal-overlay' }, panel);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  panel.addEventListener('click', (e) => e.stopPropagation());
  function close() {
    overlay.remove();
    onClose?.();
  }
  root.appendChild(overlay);
  return close;
}

// ----------------------------------------------------------------- numpad

/**
 * Big-key number pad. numpad({onSubmit, maxLen}) → {el, focusKeys(key)}
 * Layout: [1..9, 0, ⌫, ✓✓]
 */
export function numpad({ onSubmit, maxLen = 3 }) {
  let value = '';
  const display = el('div', { class: 'numpad-display' }, ' ');
  const okBtn = el('button', { class: 'numpad-key key-ok', disabled: 'true' }, '✓');

  function refresh() {
    display.textContent = value || ' ';
    if (value) okBtn.removeAttribute('disabled');
    else okBtn.setAttribute('disabled', 'true');
  }
  function press(d) {
    if (value.length >= maxLen) return;
    if (value === '0') value = '';
    value += d;
    sfx.tap();
    refresh();
  }
  function backspace() {
    value = value.slice(0, -1);
    sfx.tap();
    refresh();
  }
  function submit() {
    if (!value) return;
    const v = parseInt(value, 10);
    value = '';
    refresh();
    onSubmit(v);
  }
  okBtn.addEventListener('click', submit);

  // two tidy rows: 1-5 ⌫ / 6-0 ✓
  const keys = el('div', { class: 'numpad-keys' });
  for (let d = 1; d <= 5; d++) {
    keys.appendChild(el('button', { class: 'numpad-key', onClick: () => press(String(d)) }, String(d)));
  }
  keys.appendChild(el('button', { class: 'numpad-key key-del', onClick: backspace }, '⌫'));
  for (let d = 6; d <= 9; d++) {
    keys.appendChild(el('button', { class: 'numpad-key', onClick: () => press(String(d)) }, String(d)));
  }
  keys.appendChild(el('button', { class: 'numpad-key', onClick: () => press('0') }, '0'));
  keys.appendChild(okBtn);

  const root = el('div', { class: 'numpad' }, display, keys);
  return {
    el: root,
    handleKey(key) {
      if (/^[0-9]$/.test(key)) press(key);
      else if (key === 'Backspace') backspace();
      else if (key === 'Enter') submit();
    },
    clear() { value = ''; refresh(); },
  };
}

// ------------------------------------------------------------- small bits

export function starBar(lit, total = 3) {
  const bar = el('div', { class: 'end-stars' });
  for (let i = 0; i < total; i++) {
    const s = el('span', { class: 'star' + (i < lit ? ' lit' : '') }, '⭐');
    if (i < lit) s.style.animationDelay = `${0.35 + i * 0.4}s`;
    bar.appendChild(s);
  }
  return bar;
}

export function progressDots(total) {
  const root = el('div', { class: 'round-dots' });
  const dots = [];
  for (let i = 0; i < total; i++) {
    const d = el('span', { class: 'round-dot' });
    dots.push(d);
    root.appendChild(d);
  }
  return {
    el: root,
    /** mark round i as current; states[j] ∈ 'done' | 'miss' for finished rounds */
    update(current, states) {
      dots.forEach((d, j) => {
        d.className = 'round-dot' +
          (states[j] ? ` ${states[j]}` : '') +
          (j === current ? ' now' : '');
      });
    },
  };
}

/** Transient banner over the board: “太棒了! Awesome!” */
export function feedbackPop(boardEl, pair, kind = 'good') {
  boardEl.querySelector('.feedback-pop')?.remove();
  const pop = el('div', { class: `feedback-pop${kind === 'good' ? '' : ' bad'}` }, bi(pair));
  boardEl.appendChild(pop);
  setTimeout(() => pop.remove(), 1600);
  return pop;
}

/** A few emoji sparkles around a point in the board. */
export function sparkle(boardEl, n = 5) {
  const w = boardEl.clientWidth;
  const h = boardEl.clientHeight;
  const emo = ['✨', '🌟', '💫', '⭐'];
  for (let i = 0; i < n; i++) {
    const s = el('span', {
      class: 'spark',
      style: { left: `${15 + Math.random() * (w - 60)}px`, top: `${10 + Math.random() * (h - 50)}px` },
    }, emo[i % emo.length]);
    boardEl.appendChild(s);
    setTimeout(() => s.remove(), 900 + i * 120);
  }
}
