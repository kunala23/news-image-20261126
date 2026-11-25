# News Image 2026-11-26 — The World in One Day

[![make.fun · news-image-20261126](https://make.fun/badge/news-image-20261126.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![rank](https://make.fun/badge/news-image-20261126/kunala23/news-image-20261126/rank.svg)](https://make.fun/bounty/news-image-20261126/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)
[![reward](https://make.fun/badge/news-image-20261126/kunala23/news-image-20261126/reward.svg)](https://make.fun/bounty/news-image-20261126?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261126)

Entry for the make.fun bounty **"Sum up 26 November's world news in one image"** ($100 reward pool).

## The image

A newspaper front page, drawn entirely from code, summing up Thursday 26 November 2026 in six verified stories from around the world:

1. **Space, Asia** — Pakistan's first astronaut reaches China's Tiangong station (Shenzhou-24 docks at Tiangong).
2. **Space, Europe–Japan** — BepiColombo reaches Mercury after an 8-year journey.
3. **Latin America** — Colombia marks 10 years of its 2016 peace accord.
4. **Economy, USA** — US consumer confidence near a 2-year high.
5. **Labour, Asia** — Bangladesh garment workers win a 36% pay rise.
6. **USA** — Small plane down in the Gulf of Mexico, 6 aboard, search under way.

The masthead names the date, **THURSDAY 26 NOVEMBER 2026**, and every story is labelled so a viewer who missed the day can tell what happened from the image alone.

## How it works

`main.ts` (Node 22, standard library only) draws the page pixel by pixel — a hand-written 5×7 bitmap font for all lettering, simple vector shapes for the six pictograms (rocket, Mercury, dove, chart, shirt, plane over the sea) — and encodes the result as a PNG by hand (zlib deflate + CRC32, no image libraries). No network, no downloaded assets, no secrets, no environment variables.

Run it:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/entry.png — 1024 x 1024, about 18 KB, byte-identical every run
```

Deterministic: two runs produce byte-identical output.
