---
name: quality-gates
description: The exact commands that gate every SIGNAL AI phase and release. Use before any commit that closes a phase.
---

# Quality gates

Run from the repo root:

```bash
npm ci
npm run typecheck && npm run lint && npm test && npm run build
(cd pipeline && python -m pytest -q)
npx playwright test            # e2e against the mock build (Phase 2+)
```

Workflow lint (Phase 8+): `actionlint` if available, else `python -c "import yaml,sys;[yaml.safe_load(open(f)) for f in sys.argv[1:]]" .github/workflows/*.yml`.

Record real output in the phase doc. A gate that was not run is "not run", never "passed".
