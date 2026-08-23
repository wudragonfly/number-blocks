// registry.js — one entry per game; adding a game starts here (DESIGN.md §12).
import { renderBlockChar } from '../core/blocks.js';
import { el } from '../core/ui.js';
import { fracPie, fracBar } from '../core/shapes.js';

export const GAMES = [
  {
    id: 'counting',
    name: { zh: '数一数', en: 'Counting' },
    tagline: { zh: '点一点，一起数！', en: 'Tap the blocks and count!' },
    ages: '3-6',
    color: '#f7941d',
    icon: () => renderBlockChar(3, { size: 20, say: false }),
    load: () => import('./counting.js'),
  },
  {
    id: 'composition',
    name: { zh: '分与合', en: 'Number Bonds' },
    tagline: { zh: '一个数，分成两个！', en: 'Split a number into parts!' },
    ages: '4-7',
    color: '#ffd100',
    icon: () => el('span', { class: 'board-row no-wrap', style: { gap: '4px', alignItems: 'flex-end' } },
      renderBlockChar(2, { size: 15, say: false }),
      renderBlockChar(3, { size: 15, say: false }),
      renderBlockChar(5, { size: 15, say: false })
    ),
    load: () => import('./composition.js'),
  },
  {
    id: 'addition',
    name: { zh: '加法', en: 'Addition' },
    tagline: { zh: '合在一起变大数！', en: 'Blocks join to make more!' },
    ages: '4-9',
    color: '#3db54a',
    icon: () => el('span', { class: 'board-row no-wrap', style: { gap: '5px', alignItems: 'flex-end' } },
      renderBlockChar(2, { size: 16, say: false }),
      el('b', { style: { fontSize: '26px' } }, '+'),
      renderBlockChar(3, { size: 16, say: false })
    ),
    load: () => import('./addition.js'),
  },
  {
    id: 'subtraction',
    name: { zh: '减法', en: 'Subtraction' },
    tagline: { zh: '跳走几个，还剩几个？', en: 'Some hop away — how many left?' },
    ages: '4-9',
    color: '#ee3a30',
    icon: () => renderBlockChar(5, { size: 17, ghostTop: 2, say: false }),
    load: () => import('./subtraction.js'),
  },
  {
    id: 'multiplication',
    name: { zh: '乘法', en: 'Multiplication' },
    tagline: { zh: '排成方阵数得快！', en: 'Arrays make counting fast!' },
    ages: '6-10',
    color: '#5c5cc5',
    icon: () => renderBlockChar(6, { size: 17, arrangement: 'array', cols: 3, say: false }),
    load: () => import('./multiplication.js'),
  },
  {
    id: 'division',
    name: { zh: '除法', en: 'Division' },
    tagline: { zh: '平均分一分！', en: 'Share the blocks fairly!' },
    ages: '7-10',
    color: '#2d9cdb',
    icon: () => el('span', { class: 'board-row no-wrap', style: { gap: '5px', alignItems: 'center' } },
      renderBlockChar(8, { size: 13, arrangement: 'array', cols: 4, say: false }),
      el('b', { style: { fontSize: '26px' } }, '÷')
    ),
    load: () => import('./division.js'),
  },
  {
    id: 'fractions',
    name: { zh: '分数', en: 'Fractions' },
    tagline: { zh: '切一切，分一分！', en: 'Cut it up, share it out!' },
    ages: '6-10',
    color: '#8e5bd1',
    icon: () => fracPie(4, 1, { size: 62, color: '#8e5bd1' }),
    load: () => import('./fractions.js'),
  },
  {
    id: 'decimals',
    name: { zh: '小数·百分数', en: 'Decimals & %' },
    tagline: { zh: '0.5 = 50% 的秘密！', en: 'The secret of 0.5 = 50%!' },
    ages: '8-10',
    color: '#ec008c',
    icon: () => fracBar(10, 5, { width: 110, height: 30, color: '#ec008c' }),
    load: () => import('./decimals.js'),
  },
  {
    id: 'memory',
    name: { zh: '记忆配对', en: 'Memory Match' },
    tagline: { zh: '翻一翻，找朋友！', en: 'Flip cards, find the pairs!' },
    ages: '3-10',
    color: '#8d99ae',
    icon: () => el('span', { class: 'board-row no-wrap', style: { gap: '6px' } },
      el('span', { style: { width: '34px', height: '46px', borderRadius: '8px', background: 'linear-gradient(145deg,#5c5cc5,#7d7de0)', border: '3px solid #fff', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '20px' } }, '?'),
      renderBlockChar(2, { size: 15, say: false })
    ),
    load: () => import('./memory.js'),
  },
];

export function getGameMeta(id) {
  return GAMES.find((g) => g.id === id) || null;
}
