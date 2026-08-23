// audio.js — Web Speech API voice + WebAudio-synthesized SFX (DESIGN.md §7).
// Hardened against the classic speechSynthesis failure modes:
//  • speak() in the same tick as cancel() gets dropped/wedged (WebKit/Chrome)
//  • the engine silently enters a stuck "paused" state after tab switches
//  • Chrome GC kills in-flight utterances that aren't referenced
//  • Chrome stops queued speech unless resume() is poked periodically
import { getSettings } from './settings.js';

let audioCtx = null;
let needsPrime = true;
let voicesCache = [];

const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function ensureCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!audioCtx && AC) audioCtx = new AC();
  // covers 'suspended' and iOS's 'interrupted'
  if (audioCtx && audioCtx.state !== 'running') {
    try { audioCtx.resume(); } catch { /* ignore */ }
  }
  return audioCtx;
}

function refreshVoices() {
  if ('speechSynthesis' in window) voicesCache = speechSynthesis.getVoices() || [];
}

/** Call once at startup: unlock audio on first gesture, keep voices fresh. */
export function initAudio() {
  if ('speechSynthesis' in window) {
    refreshVoices();
    try {
      speechSynthesis.addEventListener('voiceschanged', refreshVoices);
    } catch {
      speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }
  document.addEventListener(
    'pointerdown',
    () => {
      ensureCtx();
      if (!('speechSynthesis' in window)) return;
      // self-heal a silently paused engine on every tap
      try { if (speechSynthesis.paused) speechSynthesis.resume(); } catch { /* ignore */ }
      // replay speech that was blocked before this gesture (autoplay policy)
      if (unspoken) {
        const { parts, rate } = unspoken;
        unspoken = null;
        const s2 = getSettings();
        if (s2.audio.master && s2.audio.voice) {
          const token = ++speakToken;
          setTimeout(() => {
            if (token === speakToken) queueParts(parts, rate, token, 0);
          }, 60);
        }
      }
      if (needsPrime) {
        needsPrime = false;
        refreshVoices();
        if (IS_IOS) {
          // iOS unlocks speech only from inside a user gesture; the classic
          // empty-utterance unlock (volume tricks break it on some versions)
          try {
            speechSynthesis.speak(new SpeechSynthesisUtterance(''));
          } catch { /* ignore */ }
        }
      }
    },
    { capture: true }
  );
  // speech can wedge when the page returns from background — reset it
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && 'speechSynthesis' in window) {
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
      try { speechSynthesis.resume(); } catch { /* ignore */ }
      needsPrime = true;
    }
  });
}

// ------------------------------------------------------------------ voices

const VOICE_PREF = {
  en: ['Samantha', 'Karen', 'Daniel', 'Moira', 'Google US English', 'Aria', 'Zira', 'Alex'],
  zh: ['Tingting', 'Ting-Ting', '婷婷', 'Xiaoxiao', '晓晓', 'Meijia', 'Mei-Jia', 'Google 普通话', 'Lili'],
};

function pickVoice(lang) {
  const s = getSettings();
  const wanted = lang === 'zh' ? s.audio.voiceZh : s.audio.voiceEn;
  const all = voicesCache.filter((v) => (v.lang || '').toLowerCase().startsWith(lang));
  if (wanted) {
    const v = all.find((x) => x.name === wanted) || voicesCache.find((x) => x.name === wanted);
    if (v) return v;
  }
  // on-device voices only, if any exist — Chrome's "Google …" network voices
  // are known to fail SILENTLY (no sound, no error), especially for Chinese
  const locals = all.filter((v) => v.localService);
  const pool = locals.length ? locals : all;
  for (const name of VOICE_PREF[lang] || []) {
    const v = pool.find((x) => x.name.includes(name));
    if (v) return v;
  }
  const primaryTag = lang === 'zh' ? 'zh-cn' : 'en-us';
  const primary = pool.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(primaryTag));
  return primary[0] || pool[0] || null;
}

/** Voice names available per language (for the settings pickers). */
export function listVoices() {
  refreshVoices();
  const names = (lang) =>
    voicesCache.filter((v) => (v.lang || '').toLowerCase().startsWith(lang)).map((v) => v.name);
  return { en: names('en'), zh: names('zh') };
}

// ------------------------------------------------------------------ speech

let speakToken = 0;
let speakTimer = null;
let watchdogTimer = null;
let holdUtterances = []; // strong refs — Chrome GC can kill in-flight utterances
let unspoken = null; // last request that never started (blocked pre-gesture)

function armWatchdog() {
  clearInterval(watchdogTimer);
  let ticks = 0;
  watchdogTimer = setInterval(() => {
    const synth = speechSynthesis;
    if (!synth.speaking && !synth.pending) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
      return;
    }
    // un-stick a silently paused engine
    try { if (synth.paused) synth.resume(); } catch { /* ignore */ }
    if (++ticks >= 14) {
      // ~20s "speaking" a short phrase means the engine is wedged — reset it
      try { synth.cancel(); } catch { /* ignore */ }
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }, 1500);
}

let loggedVoices = false;

// attempt 0: picked voices · attempt 1: NO named voice, lang tag only (the
// OS-default path that always works) · then stash for gesture replay
function queueParts(parts, rate, token, attempt = 0) {
  const synth = speechSynthesis;
  try { synth.resume(); } catch { /* ignore */ }
  holdUtterances = [];
  let started = false;
  for (const p of parts) {
    const u = new SpeechSynthesisUtterance(p.text);
    if (attempt === 0) {
      const v = pickVoice(p.lang);
      if (v) u.voice = v;
      u.lang = v?.lang || (p.lang === 'zh' ? 'zh-CN' : 'en-US');
      if (!loggedVoices) {
        console.info(`[number-blocks] ${p.lang} voice → ${v ? `${v.name} (${v.localService ? 'local' : 'NETWORK'})` : 'system default'}`);
      }
    } else {
      u.lang = p.lang === 'zh' ? 'zh-CN' : 'en-US';
    }
    u.rate = rate;
    u.pitch = 1.05;
    u.onstart = () => { started = true; unspoken = null; };
    holdUtterances.push(u);
    try { synth.speak(u); } catch { /* ignore */ }
  }
  if (attempt === 0) loggedVoices = true;
  armWatchdog();
  // if nothing audibly started, the engine swallowed the queue (silent network
  // voice, voices still loading, a cancel() race, or blocked pending a gesture)
  setTimeout(() => {
    if (token !== speakToken || started || synth.speaking) return;
    if (attempt === 0) {
      refreshVoices();
      try { synth.cancel(); } catch { /* ignore */ }
      console.info('[number-blocks] speech never started — retrying with the system default voice');
      setTimeout(() => {
        if (token === speakToken) queueParts(parts, rate, token, 1);
      }, 120);
    } else {
      // even the voiceless retry never started — replay on the next tap
      unspoken = { parts, rate };
    }
  }, 1200);
}

/**
 * speak({en, zh}) — respects the language mode:
 * 'zh'/'en' speak one language; 'both' speaks 中文 then English.
 * The native speechSynthesis queue plays the parts in order.
 */
let warnedOff = false;

export function speak(msg, { interrupt = true } = {}) {
  const s = getSettings();
  if (!('speechSynthesis' in window)) return;
  if (!s.audio.master || !s.audio.voice) {
    if (!warnedOff) {
      warnedOff = true;
      console.info('[number-blocks] speech is switched OFF in settings (⚙️ → 声音 → 语音朗读) — sfx may still play');
    }
    return;
  }
  warnedOff = false;
  if (msg == null) return;
  if (typeof msg === 'string' || typeof msg === 'number') msg = { en: String(msg), zh: String(msg) };

  const parts = [];
  if (s.language === 'zh') {
    parts.push({ text: msg.zh ?? msg.en, lang: 'zh' });
  } else if (s.language === 'en') {
    parts.push({ text: msg.en ?? msg.zh, lang: 'en' });
  } else {
    if (msg.zh) parts.push({ text: msg.zh, lang: 'zh' });
    if (msg.en && msg.en !== msg.zh) parts.push({ text: msg.en, lang: 'en' });
  }

  const clean = parts.filter((p) => p.text);
  if (!clean.length) return;

  const synth = speechSynthesis;
  const token = ++speakToken;
  try { if (synth.paused) synth.resume(); } catch { /* ignore */ }
  if (interrupt) {
    try { synth.cancel(); } catch { /* ignore */ }
  }
  clearTimeout(speakTimer);
  // give the engine a beat to settle after cancel(); rapid re-speaks
  // (e.g. fast counting taps) collapse to the latest request
  speakTimer = setTimeout(() => {
    if (token !== speakToken) return;
    queueParts(clean, s.audio.rate || 1, token, 0);
  }, interrupt ? 80 : 0);
}

export function stopSpeech() {
  speakToken++;
  unspoken = null;
  clearTimeout(speakTimer);
  clearInterval(watchdogTimer);
  watchdogTimer = null;
  if ('speechSynthesis' in window) {
    try { speechSynthesis.cancel(); } catch { /* ignore */ }
  }
}

/** Delegated tap-to-speak: any element with data-say-zh / data-say-en talks. */
export function initTapToSpeak() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-say-zh],[data-say-en]');
    if (!el) return;
    sfx.tap();
    speak({ zh: el.dataset.sayZh || el.dataset.sayEn, en: el.dataset.sayEn || el.dataset.sayZh });
    if (el.classList.contains('nb-char')) {
      el.classList.remove('anim-jump');
      void el.offsetWidth; // restart the animation
      el.classList.add('anim-jump');
    }
  });
}

// -------------------------------------------------------------------- SFX

function sfxOn() {
  const s = getSettings();
  return s.audio.master && s.audio.sfx;
}

function tone({ f = 440, f2 = null, at = 0, dur = 0.15, type = 'sine', gain = 0.16 }) {
  if (!sfxOn()) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const now = ctx.currentTime + at;
  o.type = type;
  o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g).connect(ctx.destination);
  o.start(now);
  o.stop(now + dur + 0.05);
}

const PENT = [0, 2, 4, 7, 9]; // major pentatonic — the counting do-re-mi

export const sfx = {
  tap: () => tone({ f: 550, f2: 880, dur: 0.07, gain: 0.1 }),
  /** rising note per counted block, like the show's counting */
  pop: (i = 0) => {
    const semi = PENT[i % 5] + 12 * Math.min(2, Math.floor(i / 5));
    tone({ f: 523.25 * Math.pow(2, semi / 12), dur: 0.18, type: 'triangle', gain: 0.2 });
  },
  flip: () => tone({ f: 300, f2: 900, dur: 0.09, type: 'triangle', gain: 0.12 }),
  whoosh: () => tone({ f: 900, f2: 180, dur: 0.25, gain: 0.09 }),
  correct: () => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ f, at: i * 0.09, dur: 0.16, type: 'triangle', gain: 0.18 })
    );
  },
  wrong: () => {
    tone({ f: 330, at: 0, dur: 0.16, gain: 0.1 });
    tone({ f: 262, at: 0.14, dur: 0.2, gain: 0.1 });
  },
  star: () => {
    tone({ f: 1318.5, dur: 0.12, type: 'triangle', gain: 0.16 });
    tone({ f: 1568, at: 0.08, dur: 0.14, type: 'triangle', gain: 0.16 });
  },
  win: () => {
    [392, 523.25, 659.25].forEach((f, i) => tone({ f, at: i * 0.12, dur: 0.12, type: 'triangle', gain: 0.18 }));
    [783.99, 523.25, 659.25].forEach((f) => tone({ f, at: 0.36, dur: 0.42, type: 'triangle', gain: 0.13 }));
  },
};
