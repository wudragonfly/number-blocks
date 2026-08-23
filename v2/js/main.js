// main.js — app bootstrap: shell, router, home page, game mounting.
import { initAudio, initTapToSpeak, stopSpeech, sfx } from './core/audio.js';
import { getSettings, setSetting, onSettings, getGameLevel, setGameLevel } from './core/settings.js';
import { t, STR, fmtPair } from './core/i18n.js';
import { el, bi } from './core/ui.js';
import { renderBlockChar } from './core/blocks.js';
import { initRouter, navigate, parseHash } from './core/router.js';
import { runQuiz } from './core/quiz.js';
import { GAMES, getGameMeta } from './games/registry.js';
import { gameStars } from './core/progress.js';
import { openSettings } from './core/settingsUI.js';

const app = document.getElementById('app');
const pageTitle = document.getElementById('page-title');
const btnHome = document.getElementById('btn-home');
const btnAudio = document.getElementById('btn-audio');
const btnSettings = document.getElementById('btn-settings');

let currentMount = null; // {destroy}
let currentGame = null; // {id, meta, module}
let mountSeq = 0;

// ---------------------------------------------------------------- shell

function fixVh() {
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}
window.addEventListener('resize', fixVh);
window.addEventListener('orientationchange', () => setTimeout(fixVh, 120));
fixVh();

function syncSettingsToShell() {
  const s = getSettings();
  document.body.dataset.lang = s.language;
  // 🔊 all on · 🔉 sfx only (voice off!) · 🔇 muted
  btnAudio.textContent = s.audio.master ? (s.audio.voice ? '🔊' : '🔉') : '🔇';
  btnAudio.classList.toggle('is-off', !s.audio.master);
}
onSettings(syncSettingsToShell);
syncSettingsToShell();

btnHome.addEventListener('click', () => navigate('/'));
btnAudio.addEventListener('click', () => {
  setSetting('audio.master', !getSettings().audio.master);
  sfx.tap();
});
btnSettings.addEventListener('click', () => {
  openSettings(currentGame ? {
    id: currentGame.id,
    meta: currentGame.meta,
    module: currentGame.module,
    onLevelChange: (lvl) => mountGame(currentGame.id, lvl),
  } : null);
});

initAudio();
initTapToSpeak();

// ---------------------------------------------------------------- home

function renderHome() {
  currentGame = null;
  btnHome.hidden = true;
  pageTitle.replaceChildren(bi(STR.appName, { row: true }));
  document.title = '数字方块 · Number Blocks';
  app.classList.add('scrollable');

  const parade = el('div', { class: 'hero-parade' });
  for (let n = 1; n <= 10; n++) {
    parade.appendChild(renderBlockChar(n, { size: 15, limbs: true, idle: true, label: true }));
  }

  const grid = el('div', { class: 'games-grid' });
  for (const g of GAMES) {
    const stars = gameStars(g.id);
    const card = el('button', { class: 'game-card', style: { '--game-color': g.color } },
      el('div', { class: 'card-icon' }, g.icon()),
      el('div', { class: 'card-name' }, bi(g.name)),
      el('div', { class: 'card-tag' }, bi(g.tagline)),
      el('div', { class: 'card-meta' },
        el('span', { class: 'chip' }, bi(t('ages', { a: g.ages }), { row: true })),
        stars > 0 ? el('span', { class: 'chip chip-stars' }, `⭐ × ${stars}`) : null
      )
    );
    card.addEventListener('click', () => {
      sfx.tap();
      navigate(`/game/${g.id}`);
    });
    grid.appendChild(card);
  }

  app.replaceChildren(
    el('div', { class: 'home' },
      el('div', { class: 'hero' },
        parade,
        el('h1', { class: 'hero-title' }, bi(STR.appName)),
        el('p', { class: 'hero-tagline' }, bi(STR.tagline))
      ),
      grid,
      el('div', { class: 'home-footer' },
        el('div', {}, 'Made with ❤️ for little mathematicians · 为小小数学家制作'),
        el('div', {}, 'A fan-made educational homage, not affiliated with the Numberblocks™ show.')
      )
    )
  );
}

// ---------------------------------------------------------------- games

async function mountGame(id, level = null) {
  const meta = getGameMeta(id);
  if (!meta) {
    navigate('/');
    return;
  }
  const seq = ++mountSeq;
  currentMount?.destroy?.();
  currentMount = null;
  stopSpeech();

  btnHome.hidden = false;
  app.classList.remove('scrollable');
  pageTitle.replaceChildren(bi(meta.name, { row: true }));
  document.title = `${meta.name.zh} ${meta.name.en} · Number Blocks`;
  app.replaceChildren(el('div', { class: 'loading-view' }, bi(t('loading'))));

  let module;
  try {
    module = (await meta.load()).default;
  } catch (err) {
    console.error('Failed to load game', id, err);
    app.replaceChildren(el('div', { class: 'loading-view' }, '⚠️ ', bi({ zh: '加载失败，请刷新', en: 'Load failed — please refresh' })));
    return;
  }
  if (seq !== mountSeq) return; // user navigated away while loading

  if (level != null) setGameLevel(id, level);
  const lvl = level ?? getGameLevel(id);
  currentGame = { id, meta, module };

  const ctx = {
    level: lvl,
    onLevelChange: (newLvl) => {
      setGameLevel(id, newLvl);
      mountGame(id, newLvl);
    },
    onHome: () => navigate('/'),
  };

  currentMount = module.mount
    ? module.mount(app, ctx)
    : runQuiz(app, module, ctx);
}

// ---------------------------------------------------------------- router

initRouter((route) => {
  currentMount?.destroy?.();
  currentMount = null;
  stopSpeech();
  if (route.page === 'game') mountGame(route.id);
  else renderHome();
});
