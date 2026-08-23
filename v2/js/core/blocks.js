// blocks.js — the parametric number-block character renderer (DESIGN.md §6).
// Original homage to the visual grammar of block characters: stacked unit
// cubes, color-coded numbers, one eye for One, square eyes for Four.
import { numWords } from './i18n.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const PALETTE = {
  1: '#ee3a30', 2: '#f7941d', 3: '#ffd100', 4: '#3db54a', 5: '#2d9cdb',
  6: '#5c5cc5', 7: '#8e5bd1', 8: '#ec008c', 9: '#8d99ae', 10: '#ee3a30',
};

const RAINBOW7 = ['#ee3a30', '#f7941d', '#ffd100', '#3db54a', '#2d9cdb', '#5c5cc5', '#8e5bd1'];

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

/** shade('#ee3a30', -0.3) → darker; +0.3 → lighter */
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c) => {
    const target = amt < 0 ? 0 : 255;
    return Math.round(c + (target - c) * Math.abs(amt));
  };
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** Identity color for a number (numbers > 10 borrow their ones digit). */
export function numberColor(n) {
  const id = n >= 1 && n <= 10 ? n : ((Math.abs(n) - 1) % 10) + 1;
  const main = PALETTE[id] || PALETTE[9];
  return { id, main, dark: shade(main, -0.35), light: shade(main, 0.55) };
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/** Per-cell color spec; identity 7 is rainbow, 10 is red & white. */
function cellSpec(identity, cellIdx) {
  if (identity === 7) {
    const main = RAINBOW7[cellIdx % 7];
    return { main, dark: shade(main, -0.35), light: shade(main, 0.55) };
  }
  if (identity === 10) {
    // Ten: white blocks with red trim and band, like the show
    return { main: '#ffffff', dark: '#d5372e', light: '#ffffff', band: '#ee3a30' };
  }
  const c = numberColor(identity);
  return { main: c.main, dark: c.dark, light: c.light };
}

function drawCell(parent, x, y, s, spec, { ghost = false, mark = false, tag = null } = {}) {
  const g = svgEl('g');
  const gap = s * 0.04;
  const rect = svgEl('rect', {
    x: x + gap, y: y + gap, width: s - gap * 2, height: s - gap * 2,
    rx: s * 0.16, fill: spec.main, stroke: spec.dark, 'stroke-width': Math.max(1.5, s * 0.07),
  });
  if (ghost) {
    rect.setAttribute('fill-opacity', '0.22');
    rect.setAttribute('stroke-dasharray', `${s * 0.16} ${s * 0.12}`);
    rect.setAttribute('stroke', '#8b90ad');
  }
  g.appendChild(rect);
  if (!ghost) {
    if (spec.band) {
      g.appendChild(svgEl('rect', {
        x: x + gap * 2, y: y + s * 0.42, width: s - gap * 4, height: s * 0.18,
        rx: s * 0.07, fill: spec.band,
      }));
    }
    if (spec.main !== '#ffffff') {
      g.appendChild(svgEl('rect', {
        x: x + s * 0.14, y: y + s * 0.11, width: s * 0.44, height: s * 0.15,
        rx: s * 0.075, fill: spec.light, opacity: 0.75,
      }));
    }
  }
  if (tag != null) {
    const t = svgEl('text', {
      x: x + s / 2, y: y + s * 0.68, 'text-anchor': 'middle',
      'font-size': s * 0.46, 'font-weight': '800', 'font-family': 'inherit',
      fill: ghost ? '#8b90ad' : '#ffffff', stroke: ghost ? 'none' : 'rgba(0,0,0,0.25)',
      'stroke-width': s * 0.015,
    });
    t.textContent = String(tag);
    g.appendChild(t);
  }
  if (mark) g.classList.add('nb-glow');
  parent.appendChild(g);
  return g;
}

function drawFace(parent, x, y, s, identity, mood) {
  const cx = x + s / 2;
  const face = svgEl('g');
  const FEAT = '#3a2b33';
  // white-bodied Ten needs outlined eyes or the white sclera disappears
  const outline = identity === 10 ? '#d5372e' : null;
  const eyes = svgEl('g');
  eyes.classList.add('nb-eyes');
  eyes.style.animationDelay = `${(Math.random() * 4).toFixed(2)}s`;

  const eyeY = y + s * 0.38;
  const offsets = identity === 1 ? [0] : [-s * 0.19, s * 0.19];
  for (const dx of offsets) {
    const ex = cx + dx;
    const one = identity === 1;
    const rx = s * (one ? 0.19 : 0.145);
    const ry = s * (one ? 0.21 : 0.165);
    const sclera = identity === 4
      ? svgEl('rect', {
        x: ex - rx * 0.95, y: eyeY - ry * 0.95, width: rx * 1.9, height: ry * 1.9,
        rx: s * 0.035, fill: '#fff',
      })
      : svgEl('ellipse', { cx: ex, cy: eyeY, rx, ry, fill: '#fff' });
    if (outline) {
      sclera.setAttribute('stroke', outline);
      sclera.setAttribute('stroke-width', s * 0.04);
    }
    eyes.appendChild(sclera);
    eyes.appendChild(svgEl('circle', { cx: ex, cy: eyeY + s * 0.02, r: s * (one ? 0.085 : 0.07), fill: FEAT }));
    eyes.appendChild(svgEl('circle', { cx: ex - s * 0.02, cy: eyeY - s * 0.015, r: s * 0.024, fill: '#fff' }));
  }
  face.appendChild(eyes);

  const mouthY = y + s * 0.68;
  const w = s * 0.15;
  if (mood === 'excited') {
    face.appendChild(svgEl('path', {
      d: `M ${cx - w} ${mouthY - s * 0.02} A ${w} ${w * 0.9} 0 0 0 ${cx + w} ${mouthY - s * 0.02} Z`,
      fill: '#7a3b45',
    }));
  } else if (mood === 'surprised') {
    face.appendChild(svgEl('ellipse', { cx, cy: mouthY, rx: s * 0.07, ry: s * 0.085, fill: '#7a3b45' }));
  } else if (mood === 'sad') {
    face.appendChild(svgEl('path', {
      d: `M ${cx - w} ${mouthY + s * 0.05} Q ${cx} ${mouthY - s * 0.09} ${cx + w} ${mouthY + s * 0.05}`,
      fill: 'none', stroke: FEAT, 'stroke-width': s * 0.05, 'stroke-linecap': 'round',
    }));
  } else {
    face.appendChild(svgEl('path', {
      d: `M ${cx - w} ${mouthY - s * 0.03} Q ${cx} ${mouthY + s * 0.1} ${cx + w} ${mouthY - s * 0.03}`,
      fill: 'none', stroke: FEAT, 'stroke-width': s * 0.05, 'stroke-linecap': 'round',
    }));
  }
  parent.appendChild(face);
}

/**
 * renderBlockChar(n, opts) → <span class="nb-char">
 * opts:
 *   size        unit block px (default 40)
 *   arrangement 'tower' | 'array' | 'rod' | 'tenframe'
 *   cols        columns for 'array'
 *   face        draw a face (default true)
 *   mood        'happy' | 'excited' | 'surprised' | 'sad'
 *   limbs       arms (default false), feet default = face
 *   ghost       whole character is an unknown: dashed + "?"
 *   ghostTop    top k blocks ghost-styled (subtraction)
 *   markTop     top k blocks glowing (comparison)
 *   numbered    1..n tags on blocks (counting hint)
 *   label       numeral under the character (true → n, or custom string)
 *   colorOf     borrow another number's identity color
 *   say         tap-to-speak (default true; says the count n)
 *   idle        gentle idle bob
 */
export function renderBlockChar(n, opts = {}) {
  const {
    size = 40, arrangement = 'tower', cols: colsOpt, face = true, mood = 'happy',
    limbs = false, ghost = false, ghostTop = 0, markTop = 0, numbered = false,
    label = null, colorOf = null, say = true, idle = false,
  } = opts;
  const count = Math.max(1, n);
  const identity = numberColor(colorOf ?? n).id;
  const s = size;

  let cols;
  if (arrangement === 'tower') cols = 1;
  else if (arrangement === 'rod') cols = count;
  else if (arrangement === 'tenframe') cols = Math.min(5, count);
  else cols = Math.max(1, Math.min(colsOpt || Math.ceil(Math.sqrt(count)), count));
  const rows = Math.ceil(count / cols);

  const feet = opts.feet ?? (face && !ghost && arrangement !== 'rod');
  const mL = limbs ? 0.55 : 0.1;
  const mR = mL;
  const mT = 0.1;
  const mB = feet ? 0.22 : 0.1;
  const W = (cols + mL + mR) * s;
  const H = (rows + mT + mB) * s;

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'aria-hidden': 'true' });

  // cells bottom-to-top, left-to-right; index 0 = bottom-left
  const cells = [];
  for (let i = 0; i < count; i++) {
    const rowFromBottom = Math.floor(i / cols);
    const col = i % cols;
    const isTopRow = rowFromBottom === rows - 1;
    const inTopRow = count - i <= ((count - 1) % cols) + 1;
    cells.push({
      i, col,
      x: (mL + col) * s,
      y: (mT + (rows - 1 - rowFromBottom)) * s,
      top: isTopRow && inTopRow,
    });
  }

  const bodyDark = cellSpec(identity, count - 1).dark;

  // feet under the bottom-left block column(s)
  if (feet) {
    const footY = (mT + rows) * s - s * 0.03;
    const bodyCx = mL * s + (cols * s) / 2;
    for (const dx of [-s * 0.31, s * 0.05]) {
      svg.appendChild(svgEl('rect', {
        x: bodyCx + dx, y: footY, width: s * 0.26, height: s * 0.13,
        rx: s * 0.065, fill: bodyDark,
      }));
    }
  }

  // arms from the top block
  if (limbs && !ghost) {
    const topCell = cells[count - 1];
    const shY = topCell.y + s * 0.55;
    for (const dir of [-1, 1]) {
      const x0 = dir < 0 ? mL * s + s * 0.04 : mL * s + cols * s - s * 0.04;
      const x1 = x0 + dir * s * 0.34;
      const y1 = shY - s * 0.28;
      svg.appendChild(svgEl('path', {
        d: `M ${x0} ${shY} Q ${x0 + dir * s * 0.22} ${shY - s * 0.05} ${x1} ${y1}`,
        fill: 'none', stroke: bodyDark, 'stroke-width': s * 0.09, 'stroke-linecap': 'round',
      }));
      svg.appendChild(svgEl('circle', { cx: x1, cy: y1, r: s * 0.1, fill: bodyDark }));
    }
  }

  // face goes on the top-row cell nearest the center
  let faceCell = null;
  if (!ghost && face && !numbered) {
    const topCells = cells.filter((c) => c.top);
    faceCell = topCells[Math.floor((topCells.length - 1) / 2)] || cells[count - 1];
  }

  for (const c of cells) {
    let spec = cellSpec(identity, c.i);
    // keep the face block clean — Ten's band would sit behind the eyes
    if (faceCell && c.i === faceCell.i && spec.band) spec = { ...spec, band: null };
    const isGhost = ghost || c.i >= count - ghostTop;
    const isMark = !isGhost && markTop > 0 && c.i >= count - markTop;
    const g = drawCell(svg, c.x, c.y, s, spec, {
      ghost: isGhost, mark: isMark, tag: numbered ? c.i + 1 : null,
    });
    g.dataset.cell = c.i;
  }

  if (ghost) {
    const q = svgEl('text', {
      x: W / 2, y: (mT + rows / 2) * s + s * 0.3, 'text-anchor': 'middle',
      'font-size': s * 0.9, 'font-weight': '800', 'font-family': 'inherit', fill: '#8b90ad',
    });
    q.textContent = '?';
    svg.appendChild(q);
  } else if (faceCell) {
    drawFace(svg, faceCell.x, faceCell.y, s, identity, mood);
  }

  const wrap = document.createElement('span');
  wrap.className = 'nb-char' + (idle ? ' nb-idle' : '');
  wrap.appendChild(svg);
  if (label != null && label !== false) {
    const lab = document.createElement('span');
    lab.className = 'nb-label';
    lab.textContent = label === true ? String(n) : String(label);
    lab.style.fontSize = `${Math.max(14, s * 0.5)}px`;
    wrap.appendChild(lab);
  }
  if (say && !ghost) {
    const w = numWords(n);
    wrap.dataset.sayZh = w.zh;
    wrap.dataset.sayEn = w.en;
  }
  return wrap;
}

/**
 * Place-value composite for numbers > 10: ten-rods + a ones tower, all at the
 * SAME unit size, with one face on the lead rod — one big character, like the
 * show's teens and tens.
 */
export function renderTensOnes(n, { unit = 16, face = true } = {}) {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const row = document.createElement('div');
  row.className = 'board-row no-wrap';
  row.style.alignItems = 'flex-end';
  row.style.gap = '8px'; // rods huddle together — one number, one figure
  for (let i = 0; i < tens; i++) {
    const lead = face && i === 0;
    row.appendChild(renderBlockChar(10, {
      size: unit, face: lead, feet: lead, say: false, label: '10',
    }));
  }
  if (ones > 0) {
    row.appendChild(renderBlockChar(ones, {
      size: unit, face: false, feet: false, say: false, label: true,
    }));
  }
  const w = numWords(n);
  row.dataset.sayZh = w.zh;
  row.dataset.sayEn = w.en;
  return row;
}

/** Ten-frames (rows of 5) with n filled cells — early counting layout. */
export function renderTenFrame(n, { colorOf = null, cell = 34 } = {}) {
  const color = numberColor(colorOf ?? n);
  const frame = document.createElement('div');
  frame.className = 'tenframe';
  const total = Math.max(10, Math.ceil(n / 5) * 5);
  for (let i = 0; i < total; i++) {
    const c = document.createElement('div');
    c.className = 'tf-cell';
    c.style.width = `${cell}px`;
    c.style.height = `${cell}px`;
    if (i < n) {
      c.style.background = color.main;
      c.style.boxShadow = `inset 0 0 0 3px ${color.dark}`;
    }
    frame.appendChild(c);
  }
  return frame;
}
