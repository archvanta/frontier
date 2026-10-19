---
description: Start a SIGNAL AI phase (reads status, matrix and phase spec first)
argument-hint: <phase number 1-9>
---

Start SIGNAL AI phase $ARGUMENTS.

1. Read `CLAUDE.md`, `docs/IMPLEMENTATION-STATUS.md`, `docs/phases/MODEL-EFFORT-MATRIX.md` and the phase doc `docs/phases/PHASE-0$ARGUMENTS-*.md`.
2. Confirm the previous phase's gate is recorded as passed with evidence. If not, stop and report.
3. Run `git status --short --branch` and confirm the working branch.
4. State the recommended model/effort for this phase (do not claim to switch it).
5. Implement only this phase, then run the phase's tests from the doc.
6. Update the phase doc's evidence section and `docs/IMPLEMENTATION-STATUS.md`, commit, push.
