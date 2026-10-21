# Implementation status

Working branch: `claude/signal-ai-build-qp2mxi` → integrated into `main` by pull request.

| Phase | Status | Gate evidence | Commit |
|---|---|---|---|
| 1 Foundation | ✅ Passed | `docs/phases/PHASE-01-FOUNDATION.md#evidence` | see git log `feat(phase-1)` |
| 2 UI & design | ✅ Passed | `docs/phases/PHASE-02-UI-DESIGN.md#evidence` | `feat(phase-2)` |
| 3 Feed & archive | ✅ Passed | `docs/phases/PHASE-03-NEWS-FEED-ARCHIVE.md#evidence` | `feat(phase-3)` |
| 4 Ingestion | ✅ Passed (live feeds checked on Actions, see SOURCE-REGISTER) | `docs/phases/PHASE-04-NEWS-INGESTION.md#evidence` | `feat(phase-4)` |
| 5 Images | ✅ Passed | `docs/phases/PHASE-05-IMAGES.md#evidence` | `feat(phase-5)` |
| 6 Ranking & picks | ✅ Passed | `docs/phases/PHASE-06-RANKING-PICKS.md#evidence` | `feat(phase-6)` |
| 7 i18n & translation | ✅ Passed (real model ran on Actions: 164 headlines) | `docs/phases/PHASE-07-I18N-TRANSLATION.md#evidence` | `feat(phase-7)` |
| 8 Actions & Pages | ✅ Passed (collector live; Pages deploy run 39311450758 succeeded) | `docs/phases/PHASE-08-GITHUB-DEPLOYMENT.md#evidence` | `feat(phase-8)` |
| 9 QA & release | ✅ Passed (live page not opened from the build container; see QA report) | `docs/phases/PHASE-09-QA-RELEASE.md#evidence` | `docs(phase-9)` |

## Post-release changes
| Change | Evidence |
|---|---|
| UI/UX redesign v2: cinematic hero, floating glass header, editorial Top Signals / Latest News, Weekly Brief, selective liquid glass, navy/violet/cyan palette | `docs/DESIGN-SYSTEM.md`, `docs/design/reference-analysis.md#v2-references-redesign-2026-10-19`; `npm run check` + 32 Playwright e2e/axe tests on the mock build |
| Black/minimal + blue theme; news-carousel hero (replaces the intro-video hero), glass-fold WebGL backdrop (since removed), 3D "signal wall" marquee | `docs/DESIGN-SYSTEM.md`; `npm run check` (52 unit tests) + 36 Playwright e2e/axe tests on the mock build |
| Reference look (Sigma screenshots): full-width header with drop-down panels, white/violet pill buttons, gradient story cards, no glass or WebGL; switchable dark/light theme (saved, applied before first paint) | `docs/DESIGN-SYSTEM.md`; `npm run check` (52 unit tests) + 61 Playwright e2e/axe tests on the mock build (axe in dark and light, English and Persian, 7 routes) |
| Phone and card fixes: no element wider than a phone screen (feed grid tracks), whole photos in every card or no photo (text-only card), full titles and excerpts, no rim line on gradient cards; hero fills exactly the first screen, whole-picture mode over a blurred copy, long headlines shrink to fit under the header; San Francisco-first type stack (no Apple font files shipped) | `docs/DESIGN-SYSTEM.md`; `npm run check` (65 unit tests) + 76 Playwright e2e/axe tests on the mock build, incl. `e2e/first-screen.spec.ts` |
| Card photos fill their rounded frame again (`cover`); only broken or tiny photos are dropped (PR #11) | `npm run check` (65 unit tests) + 76 Playwright tests |
| Motion system: view transitions for page, language and theme changes on the hash router (instant fallback), scroll reveal, sliding tab/chip/language indicator, menu exit animations, micro-interactions, full/lite/reduced modes (Save-Data, `prefers-reduced-motion`) | `docs/DESIGN-SYSTEM.md#motion`; `src/lib/motion.test.ts`, `src/lib/router.test.ts`, `e2e/motion.spec.ts` |
| Hero bug fix: removed the scroll-driven drift that dimmed copy and moved the photo frame; one fixed template for every slide (copy + fixed frame, cover); Persian digits in ranks, score rings and counter use Vazirmatn | `docs/DESIGN-SYSTEM.md`; `npm run check` + 86 Playwright tests incl. the fast-click hero test in `e2e/layout.spec.ts` |
| Optional accounts: email-code sign-in (Supabase Auth, optional Google), onboarding, profile, deterministic *For You* ranking with reasons, account bookmarks with a local-merge offer, privacy page, account deletion; RLS migration. Needs the owner's Supabase/SMTP setup before it is live (`docs/AUTH-SETUP.md`) | `docs/ACCOUNTS.md`; `npm run check` (125 unit tests, incl. 10 RLS isolation tests on the real migration in PGlite) + 90 Playwright e2e/axe tests on the mock build; real email delivery not yet tested |
| Rebrand SIGNAL AI → FRONTIER (فرانتیر): wordmark and mark, favicon, titles/meta/OG, footer, About, sign-in text and email template; repo name, Pages URL and internal identifiers (`signal-ai:` keys, `signal_pipeline`) unchanged | `docs/DESIGN-SYSTEM.md`; `npm run check` + 101 Playwright tests incl. the brand test in `e2e/header.spec.ts` |
| Hero slide background photo: suitable (big, landscape) photos also fill the slide behind the same fixed template, others keep the plain gradient; preload, single request, restrained zoom; mock data gained wide/boxy/none photo cases | `docs/DESIGN-SYSTEM.md`; `npm run check` (139 unit tests) + 105 Playwright tests in `e2e/layout.spec.ts` |
| Homepage restructure: intro scene, "choose what you follow" (local list of topic ids, followed stories first), slider (70%) with a red "next story" card (30%) that rotates with it, no pause on hover/focus, old slide fades out before the new one in, compact phone hero with the photo also as background, logo is the bare arrow glyph; fixed `fitSlides` measuring (font-size transition read stale values) | `docs/DESIGN-SYSTEM.md`; `npm run check` + Playwright suite incl. `e2e/home-intro.spec.ts`, `src/lib/follow.test.ts` |
| Intro: AI Games / Data Centers / AI News pills under the text (tiny character thumbnail), animated CSS backdrop (pauses off-screen, still under reduced motion), AI News in the Sections menu | `docs/DESIGN-SYSTEM.md`; `npm run check` + Playwright suite incl. `e2e/home-intro.spec.ts` |
| Topic picker moved between the signal wall and Latest News (bordered panel, even spacing); intro bottom fades into the page colour | `docs/DESIGN-SYSTEM.md`; `npm run check` + Playwright suite incl. `e2e/home-intro.spec.ts` |
| Topic sections: AI Games (studio-site reference look, the owner's three character illustrations as the company filter) and Data Centers; new `sections/<id>.json` files, section feeds in `sources.yaml`, "Sections" menu in the header | `pipeline/tests/test_sections.py`, `src/lib/router.test.ts`, `e2e/sections.spec.ts`; `docs/DATA-SCHEMA.md` v2 |

## Resume
Run `/continue-phase` (see `.claude/commands/continue-phase.md`).
