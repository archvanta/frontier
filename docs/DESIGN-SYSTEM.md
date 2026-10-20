# Design system

Derived from `docs/design/reference-analysis.md` (v2: the "Signal AI — The Future Moves Fast" mockup, the Sigma and Resflow site recordings). Tokens: `src/styles/tokens.css`. Components: `src/components/`.

## Direction
Cinematic, editorial, selectively glass. Deep black and midnight navy foundations lit by violet, electric-blue and cyan glows; acid lime is a *signal*, not a fill. News content stays editorial (sharp type, real images, open layouts); liquid glass is reserved for things you operate.

## Colour
| Token | Value | Use |
|---|---|---|
| `--bg`, `--bg-navy` | `#04050b`, `#070a1a` | Page foundation; navy at the top fading to black |
| `--surface-1/2/3` | `#0a0e1d` / `#0f1427` / `#171d35` | Opaque editorial surfaces (split cards, status, facts, tables) |
| `--line`, `--line-strong` | periwinkle at 10% / 18% | Hairlines between feed rows and sections |
| `--text`, `--text-2`, `--text-3` | `#f2f4fb`, `#b4bad0`, `#8d94ad` | Body ≥ 4.5:1 on every surface (axe-checked) |
| `--violet`, `--blue`, `--cyan` | `#7c5cff`, `#3a6bff`, `#33d6ff` | Lighting only: ambient page glows, hero grade, source marks, fallback art. Never text |
| `--accent` | `#c6ff3d` acid lime | Active states (nav filament, selected tab/chip, current page), rank numerals, score rings, category chips, the one primary CTA |
| `--warn`, `--danger`, `--ok` | amber, coral, green | Source health, mock banner, errors |

## Liquid glass (selective)
| Class | Treatment | Used on |
|---|---|---|
| `.glass` | sheen gradient + `--glass-bg`, 20px blur, inner top highlight, masked gradient edge (`::before`) | Floating header bar, mobile menu, Explore filter panel |
| `.glass-control` | lighter sheen, 12px blur | Top Signals tabs, Latest News category chips, Picks page tabs |
| `.btn.is-glass` | translucent pill | Floating hero utility (play/pause) |
| Weekly Brief | glass-tinted panel without backdrop blur (sticky, so blur would cost scrolling) | Recommendations |

Not glass: story cards, feed rows, day sections, story page. `@supports not (backdrop-filter)` swaps every glass surface for an opaque navy (`--glass-fallback`) so text never sits on unblurred clutter. On scroll the header bar becomes more opaque (`.is-scrolled`).

## Type
- Display: **Space Grotesk** (variable) — hero (uppercase, −0.035em, up to 3.4rem), section titles (uppercase), lead/feature headlines.
- Body: **Inter** (variable); meta is sans, not mono. Labels (kicker, eyebrow, chips, rank): **JetBrains Mono**, uppercase, tracked.
- Persian: **Vazirmatn** for all text in `fa`; uppercase/tracking removed; the English brand headline keeps Space Grotesk and aligns right in RTL.
- Fluid scale `--fs-xs` … `--fs-3xl`, `--fs-hero`. All fonts self-hosted (Fontsource, OFL).

## Layout
- Container 1320px, gutter `clamp(1rem, …, 2rem)`, 4px spacing scale, `--section-gap` between major sections.
- **Header**: floating glass bar, 12px below the top, sticky. Wordmark (lime signal-bars glyph), nav with lit capsule + lime filament for the active page, search well with `/` shortcut, FA/EN segmented switch. ≤1080px nav moves into a glass drop-down that also lists categories.
- **Hero**: one 420px scene (`.hero-frame`, 300–420px on desktop). The intro clip sits at the inline end as a 16:9 plate, colour-graded into the palette (`.hero-grade`, soft-light) and dissolved into the scene with a mask; headline, body and two actions sit in the lit area. ≤1080px the clip fills the scene with a bottom scrim; ≤640px it becomes a 16:9 band above the copy.
- **Top Signals**: one image-led feature (#1, copy over photo, ≥480px), two split secondaries (#2–3, copy beside a dissolving image), then "Also ranking" text rows (#4–6). Daily/Weekly/Monthly tabs.
- **Latest News**: chronological day sections beside a sticky aside (Weekly Brief + Signal status). Each day: the newest story as a large horizontal lead (16:10), the next three as 3:2 image cards, the rest as a two-column list with 4:3 thumbnails. Category chips filter the loaded days in place.
- ≤1080px the aside drops above the feed; ≤760px lists and secondaries go single-column.

## Components
`Header` (`Wordmark`, `LangSwitch`), `HeroVideo`, `PicksPanel`, `StoryCard` (feature / split / lead / grid / list / row), `StoryImage` (fixed ratio, fallback on error), `WeeklyBrief` (`ScoreRing`), `SignalStatus`, `DaySection`, `Pagination`, `ScoreExplain`, `States`, `Footer`/`LastUpdate`.

Category fallback art (`scripts/make_fallbacks.py`): navy with per-category violet/blue/cyan light, a small glass tile and the glyph in lime.

## Motion
- Card entry fade/rise 520 ms; image zoom 1.035 and a lime underline that draws under the title on hover; header opacity on scroll; live-dot pulse; skeleton shimmer.
- Everything is disabled under `prefers-reduced-motion` (`--dur: 0ms`, animations off). The hero video never autoplays then, on ≤640px, or with Save-Data/2G.

## Accessibility
- Skip button to main, visible lime focus ring, landmarks, one `h1` per page, `aria-current` on nav/pagination, `aria-pressed` on bookmarks, language buttons and filter chips, ARIA tabs with RTL-aware arrow keys.
- Feed text is rendered as text only; titles get `dir="auto"` and `lang`.

## RTL
Logical CSS properties throughout; directional icons flip (`.icon-dir`, `.icon-back`); mask gradients on the hero plate and split images flip direction under `[dir='rtl']`.
