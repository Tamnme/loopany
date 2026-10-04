# CLAUDE.md

Local source for two Loopany loops. `README.md` has the full picture — this file is only the
things that bite.

## Commands

```bash
cd loop-src && node --test        # 45 tests. Baseline is 42 pass / 3 fail (see below), not 45/0.
npx @crewlet/loopany@latest edit <loop-id> --workflow-file daily-lesson.workflow.js --dry-run
```

Always dry-run before applying — the loop fires unattended and a broken workflow costs a real
lesson day. The briefs (`loopany/*/README.md`) need no push; they sync on the next run.

## Hard rules

- **Never write inside `loopany/`** — synced content. No `cargo`, no build output, no checkouts.
- **Never touch mtimes under `rustlings/exercises/`** — they decide which exercises get reviewed.
- **Absolute paths only** in workflow code. Runs start in an unrelated empty directory.
- **The loopany host kills the whole workflow at 30s.** Every external call is budgeted from
  `HOST_TIMEOUT_MS`. When the cap trips the run gets *no* prefetched data.
- `rustlings/` and `rust-dsa/` are sibling repos, gitignored here. Don't add them as submodules.
- **Loop output is the loops', not source.** `loopany/daily-lesson/lessons/` (tracked) and
  `loopany/dorm-conductor/dialogues/` + `chat_history.json` (gitignored). Never hand-edit them to
  make a test or a grade come out differently.

## Notes from real breakage

- **2026-08-12 — 3 of the 33 tests fail on the wall clock, not a regression.** The selection
  fixture stamps exercise mtimes at hardcoded `2026-08-05`…`08-13` while recreating the cutoff
  lesson for a *live* birthtime, so the qualifying pool is now always empty. Compare against
  30/3 before assuming you broke something; fix by restamping relative to `Date.now()`.
- **2026-08-27 — don't key a boolean on an exit code when non-zero is the expected state.**
  `cargo.ok` was `exit === 0`, but every weekday the run writes a deliberately-failing `todo!()`
  test, so the grading data read UNKNOWN on *every* run for the whole chess track. `ok` now means
  "the command produced parseable output" — same distinction the clippy path draws with `hasJson`.
- **The fixture must mirror production's shape, not a convenient one.** Most bugs in this repo
  have been a green test suite over a real break, and most of those were the fixture diverging
  from reality. When adding an assertion, break the covered logic and watch it go red.
- **`docs/rust-exercise-feedback.md` is a dated record, not current truth.** Its grading section
  was superseded by the 2026-08-09 chess pivot. The live contract is
  `loopany/daily-lesson/README.md`.
