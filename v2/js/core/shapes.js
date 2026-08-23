// shapes.js — fraction & decimal manipulatives shared by several games.
import { el } from './ui.js';
import { numberColor, shade } from './blocks.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/**
 * Segmented fraction bar. fracBar(den, shaded, {width, height, color,
 * interactive, onChange}) — interactive bars let the child tap segments.
 */
export function fracBar(den, shaded, { width = 420, height = 64, color = null, interactive = false, onChange = null } = {}) {
  const c = color || numberColor(5).main;
  const bar = el('div', {
    class: 'frac-bar',
    style: { width: `min(${width}px, 86vw)`, height: `${height}px`, '--seg-color': c },
  });
  let count = shaded;
  const segs = [];
  for (let i = 0; i < den; i++) {
    const seg = el('button', { class: 'frac-seg' + (interactive ? ' tappable' : '') });
    if (i < shaded) seg.classList.add('shaded');
    if (interactive) {
      seg.addEventListener('click', () => {
        seg.classList.toggle('shaded');
        count = segs.filter((s) => s.classList.contains('shaded')).length;
        onChange?.(count);
      });
    } else {
      seg.setAttribute('disabled', 'true');
    }
    segs.push(seg);
    bar.appendChild(seg);
  }
  return Object.assign(bar, { getShaded: () => count });
}

/** Pie/circle fraction model: den slices, first `shaded` filled. */
export function fracPie(den, shaded, { size = 150, color = null } = {}) {
  const c = color || numberColor(5).main;
  const dark = '#4a4a68';
  const r = 48;
  const cx = 55;
  const cy = 55;
  const svg = svgEl('svg', { viewBox: '0 0 110 110', width: size, height: size });
  if (den === 1) {
    svg.appendChild(svgEl('circle', {
      cx, cy, r, fill: shaded >= 1 ? c : '#fff', stroke: dark, 'stroke-width': 5,
    }));
    return svg;
  }
  for (let i = 0; i < den; i++) {
    const a0 = (i / den) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / den) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = 1 / den > 0.5 ? 1 : 0;
    svg.appendChild(svgEl('path', {
      d: `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`,
      fill: i < shaded ? c : '#fff',
      stroke: dark, 'stroke-width': 4, 'stroke-linejoin': 'round',
    }));
  }
  return svg;
}

/** 10×10 hundred-grid. Returns {el, setShaded, getShaded}. */
export function hundredGrid(shaded, { cellPx = 26, color = null } = {}) {
  const c = color || numberColor(5).main;
  const grid = el('div', {
    class: 'hundred-grid',
    style: { '--seg-color': c, width: `min(${cellPx * 10 + 28}px, 82vw)` },
  });
  const cells = [];
  for (let i = 0; i < 100; i++) {
    const cell = el('div', { class: 'hg-cell', style: { aspectRatio: '1' } });
    cells.push(cell);
    grid.appendChild(cell);
  }
  let count = 0;
  function setShaded(n) {
    count = Math.max(0, Math.min(100, n));
    cells.forEach((cell, i) => cell.classList.toggle('shaded', i < count));
  }
  setShaded(shaded);
  return { el: grid, setShaded, getShaded: () => count };
}

/** Number line 0..max with a highlighted arrow marker at `mark`. */
export function numberLine({ max = 1, ticks = 10, mark = null, width = 560, labelEvery = null } = {}) {
  const H = 84;
  const pad = 30;
  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${H}`, class: 'numline' });
  svg.setAttribute('width', '100%');
  const y = 52;
  svg.appendChild(svgEl('line', { x1: pad, y1: y, x2: width - pad, y2: y, stroke: '#4a4a68', 'stroke-width': 5, 'stroke-linecap': 'round' }));
  const step = (width - pad * 2) / ticks;
  for (let i = 0; i <= ticks; i++) {
    const x = pad + i * step;
    const major = labelEvery ? i % labelEvery === 0 : (i === 0 || i === ticks);
    svg.appendChild(svgEl('line', { x1: x, y1: y - (major ? 11 : 7), x2: x, y2: y + (major ? 11 : 7), stroke: '#4a4a68', 'stroke-width': major ? 4 : 3 }));
    if (major) {
      const t = svgEl('text', { x, y: y + 30, 'text-anchor': 'middle', class: 'nl-tick-label' });
      const val = (max * i) / ticks;
      t.textContent = String(Math.round(val * 100) / 100);
      svg.appendChild(t);
    }
  }
  if (mark != null) {
    const x = pad + (mark / max) * (width - pad * 2);
    const m = numberColor(1).main;
    svg.appendChild(svgEl('path', {
      d: `M ${x} ${y - 14} L ${x - 10} ${y - 30} L ${x + 10} ${y - 30} Z`,
      fill: m, stroke: shade(m, -0.3), 'stroke-width': 2,
    }));
  }
  return svg;
}
