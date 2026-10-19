# Quality gates

A phase is complete only when its gate commands ran and passed. Record the actual output summary in the phase doc's **Evidence** section. A gate that was not run is reported as "not run".

| Gate | Command | Applies from |
|---|---|---|
| Install | `npm ci` | Phase 1 |
| Types | `npm run typecheck` | Phase 1 |
| Lint | `npm run lint` | Phase 1 |
| Unit (web) | `npm test` | Phase 1 |
| Build (live) | `npm run build` — asset URLs must start with `/SIGNAL_AI/`; live bundle must not contain `[MOCK]` | Phase 1 |
| Build (mock) | `npm run build:mock` | Phase 1 |
| E2E | `npm run build:mock && npx playwright test` (375/768/1440 px, en + fa, overflow, deep links, hero behaviour) | Phase 2 |
| Pipeline | `cd pipeline && python -m pytest -q` | Phase 4 |
| Idempotency | run the collector twice on fixtures → second run writes nothing | Phase 4 |
| Workflows | YAML parse + `actionlint` when available | Phase 8 |
| Deploy | Actions run `success` + `page_url` from `actions/deploy-pages` + HTTP 200 on the URL and `data/meta.json` | Phase 8 |
| Security | no `dangerouslySetInnerHTML`; URL scheme allowlist; secret grep; workflow permissions review | Phase 9 |

Critical gates (types, unit, pipeline, build, deploy) block the next phase. Non-critical issues are listed in `docs/release/KNOWN-LIMITATIONS.md` with severity.
