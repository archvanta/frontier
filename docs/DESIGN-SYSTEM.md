# Design system

Derived from `docs/design/reference-analysis.md` (v2: the "Signal AI — The Future Moves Fast" mockup, the Sigma and Resflow site recordings). Tokens: `src/styles/tokens.css`. Components: `src/components/`.

## Direction
Black, minimal, cinematic. True-black ground with graphite surfaces, white type and **one** accent: luminous blue. News stays editorial (sharp type, real images, open layouts, hairlines instead of boxes); glass is reserved for things you operate. The only decorative light is the blue "glass fold" in the hero. No violet, cyan, lime or lit card gradients.

## Colour
| Token | Value | Use |
|---|---|---|
| `--bg`, `--bg-navy` | `#000000`, `#050507` | Page foundation |
| `--surface-1/2/3` | `#0a0a0d` / `#101014` / `#18181e` | Opaque editorial surfaces (split cards, status, facts, tables, wall cards) |
| `--line`, `--line-strong` | white at 8% / 16% | Hairlines between feed rows and sections |
| `--text`, `--text-2`, `--text-3` | `#f5f6f8`, `#b7bac4`, `#8b8f9c` | Body ≥ 4.5:1 on every surface (axe-checked) |
| `--accent` | `#5b9dff` blue | Active states (nav filament, selected tab/chip, current page), category labels, rank numerals, score rings, the active carousel indicator |
| `--accent-strong` | `#2e6bf0` | Filled accent surfaces (primary button, rank pill); white text, 4.7:1 |
| `--violet`, `--blue`, `--cyan`, `--teal` | blue family only | Legacy token names, now all blues; used by the fallback art and the shader |
| `--warn`, `--danger`, `--ok` | amber, coral, green | Source health, mock banner, errors |

## Liquid glass (selective)
| Class | Treatment | Used on |
|---|---|---|
| `.glass` | sheen gradient + `--glass-bg`, 20px blur, inner top highlight, masked gradient edge (`::before`) | Floating header bar, mobile menu, Explore filter panel |
| `.glass-control` | lighter sheen, 12px blur | Top Signals tabs, Latest News category chips, Picks page tabs |
| Weekly Brief | glass-tinted panel without backdrop blur (sticky, so blur would cost scrolling) | Recommendations |

Not glass: story cards, feed rows, day sections, story page, hero controls (plain translucent black). `@supports not (backdrop-filter)` swaps every glass surface for an opaque graphite (`--glass-fallback`).

## Glass fold (hero atmosphere)
`GlassFold.tsx`: a ~60-line fragment shader (no library, no texture, no network) drawing three layers of flowing blue ribbons with glowing creases, at up to 960px render size and 30 fps. A CSS rendering of the same look (`.glass-fold-static`) sits underneath and is the whole effect when WebGL is missing, the context is lost, motion is reduced, or before the first frame. It runs only while it is on screen, the tab is visible and the active slide has no usable photo; it stops and releases the context otherwise.

## Type
- Display: **Space Grotesk** (variable) — hero (uppercase, −0.035em, up to 3.4rem), section titles (uppercase), lead/feature headlines.
- Body: **Inter** (variable); meta is sans, not mono. Labels (kicker, eyebrow, chips, rank): **JetBrains Mono**, uppercase, tracked.
- Persian: **Vazirmatn** for all text in `fa`; uppercase/tracking removed; the English brand headline keeps Space Grotesk and aligns right in RTL.
- Fluid scale `--fs-xs` … `--fs-3xl`, `--fs-hero`. All fonts self-hosted (Fontsource, OFL).

## Layout
- Container 1320px, gutter `clamp(1rem, …, 2rem)`, 4px spacing scale, `--section-gap` between major sections.
- **Header**: floating glass bar, 12px below the top, sticky, drawn over the hero. Wordmark, nav with lit capsule + blue filament for the active page, search well with `/` shortcut, FA/EN switch. ≤1080px the nav moves into a glass drop-down that also lists categories.
- **Hero (news carousel)**: edge to edge, `clamp(540px, 88svh, 860px)`, starting under the header (rendered through a portal into `#hero-slot`, outside the width-limited column). The current story's real image fills the scene under a soft dark gradient; the copy sits bottom-start: category label (accent), headline, 1–2 line excerpt, source · time, "Read full story" link and a quiet source link. See below for behaviour.
- **Top Signals**: one image-led feature (#1, copy over photo, ≥480px), two split secondaries (#2–3), then "Also ranking" text rows (#4–6). Daily/Weekly/Monthly tabs.
- **Signal wall**: the newest real headlines as mini cards in four tilted vertical marquee columns, faded into the black page at every edge.
- **Latest News**: chronological day sections beside a sticky aside (Weekly Brief + Signal status). Each day: a large lead, three 3:2 image cards, then a two-column list. Category chips filter the loaded days in place.
- ≤1080px the aside drops above the feed; ≤760px lists and secondaries go single-column.

## News carousel (`NewsHero`)
- **Stories** (`lib/heroStories.ts`): today's top-ranked daily picks first, then the newest stories, only those with a genuine feed/og image (never category art or brand art), up to 6, no duplicates. If fewer than 3 have a real image the carousel is filled to 3 with the next stories (their slide shows the glass-fold backdrop instead of a photo). No stories: the brand intro (`THE WORLD IS CHANGING. TRACK THE SIGNAL.`) on the glass fold.
- **Timing**: 5 s per story, counted in visible, un-paused time; crossfade 1.2 s, slow zoom 1.09 → 1, copy rises in with a short stagger. Loops. Any manual change restarts the timer.
- **Pauses**: pointer hover, keyboard focus, hidden tab, hero less than 35% visible, and the explicit pause button. Under `prefers-reduced-motion` there is no autoplay, zoom or text motion; the button starts it on request.
- **Input**: clickable indicators (the active one fills with the accent as progress), prev/next, arrow keys (flipped in RTL), touch swipe ≥ 50px (flipped in RTL).
- **Images**: first image high priority, the next one preloaded, others not mounted until visited. A failed or narrower-than-640px image swaps that slide to the glass-fold backdrop.
- **A11y**: carousel/slide roles, inactive slides `inert` + `aria-hidden`, live region off while rotating, one visually hidden `h1` with the brand line, slide titles are `h2`.

## Signal wall (`SignalWall`, `Marquee`)
Port of the 21st.dev "3D testimonials" Marquee to plain CSS keyframes (props `vertical`, `reverse`, `pauseOnHover`, `repeat`; the same translate-by-one-track loop; the same `perspective` + `rotateX/Y/Z` plane, mirrored in RTL). Tailwind and shadcn were deliberately not introduced for one component: the site is plain CSS with tokens and logical properties. Cards are real stories (thumbnail, category, headline, source · time). The moving wall repeats stories listed in full below, so it is `aria-hidden` and its links are out of the tab order; with reduced motion, or under 6 stories, a plain grid of real links replaces it. Columns pause on hover, off-screen and in hidden tabs.

## Components
`Header` (`Wordmark`, `LangSwitch`), `NewsHero`, `GlassFold`, `SignalWall`, `Marquee`, `PicksPanel`, `StoryCard` (feature / split / lead / grid / list / row), `StoryImage` (fixed ratio, fallback on error), `WeeklyBrief` (`ScoreRing`), `SignalStatus`, `DaySection`, `Pagination`, `ScoreExplain`, `States`, `Footer`/`LastUpdate`.

Category fallback art (`scripts/make_fallbacks.py`): black with soft blue light, a small glass tile and the glyph in blue.

## Motion
- Card entry fade/rise 520 ms; image zoom 1.035 and a accent underline that draws under the title on hover; header opacity on scroll; live-dot pulse; skeleton shimmer.
- Everything is disabled under `prefers-reduced-motion` (`--dur: 0ms`, animations off): the carousel does not autoplay, the shader and the marquee are off. The intro video (`public/videos/`) is kept but no longer used.

## Accessibility
- Skip button to main, visible blue focus ring, landmarks, one `h1` per page, `aria-current` on nav/pagination, `aria-pressed` on bookmarks, language buttons and filter chips, ARIA tabs with RTL-aware arrow keys.
- Feed text is rendered as text only; titles get `dir="auto"` and `lang`.

## RTL
Logical CSS properties throughout; directional icons flip (`.icon-dir`, `.icon-back`); mask gradients on the hero plate and split images flip direction under `[dir='rtl']`.
