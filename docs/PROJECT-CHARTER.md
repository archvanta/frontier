# Project charter

**Product.** SIGNAL AI is a bilingual (Persian RTL / English LTR) website that tracks public AI news. A scheduled collector on GitHub Actions reads a maintained list of free RSS/Atom feeds and official sources about every hour, deduplicates stories, attaches relevant images, scores them with a transparent deterministic formula, optionally machine-translates new items offline into Persian, and publishes static JSON. A static React site on GitHub Pages renders it.

**Audience.** Persian and English readers who want a fast, honest overview of AI developments with links to the original sources.

**Goals**
1. Today's and yesterday's AI news, newest first, with real archive pages for older days.
2. Daily / Weekly / Monthly picks from a documented ranking, never presented as truth or popularity.
3. Clear attribution: source, original title, publication time, link; short excerpts only.
4. Zero running cost: no paid APIs, no servers, no secrets.
5. A distinctive editorial/cyberpunk dark design that never gets in the way of reading.

**Non-goals.** Full-text republication, user accounts, comments, real-time (sub-hour) news, claims of complete worldwide coverage.

**Constraints.** GitHub Free (public repo for Pages), standard hosted runners, best-effort cron scheduling, source terms and image copyright.

**Success.** Tested site deployed at the verified GitHub Pages URL, hourly collector running, documentation that lets a future session continue.
