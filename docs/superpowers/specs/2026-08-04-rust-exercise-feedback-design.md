# Rust exercise feedback in the daily lesson

**Date:** 2026-08-04
**Loop:** `loop-ms79033a-b8c219c7` — "Rust + DSA — Daily Lesson"
**Status:** approved, not yet implemented

## Context

The loop currently grades Track A pass/fail: `rustlings.done` says an exercise compiles and
passes, and the lesson moves on. The owner never learns whether the code they wrote was any
*good* — only that the compiler accepted it. That is the gap this closes.

The owner asked for feedback on their worked exercises, with options to evaluate and improve
the code. Of three options presented (prose-only review; prose + clippy; prose + clippy + a
daily rework step), they chose **prose review grounded in clippy, read-only**. The rework
step was rejected as a daily tax: the owner routinely overshoots assignments, so spending
Track A's 8 minutes on yesterday's work is the wrong direction.

Outcome: each lesson opens Track A with a short review of yesterday's code — what was
idiomatic, one concrete improvement, and how rustlings' official solution differs — with
clippy lints quoted by name so the advice is citable rather than stylistic opinion.

## Verified facts

Each of these was checked against the live system on 2026-08-04. Nothing here is assumed.

| Fact | Evidence |
|---|---|
| Every exercise has an official reference solution at `rustlings/solutions/<sec>/<name>.rs` | `ls solutions/` — 00_intro … through the full curriculum |
| Every exercise is a named cargo bin target | `rustlings/Cargo.toml` → `bin = [{ name = "if1", path = "exercises/03_if/if1.rs" }, …]`, plus a `<name>_sol` target per solution |
| Scoped clippy is cheap | `time cargo clippy --bin if1` → **0.35s total** |
| Files are tiny | `exercises/03_if/if1.rs` 38 lines; solution files 110–460 B |
| **Cargo replays cached clippy diagnostics** | Scratch crate with two known lints: run 1 emitted both, run 2 (unchanged, no flags) emitted both again |
| `rustlings/` has no git baseline | `git log` → "your current branch 'main' does not have any commits yet" |
| Early exercises are clippy-clean | `cargo clippy --bin variables5` → no issues |
| `rtk` rewrites and filters `cargo` in the interactive shell | Shell `cargo clippy` printed "cargo clippy: No issues found"; `rtk proxy cargo clippy` printed the real warnings |

Three consequences of the last three rows:

- **No diff-vs-your-previous-attempt.** With no commits in `rustlings/`, the only reference
  is the official solution. Comparing against the owner's own earlier draft is not available
  and should not be designed for.
- **Clippy will be quiet for a while.** At the owner's current position (`if`/`functions`)
  most exercises lint clean. The solution comparison carries the value now; clippy earns its
  keep from `move_semantics` onward. This is why the block must be allowed to say nothing.
- **The workflow is unaffected by rtk.** It calls `execFile('cargo', …)` from Node, which
  bypasses the shell hook and receives raw output — the same way the existing `cargo test`
  pre-fetch already works.

## Design

### Component 1 — `reviewed_exercises` (workflow pre-fetch)

A new block in the loop's workflow, alongside the existing `rustlings` and `cargo`
pre-fetches. It hands the run everything needed to review yesterday's code, so the run makes
no exploratory shell calls of its own.

**Selecting which exercises to review.** An exercise qualifies when it is **both**:

1. present in the `rustlings.done` list (compiler-backed — it actually passes), and
2. its source file's mtime is **after the previous lesson's date**.

Neither condition alone is sufficient: the done list cannot distinguish work done yesterday
from work done last week, and mtime alone would surface a file the owner opened but never
got passing. Capped at **5** exercises, newest mtime first, so an overshoot day cannot blow
up the handoff.

**Resolving name → path.** Parsed from `rustlings/Cargo.toml`'s `bin` array rather than
hardcoded, so it tracks rustlings' own layout. The `<name>_sol` targets are ignored; the
solution path is derived from the exercise path by swapping the `exercises/` prefix for
`solutions/`.

**Shape handed to the run:**

```js
reviewed_exercises: [
  { name, path, code, solution, clippy: { ok, warnings: [...] } },
  …
]
```

`clippy.warnings` holds the lint name and message per finding; `ok: false` records that the
clippy invocation itself failed, which must read as "unknown", never as "clean".

**Failure policy.** Every part of this block is best-effort. An unreadable file, an
unparseable `Cargo.toml`, or a clippy crash yields `reviewed_exercises: []` or a partial
entry — never a thrown error. Code feedback is a nicety; it must never cost a lesson day.
This is the same posture the brief already takes toward `lesson-web.py` failures.

### Component 2 — the `### Yesterday's code` block (lesson content)

A new section at the top of `## Track A · Rust`, before today's assignment.

- **One deep review** — one exercise only, chosen by this order: the one with clippy
  warnings; failing that, the one whose code diverges most from the official solution;
  failing that, the newest. What the owner did well, one
  concrete improvement shown as rewritten lines, and how the official solution differs
  *where it genuinely differs*. Not a diff dump: most of these files are five lines, and a
  mechanical diff of a five-line file teaches nothing.
- **One line each** for the remaining exercises.
- **Clippy lints quoted by name** (`clippy::needless_return`) with prose explaining why the
  rule exists. Clippy establishes *that* something is off; the lesson explains *why*.
- **Silent when there is nothing worth saying.** A daily "looks good!" trains the owner to
  skip the block, which destroys it as a channel. Omit the heading entirely on a clean day.

### What deliberately does not change

- **Grading.** Unchanged: `rustlings.done` on weekdays, `cargo` on Sundays. Feedback is
  read-only and never gates progression.
- **The 15-minute budget.** Reading a short review is not an exercise. Track A keeps its
  full ~8 minutes for new work.
- **`lesson-web.py`.** No change. The block is markdown inside the lesson file, so the
  existing pandoc render displays it for free.
- **The metric schema.** No new metric. Feedback quality is not a number worth tracking, and
  the schema rule is additive-only for keys the UI already binds.

## Verification

1. **Ladder/selection logic** — assert the two-condition filter in isolation: an exercise
   that is done but stale is excluded; one modified but not done is excluded; one that is
   both is included; the cap holds at 5 and keeps the newest.
2. **Cargo.toml parsing** — assert the real `rustlings/Cargo.toml` yields a name→path map
   containing `if1 → exercises/03_if/if1.rs`, and that `_sol` targets are excluded.
3. **Clippy capture** — run the pre-fetch against a file with a known lint and confirm the
   warning is parsed out; confirm a clean file yields an empty list with `ok: true`, distinct
   from a failure's `ok: false`.
4. **Workflow syntax** — `node --check` on the body wrapped in an async function (top-level
   `return` is legal in the workflow's execution context but not in a bare module).
5. **Dry run** — `loopany edit … --workflow-file … --dry-run` before applying.
6. **End to end** — the next scheduled run produces a lesson whose Track A opens with the
   block, or omits it cleanly when the owner's exercises lint clean and match the solution.

## Facts discovered during implementation

These were not known when the design above was written. They changed the implementation and
are recorded here because the reasoning is not recoverable from the code alone.

| Fact | Evidence | Consequence |
|---|---|---|
| **The loopany host caps the WHOLE workflow at 30s** | `@crewlet/loopany/dist/workflow.js`: `TIMEOUT_MS = (Number(process.env.LOOPANY_WORKFLOW_TIMEOUT_SECONDS) \|\| 30) * 1000`; `~/Library/LaunchAgents/ai.loopany.daemon.plist` sets only `PATH`, so the default stands | Any per-command timeout above the remaining budget can never fire. When the cap trips, the run gets **no prefetched data at all** plus a "diagnose the failure" task — grading, streak and the spaced-repetition ladder all vanish. Every external call is now budgeted from one `HOST_TIMEOUT_MS` constant |
| **Default clippy finds nothing on teaching-sized exercises** | Swept all 17 completed exercises: zero diagnostics. `-W clippy::pedantic` on `if1` alone yields 2 | Pedantic is enabled deliberately. Reverting it to default silently kills the feature while leaving every test green |
| **clippy's `correctness` group is deny-by-default, so it reports at `level: "error"`** | clippy lint-configuration docs; reproduced with `clippy::eq_op` | Filtering to `level === 'warning'` made a clippy-REJECTED exercise indistinguishable from a clean one. Both levels are now surfaced, with `level` on each finding |
| **Lesson files are rewritten after they are issued** | `2026-08-04.md`: birth `02:01:42Z`, mtime `02:51:04Z` — the grading pass rewrites front-matter, and `lesson-web.py`'s answer write-back touches it again | The selection cutoff must be **birthtime**, not mtime. With mtime, answering Track B in the evening hides that evening's Rust work from review. Birthtime is safe only because the pre-fetch runs before grading |
| **`warnings` is not clippy-only** | Real `rustlings/Cargo.toml` has `[lints]` (`unsafe_code` forbid, `clippy::todo` forbid, `empty_loop` forbid, `infinite_loop`/`mem_forget` deny); compile errors are admitted as `ok:true` | A `level:'error'` entry may be a clippy correctness lint, a rustlings-forbidden lint, or a bare rustc code like `E0061`. The brief tells the agent to quote codes as given rather than assume a `clippy::` prefix |
| **`child_process` reads `timeout: 0` as NO timeout** | Node docs; reproduced | A spent budget must *skip* a call, never pass `0`. Both call sites guard this explicitly |
| **rustlings' `Cargo.toml` uses an inline `bin = [{ name, path }]` array** | `rustlings/Cargo.toml` — 94 non-`_sol` entries | A fixture using `[[bin]]` blocks instead caused a regex that matched nothing in production while tests stayed green. Fixtures must mirror production's shape, not a convenient one |

## What this cost, and why

Eight Criticals were found and fixed during implementation, plus five findings in the final
whole-branch review. **Every Critical was a green test suite hiding a real break, and most
traced to the fixture rather than the logic.**

The fixture was necessary — the loop's duplicate-wake gate means a harness pointed at the real
tree captures `null`, making every assertion vacuous — but it is also the single largest source
of false confidence in this work. What kept it honest was requiring, for every assertion, that
someone break the covered logic and show it going red. Three of the eight Criticals were found
that way; the other five came from probing the *real* tree, which no fixture test can substitute
for.

## Notes

The enclosing directory was not a git repository when this spec was written; it was initialised
at `7eda21c` so this work could be reviewed and rolled back.
