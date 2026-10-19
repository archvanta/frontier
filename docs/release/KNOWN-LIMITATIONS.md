# Known limitations

Honest list of what SIGNAL AI does not do, or does only partly. Keep it current.

## Data and sources
- **Hourly is best effort.** Scheduled GitHub Actions runs can be delayed or skipped when GitHub is busy, and schedules stop after 60 days without repository activity (re-enable them in the Actions tab).
- **Feed coverage depends on publishers.** A feed that changes, rate-limits or disappears is marked as failing on the Sources page and skipped; the rest of the run continues. Some organisations publish no RSS (Anthropic is read through a community mirror on GitHub, which can lag behind the official site).
- **Excerpts only.** The site stores headline, link, times, a ≤400-character feed excerpt and image URLs. It never copies full articles; readers follow the source link.
- **Undated items** get the time they were first collected and are labelled as estimated.
- **Dedup is conservative.** Same-event grouping uses headline similarity within 72 hours and never merges on a company name alone. Differently worded reports of one event may stay separate, and rarely, two different stories with near-identical headlines may group.
- **Day boundaries are UTC.** Today and Yesterday are UTC days; times are shown in the reader's own time zone.

## Ranking
- The score is a transparent editorial signal (source tier 30%, independent coverage 25%, recency 20%, topic 15%, novelty 10%). It does not measure truth, quality or popularity, and tiers are an editable editorial prior.
- Picks move forward at least every 6 hours even with no new stories; between those steps they are computed as of the newest stored story.

## Translation
- Persian translation is offline machine translation (Argos Translate en→fa 1.5) and can be wrong, especially for names and technical terms. The original English title and the source link are always shown, and translations are labelled.
- At most 150 stories are translated per run (newest first, with a 3-day backfill after an outage). Older untranslated stories stay in English.
- If the model cannot be downloaded or loaded, the run publishes English only and says so in the run summary. Translation can be turned off with the `SIGNAL_TRANSLATE=0` repository variable.
- The model package is downloaded from the Argos project's own host on first use and cached; its checksum is printed in the run summary but not yet pinned.

## Images
- Publisher images are hot-linked, not copied, so they can disappear or be blocked; the card then falls back to the category graphic.
- Stories mainly about Claude/Anthropic, OpenAI or Gemini use fixed, unofficial editorial character illustrations, labelled as such. Brand detection is headline-based and deliberately strict, so some brand stories show a normal image instead.

## Site
- Hash-based URLs (`#/story/...`) are used because GitHub Pages has no server-side routing.
- Search covers the last 90 days and runs in the browser over a single index file.
- Bookmarks live in the browser's local storage and do not sync between devices.
- The repository is public: source code and collected data are visible to everyone.
- No LICENSE file has been chosen for the code yet.
