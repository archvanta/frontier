# Design system

Derived from `docs/design/reference-analysis.md`. Tokens: `src/styles/tokens.css`. Components: `src/components/`.

## Colour
| Token | Value | Use |
|---|---|---|
| `--bg` / `--surface-1/2/3` | `#0a0b0a` / `#111312` / `#171a18` / `#1f2320` | Layered near-black surfaces |
| `--line`, `--line-strong` | cream at 10% / 20% | Hairline grid borders |
| `--text`, `--text-2`, `--text-3` | `#efeadf`, `#b9b5ab`, `#8a877f` | Body ≥ 4.5:1 on all surfaces (text-3 used only for meta ≥ 12px) |
| `--accent` | `#c6ff3d` acid lime | Active nav, tabs, focus ring, rank numbers, score fills, CTA — never long text on lime except buttons |
| `--warn`, `--danger`, `--ok` | amber, coral, green | Source health, mock banner, errors |
| `--brand-claude/openai/gemini` | orange / sage / violet | 3px underline on brand-art thumbnails |

## Type
- Display: **Space Grotesk** (variable) — headlines, uppercase section titles.
- Body: **Inter** (variable). Labels/meta: **JetBrains Mono**, uppercase, tracked.
- Persian: **Vazirmatn** (variable) for all text in `fa`; uppercase/tracking removed in Persian.
- Fluid scale `--fs-xs` … `--fs-3xl` (clamp-based). All fonts self-hosted via Fontsource (OFL), no third-party font CDN.

## Layout
- Container 1320px, gutter `clamp(1rem, …, 2rem)`; 4px spacing scale.
- Header: sticky, blurred near-black, primary nav pills + search + language toggle; second row of category links (mono caps).
- Hero row: 16:9 video frame (max 746×420) + "Signal / Status" panel; stacks ≤ 1024px; ≤ 640px the frame is 4:3, status collapses to the last-update line.
- Top Signals: tabbed Daily / Weekly / Monthly (ARIA tabs, arrow keys respect RTL), feature card + ranked rows.
- Feed: day sections with big uppercase day title and lime square marker; card grid `auto-fill minmax(280px, 1fr)`.

## Components
`Header`, `HeroVideo`, `SignalStatus`, `PicksPanel`, `StoryCard` (grid / feature / row), `StoryImage` (fixed 16:9, fallback on error, brand tag), `DaySection`, `Pagination`, `ScoreExplain` (segmented bars like the benchmark bars in ref 02), `States` (skeleton, empty, error), `Footer`/`LastUpdate`.

## Motion
- Card entry fade/translate 420 ms; hover lift via border/background; live dot pulse; skeleton shimmer.
- All disabled under `prefers-reduced-motion` (`--dur: 0ms`, animations off). Hero video never autoplays then.

## Accessibility
- Skip button to main, visible lime focus ring (`--focus`), semantic landmarks, one `h1` per page, aria-current on nav/pagination, aria-pressed on bookmarks, labelled icon buttons.
- Feed text is rendered as text only; titles get `dir="auto"` and `lang` so mixed Latin/Persian lines render correctly.

## RTL
Logical CSS properties throughout; directional icons flip (`.icon-dir`, `.icon-back`). The hero headline stays in English (`dir="ltr"`) in both locales because it is the brand line.
