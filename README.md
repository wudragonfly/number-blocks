# 数字方块 · Number Blocks

Bilingual (中文/English) math games for kids, hosted on GitHub Pages.

| | Play | Source |
|---|---|---|
| **v2 — new** (2026): 9 games × 5 levels, ages 3–10, block characters, bilingual voice | [wudragonfly.github.io/number-blocks/v2](https://wudragonfly.github.io/number-blocks/v2/) | [`v2/`](v2/) |
| **v1 — classic**: the original counting / addition / subtraction games | [wudragonfly.github.io/number-blocks/v1](https://wudragonfly.github.io/number-blocks/v1/) | [`v1/`](v1/) |

The root page ([wudragonfly.github.io/number-blocks](https://wudragonfly.github.io/number-blocks/)) is a
landing page linking to both versions.

v2 is a zero-dependency, no-build static site — see [`v2/README.md`](v2/README.md) for
development notes and [`v2/DESIGN.md`](v2/DESIGN.md) for the full design doc.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000        (landing page)
# open http://localhost:8000/v2/   (new games)
# open http://localhost:8000/v1/   (classic games)
```
