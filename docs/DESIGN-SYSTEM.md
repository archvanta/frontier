# Design system

Derived from `docs/design/reference-analysis.md` (v2: the "Signal AI — The Future Moves Fast" mockup, the Sigma and Resflow site recordings). Tokens: `src/styles/tokens.css`. Components: `src/components/`.

## Direction
Black by default, white on request, always the same system: a full-width header bar, white and violet pill buttons, drop-down panels with icon tiles, and large rounded **gradient cards** with a muted label over a big light title and the story's real image as an inset preview (the look of the owner's Sigma reference screenshots, 2026-10-20). News stays editorial (real images, sharp type, hairlines between feed rows). No glass or blur anywhere: surfaces are opaque. The one decorative light is the deep navy-to-violet glow behind hero slides that have no photo.

## Colour
Tokens: `src/styles/tokens.css`. Dark values are `:root`; `html[data-theme='light']` redefines the surface, line, text, overlay, button and header tokens.
| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg`, `--bg-navy` | `#000000`, `#050507` | `#ffffff`, `#f7f7fa` | Page foundation |
| `--surface-1/2/3` | `#0a0a0d` / `#101014` / `#18181e` | `#f5f5f8` / `#ececf1` / `#e2e2ea` | Opaque panels (filter panel, Weekly Brief, status, tables, track behind tabs) |
| `--line`, `--line-strong` | white at 8% / 16% | ink at 10% / 20% | Hairlines |
| `--text`, `--text-2`, `--text-3` | `#f5f6f8`, `#b7bac4`, `#8b8f9c` | `#0b0b10`, `#3f4250`, `#5c5f6e` | Body ≥ 4.5:1 on every surface in both themes (axe-checked) |
| `--accent` | `#5b9dff` | `#2459d6` | Active states, links, focus ring, current-page underline, rank numerals, score rings |
| `--btn-primary-bg/ink` | white / near-black | near-black / white | Primary pill (solid white in dark) |
| `--btn-secondary-*` | violet-tinted translucent, white type | pale violet, deep violet type | Secondary pill |
| `--btn-dark-*` | `#202024` | `#ececf1` | Utility pills (search, language, theme, menu) |
| `--tone-violet/blue/indigo/teal/crimson` | vertical gradients, deep at the top to saturated at the foot | same | Story-card, wall-card and menu-tile fills; always carry white type |
| `--ov-1…3`, `--well` | white overlays | ink overlays | Hover fills, kbd hints, input wells |
| `--warn`, `--danger`, `--ok` | amber, coral, green | darker amber, red, green | Source health, mock banner, errors |

Surfaces that stay dark in the light theme (the hero, gradient cards, wall cards) re-declare the dark text, accent and button values (`html[data-theme='light'] :is(.news-hero, .story-card[data-tone], .wall-card[data-tone])`), so nothing inside them needs a light variant.

Category → tone: models violet, research blue, products indigo, business teal, policy crimson, open-source teal, hardware indigo, safety crimson (`src/lib/tones.ts`, together with the category icons).

## Themes
- **Switch**: the sun/moon button in the header (`ThemeToggle`; its label names the theme it switches to). Dark is the default.
- **Persistence**: `localStorage['signal-ai:theme']`. `public/theme-init.js` is a tiny blocking classic script in `<head>` (allowed by the production CSP's `script-src 'self'`) that sets `data-theme` before first paint, so there is no flash; `src/lib/theme.ts` keeps the `theme-color` meta in sync and exposes `useTheme()`. Storage being blocked falls back to dark.
- **Light-theme specifics**: the hero stays a dark stage (white type over the photo or gradient) with rounded bottom corners instead of fading into the page; gradient cards keep their dark gradients and white type; primary buttons invert to near-black.

## Surfaces
| Class | Treatment | Used on |
|---|---|---|
| `.surface` | opaque `--surface-1`, 1px `--line-strong`, soft shadow | Explore filter panel |
| `.pill-track` | opaque `--surface-2` with a hairline | Track behind the Top Signals / Picks tabs and the Latest News category chips |
| Header, drop-down panels | `--header-bg` (near-black gradient with a faint warm glow), `--panel-bg` (dark glossy gradient), 1px `--panel-line`, inner top highlight | Header bar, nav panels, mobile menu |

There is no `backdrop-filter` anywhere.

## Hero backdrop
Slides without a usable photo (or whose photo failed or is under 640px wide) sit on `.nh-backdrop`: layered CSS radial gradients (violet at the foot on the reading side, blue at the opposite corner, a faint lift at the top) over `#07050f`. No canvas, no WebGL, no dependency. It mirrors in RTL.

## Type
- **San Francisco, where the visitor already has it.** Latin text (display, body, labels) uses `-apple-system` / `BlinkMacSystemFont` (SF on Apple devices) and a locally installed `SF Pro Display` / `SF Pro Text` / `SF Pro` (for example from [SFWindows](https://github.com/bradleyhodges/SFWindows)); mono labels use `ui-monospace` / `SF Mono`. Everyone else gets **Inter** (variable, self-hosted, OFL) as the visible stand-in, with **JetBrains Mono** behind the mono stack.
- **No Apple font file is shipped or committed.** Apple's San Francisco licence limits the font to UI mock-ups for Apple platforms and forbids embedding, redistributing it or using it in website content, so the stack only *names* fonts that are already on the visitor's device. Do not add SF/New York files to `public/` or `src/` unless Apple's terms change or the owner decides to take that risk in writing.
- Hierarchy: hero (uppercase, −0.035em, up to 3.4rem), section titles (uppercase), lead/feature headlines; meta is sans, not mono. Labels (kicker, eyebrow, chips, rank) are mono, uppercase, tracked.
- Persian: **Vazirmatn** for all text in `fa` (SF has no Persian glyphs, and `-apple-system` would otherwise fall back to a system Arabic face); uppercase/tracking removed. `html[lang='fa']` and any `[lang='fa']` element redefine `--font-display` / `--font-body` to Vazirmatn. The Latin-only brand marks (wordmark, footer brand, source initials) use `--font-latin` so they stay SF/Inter in Persian pages.
- Fluid scale `--fs-xs` … `--fs-3xl`, `--fs-hero`. Web fonts are self-hosted through Fontsource (Inter, JetBrains Mono, Vazirmatn; all OFL). Space Grotesk was removed.

## Layout
- Container 1320px, gutter `clamp(1rem, …, 2rem)`, 4px spacing scale, `--section-gap` between major sections.
- **Header**: a full-width sticky bar (68px) on a near-black gradient with a faint warm glow and a hairline underneath. Inline-start: the SIGNAL AI mark (rounded gradient tile with the signal bars) and wordmark. Then plain grey links, white when current with a short accent underline: Top Signals, **Picks ▾** (Daily / Weekly / Monthly), **Categories ▾** (the eight categories), Explore, **More ▾** (Archive, Sources, Method). Inline-end: dark search pill (`/` focuses it), dark FA/EN pill, dark theme button and a solid white **Saved** pill. Mirrored in Persian.
- **Drop-downs** (`NavGroup` in `Header.tsx`): a disclosure button (`aria-expanded`) opens a dark glossy panel with a 1px border; each row is a rounded gradient icon tile, a white title, a grey one-line description and a hairline divider. Click toggles; one panel at a time; ArrowDown on the button enters the panel, Arrow/Home/End move between rows, Escape closes and returns focus to the button, an outside click, focus leaving or navigation closes. The current page is `aria-current`.
- **≤1180px** the nav becomes a full-width panel under the bar (menu button), groups turn into accordions with the same rows, and Saved moves into the list.
- **Hero (news carousel)**: edge to edge, directly under the header bar (rendered through a portal into `#hero-slot`, outside the width-limited column). **The first screen is the hero and nothing else**: the stage reaches from its own top (measured as `--nh-top`: the header, plus the mock banner in mock builds) to the bottom of the viewport (`100svh`, never below 30rem), so Top Signals starts below the fold. The copy sits bottom-start in flow: category label (accent), headline (never clamped), up to 3 lines of excerpt (2 on short screens), source · time, "Read full story" and "Read at source". The slider controls are compact and quiet along the hero's bottom edge, inside it and inside the viewport. See below for behaviour.
- **Top Signals**: a large gradient feature card (#1: rank and muted category label, big light title, excerpt, source · time · actions, the photo filling a rounded frame that sits inside the card with room below), two split gradient cards (#2–3: copy beside a rounded image), then "Also ranking" text rows (#4–6). Daily/Weekly/Monthly tabs are a segmented control whose active segment is the primary pill.
- **Signal wall**: the newest real headlines as mini cards in four tilted vertical marquee columns, faded into the black page at every edge.
- **Latest News**: chronological day sections beside a sticky aside (Weekly Brief + Signal status). Each day: a wide gradient lead card, three three-up cards (icon tile top-left, "Read" pill top-right, title, full excerpt, meta, divider, the photo filling a rounded frame that sits inside the card with room below), then a two-column open list. Category chips filter the loaded days in place.
- ≤1080px the aside drops above the feed; ≤760px lists and secondaries go single-column.

## News carousel (`NewsHero`)
- **Stories** (`lib/heroStories.ts`): today's top-ranked daily picks first, then the newest stories, only those with a genuine feed/og image (never category art or brand art), up to 6, no duplicates. If fewer than 3 have a real image the carousel is filled to 3 with the next stories (their slide shows the gradient backdrop instead of a photo). No stories: the brand intro (`THE WORLD IS CHANGING. TRACK THE SIGNAL.`) on the gradient backdrop.
- **Timing**: 5 s per story, counted in visible, un-paused time; crossfade 1.2 s, slow zoom 1.09 → 1, copy rises in with a short stagger. Loops. Any manual change restarts the timer.
- **Pauses**: pointer hover, keyboard focus, hidden tab, hero less than 35% visible, and the explicit pause button. Under `prefers-reduced-motion` there is no autoplay, zoom or text motion; the button starts it on request.
- **Input**: clickable indicators (the active one fills with the accent as progress), prev/next, arrow keys (flipped in RTL), touch swipe ≥ 50px (flipped in RTL).
- **Images** (`lib/imageFit.ts`, judged from the natural size once loaded and remembered per URL): **cover** (fills the stage) only for wide, large photos (≥1000px wide, ratio 1.45–2.3); otherwise **contain**: the whole picture, rounded and framed on the end side (stacked above the copy below 900px), over a blurred, darkened copy of itself; a failed, small (<480×270) or extreme (ratio <0.8 or >3.2) image is dropped for the gradient backdrop. A strong scrim keeps the headline readable on any photo. First image high priority, the next one preloaded, others not mounted until visited.
- **Headline fit**: `fitSlides` shrinks each slide's headline (`--nh-scale`, steps of 0.05, floor 0.55) until its copy fits between the header and the controls; below the floor the hero grows instead of clipping. Re-fitted on resize, font load, locale change and image judgement. Checked with the longest real English and Persian headlines at 360×640 to 1920×1080 (`e2e/first-screen.spec.ts` checks every slide: label and headline below the header, buttons above the controls, controls inside the viewport, Top Signals below the fold).
- **A11y**: carousel/slide roles, inactive slides `inert` + `aria-hidden`, live region off while rotating, one visually hidden `h1` with the brand line, slide titles are `h2`.

## Signal wall (`SignalWall`, `Marquee`)
Port of the 21st.dev "3D testimonials" Marquee to plain CSS keyframes (props `vertical`, `reverse`, `pauseOnHover`, `repeat`; the same translate-by-one-track loop; the same `perspective` + `rotateX/Y/Z` plane, mirrored in RTL). Tailwind and shadcn were deliberately not introduced for one component: the site is plain CSS with tokens and logical properties. Cards are real stories (thumbnail, category, headline, source · time). The moving wall repeats stories listed in full below, so it is `aria-hidden` and its links are out of the tab order; with reduced motion, or under 6 stories, a plain grid of real links replaces it. Columns pause on hover, off-screen and in hidden tabs.

## Components
`Header` (`Wordmark`, `NavGroup`, `LangSwitch`, `ThemeToggle`), `NewsHero`, `SignalWall`, `Marquee`, `PicksPanel`, `StoryCard` (feature / split / lead / grid / list / row), `StoryImage` (fixed-ratio rounded frame that always sits fully inside the card, filled edge to edge by the photo with `object-fit: cover`; a broken or tiny (<240×120) photo removes the media block and the card goes text-only, `is-text-only`), `WeeklyBrief` (`ScoreRing`), `SignalStatus`, `DaySection`, `Pagination`, `ScoreExplain`, `States`, `Footer`/`LastUpdate`.

Category fallback art (`scripts/make_fallbacks.py`): black with soft blue light, a small tile and the glyph in blue; it works on every card tone and in both themes.

## Motion
- Card entry fade/rise 520 ms; image zoom 1.035 and an underline that draws under the title on hover; drop-down panel fade/slide 220 ms; live-dot pulse; skeleton shimmer. (A site-wide motion system, page transitions and a theme-switch transition are a separate step.)
- Everything is disabled under `prefers-reduced-motion` (`--dur: 0ms`, animations off): the carousel does not autoplay and the marquee is off. The intro video (`public/videos/`) is kept but no longer used.

## Accessibility
- Skip button to main, visible blue focus ring, landmarks, one `h1` per page, `aria-current` on nav/pagination, `aria-pressed` on bookmarks, language buttons and filter chips, `aria-expanded` on drop-down buttons, a labelled theme button, ARIA tabs with RTL-aware arrow keys.
- Feed text is rendered as text only; titles get `dir="auto"` and `lang`.

## RTL
Logical CSS properties throughout; directional icons flip (`.icon-dir`, `.icon-back`); the hero backdrop and its text mirror under `[dir='rtl']`; the header, drop-downs and cards mirror through logical properties.
