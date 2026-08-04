# Rust + DSA — Daily Lesson

## Spec

**Mission.** Take the owner from Rust foundations to a finished **custom data structure
library** in Rust, 15 minutes a day, teaching **both a Rust lesson and a DSA lesson every
day**. The finish line: `rust-dsa` implements Vec, Stack, Queue, LinkedList, BinaryHeap,
BST, HashMap and Graph, each unit-tested with `cargo test` green and each public item
documented. The authoritative setpoint lives in the loop's `goal`, not here — when it's
met, the run calls `loopany finish`.

**The 15-minute split — two tracks, one file, every day.**

| Track | Budget | What | Verified by |
|---|---|---|---|
| **A · Rust** | ~8 min | next rustlings exercises | pre-fetched `rustlings.done` (compiler-backed) |
| **B · DSA** | ~7 min | one concept, then one structure | see *Stage B1/B2* |

Track B runs in two stages, because 15 minutes will not hold two coding tracks:

- **Stage B1 · theory-first** — while Track A is still pre-ownership. The exercise is **by
  hand, no Rust**: trace an algorithm, derive the Big-O, hand-simulate an insert or a
  rebalance, write pseudocode. Fits 7 minutes honestly. The owner writes their answer into
  the lesson file's `## My answer` block; a collapsed worked answer sits below it to
  self-check against.
- **Stage B2 · implement** — begins once Track A has `move_semantics`, `traits`,
  `lifetimes` and `smart_pointers` all done. The exercise becomes real code in `rust-dsa`,
  one structure at a time, verified by `cargo test`. That structure's theory is already
  banked from B1, so the step is just the code.

**Where things live.** The loop folder is synced content, so all heavy work stays out of it:

| Path | What | Synced? |
|---|---|---|
| `loopany/daily-lesson/README.md` | this brief + memory | yes |
| `loopany/daily-lesson/lessons/YYYY-MM-DD.md` | the day's lesson (both tracks) | yes |
| `../../rustlings/` | rustlings exercises (has `target/`) | **no — keep out** |
| `../../rust-dsa/` | the final project (has `target/`) | **no — keep out** |

Never run `cargo`, `rustlings`, or create a checkout inside `loopany/`.

**Each run, in order:**

1. **Grade yesterday, per track.** The workflow hands over `prev_lesson` — yesterday's file,
   its full text, and its `### My answer` block already extracted — plus `history` (every
   lesson's date + graded `type`), `streak_before_prev`, and `gap_days`. Don't re-`ls` the
   folder or re-read the file; only touch disk if that data is null or looks wrong.

   **`gap_days > 0` means a run failed and the owner got no lesson those days.** That is the
   loop's fault, never theirs: say so in one line in today's opening note, don't grade the
   missing days, and don't break the streak over them.
   - *Track A* — use the grading data the workflow already fetched (`rustlings.done`, every
     exercise rustlings recorded as passing, and `cargo`). Only run commands yourself when
     that data is null or looks wrong — fallback below. The compiler judges, never the
     owner's word.
   - *Track B, stage B1* — judge `prev_lesson.track_b_answer`. Non-empty and substantively
     addressing the question → passed; empty → not (the owner never filled it in). This is
     the **only** evidence a B1 exercise was done. A substantive answer passes even when
     partly wrong — so when it *is* wrong, the correction goes in **today's lesson's opening
     note**, one line naming what was off, never silently dropped.
   - *Track B, stage B2* — `cargo` from the pre-fetched data (`cargo test` summary,
     passing/failing test names, first compile errors).

   Then edit that file's front-matter `type:` in place: `done` (both tracks passed),
   `partial` (one track only), `skipped` (neither). A lesson issued before Track B existed
   has no Track B section — grade it on Track A alone, `done` or `skipped`.
   **Grading a Sunday review day** uses the same two rules with one swap: Track A is judged on
   `cargo` (the `review_*` test file passing), never on `rustlings.done`. Any test question
   answered wrong goes into the *Review queue*, and the item that Sunday pulled *from* the
   queue is dropped from it either way.
2. **Sunday?** Then skip to the *Sunday · Review day* section — no new concepts today, and no
   curriculum advance on either track. Otherwise **pick today's two steps** — see
   *Curriculum*, adapting per track **independently**. A
   track that was skipped re-teaches the same concept a different way and does **not**
   advance; two skips in a row on one concept → shrink the step and say so. The tracks will
   sit at different depths; that's expected, never resync them.
3. **Write today's lesson** to `lessons/<YYYY-MM-DD>.md`, front-matter `type: assigned`,
   both tracks in one file under `## Track A · Rust` and `## Track B · DSA`. Each track gets:
   - **Concept** — one idea, plain prose, one tiny snippet or worked trace. One idea, not three.
   - **Do this** — the exact command(s) or the exact question, sized to that track's budget.
   - **Done when** — one checkable line the next run can verify mechanically.
   - **Stuck?** — one collapsed hint, not the answer.

   Track B in stage B1 additionally gets an empty `### My answer` block for the owner to
   fill, and a collapsed **worked answer** below it. That heading is exact — `lesson-web.py`
   and the next run's grading both key on it, and prose referring to it should say
   `### My answer` too.
4. **Update this file** — append one dated Timeline line, nudge *Current understanding*
   (each track's position, and B's current stage).
5. **Put the lesson in front of the owner.** After the file is written, open it in the
   browser and fire a macOS banner — a lesson nobody sees is a skipped day:

   ```bash
   nohup python3 "$HOME/.claude/tools/lesson-web.py" --open >/dev/null 2>&1 &
   ```

   **The browser opening itself is the delivery — there is no banner.** Notifications are a
   dead end on this Mac and the evidence is conclusive (2026-07-31): `display notification`
   returns success but nothing draws, because no CLI-reachable process is a registered
   notification client — Script Editor isn't one, and a hand-built `osacompile` applet is
   blocked from executing at all by its ad-hoc signature. Don't spend another run on
   `osascript`; if a banner is ever wanted again the only route is a properly signed app the
   owner approves once in Finder. Starting the server twice is safe — it detects the bound
   port and just opens the browser.

   `lesson-web.py` serves the day's lesson at <http://127.0.0.1:7331> — rendered by pandoc,
   Track A's rustlings progress polled live from the state file, and a Track B answer box
   that **writes straight back into the lesson markdown's `## My answer` block**. That
   write-back is the load-bearing part: it keeps the markdown the single source of truth, so
   step 1's grading is unchanged and never reads a second copy. Starting it twice is safe —
   it detects the bound port and just opens the browser. If either command fails, log it in
   the Timeline and carry on; neither is worth failing the run over.

   `~/.claude/tools/lesson-open.sh` is the terminal equivalent, kept as a fallback for a
   day the browser isn't wanted. Track A itself stays in the editor — a browser has no
   business editing `intro2.rs`, and rustlings already watches the file.
6. **Report.** `loopany report --state '{"day":<n>,"rustlings_done":<n>,"dsa_topics":<n>,"structs_done":<n>,"streak":<n>}'`
   with a one-line message naming both topics. `structs_done` counts only structures whose
   tests pass; `dsa_topics` = B1 concepts passed plus B2 structures shipped; `streak` =
   `streak_before_prev + 1` when you just graded `prev_lesson` `done` or `partial`, else `0`
   — don't recount it by hand, the workflow already walked the history.
7. **Judge the goal.** All 8 structures tested, documented, `cargo test` green → write a
   closing lesson, then `loopany finish`.

**Front-matter convention.** Every lesson file opens with flat scalars only:
`type:` one of exactly `assigned` | `partial` | `done` | `skipped` (the stage, nothing
else), `title:` both topics in one line, `date:` `YYYY-MM-DD`. The dashboard board keys its
columns on that vocabulary — never invent a fifth value, never add a `status:` field.

**When to speak.** `notify: always` — this is a lesson, not a monitor; silence means an
unread lesson. The message is the notification the owner actually sees, so keep it to one
scannable line in exactly this shape:

```
Lesson 3 · A: intro3 (functions) · B: dynamic arrays — yesterday A ✓ B ✗
```

Lesson number, then each track as `A:`/`B:` with the concrete thing to do (exercise name or
concept, ≤4 words of gloss), then yesterday's per-track verdict as `✓`/`✗` after an em-dash.
On lesson 1 or after a duplicate wake, drop the verdict clause rather than inventing one.
No preamble, no encouragement, no second sentence — the dashboard's **Today** tab carries
the detail.

**Curriculum.**

- **Track A · Rust foundations** (`rustlings`, in order): variables, functions, if,
  primitive types, vecs, move semantics, structs, enums, strings, modules, hashmaps,
  options, error handling, generics, traits, lifetimes, smart pointers, then the rest.
  Source: <https://github.com/rust-lang/rustlings> + the Book chapter each section maps to.
- **Track B · DSA.** Stage **B1** concept order (theory, by hand): complexity & Big-O →
  arrays & dynamic arrays (amortized growth) → linked lists → stacks → queues → hashing
  (hash functions, collision strategies) → trees & BST → heaps → graphs (representations,
  BFS/DFS) → sorting → recursion & divide-and-conquer. Stage **B2** implementation order
  (each reuses the last): `Vec` (raw growth) → `Stack` → `Queue` → `LinkedList`
  (`Box`/`Option` — the ownership payoff) → `BinaryHeap` → `BST` → `HashMap` → `Graph`.
  B1's order deliberately front-runs B2's, so each structure's theory is banked before it
  is implemented. Source: <https://github.com/tayllan/awesome-algorithms>.

**Sunday · Review day.** Sunday **replaces** the normal lesson — no new concept on either
track, same 15 minutes, same two headings so grading and `lesson-web.py` are unchanged. Its
`title:` starts with `Review week N ·` so it's recognisable in `history`.

| Slot | Budget | What | Verified by |
|---|---|---|---|
| **Track A** | ~8 min | **small project** — one integration test file | `cargo test` |
| **Track B** | ~7 min | **the test** — 5 short questions | `### My answer` |

- **Track B · the test.** Five short questions in the one `### My answer` block, drawn by the
  ladder below — **2 from this week**, **1 due at ~1 week**, **1 due at ~4 weeks**, **1 from
  the wrong-answer queue** (or a sixth due item when the queue is empty). Questions may be
  Rust *or* DSA — both tracks are knowledge, and the title of each lesson carries both. Drop
  a slot the loop is too young to fill; never pad to five. Same collapsed worked answer below
  the block, same grading next run.
- **Track A · the small project.** The owner writes real Rust into
  `rust-dsa/tests/review_<YYYY_MM_DD>.rs` — an integration test exercising a **due** concept
  from the ladder, not this week's. Self-contained at stage B1 (helpers inside the test
  file); at B2 it drives the structures already shipped. `cargo test` already builds and runs
  `tests/`, so the pre-fetched `cargo` data grades it with no extra plumbing. **On Sunday,
  Track A is graded on `cargo`, not on `rustlings.done`** — rustlings doesn't move that day
  and that is not a skip.
- **The ladder — every concept, not just the failures.** Spacing is derived, not stored:
  **every lesson comes back at ~1 week, ~4 weeks and ~12 weeks after it was taught.** The
  workflow hands over `due_review` — the lessons whose date falls in one of those windows,
  each with its `title` and which rung it's on — so the run picks questions from the whole
  body of knowledge, not from a list of mistakes. Nothing needs to be written down for a
  concept that is simply being reviewed on time.
- **The wrong-answer queue is the exception list**, not the mechanism. Two deviations from
  the ladder, both recorded in *Current understanding*:
  - **Wrong → sooner.** A question answered wrong (Sunday's or a weekday's) is appended to
    *Review queue*, re-asked the very next Sunday, then removed — right or wrong — and it
    keeps its normal place on the ladder regardless. Cap 3; oldest falls off.
  - **Right at 12 weeks → retired.** Add it to *Retired* and stop drawing it, so the ladder
    doesn't grow unbounded as the curriculum does.
- **Report on Sunday** the same schema. A review day counts as `dsa_topics` unchanged (it
  teaches nothing new) and keeps the streak like any other day.

**Code feedback on Track A.** The workflow hands over `reviewed_exercises` — every exercise
the owner finished since the last lesson, each with their `code`, rustlings' official
`solution`, and scoped `clippy` findings run at **pedantic** level (`-W clippy::pedantic`),
each carrying `{code, message, line, level: 'warning' | 'error'}`. Turn it into a
`### Yesterday's code` block at the top of `## Track A · Rust`, above today's assignment.

- **Deep-review exactly one**, chosen in this order: the exercise with clippy warnings;
  failing that, the one whose code diverges most from the official solution; failing that,
  the newest. An exercise with any `level: 'error'` finding outranks one with only warnings
  when choosing this single slot. Say what they did well, give **one** concrete improvement as
  rewritten lines, and note how the official solution differs *only where it genuinely does*.
  These files are five lines — a mechanical diff teaches nothing.
- **One line each** for the rest.
- **`level` splits findings into two different things — never blur them together.**
  `level: 'error'` means the compiler or clippy genuinely **rejected** something: clippy's own
  deny-by-default `correctness` group, one of rustlings' own forbidden/denied lints (its
  `Cargo.toml` sets `unsafe_code` and `clippy::todo`/`empty_loop` to forbid, `infinite_loop`
  and `mem_forget` to deny), or a bare rustc compile-error code (e.g. `E0061`) — rustlings
  passing an exercise says nothing about any of these, so this is reachable on a "done"
  exercise. Lead with these, name them as real defects, never mix them in among the style
  notes. `level: 'warning'` is pedantic idiom advice: a tidier way to write something the
  compiler already accepted. Explain the rule and show the tidier form — the owner did nothing
  wrong, so don't frame it as a mistake.
- **Quote each finding's `code` exactly as given.** Most are clippy lints
  (`clippy::needless_return`), but a `level: 'error'` entry can equally be a rustlings-forbidden
  lint or a bare rustc error code (`E0061`) — never assume or add a `clippy::` prefix that
  isn't there. The code establishes *that* something is off; the lesson explains *why*.
- **`clippy.ok: false` means unknown, never clean.** Say nothing about lints for that
  exercise rather than implying it passed.
- **Findings arrive already capped at 10 per exercise — error-level entries are never dropped
  in favour of warnings, but the array is NOT re-sorted by level.** It stays in clippy's own
  emission order (which tracks line order in the file), so sort or partition by `level`
  yourself if you want errors presented before warnings in the block — don't assume position
  implies severity. Show fewer than 10 only for prose reasons, never by slicing.
- **Omit the whole block when there is nothing worth saying — the most important line here.**
  Pedantic is chatty, so the temptation to always have something to say is real; repeating the
  same lint every day is the same failure as writing "looks good!" — both train the owner to
  stop reading the block. Silence is the correct output for a clean day, and default-level
  clippy alone would have stayed silent for weeks (see *Current understanding*).
- Feedback is **read-only**: it never gates the next lesson and never spends Track A's
  ~8 minutes. Grading is unchanged.

## Current understanding

- **Both projects exist.** `rustlings/` (94 exercises, own git repo) and `rust-dsa/`
  (`cargo new --lib`, default test passes) are in place at
  `/Users/tamnm/code/personal/`. Bootstrap is done — never redo it.
- **The tree lives outside `~/Documents` deliberately.** Moved there 2026-08-03: macOS TCC
  denies launchd-started processes access to `~/Documents`, and the daemon now runs as a
  LaunchAgent. Running from Documents cost the 08-03 lesson (`An internal error occurred
  (EPERM)`). Never move it back.
- **Your cwd is NOT the project tree.** Runs still start in
  `~/Documents/Manual Library/code/personal`, which is now an **empty leftover directory** —
  the daemon's launch cwd, unaffected by the move. Everything works only because every path
  is absolute. **Always use absolute paths under `/Users/tamnm/code/personal/`**, and `cd`
  explicitly before any `loopany`, `cargo` or `rustlings` command. A relative path silently
  lands in the empty dir.
- **Schedule: 09:00 Asia/Saigon daily** (cron `0 9 * * *`). It sat at 14:17 for a day around
  2026-08-03 and is back at 09:00 — confirmed against `loopany show` on 2026-08-03, so ignore
  any older note claiming 14:17. Asia/Ho_Chi_Minh is the same zone and is what the workflow
  uses for its date math. The 15-minute budget has never moved.
- **Review queue** — the *exception* list only: questions answered wrong, waiting to be
  re-asked next Sunday. Max 3, oldest falls off; removed after one retry, right or wrong.
  On-time review of everything else is derived from `due_review`, never listed here.
  - **Linked lists · memory overhead** — lesson 4 Q4 (1,000 `i64`: ~8 KB array vs ~16 KB
    list), left blank. Added 2026-08-04.
- **Retired** — concepts answered right at the 12-week rung; no longer drawn by the ladder.
  - *(empty)*
- **Grading is pre-fetched, and duplicate wakes never reach the agent.** A workflow runs
  before each lesson and hands over `today`, `prev_lesson` (yesterday's file: path, `type`,
  full text, and its `### My answer` block extracted), `history` (every lesson's date +
  graded `type`), `streak_before_prev`, `gap_days`, `rustlings` (current exercise + the
  done list, from `rustlings/.rustlings-state.txt`) and `cargo` (`cargo test` summary,
  passing/failing test names, first compile errors). The state file's format: line 1 is a
  `DON'T EDIT` header, the first non-blank name after it is the current exercise, the rest
  are done — and rustlings only records an exercise once it compiles and passes, so that
  list is compiler-backed, not self-reported. The same workflow short-circuits a duplicate
  same-day wake — today's lesson present and still `assigned` → silent tick, no agent, no
  Timeline line — so a run that starts *has* work to do.
- **Code feedback is pre-fetched too, and clippy runs at pedantic level on purpose.**
  `reviewed_exercises` carries the owner's code, the official `solutions/<sec>/<name>.rs`,
  and `cargo clippy --bin <name> --message-format=json -- -W clippy::pedantic` findings
  (`{code, message, line, level}`, capped at 10 per exercise — errors never dropped in favour
  of warnings, but the array is otherwise in clippy's own emission order, not re-sorted), for
  up to 5 exercises that are both in `rustlings.done` **and** modified since the previous
  lesson file's **birthtime** (not its mtime — the lesson file gets rewritten after issue, so
  mtime means "last touched", not "when issued"; see the gotcha below). Never re-read those
  files or re-run clippy by hand. **Pedantic is on because default clippy produced zero
  findings across all 17 exercises the owner had completed as of 2026-08-04**
  (`intro1..2`, `variables1..6`, `functions1..5`, `if1..3`, `quiz1`) — default alone would have
  made this feature silent for weeks. Real pedantic output on that same tree: `if1` →
  `clippy::semicolon_if_nothing_returned` and `clippy::uninlined_format_args`; `quiz1` →
  `clippy::uninlined_format_args`. `level: 'error'` means the compiler or clippy genuinely
  rejected something — clippy's own deny-by-default `correctness` group, one of rustlings'
  forbidden/denied lints, or a bare rustc compile-error code — distinct from the idiom-advice
  `warning` level, because rustlings passing an exercise says nothing about any of those.
  Verified 2026-08-04: scoped clippy is 0.35s, cargo replays cached diagnostics (so no
  cache-busting is needed), and `rustlings/` has **no git baseline** — the official solution
  is the only reference, there is no diff against the owner's earlier attempt. **Don't
  simplify pedantic back to default** — that would silently kill the feature again.
- **Fallback grading commands.** rustlings is **6.5.0 — there is no `rustlings list`.**
  When the pre-fetched data is missing, `cd rustlings && rustlings check-all 2>&1 | tail -3`
  recompiles everything non-interactively and prints `N/94 exercises pending`. It emits
  ANSI/TUI escape noise, so always pipe through `tail`. It's slow (94 crates) — prefer the
  pre-fetched data.
- **Baseline counts** — at create: `93/94 pending` (only `intro1`, which ships passing);
  `structs_done: 0`; `cargo test` in `rust-dsa` green with the scaffold test.
- **Owner profile** — starting from foundations; budget is a real 15 min/day.
  Wants both reading and doing, wants **DSA every day alongside Rust**,
  and wants the loop to check whether yesterday's work was actually done rather than
  marching on regardless.
- **Position** — Track A: lesson 4 passed and **overshot a third time** — `rustlings.done`
  is `intro1..2, variables1..6, functions1..5` (13/94), current exercise `if1`. Step grown
  to four in lesson 5 (`if1..3` + `primitive_types1`). Track B: **stage B1**, concepts 1–3
  (Big-O; dynamic arrays; linked lists) all passed, each with one flaw; concept 4 (stacks)
  issued in lesson 5. No structures written; `cargo test` still scaffold-only.
- **Gotchas** —
  - **Day 1 was skipped, day 2 overshot.** The cold-start floor worked: shrinking to one
    exercise got the owner moving and they did four. Grow the step when a track overshoots,
    but keep the floor rule for any track that skips.
  - **B1 answers can be right-shaped but wrong.** Lesson 2's Q3 said `O(n)` where the
    doubling test gives `O(n²)` — passed on substance, corrected in lesson 3's opening note.
    That is the pattern; don't silently move on.
  - **A partly-filled `### My answer` block still passes.** Lesson 4 answered 2 of 4 and
    graded `done` — the written rule is non-empty + substantive, and `partial` means *one
    track*, not half a track. The lever is the lesson, not the grade: name the blanks in the
    opening note, re-ask one of them as today's Q1, and put the other in the Review queue.
  - The enclosing folder is not a git repo, so there's no commit history to read progress
    from. Progress comes from the pre-fetched data and the `### My answer` blocks.
  - B1 exercises are not compiler-checkable. The `### My answer` block is the only evidence
    a B1 exercise was done — empty means skipped, no matter what else the day looks like.
  - Lesson 1 predates Track B and is Rust-only. Don't mark it `partial` for a missing DSA
    section it was never given.
  - **Delivery is local, not push.** Loopany's `notify: always` only writes the message into
    the run history on loopany.ai — the daemon has no notifier and nothing pops on the Mac.
    Opening the browser (Spec step 5) *is* the delivery.
  - `~/.claude/tools` is a symlink to `~/dotfiles/AI/tools` — editing `lesson-web.py`
    edits the dotfiles copy.
  - **Runs do fail, and a failed run is a lost lesson day** (08-02: API connection dropped
    mid-response; 08-03 morning: the `~/Documents` EPERM). The workflow now surfaces those
    days as `gap_days` — see step 1. Don't read a gap as the owner going quiet.
  - **Duplicate wakes happen** (07-31 fired twice, 23 min apart). The workflow now gates
    them; if it ever falls back and you see `lessons/<today>.md` already `assigned`, don't
    grade it and don't issue a second one — report `nothing-new` and stop.
  - **Never edit a file under `rustlings/exercises/` yourself.** Its mtime is the cutoff that
    decides what gets reviewed; touching one makes stale work look new. Feedback is prose in
    the lesson, never an edit to the owner's code.
  - **Clippy runs at pedantic, not default — default was silent.** A sweep across all 17
    exercises the owner had completed as of 2026-08-04 (`intro1..2`, `variables1..6`,
    `functions1..5`, `if1..3`, `quiz1`) found zero default-level findings, so pedantic
    (`-W clippy::pedantic`) is load-bearing, not decoration — real findings only start at
    `if1` (`clippy::semicolon_if_nothing_returned`, `clippy::uninlined_format_args`) and
    `quiz1` (`clippy::uninlined_format_args`); `variables*` and `functions*` are genuinely
    clean, not an artifact of a weaker check. Expect pedantic to be chattier than default; the
    silence rule (Spec, above) is what keeps that from becoming noise.
  - **`level: 'error'` and `level: 'warning'` are not the same finding dressed differently.**
    Error means the compiler or clippy genuinely rejected the code — clippy's own
    deny-by-default `correctness` group, one of rustlings' forbidden/denied lints, or a bare
    rustc compile-error code, not only a clippy lint — a real defect, reachable even on a
    rustlings-passing exercise. Warning is pedantic idiom advice on code the compiler already
    accepted. Collapsing them into one undifferentiated list is the one mistake to avoid here.

## Timeline

<!-- one dated entry per run, appended below by the loop -->

- **2026-07-30** — loop created and bootstrapped (`rustlings init`, 94 exercises; `cargo new
  --lib rust-dsa`, green). Baseline 93/94 pending, 0 structures. Lesson 1 issued, Rust-only.
  Same day the owner reshaped the loop: DSA became a **daily Track B** beside Rust with a
  theory-first B1 stage, schema gained `dsa_topics`, `type` gained `partial`.
- **2026-07-31** — run 2: lesson 1 graded `skipped`, Track A shrunk to one exercise, Track B
  opened at B1 (Big-O). Same day, **delivery solved locally** — `lesson-web.py` (stdlib
  http.server on 127.0.0.1:7331, pandoc render, live rustlings progress, answer box writing
  back into `### My answer`), after notifications were abandoned with evidence.
- **2026-08-01** — run 3: first fully-`done` day (Track A overshot 1→4 exercises; Track B all
  three answered, Q3 wrong). Evolution pass added the duplicate-wake gate and pre-fetched
  `prev_lesson`, killing the `ls`/`date`/Read opener.
- **2026-08-03** — run 4. **No lesson existed for 08-02** — that run failed, so the owner got
  no lesson that day. Not a streak break on their side. Lesson 3 graded `done`:
  Track A overshot a second time (`variables4/5/6` for a two-exercise assignment → step now
  three), Track B answered all four with Q2 wrong (7 copies for what is 15). Lesson 4 issued:
  functions/parameters/semicolon-as-return vs linked lists (`O(n)` access, `O(1)` front
  insert, the predecessor problem, pointer overhead) — the array↔list trade that sets up B2's
  `Stack`/`Queue`.
- **2026-08-03** — evolution pass. Found three drifts and fixed them: the **schedule had
  moved to 14:17 Asia/Saigon** while the brief, dashboard and workflow all still said 09:00;
  the runs' **cwd is an empty leftover dir** (`~/Documents/…/personal`) that only works
  because every path is absolute — now pinned as a gotcha; and run 4 still `ls`-ed
  `lessons/` because it needed the whole history to compute `streak`. Workflow now hands over
  `history`, `streak_before_prev` and `gap_days`, so streak is deterministic and a
  failed-run gap is never misread as an owner skip. `cargo test` measured at 1.4s cached —
  left in place. Timeline condensed to a milestone spine.
- **2026-08-03** — **Sunday review day + spaced repetition** added at the owner's request.
  Sunday replaces the lesson with a 5-question test (Track B) plus a small project (Track A,
  an integration test in `rust-dsa/tests/review_*.rs`), so both features ride the existing
  grading pipeline — `cargo test` already builds `tests/`, and the test answers use the same
  `### My answer` block. Spacing is a 3-item *Review queue* in this file, not a scheduler.
  Workflow now hands over `is_review_day`, `week_number`, each history entry's `title`, and
  `due_review` — the derived ladder. Spacing covers **all** knowledge, not just mistakes:
  every lesson returns at ~1w/~4w/~12w (±3 days, so exactly one Sunday lands in each window —
  verified over a year of Sundays for every weekday a lesson can be taught on). The queue
  only holds exceptions. Schedule confirmed as 09:00, correcting the stale 14:17 note.
- **2026-08-04** — run 5. Lesson 4 graded `done`, but **half a track**: Track A overshot a
  third time (`functions1..5` for a three-exercise assignment → step now four), Track B
  answered Q1/Q2 and left **Q3 and Q4 blank**, with Q2's reason cut off mid-sentence. First
  time the block came back partly filled — new gotcha above, and the two levers used instead
  of a harsher grade: Q3 re-asked as today's Q1, Q4 into the Review queue for Sunday 08-09
  (queue's first entry). Lesson 5 issued: `if` as an expression (no truthiness, both arms
  same type, no ternary needed) vs stacks (LIFO, all three ops `O(1)` *because* of the
  restriction, array-backed at the end vs list-backed at the head — each picking the end its
  structure is fast at, which is the setup for B2's `Stack`).
- **2026-08-04** — **code feedback on Track A** added. The workflow now pre-fetches
  `reviewed_exercises` (owner's code + rustlings' official solution + scoped clippy JSON, up
  to 5 exercises) for exercises finished since the last lesson, and the lesson opens Track A
  with a `### Yesterday's code` review. Read-only by design — the owner rejected a daily
  rework step as a tax on a track they already overshoot. **Clippy runs at pedantic
  (`-W clippy::pedantic`), not default**: a sweep across all 17 exercises the owner had
  completed found **zero default-level findings**, so default alone would have made the
  feature silent for weeks; pedantic surfaces real advice starting at `if1`
  (`clippy::semicolon_if_nothing_returned`, `clippy::uninlined_format_args`) and `quiz1`
  (`clippy::uninlined_format_args`). Each finding now carries a `level`: `error` means a
  genuine rejection — clippy's own correctness group, a rustlings-forbidden lint, or a bare
  rustc error code — surfaced separately from `warning` (pedantic idiom advice), since
  rustlings passing an exercise says nothing about any of those. Findings arrive pre-capped
  at 10 per exercise — errors survive the cap over warnings, but the array stays in clippy's
  own emission order, not sorted by level. Workflow source now lives durably at
  `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js` with a test harness beside
  it, instead of only on the server.
