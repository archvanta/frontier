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

## v2 references (redesign, 2026-10-19)
Same method: ffprobe + 4-frame-per-16 s contact sheets in a session scratch folder; nothing committed.

**"Signal AI — The Future Moves Fast" mockup (1586×992 still)** — observed: signal-bars wordmark with lime "AI"; text nav with a lime underline on the active item; a wide violet-lit hero banner with an uppercase two-line headline (lime on key words), lime pill CTA plus a ghost "Watch the intro" pill, imagery on the right; "TOP SIGNALS" with one large image-led card and two stacked horizontal cards; "LATEST NEWS" with category filter pills next to a "WEEKLY BRIEF" panel listing numbered items with circular scores; a one-line footer with feature icons.

**`detail-video-1728 2.mp4` (52.8 s) = the earlier "Sigma" recording** — observed: violet→blue→cyan gradients, large clean sans headlines with dimmed second lines, white pill CTAs, rounded gradient panels, frosted toggles (the Wi-Fi panel is the clearest liquid-glass surface), blog cards with short excerpts.

**`detail-video-1728.mp4` (62.9 s) = "Resflow" studio site (new)** — observed: near-black, bold condensed uppercase section titles, a lot of empty space, numbered service tiles ("01"), a thin vertical progress rail, b/w photography, FAQ accordion rows, very little colour.

### v2 decisions
| Trait | Decision |
|---|---|
| Mockup composition | Hero banner with copy left / clip right; Top Signals 1 feature + 2 horizontal; Latest News + Weekly Brief side panel with score rings; one-line footer features |
| Sigma lighting & glass | Navy/violet/cyan ambient glows; liquid glass only on header, search/filter, tabs/chips and floating utilities |
| Resflow restraint | Generous section spacing, uppercase display titles, numbered ranks, no decorative motion |
| Mockup's decorative 01/02/03 hero rail | Not used (no function behind it) |
| Mockup headline "AI IS MOVING FAST." | Kept the specified "TRACK THE SIGNAL." line, with the mockup's lime-on-key-word treatment |
| Mockup's cyberpunk hero portrait | Not available as an asset and images are never generated; the real intro clip fills that role |

## v3 references (2026-10-20): Sigma site screenshots
Four stills supplied by the owner replace the glass direction ("exactly this"):
1. Buttons: solid white pill with dark type and a leading icon; secondary is a translucent violet-tinted pill with white type; large radius.
2. Header bar: full width, near-black gradient with a faint warm glow, logo mark + wordmark, grey links with small chevrons for drop-downs, a dark rounded "AI Chat" pill and a white "Download" pill. The open drop-down is a dark glossy rounded panel with a 1px border; rows have a rounded icon tile, a white title over a grey subtitle and thin dividers.
3. Feature cards: large rounded cards with a vertical gradient (violet; teal to green), a muted label over a big light title, the product UI as an inset preview bleeding off the bottom.
4. Three-up cards on black (violet / red / blue): icon tile top-left, "Learn more" pill top-right, title, two-line description, a divider, an illustration below.
Mapping to SIGNAL AI is in `docs/DESIGN-SYSTEM.md` (header, drop-downs, buttons, gradient cards). The WebGL glass fold from the earlier GradFlow reference was removed.
