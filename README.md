# loopany — Rust + DSA daily lesson

The local source for a [Loopany](https://loopany.ai) scheduled loop that teaches me Rust and
data structures, 15 minutes a day, and grades whether I actually did yesterday's work.

The loop runs on my machine via the loopany daemon, fires at **09:00 Asia/Saigon**, and finishes
itself when `rust-dsa` implements Vec, Stack, Queue, LinkedList, BinaryHeap, BST, HashMap and
Graph — each unit-tested and documented.

## How a run works

Each morning, two stages:

1. **The workflow** (`loop-src/daily-lesson.workflow.js`) — deterministic JS, no LLM. It gathers
   everything the lesson needs: yesterday's lesson and the answer I typed into it, the full
   lesson history, the spaced-repetition ladder, compiler-backed rustlings progress, `cargo test`
   state, and code feedback on the exercises I finished. Then it calls `agent(prompt, data)`.
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

**Not in this repo:** `rustlings/` and `rust-dsa/` sit beside it, carry their own git history, and
are gitignored here (rustlings alone has a 110 MB `target/`).

## Working on the workflow

```bash
cd loop-src && node --test          # 33 tests, all offline except cargo/clippy
```

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

## Notes

Lesson delivery is local: `~/.claude/tools/lesson-web.py` serves the day's lesson on
`127.0.0.1:7331` and writes my Track B answer straight back into the lesson markdown, keeping it
the single source of truth. macOS notifications are a dead end here and the brief records why.
