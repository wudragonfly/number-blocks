# Number Blocks 数字方块 — Design Document

A bilingual (中文/English), Numberblocks-inspired math playground for kids aged 3–10.
Static site, zero build step, deployable straight to GitHub Pages, designed for desktop
and iPad browsers.

---

## 1. Goals & lessons from v1

**Goals**

- Make math *feel* like play: living block characters, sound, motion, celebration.
- Cover the full arc from age 3 to 10: counting → composition → + − × ÷ → fractions →
  decimals & percent.
- Bilingual by design (Chinese / English / Both), with voice everywhere.
- One shared engine so a new game is ~one file, not a new website.

**What v1 got wrong (github.com/wudragonfly/number-blocks)**

| v1 problem | v2 answer |
|---|---|
| 6 standalone HTML pages, ~7,400 lines, CSS+JS fully duplicated per page | SPA: one `index.html`, shared core modules, each game is a single ES module |
| Blocks were plain colored squares | Parametric SVG characters: faces, moods, limbs, blinking, per-number identity |
| Only counting/composition/+/−/× | 9 games through decimals & percent, 5 difficulty levels each |
| Per-page ad-hoc settings | One settings store + one settings UI (global + per-game sections) |
| No progress, no reward loop | Stars per game/level, streaks, confetti, celebration screens |
| Full page reload between games; audio re-unlock every page | Hash-routed SPA: audio unlocked once, instant navigation |

## 2. Audience, pedagogy & difficulty model

Every game has **levels 1–5**. Levels are *per-game progressions*, not ages; each game
card shows a recommended age range, and each level shows a bilingual descriptor
(e.g. Addition L2 = "和 ≤ 10 · Sums to 10"). A **global default level** seeds any game
the child hasn't played; each game remembers its own level afterwards.

Feedback policy (uniform across games):

1. Wrong answer #1 → gentle wobble + encouraging voice line + **hint** (visual aid).
2. Wrong answer #2 → **reveal** the answer with a spoken explanation, then move on.
3. Correct → chime, confetti burst, characters celebrate, rotating praise lines.
4. 3-correct streak → bonus fanfare. End of session → star screen (always ≥ 1 star:
   3★ ≥ 90% first-try accuracy, 2★ ≥ 65%, else 1★).

Sessions are short by design: **8 rounds** per quiz (Memory Match is one board).

## 3. Information architecture

```
#/               Home — hero parade of characters 1–10 (tappable), game grid
#/game/<id>      A game (level pill, round dots, board, input area)
Settings modal   Reachable from every page (gear). Game pages add that game's section.
```

Header (persistent): Home button ← · page title · 🔊 quick mute · ⚙ settings.
Back to the main page = Home button or browser Back (hash history).

## 4. Tech stack & constraints

- **Vanilla ES modules.** No build, no dependencies. `index.html` + `css/*` + `js/*`.
  Games are lazy-loaded with dynamic `import()`.
- **Hash routing** (`#/game/addition`) — works on GitHub Pages with zero 404 config,
  relative paths only, so it runs at `user.github.io/repo/` or any subpath.
- **Targets:** iPadOS Safari 15+, desktop Chrome/Safari/Firefox/Edge. Touch-first,
  keyboard-enhanced (number keys, 1–4 for choices, Enter).
- **Persistence:** `localStorage` under `nb.*` keys. No network calls at all — the site
  is fully self-contained and works offline once loaded (PWA manifest included for
  "Add to Home Screen"; a service worker is future work).

## 5. Visual design system

**World:** the Numberlandia feel — sky-gradient background, drifting CSS clouds, sun,
green grass footer. Game boards sit on a soft white rounded card for readability.

**Typography:** `ui-rounded` / system rounded stack + `PingFang SC` for Chinese.
No webfonts (offline-friendly, fast). Big sizes: prompts ≥ 28px, choices ≥ 32px.

**Touch:** minimum 64px targets, choice buttons ≥ 88px tall, `touch-action:
manipulation`, no text selection on boards, safe-area insets, `dvh` + `--vh` fallback.

**Number identity palette** (CSS vars `--nb1…--nb10`, used everywhere):

| n | color | n | color |
|---|---|---|---|
| 1 | red `#ee3a30` | 6 | indigo `#5c5cc5` |
| 2 | orange `#f7941d` | 7 | rainbow (one hue per block) |
| 3 | yellow `#ffd100` | 8 | magenta `#ec008c` |
| 4 | green `#3db54a` | 9 | grey `#8d99ae` |
| 5 | blue `#2d9cdb` | 10 | red + white band |

Numbers > 10 render as **place-value composites**: same-unit ten-rods + a ones tower
with one face on the lead rod — one big character, show-style.

**Motion:** transform/opacity only. Idle bounce, blink loop, pop-in, celebrate-jump,
wrong-wobble, merge/split animations. `prefers-reduced-motion` disables idle motion.

## 6. Character renderer (`js/core/blocks.js`)

`renderBlockChar(n, opts) → <span class="nb-char">…<svg>` — the heart of the look.

- **Arrangements:** `tower` (1-wide stack, canonical character), `array {cols}`
  (multiplication), `tenframe` (counting), `rod` (horizontal).
- **Unit block:** rounded square, chunky darker border, top highlight — cartoon depth.
- **Face** on the top block: white eyes + pupils + shine; **One has one eye**;
  **Four has square eyes**; everyone else round. Moods: `happy, excited, sad,
  surprised, ghost` (unknown quantity: dashed outline + "?" face).
- **Limbs** (optional): stick arms/hands and feet for hero-size characters.
- Blink via CSS animation with per-instance random delay; every character carries
  `data-say` so tapping it speaks its number (see §7).
- Also exports: `renderTensOnes(n)` (place value), `renderTenFrames(n)`,
  `numberColor(n) → {main, dark, light}`.

**IP note:** characters are an original parametric homage to the show's visual grammar
(stacked unit cubes, color-coded numbers, one eye for One) for personal, educational
use — no official assets, names, or logos are copied. Not affiliated with or endorsed
by the rights holders.

## 7. Audio system (`js/core/audio.js`)

- **Voice: Web Speech API.** Voice pick order — saved preference → best-known local
  voice (en: Samantha/Karen/Daniel…, zh: Tingting/婷婷/Meijia…) → any matching lang.
  Voice pickers live in Settings; rate control (slow/normal) for young ears.
- `speak({en, zh})` respects the language mode: `zh` / `en` speak one language;
  `both` speaks 中文 first, then English via the native utterance queue.
- **Wedge-proofing:** speak defers ~80ms after `cancel()` (same-tick cancel→speak
  drops/wedges on WebKit; rapid re-speaks collapse to the latest), `resume()` is
  poked on every tap and by a 1.5s watchdog while speaking (cures stuck-paused
  engines and Chrome's stalled queue; a >20s "short" utterance forces a reset),
  and in-flight utterances are strongly referenced (Chrome GC bug).
- **iOS unlock:** first `pointerdown` anywhere resumes the `AudioContext` and primes
  `speechSynthesis` with an empty utterance; re-primed on `visibilitychange`. Because
  this is an SPA, unlocking happens once per visit.
- **SFX: WebAudio-synthesized** (zero asset files): `tap`, `pop(i)` (rising pentatonic
  notes while counting — the do-re-mi effect), `correct` (major arpeggio), `wrong`
  (soft, kind), `flip`, `whoosh`, `star`, `win` (fanfare).
- **Tap-anything-speaks:** a delegated listener speaks any element with
  `data-say-en`/`data-say-zh` and plays `tap`. All characters and key visuals get it.
- Settings: master / voice / SFX toggles, rate, per-language voice choice.
  Navigation cancels any ongoing speech.

## 8. i18n (`js/core/i18n.js`)

- Modes: `zh` | `en` | `both` (default `both`). `both` renders 中文 primary +
  English secondary (CSS controls visibility via `body[data-lang]`), and speaks
  中文 → English.
- All strings are `{en, zh}` pairs; `ui.bi()` renders them; games never hardcode text.
- **Verbalizers** (needed because TTS can't read "3/4" or "0.35" correctly):
  - `numWords(n)` → "twenty-three" / 「二十三」 (0–9999)
  - `fracWords(a, b)` → "three quarters" / 「四分之三」
  - `decWords(x)` → "three point one four" / 「三点一四」
  - `pctWords(p)` → "thirty-five percent" / 「百分之三十五」
  - equation helpers for `a + b = ?`, `a × b = ?`, etc.

## 9. Settings (`js/core/settings.js`, `nb.settings`)

```js
{
  language: 'both' | 'zh' | 'en',
  audio: { master, voice, sfx, rate, voiceEn, voiceZh },
  defaultLevel: 1..5,           // seeds games never played
  perGame: { [id]: { level, ...gameOptions } }
}
```

One modal UI: 语言 Language → 声音 Sound → 难度 Default level → (when opened inside a
game) that game's level + its declared options → reset progress. Games declare extra
options *declaratively* (`extraSettings: [{key, label, options}]`) and the modal
renders them — no per-game settings UI code. Changes broadcast via a subscribe API;
the current page re-renders text/voices live.

## 10. Game engine (`js/core/quiz.js`)

`runQuiz(container, game, {level})` owns the loop; a game module is data + a
round factory:

```js
export default {
  id, name, rounds: 8,
  levelHints: { 1: {en,zh}, … 5: {en,zh} },       // shown in level picker
  extraSettings?: [...],
  makeRound(level, roundIndex) => ({
    prompt: {en, zh},              // shown + spoken
    board(el, api),                // draw visuals; api: speak, sfx, submit(v), correct(), wrong()
    input: 'choices'|'numpad'|'custom',
    choices?: [{label|node, value, say?}],
    answer?: value,
    hint?(el), reveal?(el),        // feedback policy hooks (§2)
    explain?: {en, zh},
    onCorrect?(el)                 // e.g. play the merge animation
  })
}
```

The engine renders round dots, speaks prompts, builds choice buttons or a big numpad,
enforces the hint→reveal policy, tracks first-try accuracy and streaks, then shows the
star **end screen** (replay / next level / home). `endScreen()` is exported separately
so board-style games (Memory Match) reuse it. Progress (`js/core/progress.js`,
`nb.progress`) records stars/best per game+level; home tiles show total stars.

## 11. Game specifications (levels 1→5)

**counting · 数一数** (ages 3–6) — Tap blocks to count: each tap lights the block,
plays a rising note, and speaks the count. Round types: count-then-pick-numeral,
"find N" among characters, and (L3+) read tens+ones composites.
L1 1–5 · L2 1–10 · L3 1–20 with ten-frames · L4 to 50, count by 2/5/10 · L5 to 100 &
place value (tens/ones).

**composition · 分与合** (ages 4–7) — The signature split: character N breaks into A
and a ghost "?" part; find the missing part (number-bond model).
L1 N ≤ 5 · L2 N ≤ 8 · L3 make-10 focus · L4 N ≤ 20 · L5 three parts / make-100 with
tens.

**addition · 加法** (ages 4–9) — Two characters walk together and **merge** into the
sum after you answer.
L1 sums ≤ 5 · L2 ≤ 10 · L3 ≤ 20 crossing ten (make-ten visual hint) · L4 two-digit,
numpad, carrying (rods+ones visual) · L5 missing addend & three addends.

**subtraction · 减法** (ages 4–9) — Blocks hop away; what's left?
L1 within 5 · L2 within 10 · L3 within 20 (borrow shown by breaking a ten-rod) ·
L4 two-digit, numpad · L5 missing subtrahend & difference ("7比3多几?").

**multiplication · 乘法** (ages 6–10) — Arrays and equal groups build row-by-row with
sound; skip counting aloud.
L1 equal groups & skip count 2/5/10 · L2 tables 2·3·4·5·10 · L3 all tables to 9×9 ·
L4 missing factor & squares · L5 2-digit × 1-digit via tens/ones partial arrays.
Extra setting: choose which tables to practice.

**division · 除法** (ages 7–10) — Sharing: blocks fly one-by-one onto plates;
leftovers shrug (remainders).
L1 halves within 10 · L2 ÷2/÷5/÷10 · L3 all table facts · L4 remainders · L5 2-digit ÷
1-digit with remainder.

**fractions · 分数** (ages 6–10) — Bar, pie and set models; shade, identify, compare.
L1 halves & quarters · L2 unit fractions to 1/8 (shade it yourself) · L3 non-unit +
same-denominator compare · L4 equivalents & fraction of a set · L5 add same-denominator
& mixed numbers intro.

**decimals · 小数·百分数** (ages 8–10) — Hundred-grid (100 mini blocks) links
fraction ↔ decimal ↔ percent; number line for tenths.
L1 tenths on a bar · L2 hundredths on the grid · L3 the triple match 1/2 = 0.5 = 50% ·
L4 compare/order decimals, percent of round amounts · L5 percent of any amount,
decimal sums to 1, mini "sale price" stories.

**memory · 记忆配对** (ages 3–10) — Classic flip-and-match board; every flip speaks
the card. Pairs by level: L1 numeral↔character 1–5 (6 cards) · L2 1–10 (12) ·
L3 sum↔total (12) · L4 product↔total (16) · L5 fraction↔percent↔decimal (16).
Extra setting: pair theme override. Stars by move efficiency.

## 12. File structure & how to add a game

```
index.html            css/base.css        js/main.js           js/games/registry.js
manifest.json         css/components.css  js/core/storage.js   js/games/counting.js
assets/favicon.svg    css/blocks.css      js/core/settings.js  … one file per game
DESIGN.md  README.md  css/games.css       js/core/i18n.js  audio.js  blocks.js
.nojekyll                                 ui.js  quiz.js  confetti.js  progress.js  router.js
```

**Add a new game checklist:** ① create `js/games/<id>.js` exporting the contract in
§10 · ② add one entry to `registry.js` (id, bilingual name, tagline, ages, color,
icon) · ③ done — routing, settings, level picker, stars, audio, i18n all come free.

## 13. QA plan

- Serve locally (`python3 -m http.server`), drive with a headless browser: screenshot
  home + every game at desktop (1280×800) and iPad (1024×768 landscape, 768×1024
  portrait); click through full rounds of several games; zero console errors allowed.
- Manual: iPad Safari — audio unlock, TTS zh/en voices, both-mode sequencing,
  add-to-home-screen, orientation change mid-game.
- State: settings & stars survive reload; browser Back exits a game to Home.

## 14. Risks & future work

- **TTS voice availability varies** by device → voice picker + graceful silence +
  everything readable on screen. | **Both-mode chaining on iOS** → timer fallback.
- Future: service-worker offline cache, per-child profiles, adaptive difficulty,
  recorded voice packs behind the same `speak()` API, more games (clock, money,
  comparison, negative numbers), Numberblocks-style "figure it out" video moments.
