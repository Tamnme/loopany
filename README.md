# loopany — local source for my scheduled loops

Two [Loopany](https://loopany.ai) loops, both running on my machine via the loopany daemon:

| Loop | Fires | What |
|---|---|---|
| **Rust + DSA — Daily Lesson** | 09:00 Asia/Saigon | Teaches me Rust and data structures, 15 minutes a day, and grades whether I actually did yesterday's work. Most of this repo. |
| **Late-Night Conductor** | 22:00 Asia/Saigon | An orchestral-conductor flatmate who translates enterprise-architecture dilemmas into orchestration and acoustics. Brief + web app only — see `loopany/dorm-conductor/README.md`. |

The rest of this README is about the daily lesson; the conductor's brief is self-contained.

The lesson loop finishes itself when `rust-dsa` plays legal chess — perft-verified move generation, alpha-beta search with
a transposition table, and a terminal binary to play a full game against — built on hand-written
`ds::` structures rather than std's. (Until 2026-08-09 the finish line was an abstract
8-structure library; the brief records why chess replaced it. Five of the eight structures are
still earned along the way, the rest on Sundays.)

## How a run works

Each morning, two stages:

1. **The workflow** (`loop-src/daily-lesson.workflow.js`) — deterministic JS, no LLM. It gathers
   everything the lesson needs: yesterday's lesson and the answer I typed into it, the full
   lesson history, the spaced-repetition ladder, compiler-backed rustlings progress, the next
   exercises in rustlings' own order with their source text, the chess crate's own `src/` and
   `tests/` sources, `cargo test` state, and code feedback on the exercises I finished. Then it
   calls `agent(prompt, data)`.
2. **The agent** — a coding agent that grades yesterday per track, picks today's two steps, writes
   the lesson, and opens it in the browser. Its instructions live in
   `loopany/daily-lesson/README.md`.

Splitting it this way is the point: anything mechanical happens in stage 1, where it is testable
and cheap, so stage 2 never burns turns on `ls` and `date`.

## Layout

| Path | What |
|---|---|
| `loop-src/daily-lesson.workflow.js` | The workflow body. Source of truth — pushed to the server with `--workflow-file`. |
| `loop-src/daily-lesson.workflow.test.mjs` | Its test suite. Wraps the real workflow and stubs the `agent` global, so tests run the shipped code with no duplication. |
| `loop-src/fixture/` | A miniature rustlings + rust-dsa + lessons tree the tests run against. |
| `loopany/daily-lesson/README.md` | **The loop's brief and memory** — not documentation. The agent reads it every morning and appends to it. Synced to the loopany server. |
| `loopany/daily-lesson/lessons/` | One file per day, both tracks, with my answers written back in. |
| `docs/rust-exercise-feedback.md` | Design notes for the code-feedback feature, including facts that cost real debugging to learn. |
| `loopany/dorm-conductor/` | The conductor loop: its brief, `conductor_web.py` (the tea chatbox / acoustics simulator, stdlib-only, port 7332), and the `tea` CLI. |

**Not in this repo:** `rustlings/` and `rust-dsa/` sit beside it, carry their own git history, and
are gitignored here (rustlings alone has a 110 MB `target/`). The conductor's
`dialogues/` and `chat_history.json` are gitignored too — private output that churns every run.
The lesson loop's `lessons/` are tracked; both loops' output directories are the loops' own, never
hand-edited source.

## Working on the workflow

```bash
cd loop-src && node --test          # 33 tests, all offline except cargo/clippy
```

**As of 2026-08-12, 3 of the 33 fail on a clock, not a regression** — see the fixture bullet
below. Compare against that baseline before assuming you broke something.

Deploy only through the dry-run gate — the loop fires unattended, and a broken workflow costs a
real lesson day:

```bash
cd loop-src
npx @crewlet/loopany@latest edit <loop-id> --workflow-file daily-lesson.workflow.js --dry-run
# rejections: none  →  then drop --dry-run to apply
npx @crewlet/loopany@latest edit <loop-id> --workflow-file daily-lesson.workflow.js
```

Re-run the dry-run afterwards; `changes: none` confirms the server matches local. The brief
(`loopany/daily-lesson/README.md`) needs no push — it syncs on the loop's next run.

## Constraints worth knowing before you edit

These are not style preferences. Each one has cost a lesson day or a silent bug.

- **The loopany host kills the whole workflow at 30 seconds.** Every external call is budgeted
  from one `HOST_TIMEOUT_MS` constant. A per-command timeout larger than the remaining budget can
  never fire, and when the cap trips the run gets *no prefetched data at all* — grading, streak and
  the review ladder all vanish. Don't raise a timeout without checking the budget still adds up.
- **`child_process` reads `timeout: 0` as "no timeout".** A spent budget must skip a call, never
  pass zero.
- **Absolute paths only.** Runs start in an unrelated empty directory; nothing may depend on `cwd`.
- **Never write inside `loopany/`.** It is synced content — no `cargo`, no build output, no
  checkouts.
- **Never touch mtimes under `rustlings/exercises/`.** They decide which exercises get reviewed;
  touching one makes stale work look new.
- **The fixture must mirror production's shape, not a convenient one.** Most bugs found while
  building the feedback feature were a green test suite over a real break, and most of those were
  the fixture diverging from reality.
- **The fixture's mtimes are hardcoded absolute dates, and they expire (2026-08-12).** The
  selection tests stamp exercises at `2026-08-05`…`2026-08-13` but recreate the cutoff lesson to
  get a *live* birthtime, so once the wall clock passed those dates the qualifying pool emptied
  and 3 tests went red — `selection caps at 5…`, `one unreadable exercise…`, and the `denied1`
  clippy-level test. Nothing in the workflow broke. Restamp relative to `Date.now()` when you next
  touch that harness; until then, treat those 3 as the known baseline.

## Notes

Lesson delivery is local: `~/.claude/tools/lesson-web.py` serves the day's lesson on
`127.0.0.1:7331` and writes my Track B answer straight back into the lesson markdown, keeping it
the single source of truth. macOS notifications are a dead end here and the brief records why.
