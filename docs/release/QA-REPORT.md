# QA report

Date: 2026-10-19 (UTC). Every result below comes from a command or workflow run that was actually executed; anything not yet checked is marked as such.

## Automated tests
| Suite | Where | Result |
|---|---|---|
| Python collector (`pytest`) | local + CI | **77 passed**: parsing, fetch safety, dedup/events, images/brands, scoring/picks, translation, idempotent writes, workflow policy |
| Unit (`vitest`) | local + CI | **40 passed**: archive paging, router, dates, search, bookmarks, i18n parity, image fallback, app rendering incl. RTL |
| End-to-end (`playwright`, mock build) | local + CI | **30 passed**: layout without overflow at 375/768/1440 px in en/fa, hero placement/mute/pause/reduced motion, keyboard, deep links after reload, archive paging, search in URL, bookmarks, language on all routes, translation labels, CSP and console, external links, axe WCAG 2.1 A/AA on 5 routes × 2 languages |
| Type check / lint | local + CI | `tsc -b` and `eslint .` clean |
| Workflow lint | local | actionlint 1.7.12: no errors |

CI on GitHub was green for both merged pull requests (#1 head `6f3039a`, #2 head `9bb651c`).

## Real data (GitHub Actions)
- Run 1: 18/23 feeds, 215 stories, 149 Persian headlines (model downloaded and cached).
- Fixes from run 1: empty-but-valid feeds count as healthy; Guardian URL corrected; Microsoft (HTTP 410) and AI News (HTTP 403) disabled.
- Run 2: 20/21 enabled feeds OK (VentureBeat rate-limited, HTTP 429), 230 stories, 164 translated.
- Run 3 immediately after: no data change, **no commit**.
- Spot check of the committed data: 0 stories with estimated dates, images = 94 feed, 10 og:image, 66 brand art, 45 category fallback (run 1). Machine translations read as understandable but imperfect, e.g. "How Oracle turns days of work into minutes with ChatGPT and Codex" → "چگونه اوراکل روز کار را به دقیقه با ChatGPT و Codex تبدیل می کند".
- A production build of the site with that real data, viewed locally in Chromium at 1440 px (en) and 390 px (fa): Today/picks/status render with real stories and no mock banner; broken publisher images (blocked in the build container) fall back to category art.

## Security review
- **XSS:** feed text is rendered as text only; no `dangerouslySetInnerHTML`, `innerHTML` or `eval` in `src/`. URLs pass `safeUrl` (http/https only); image URLs reject `javascript:`/`data:` and tracker pixels.
- **CSP:** production builds carry a Content-Security-Policy meta tag (same-origin scripts, styles, data, fonts; https images). An e2e test confirms pages load with no CSP or console errors.
- **External links:** all `target=_blank` links use `rel="noopener noreferrer"` (e2e checked); images use `referrerpolicy=no-referrer`.
- **Collector fetching (SSRF limits):** only allowlisted hosts, checked again on every redirect hop (a redirect to 169.254.169.254 is blocked in tests); timeouts, size caps (3 MB feeds, 512 KB pages), limited retries, per-host spacing; og:image only for listed hosts and at most 10 pages per source per run. Model package: zip path traversal and checksum mismatch are refused.
- **Workflows:** default `contents: read`; write scopes only on the collector job (`contents: write`) and the deploy job (`pages: write`, `id-token: write`); all actions pinned to commit SHAs; no `secrets.*` used; no force-push.
- **Repository contents:** history scanned for tokens/keys and for the master prompt, reference videos and extracted frames: none found. The only video files are the shipped hero clip (MP4 1.0 MB, WebM 0.85 MB).

## Accessibility
- axe-core WCAG 2.1 A/AA: no violations on home, picks, explore, archive and about in English and Persian (mock build).
- Skip link, keyboard-operable picks tabs (arrow keys follow RTL), visible focus, `lang`/`dir` on the document and on mixed-language headlines, reduced-motion poster for the hero.

## Performance
- JS 283 KB (88 KB gzip), CSS 37 KB (9.7 KB gzip); fonts self-hosted. Hero video uses `preload="metadata"`, is muted, pauses off-screen, and is replaced by a poster for reduced motion, small screens and Save-Data.
- Data after two runs: 544 KB total; search index 105 KB; picks 54 KB; day files load per page.

## Not yet verified
- **Live site.** No GitHub Pages deployment has succeeded yet because Pages is not enabled for the repository (see `DEPLOYMENT-GUIDE.md`). Live-URL checks (home, deep link reload, data freshness, both languages on a phone) are pending that setting.
- Lighthouse scores were not measured.
