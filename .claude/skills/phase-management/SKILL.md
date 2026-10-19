---
name: phase-management
description: Run one SIGNAL AI phase end to end — read the spec, implement, gate, document evidence, commit and push. Use when starting, resuming or closing any of the nine phases.
---

# Phase management

1. Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md`, and the phase doc.
2. `git status --short --branch`; never discard or overwrite uncommitted user work.
3. Say the recommended model/effort for the phase. Do not claim the session switched.
4. Implement only this phase's scope.
5. Run the phase gate from `docs/QUALITY-GATES.md`. Fix failures before continuing.
6. Write real evidence (commands + results) into the phase doc's "Evidence" section.
7. Update `docs/IMPLEMENTATION-STATUS.md` (phase row, commit SHA after committing).
8. Commit `feat(phase-N): …`, push the working branch. No force-push, no history rewrite.
9. Continue to the next phase unless a genuine blocker needs the user.
