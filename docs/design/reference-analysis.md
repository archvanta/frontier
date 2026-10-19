# Reference analysis

Method: `ffprobe` metadata + `ffmpeg` contact sheets (one frame every 5 s, 3×3 tiles at 480 px) written to a session scratch folder outside the repo, then viewed. Stills downscaled to 700 px and viewed. Nothing extracted was committed.

## UI reference 01 — `detail-video-1728 (1).mp4` (39.5 s)
**Observed**
- Portfolio/shop site of an illustration studio ("NoGood"): saturated acid-lime (#c6ff3d-ish) full panels next to black and warm off-white panels.
- Large, tight, left-aligned grotesk headlines in black on lime ("Illustration inspired by retro tech and fuelled by open web counterculture").
- Dense modular grid: tiles of different sizes butt together with thin rules; small uppercase mono-style labels ("SHOP > LATEST", "SYSTEM LOG", "DOWNLOADS / BITTORRENT").
- Retro-tech illustration (helmets, cassette decks, CRTs) with inked outlines and screen-print texture; product cards with underlined uppercase captions and prices.
- A dark comments/log panel with rows, timestamps right-aligned, tiny orange accent.
- Sticker-bomb lime/black illustration band in the footer; footer nav as an uppercase list.

## UI reference 02 — `detail-video-1728 (2).mp4` (52.8 s)
**Observed**
- "Sigma" AI-browser marketing site: near-black background with violet→blue→teal gradient glows.
- Clean sans-serif headings, generous spacing, pill buttons (white "Download", dark "AI Chat").
- Rounded cards with gradient fills, product screenshots inside device frames.
- Benchmark section: horizontal segmented bars with numeric multipliers ("1.32× faster").
- Blog row: three image cards with title + short excerpt; FAQ accordion rows in dark surfaces; gradient footer.

## Character stills + hero clip
**Observed**
- Three characters with boxy helmet visors labelled "+CLD+", "+GPT+", "+GEIM+", bold inked outlines, halftone/screen-print grain, cream backgrounds; palettes: Claude = burnt orange/olive, OpenAI = sage/teal with lime badge, Gemini = violet/blue.
- Hero clip (10 s, 1280×720): the three characters working in a cluttered retro lab; subtle motion (oscilloscope traces, hands typing). Dark, warm, low-contrast edges suitable for a text overlay on the left/bottom.

## Assumptions (not directly observed)
- Motion in the references is scroll-driven reveal; I assume short fade/translate on card entry is in keeping.
- I assume the user wants the lime of reference 01 as the signature accent and the dark gradient layering of reference 02 for depth.

## Decisions
| Trait | Decision |
|---|---|
| Acid-lime panels | `--accent: #c6ff3d` for active nav, picks tab, focus ring, score bars, a single lime "signal" strip; never as large text backgrounds behind long copy |
| Black/cream contrast | Near-black surfaces `#0a0b0a` / `#111312` / `#171a18`; cream `#efeadf` for headline text accents |
| Grotesk headlines | Space Grotesk (variable) for display, Inter for body, JetBrains Mono for labels, Vazirmatn for Persian |
| Mono uppercase labels | Category/source/time meta in small mono caps (`SOURCE / 14:05`) |
| Modular grid with rules | 12-col grid, 1px hairline borders `rgba(239,234,223,.1)`, tiles share borders |
| Gradient glows (ref 02) | Very subtle radial violet/teal glow behind the picks module only |
| Benchmark bars (ref 02) | Score explanation uses segmented horizontal bars per factor |
| Screen-print grain | Tiny SVG noise overlay at 3–4% opacity, disabled for reduced motion/data |
| Character art | Only as card art for the three brands, labelled unofficial |
