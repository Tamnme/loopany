# Per-concept evidence levels for daily-lesson

Date: 2026-10-04 · Status: draft for review · Borrowed from: [Gnos](https://github.com/madhvantyagi/Gnos)
(`skills/learner-tracking/references/evidence.md`, `scripts/learner_state.py`)

## Why

The agent's per-track PASS/FAIL is the only record of what was learned, and the review ladder
(`loop-src/daily-lesson.workflow.js:79-92`) re-serves every *lesson* at ~1/4/12 weeks whether or
not it stuck. A hinted pass and a cold recall weeks later look identical. Same shape as the
2026-08-27 `cargo.ok` note: status should be derived from evidence by code, not asserted.

Full Gnos adoption was rejected: it has no unattended mode, never executes submitted code, has no
spaced-review engine and no Rust content. Only its evidence model is borrowed.

## Decisions

| # | Decision | Rejected alternative |
|---|---|---|
| D1 | Attempt records live in lesson front-matter | separate `attempts.jsonl` (second store, can drift) |
| D2 | Forward-only; no lesson file is edited | back-fill from old PASS/FAIL prose (lossy parser) |
| D3 | Levels drive the ladder and review queue only | gating new concepts on prerequisites (needs prereq edges) |
| D4 | Review day moves Sunday → Friday, whole | split Friday test / Sunday builds |
| D5 | Stable concept IDs + unknown-ID check | Gnos's sha256 plan fingerprint (no second plan copy exists here) |

## 1. Concept IDs

- `loopany/daily-lesson/README.md` curriculum tables gain an `id` column. Namespaces:
  `rs.<exercise>` (rustlings name), `b1.<slug>`, `chess.p<n>`, `ds.<struct>`. (A B2 step *is* a
  `ds::` structure, so there is no separate `b2.` namespace.)
- Brief rule: an ID is never renamed or reused. A renamed concept gets a new ID.
- IDs are written as inline code matching `` `(rs|b1|chess|ds)\.[a-z0-9_-]+` `` so the
  workflow extracts the registry with one regex over the README. `rs.` IDs are not listed in
  the README; they are valid when the name is in rustlings' Cargo.toml bin list.
- `unknown_ids` is `null` when the README could not be read (the check did not run), never `[]`.
- `unknown_ids`: IDs present in attempts but absent from the README. The agent must name them
  in its report. Never fatal.

## 2. Attempt records

Written by the agent into the lesson it grades (the same edit that already sets `type:` on
`prev_lesson`). One line per concept tested, `key=value`, no YAML parser needed:

```
attempts:
  - id=b1.alpha-beta result=correct help=none kind=retrieval
  - id=rs.traits2 result=partial help=hint kind=application
```

| Field | Values | Source |
|---|---|---|
| `result` | `correct` · `partial` · `incorrect` | Track A / B2: `rustlings.done` and `cargo` (deterministic). B1: agent judgment of `### My answer` |
| `help` | `none` · `hint` | Loop state: `none` on a first serve; `hint` if the concept was re-served or the lesson shrunk |
| `kind` | `application` · `retrieval` | `retrieval` on review day or a ladder re-ask, else `application` |

A skipped lesson (no answer, no code) writes no attempts. Absence of an attempt is not an
`incorrect`.

**Known weakness:** `help` cannot see whether the owner read a hint. Upgrade path, out of scope:
`lesson-web.py` records hint reveals into front-matter.

## 3. Derivation

Pure function in the workflow, `deriveConcepts(lessons, today)`, returning
`{ [id]: { level, rung, due, last_date } }`. Per concept, attempts in date order:

| Level | Rule |
|---|---|
| `practicing` | latest attempt is `partial`/`incorrect`, or `help≠none` |
| `demonstrated` | latest is `correct` + `help=none` |
| `retained` | latest is `correct` + `help=none` + `retrieval`, after an earlier `demonstrated` |
| `needs-repair` | an earlier `demonstrated`/`retained`, latest `incorrect` |

Gnos's `exposed` level is dropped: a concept with no attempt simply has no entry, and
recording "taught but untested" would need a second front-matter field for no scheduling gain.

Malformed lines are skipped and listed in `attempt_parse_errors` (`{date, line}`). The function
never throws: a throw under the 30s host cap loses all prefetched data.

## 4. Ladder and review queue

- Concept with attempts: rung index 0/1/2 → 7/28/84 days. It advances one rung only on
  `correct` + `help=none` + `retrieval`. Any other attempt keeps the rung.
  `due = last attempt date + rung interval`; due from 3 days before `due` onward, **overdue
  included** — a concept's due date only moves on a new attempt, so a strict ±3 window would
  drop it from the ladder forever after one failed review-day run.
- `needs-repair` concepts are offered to the Review queue (cap 3, unchanged).
- Lessons with no attempts (everything before cutover): existing date ladder, unchanged.
- `due_review` entries gain `source: 'concept' | 'lesson'`. Prompt text updated to match.

## 5. Friday review day

- `daily-lesson.workflow.js:43` → `weekday === 'Friday'`; prompt text at `:576`; comments `:40`, `:81`.
- README: *Sunday · Review day* and every Sunday rule (≈`:195-200`, `:523`, `:531-575`) become
  Friday. Sunday is a normal lesson day.
- Metrics stay monotonic; Friday counts exactly as Sunday did.

## New data handed to the agent

`concepts`, `unknown_ids`, `attempt_parse_errors`; `due_review[].source`.

## Testing

Baseline `cd loop-src && node --test` is **30 pass / 3 fail** (wall-clock fixture, see CLAUDE.md).
New cases in `daily-lesson.workflow.test.mjs`, fixtures copied from a real lesson's front-matter:

- each level transition, including `needs-repair`;
- rung advances on unassisted retrieval, holds on hinted/partial/application;
- a pre-cutover lesson (no `attempts:`) still appears via the date ladder with `source: 'lesson'`;
- unknown ID reported, not fatal;
- malformed attempt line → `attempt_parse_errors`, run completes;
- `is_review_day` true on a Friday date, false on Sunday.

Each assertion is checked by breaking the covered branch and watching it go red. Then
`npx @crewlet/loopany@latest edit <loop-id> --workflow-file daily-lesson.workflow.js --dry-run`.

First live check: the first graded lesson after cutover carries `attempts:`, and the following run
shows `concepts` in its prefetched data (`loopany log <id>`).

## Out of scope

Hint-reveal tracking in `lesson-web.py`; prerequisite gating; back-filling history; fixing the
3 wall-clock test failures (separate change).
