# 数字方块 · Number Blocks

Bilingual (中文/English) math games for kids aged 3–10, styled after the block
characters kids love — counting, number bonds, + − × ÷, fractions, decimals &
percent, and a memory match game. Voice everywhere, stars to earn, and five
difficulty levels per game.

**Design:** see [DESIGN.md](DESIGN.md). **Stack:** plain HTML/CSS/JS ES modules —
no build step, no dependencies.

## Play locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(Any static file server works; ES modules require http://, not file://.)

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Repo → Settings → Pages → Source: *Deploy from a branch* → `main` / root.
3. Visit `https://<user>.github.io/<repo>/`. All paths are relative, so any
   subpath works. Hash routing means no 404 configuration is needed.

## Features

- 🎮 9 games × 5 levels (age 3 → 10), one shared engine
- 🗣️ Voice via the Web Speech API — 中文 / English / 双语 (speaks both)
- 🎵 Sound effects synthesized with WebAudio (zero audio files)
- 🧒 iPad-friendly: big touch targets, no zoom/scroll traps, add-to-home-screen
- ⭐ Stars saved per game & level (localStorage), settings shared across games
- ⚙️ Global + per-game settings in one menu (language, voices, speed, levels)

## Add a new game

1. Create `js/games/<id>.js` exporting `{ id, levelHints, makeRound(level) }`
   (quiz game) or `{ id, levelHints, mount(container, ctx) }` (custom board).
2. Add one entry to `js/games/registry.js` (name, tagline, ages, color, icon).

Routing, level picker, settings, stars, audio, and i18n come free. Details in
DESIGN.md §10–12.

## Note

A fan-made educational homage. Not affiliated with, or endorsed by, the
creators of the Numberblocks™ television show; no official assets are used.
