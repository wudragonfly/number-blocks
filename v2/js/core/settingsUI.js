// settingsUI.js — the shared settings modal (global + per-game sections).
import { el, bi, modal } from './ui.js';
import { getSettings, setSetting, getGameLevel, setGameLevel, getGameOpt, setGameOpt } from './settings.js';
import { t } from './i18n.js';
import { speak, listVoices, sfx } from './audio.js';
import { resetProgress } from './progress.js';

function segControl(options, isOn, onPick) {
  const root = el('div', { class: 'seg' });
  const btns = options.map((opt) => {
    const btn = el('button', { class: 'seg-opt' + (isOn(opt.value) ? ' on' : '') },
      typeof opt.label === 'object' && !(opt.label instanceof Node) ? bi(opt.label) : opt.label);
    btn.addEventListener('click', () => {
      onPick(opt.value);
      btns.forEach((b, i) => b.classList.toggle('on', isOn(options[i].value)));
      sfx.tap();
    });
    root.appendChild(btn);
    return btn;
  });
  return root;
}

function toggleControl(get, set, onChange) {
  const btn = el('button', { class: 'toggle' + (get() ? ' on' : ''), 'aria-label': 'toggle' });
  btn.addEventListener('click', () => {
    set(!get());
    btn.classList.toggle('on', get());
    sfx.tap();
    onChange?.(get());
  });
  return btn;
}

function row(label, control) {
  return el('div', { class: 'set-row' }, bi(label), control);
}

function section(title, ...children) {
  return el('div', { class: 'set-section' },
    el('div', { class: 'set-title' }, bi(title, { row: true })),
    ...children);
}

function voicePicker(lang, settingKey, sampleText) {
  const voices = listVoices()[lang];
  if (!voices.length) return null;
  const sel = el('select', { class: 'set-select' });
  sel.appendChild(el('option', { value: '' }, '✨ Auto'));
  for (const name of voices) {
    sel.appendChild(el('option', { value: name }, name));
  }
  sel.value = getSettings().audio[settingKey] || '';
  sel.addEventListener('change', () => {
    setSetting(`audio.${settingKey}`, sel.value || null);
    speak(sampleText);
  });
  return sel;
}

/**
 * openSettings({game}) — game: {id, meta, module, onLevelChange} when opened
 * from inside a game page; adds that game's section on top.
 */
export function openSettings(gameCtx = null) {
  const s = getSettings();
  const body = el('div', {});

  // ---- per-game section (when inside a game) ----
  if (gameCtx) {
    const { id, meta, module } = gameCtx;
    const kids = [
      segControl(
        [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
        (v) => getGameLevel(id) === v,
        (v) => {
          setGameLevel(id, v);
          gameCtx.onLevelChange?.(v);
        }
      ),
      el('div', { class: 'set-row', style: { fontSize: '14px', color: 'var(--ink-soft)' } },
        bi(module?.levelHints?.[getGameLevel(id)] || { zh: '', en: '' })),
    ];
    for (const extra of module?.extraSettings || []) {
      kids.push(el('div', { class: 'set-row' }, bi(extra.label)));
      if (extra.type === 'multi') {
        const current = () => getGameOpt(id, extra.key, []);
        kids.push(segControl(
          extra.options,
          (v) => current().includes(v),
          (v) => {
            const cur = current().slice();
            const idx = cur.indexOf(v);
            if (idx >= 0) cur.splice(idx, 1);
            else cur.push(v);
            setGameOpt(id, extra.key, cur);
          }
        ));
      } else {
        kids.push(segControl(
          extra.options,
          (v) => getGameOpt(id, extra.key, extra.options[0].value) === v,
          (v) => setGameOpt(id, extra.key, v)
        ));
      }
    }
    body.appendChild(section({ zh: `本游戏 · ${meta.name.zh}`, en: `This game · ${meta.name.en}` }, ...kids));
  }

  // ---- language ----
  body.appendChild(section(t('language'),
    segControl(
      [
        { value: 'zh', label: '中文' },
        { value: 'en', label: 'English' },
        { value: 'both', label: '双语 Both' },
      ],
      (v) => getSettings().language === v,
      (v) => setSetting('language', v)
    )
  ));

  // ---- sound ----
  const soundKids = [
    row(t('soundAll'), toggleControl(() => getSettings().audio.master, (v) => setSetting('audio.master', v))),
    row(t('voiceOpt'), toggleControl(
      () => getSettings().audio.voice,
      (v) => setSetting('audio.voice', v),
      (on) => { if (on) speak({ zh: '语音打开了！', en: 'Voice is on!' }); }
    )),
    row(t('sfxOpt'), toggleControl(() => getSettings().audio.sfx, (v) => setSetting('audio.sfx', v))),
    row(t('speed'), segControl(
      [
        { value: 0.75, label: bi(t('slow')) },
        { value: 1.0, label: bi(t('normal')) },
      ],
      (v) => Math.abs(getSettings().audio.rate - v) < 0.01,
      (v) => {
        setSetting('audio.rate', v);
        speak({ zh: '我们一起玩吧！', en: "Let's play!" });
      }
    )),
  ];
  const zhPicker = voicePicker('zh', 'voiceZh', { zh: '你好！我是数字方块。' });
  const enPicker = voicePicker('en', 'voiceEn', { en: 'Hello! I am a number block.' });
  if (zhPicker) soundKids.push(row(t('voiceZh'), zhPicker));
  if (enPicker) soundKids.push(row(t('voiceEn'), enPicker));
  body.appendChild(section(t('sound'), ...soundKids));

  // ---- default level ----
  body.appendChild(section(t('difficulty'),
    segControl(
      [1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) })),
      (v) => getSettings().defaultLevel === v,
      (v) => setSetting('defaultLevel', v)
    ),
    el('div', { class: 'set-row', style: { fontSize: '13.5px', color: 'var(--ink-soft)' } },
      bi({ zh: '新游戏的起始难度（每个游戏也可单独调）', en: 'Starting level for games you haven\'t played (each game can be set separately)' }))
  ));

  // ---- reset ----
  let armed = false;
  const resetBtn = el('button', { class: 'danger-btn' }, '');
  resetBtn.appendChild(bi(t('resetProgress')));
  resetBtn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      resetBtn.replaceChildren(bi({ zh: '再点一次确认清除！', en: 'Tap again to confirm!' }));
      return;
    }
    resetProgress();
    resetBtn.replaceChildren(bi(t('resetDone')));
    resetBtn.setAttribute('disabled', 'true');
  });
  body.appendChild(section({ zh: '进度', en: 'Progress' }, resetBtn));

  return modal({ title: t('settings'), content: body, onClose: gameCtx?.onClose });
}
