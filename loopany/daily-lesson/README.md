# Rust + DSA — Daily Lesson

## Spec

**Mission.** Take the owner from Rust foundations to a **working chess engine** in Rust, 15
minutes a day, teaching **both a Rust lesson and a DSA lesson every day**. The finish line:
`rust-dsa` plays legal chess — perft-verified move generation, alpha-beta search with a
transposition table, and a terminal binary you can play a full game against — built on
hand-written `ds::` structures rather than std's. The authoritative setpoint lives in the
loop's `goal`, not here — when it's met, the run calls `loopany finish`.

**Why chess (2026-08-09).** It replaced an abstract 8-structure library that was correct and
boring. Chess spends every rustlings concept the same day and genuinely needs five of the eight
structures. The complaint was *boring, not too hard*: **connection is the lever, never difficulty.**

**The 15-minute split — two tracks, one file, every day.**

| Track | Budget | What | Verified by |
|---|---|---|---|
| **A · Rust** | ~8 min | **2** rustlings exercises, then that same concept spent in chess | `rustlings.done` **and** a named `cargo` test |
| **B · DSA** | ~7 min | one concept, then one structure | see *Stage B1/B2* |

**Track A is two halves and both count.** ~4 min on the next two rustlings exercises, ~4 min
applying what they just taught inside `rust-dsa`. The step is **two exercises, not four** — that
halves rustlings velocity and buys the throughline. It will try to drift back to four on any day
the chess step is awkward; two is the setpoint, and the chess half is the first thing time
pressure eats.

**The chess half's contract.** The run **writes one failing `#[test]` into the crate itself**
and names it in `### Done when`; the owner's job is to make it pass. The next run grades it by
looking that name up in `cargo.passing`. So a chess step is never self-reported — the compiler
judges it, exactly like rustlings. Write the test, not the implementation: a stub with `todo!()`
is fine, a working body is not. **One test per day, one name.**

**The inverted chess half — "ship it broken".** Once in a while the halves swap: **the run writes
a deliberately wrong implementation and names the test the owner must write.** Finding a bug
teaches an invariant that building the happy path does not. Every clause is load-bearing:

- **It lives in `rust-dsa/tests/invert_<YYYY_MM_DD>.rs`, never in `src/`** — the wrong function is
  a local `fn` there, same shape as Sunday's `tests/review_<YYYY_MM_DD>.rs`.
- **Only on a phase already closed, at most once per phase, never on the phase in flight.**
- **It does not spend the one-run-written-body-per-phase budget and never advances `chess_phase`.**
  If ship-it-broken ever looks like it is moving the phase, it is being used wrong — stop.
- **The bug must compile, pass a naive test, and fail a good one.** No compile errors, no
  `todo!()`, no panic on the first call — if the bug is visible without writing a test, there is
  no exercise.
- **Say that it's wrong; don't say where.** Naming the line gives it away; hiding that a bug exists
  at all is a trap, not a lesson.
- **`### Done when`** stays one mechanical line: `cargo test <name>` green. The next run checks that
  name in `cargo.passing` **and** reads the file text out of `rust_dsa.files` — a test can be
  weakened instead of the code being fixed.

Track B runs in two stages, because 15 minutes will not hold two coding tracks:

- **Stage B1 · theory-first** — the exercise is **by hand, no Rust**: trace an algorithm, derive
  the Big-O, hand-simulate an insert or a rebalance, write pseudocode. The owner writes their
  answer into the lesson file's `## My answer` block; a collapsed worked answer sits below it.

  **B1 has two question forms, and the day picks which.** *Forward* is the list above — compute
  it, trace it, derive it. *Inverted* asks the same concept from the failure side: **construct
  the input, the ordering, or the one-line change that breaks the invariant, and name the symptom
  it produces.** Same 7 minutes, same block, same worked answer — only the question changes.

  | Day | Form |
  |---|---|
  | A concept served for the first time | **Forward** |
  | A repeat serve — the held concept during `presence.any: false`, or a re-served pair | **Inverted** |
  | Sunday review, and every wrong-answer-queue item | **Inverted** |

  Inversion is the only form that re-asks without explaining again — it is what the run does with a
  held concept instead of writing a second lecture. Left to itself the run picks forward every day,
  so read this table before writing Track B.
- **Stage B2 · implement** — real code in `rust-dsa/src/ds/`, one structure at a time, verified by
  `cargo test`. That structure's theory is already banked from B1, so the step is just the code.

  **B2 is gated on the chess phase that needs the structure, not on a rustlings exercise.** The old
  `generics2`/`box1` gates are gone — they held `structs_done` at 0. The engine pulls each structure
  in when it needs it (see *Chess roadmap*).

  **B1 does not run dry — it has a part 2.** When no structure is due, Track B takes **the next
  untaught concept from *B1 part 2*** (see *Curriculum*). Don't hand-design the same structure for
  days, and don't start B2 early. **When part 2 is exhausted the draw order is settled (2026-09-03):
  (1) transposition tables, (2) re-serve iterative deepening** — served 08-25 into an empty room and
  never read, so genuinely untaught — **(3) then B1 becomes `due_review` questions only, one a day.**
  Do not invent new concepts to keep part 2 alive.

**Chess roadmap.** Phases, not dates. Each is several days; advance only when its test passes.

| Phase | Chess | Rust it needs | Structure it earns |
|---|---|---|---|
| 0 | `Square` newtype, `"e4"` ↔ index round-trip | structs | — |
| 1 | `Color`/`PieceKind` enums, `Board([Option<Piece>; 64])`, `Display` | enums, `Option` | — |
| 2 | FEN parse, pseudo-legal moves per piece | strings, vecs, iterators | `ds::Vec` (move list) |
| 3 | make/unmake, legality via king-in-check | structs, generics | `ds::Stack` (undo) |
| 4 | perft 1–3, castling, en passant, promotion | — | — |
| 5 | eval, minimax, alpha-beta | recursion, lifetimes | the search tree |
| 6 | move ordering | traits, `Ord` | `ds::BinaryHeap` |
| 7 | Zobrist hashing, transposition table, threefold repetition | hashmaps, smart pointers | `ds::HashMap` |
| 8 | `[[bin]]` terminal game vs human | error handling | — |

`LinkedList`, `Queue`, `BST` and `Graph` have **no honest use in a chess engine**. Forcing them
in would rebuild the fake-exercise feeling this redesign removed, so they are built as standalone
`ds::` modules on Sundays — see *Sunday · Review day*.

**Keep `cargo test` under 8 seconds.** `CARGO_TEST_HARD_CAP_MS` in the workflow is 8000 ms and
covers compile *and* run; blow it and `cargo.ok` goes false, which means grading goes blind.
Routine perft tests stay at **depth ≤ 3** (depth 4 is ~197k nodes and debug Rust is slow);
anything deeper is `#[ignore]`d and run by hand.

**Where things live.** The loop folder is synced content, so all heavy work stays out of it:

| Path | What | Synced? |
|---|---|---|
| `loopany/daily-lesson/README.md` | this brief + memory | yes |
| `loopany/daily-lesson/lessons/YYYY-MM-DD.md` | the day's lesson (both tracks) | yes |
| `../../rustlings/` | rustlings exercises (has `target/`) | **no — keep out** |
| `../../rust-dsa/` | the chess engine + `ds::` modules (has `target/`) | **no — keep out** |

Never run `cargo`, `rustlings`, or create a checkout inside `loopany/`.

**Each run, in order:**

1. **Grade yesterday, per track.** The workflow hands over `prev_lesson` — yesterday's file, its
   full text, and its `### My answer` block already extracted — plus `history`,
   `streak_before_prev`, and `gap_days`. Don't re-`ls` the folder or re-read the file; only touch
   disk if that data is null or looks wrong.

   **`gap_days > 0` means a run failed and the owner got no lesson those days.** That is the
   loop's fault, never theirs: say so in one line in today's opening note, don't grade the missing
   days, and don't break the streak over them.
   - *Track A* — **two halves, both from pre-fetched data, both required.** The rustlings half
     passes when yesterday's named exercises are in `rustlings.done`; the chess half passes when
     yesterday's named test is in `cargo.passing_tests`. Track A is `✓` only if **both** landed;
     one of two is a Track A miss, so the track re-teaches and does not advance.

     **`cargo.ok: true` does not mean everything passed** — it means cargo *ran* and its per-test
     verdicts are trustworthy. A failing test is the **normal daily state**: every weekday leaves a
     `todo!()` test failing on purpose. Grade from `passing_tests` / `failing_tests` and **don't
     re-run `cargo test` yourself**. `cargo.ok: false` is the genuinely blind case — the call was
     skipped, or the crate didn't compile (check `compile_errors`): say the check didn't run and
     carry the test forward unchanged.
   - *Track B, stage B1* — judge `prev_lesson.track_b_answer`. Non-empty and substantively
     addressing the question → passed; empty → not. This is the **only** evidence a B1 exercise
     was done. A substantive answer passes even when partly wrong — so when it *is* wrong, the
     correction goes in **today's lesson's opening note**, one line, never silently dropped. A
     partly-filled block still passes: name the blanks, re-ask one as today's Q1, queue the other.
   - *Track B, stage B2* — `cargo` from the pre-fetched data.

   Then edit that file's front-matter `type:` in place: `done` (both tracks passed), `partial`
   (one track only), `skipped` (neither). A lesson issued before Track B existed has no Track B
   section — grade it on Track A alone.
   **Grading a Sunday review day** uses the same two rules with one swap: Track A is judged on
   `cargo` alone (the `ds::` module's tests, or the `review_*` file's), never on `rustlings.done`
   and with no chess half. Any test question answered wrong goes into the *Review queue*, and the
   item that Sunday pulled *from* the queue is dropped from it either way.
2. **Sunday?** Then skip to *Sunday · Review day* — no new concepts, no curriculum advance on
   either track. Otherwise **pick today's two steps** — see *Curriculum*, adapting per track
   **independently**. A track that was skipped re-teaches the same concept a different way and does
   **not** advance; two skips in a row on one concept → shrink the step and say so. The tracks will
   sit at different depths; that's expected, never resync them.

   **Shrink the half that missed — never the half that landed.** Track A's verdict is joint (both
   halves or `✗`), but the *response* is per half. Reading the joint `✗` as "shrink Track A"
   punishes the half that is working — it happened three times, dropping rustlings to 1/day against
   the 2/day setpoint. **A half that landed goes back to its full setpoint the next day**; only the
   missed half shrinks. The cold-start floor of one applies to a half recovering from *its own*
   miss, never to its sibling.

   **Absence, not difficulty — `consecutive_skips ≥ 3` stops the shrink ladder.** The workflow hands
   over `consecutive_skips`, the trailing run of `skipped` (excluding `prev_lesson`, so add 1
   yourself if you just graded it `skipped`). Below 3 the shrink rule applies normally. **At 3 or
   more, do not shrink again** — the ladder is out of road, and nothing being touched at all is the
   signature of the owner not being there, which no lesson design fixes. Instead:
   - **Hold the step size steady.** Don't shrink, don't stack up what was missed, don't re-teach a
     fourth time. Ship a normal small lesson.
   - **Rotate forward on the RETURN day, not on every absent day.** Firing rotate-don't-re-serve
     daily burns the curriculum into an empty room. While `presence.any` is false, **Track B holds
     its concept** exactly as Track A holds its pinned rustlings pair: re-serve unchanged, cut the
     prose to a short reminder, don't advance. The three-serve park rule counts only serves that
     were **read** (`presence.any: true`). Rotate once, on the first day with presence.
   - **Say one plain line in the opening note** — the loop noticed the gap, nothing is owed, today
     starts clean. No guilt, no catch-up plan, no streak talk.
   - **The return day is a fresh start, not a retry.** The first lesson after a break of 3+ opens on
     the *next* concept, not the one abandoned.
   - **A hold day may never reach you at all — the workflow ships it.** Since 2026-09-07 the
     prefetch carries the hold itself: on a weekday where `presence.any` is false,
     `consecutive_skips ≥ 3`, `gap_days` is 0 and yesterday is still `assigned` with an empty answer
     box, it grades yesterday `skipped`, re-serves the last **weekday** lesson verbatim under
     today's date, opens the browser and reports — no agent. Sunday, a return, an outage or an
     unexpected file shape all fall through to you unchanged, so **an agent run during an absence is
     a Sunday or a real event, never a copy.** Two consequences you own: the Timeline gets **one
     range entry** covering the held stretch when you next run, never one line per held day; and the
     gate's interlock is the **`metrics:` front-matter line** you write into every lesson (see
     *Front-matter convention*) — omit it and the gate silently declines, so every absent day goes
     back to being a ~$1.50 agent run. *(The gate shipped 09-07 keyed on the host cursor and never
     fired once; re-keyed to the file on 09-11 — do not send it back to `prev`.)*

   **The chess half is untouched, not too big — `rust_dsa.owner_touched` settles it.** It says
   whether the owner opened the crate *at all* since the last lesson (with `touched_paths`); the
   run's own edits are excluded by construction, so **`owner_touched: false` with the chess test
   still red means the step was never attempted.** A step nobody opened cannot be too big. *(Size,
   reach and weekday crowding are refuted on evidence — see* Current understanding*; don't re-test
   them.)* So when `owner_touched` is false and the chess test missed:
   - **Don't shrink it, don't re-serve it a third time, and don't redesign the step's delivery.**
   - **At most ONE run-written body per phase, and never two runs in a row.** It fired four times
     instead of once, so phase 1's code is run-authored end to end. **A run-written body never
     advances `chess_phase`**, and once one has been written in the current phase, the phase is
     **blocked on the owner**. Say one line, and give those ~4 minutes back to the rustlings half
     until the owner opens the crate once. *(A ship-it-broken body doesn't count — see* The inverted
     chess half*.)*

   **Asking the owner — use the channel that gets answered.** A decision is asked as **Track B's Q1
   inside the `### My answer` block**, never as a sentence in the opening note: the box has a
   demonstrated response rate, the note has none and its one question got silence the run misread as
   consent. One question, two named options, one line each; it costs Q1's slot that day.

   **Then take the answer as given — but only count silence as an answer when they were there.** An
   unanswered question on a day the owner never showed up is an empty room, not a decision. It is a
   decision only when the box comes back blank *and* `presence.any` is **true**. Don't re-derive
   `presence.any`, and don't restate the test in prose. Re-ask at most once, on the next day with
   presence.

   **The crate question is CLOSED — `Q1: a` on 2026-08-28, keep the crate daily.** Never re-ask it,
   and don't take the Sundays-only fallback. What it doesn't settle is *why* nine days of presence
   chose rustlings, so the next `board_rank_line` miss is the first informative one — report it
   plainly, never redesign on it and **never call `loopany finish` over it**.

   **A concept is re-taught at most three times, then parked.** Without a cap, re-teaching freezes
   the curriculum — bitboards ran four times, phase 1 sat five days. On the third miss: move the
   concept to *Review queue*, advance the track, name the park in one line. This applies where the
   loop **chooses** what to teach — Track B's concept and the chess step. It does **not** apply to
   Track A's rustlings half: that order is pinned by `current_exercise` and can only shrink in
   count, never skip ahead.

   **Track A's step comes from `rustlings.next_exercises`** — the ordered slice starting at
   `current_exercise`, straight from Cargo.toml's bin list (the authoritative order, quizzes
   included), each with its source text. Size the step off it and quote the "done when" from it.
   Never grep the manifest, `cat` the sources, or infer order from section directory names. Only if
   the array is empty does the run check the bin list itself. **The step is two exercises** unless a
   track is recovering from its own skip.

   **`next_exercises[i].owner_modified` separates a keystroke from a miss** — don't judge it by
   reading the code. `true` on an exercise *not* in `rustlings.done` means the owner wrote it and
   the watcher never executed it: that is **presence**, not a miss. Name it as a keystroke in the
   opening note ("run the watcher once"), **re-assign the same pair unchanged, and don't re-teach
   the concept**. `false` is a genuine miss and the ordinary rules apply.

   **Track A's chess half comes from the *Chess roadmap* phase in *Current understanding*.** Pick
   the smallest next thing in that phase that the Rust taught so far can express. Write the failing
   test into `rust-dsa` yourself and name it in `### Done when`. Advance the phase only when its
   last test passes; a phase is several days, not one.

   **The crate is pre-fetched too — `rust_dsa.files` is every `.rs` under `src/` and `tests/` with
   its full text, plus `cargo_toml`.** Edit straight from it; never `ls -R`, `cat` or re-Read the
   crate to orient first, and register a new module in the `src/lib.rs` text you were handed. Only a
   file flagged `truncated: true` (clipped at 8 KB) or an empty `files` array is worth your own read.
3. **Write today's lesson** to `lessons/<YYYY-MM-DD>.md`, front-matter `type: assigned`, both
   tracks in one file under `## Track A · Rust` and `## Track B · DSA`. Each track gets:
   - **Concept** — one idea, plain prose, one tiny snippet or worked trace. One idea, not three.
     **It closes with one sentence, ≤20 words, naming how this goes wrong in practice** — the same
     idea from the failure side, never a second idea.
   - **Do this** — the exact command(s) or the exact question, sized to that track's budget.
   - **Done when** — one checkable line the next run can verify mechanically.
   - **Stuck?** — one collapsed hint that **eliminates a wrong path and never points at the right
     one**. Three forms that work: *"if you got X, you answered a different question"*; *"one of
     these is a trap — check what it costs"*; *"two of the four are wrong for the same reason"*.
     **Banned**: restating the Concept, and handing over the first step of the derivation.

   Track A additionally gets a `### Chess step` between its `### Do this` and `### Done when`: the
   file to edit, one sentence on what to build, and the exact test name to turn green. No second
   concept lives here — the chess step *spends* the Concept the rustlings half just taught. If it
   needs Rust the owner hasn't met yet, the step is too big. **It opens with a runnable command
   block**, same shape as the rustlings watcher — absolute path, the day's single test name, the
   file path on the line above. It *replaces* the sentence describing where to go:

   ```bash
   cd /Users/tamnm/code/personal/rust-dsa && cargo test <test_name>
   ```

   Track B in stage B1 additionally gets an empty `### My answer` block for the owner to fill, and a
   collapsed **worked answer** below it. That heading is exact — `lesson-web.py` and the next run's
   grading both key on it, and prose referring to it should say `### My answer` too.

   **Length is capped, and the cap is the assignment.** 15 minutes is ~1,000 words of reading *if
   the owner does nothing else* — and they have to write Rust and answer a question in it:

   | Section | Words |
   |---|---|
   | opening note (grades + corrections) | ≤ 120 |
   | `### Yesterday's code` | ≤ 200 |
   | Track A `### Concept` | ≤ 150 |
   | Track A `### Chess step` | ≤ 60 |
   | Track B `### Concept` | ≤ 250 |
   | each `### Do this` / `### Done when` | ≤ 60 |
   | each `### Stuck?` | ≤ 60 |
   | collapsed worked answer | ≤ 200 |
   | **whole file** | **≤ 1,200** |

   Draft to the budget, then **at most one trim pass**: write the file, run `wc -w` **once**, and if
   it's over, cut *whole sections* back to their one idea in a single edit. **Never word-shave in a
   loop** — that is what cost run 8 its metrics. Being 5% over costs the owner nothing; a run that
   never ships costs them the day. If one pass doesn't land it, ship it and note the overrun.

   Cut the Concept back to its one idea rather than trimming the exercise. Depth belongs in *one*
   place per lesson. **A `### Stuck?` longer than its own Concept is the tell that the hint has
   become a second lecture.**
4. **Update this file — and keep it under the Read cap.** Append one dated Timeline entry, **≤60
   words, hard**, then nudge *Current understanding* (each track's position, and B's current stage).
   The Timeline is a dated spine of *what happened* — the grade, the day's steps, the counters. A
   *durable finding* (a new gotcha, a refuted hypothesis, a rule the next run must know) goes in
   Current understanding **instead of**, never as well as. The cap is load-bearing: Timeline essays
   regrew this brief past the **25k-token Read cap** twice, after which every run pages it in twice
   plus a `tail` before it can start — and a long run is the loop's main failure mode.
5. **Put the lesson in front of the owner.** After the file is written, open it — a lesson nobody
   sees is a skipped day:

   ```bash
   nohup python3 "$HOME/.claude/tools/lesson-web.py" --open >/dev/null 2>&1 &
   ```

   It serves the day's lesson at <http://127.0.0.1:7331> — pandoc-rendered, rustlings progress
   polled live, and an answer box that **writes straight back into the lesson markdown's
   `## My answer` block**, keeping the markdown the single source of truth. Starting it twice is
   safe. If it fails, log it in the Timeline and carry on; `~/.claude/tools/lesson-open.sh` is the
   terminal fallback. Track A stays in the editor — rustlings already watches the file.
6. **Report.** `loopany report --state '{"day":<n>,"chess_phase":<n>,"crate_touched":<0|1>,"rustlings_done":<n>,"dsa_topics":<n>,"structs_done":<n>,"streak":<n>,"words":<n>}'`
   with a one-line message naming both topics. `words` is the `wc -w` you already ran in step 3.
   `chess_phase` is the *Chess roadmap* phase the run is currently working in, 0–8 — the loop's real
   progress axis, so report it every day, and a **run-written body does not advance it**.
   `crate_touched` is `rust_dsa.owner_touched` as 1 or 0. `structs_done` counts only structures
   whose tests pass.

   **`dsa_topics` and `structs_done` are cumulative — never report a number below the previous
   run's.** `dsa_topics` went 12 → 13 → 14 → **12** because each run recounted from scratch. Take
   the previous value from `prev_lesson.metrics` (already parsed for you) and add today's
   increment, if any; a review day adds nothing. `streak` = `streak_before_prev + 1` when you just
   graded `prev_lesson` `done` or `partial`, else `0` — don't recount it by hand. **The same four
   numbers go into today's `metrics:` front-matter line** — reporting them is not enough.
7. **Judge the goal.** Chess roadmap through phase 8, all 8 `ds::` structures tested and
   documented, `cargo test` green, and the binary plays a full legal game → write a closing lesson,
   then `loopany finish`. Read the loop's `goal` for the exact setpoint; it wins over this list.

**Front-matter convention.** Every lesson file opens with flat scalars only: `type:` one of exactly
`assigned` | `partial` | `done` | `skipped` (the stage, nothing else), `title:` both topics in one
line, `date:` `YYYY-MM-DD`, and `metrics:` (below). The dashboard board keys its columns on the
`type` vocabulary — never invent a fifth value, never add a `status:` field.

**The `metrics:` line is mandatory, and it is load-bearing.** One flat scalar, exactly this shape:

```
metrics: day=37 chess_phase=1 dsa_topics=15 structs_done=1
```

The same four cumulative numbers you `loopany report --state`, written into the file you just
wrote. This is the loop's **only** store for them — the host cursor cannot hold them (see *the
hold gate*, Current understanding), and none of the four is derivable from disk. The workflow's
no-agent hold gate reads yesterday's line as its interlock, so **a lesson written without the line
costs a full agent run the next absent day** and every day after until a run writes one again.
It self-heals in exactly one day; it just costs ~$1.50 to heal.

**When to speak.** `notify: always` — this is a lesson, not a monitor; silence means an unread
lesson. The message is the notification the owner actually sees, so keep it to one scannable line in
exactly this shape:

```
Lesson 12 · A: structs3 + chess Square · B: heaps — yesterday A ✓ B ✗
```

Lesson number, then each track as `A:`/`B:` with the concrete thing to do, then yesterday's
per-track verdict as `✓`/`✗` after an em-dash. Track A names **both halves** joined by `+` — the
last exercise of the step, then `chess <thing>` (≤3 words). Track B stays one concept or structure,
≤4 words of gloss. On lesson 1 or after a duplicate wake, drop the verdict clause rather than
inventing one. No preamble, no encouragement, no second sentence — the dashboard's **Today** tab
carries the detail.

**Curriculum.**

- **Track A · Rust foundations** (`rustlings`, in order): variables, functions, if, primitive
  types, vecs, move semantics, structs, enums, strings, modules, hashmaps, options, error handling,
  generics, traits, lifetimes, smart pointers, then the rest. The order is handed over as
  `next_exercises`; this list is the shape, not the source.
  Source: <https://github.com/rust-lang/rustlings> + the Book chapter each section maps to.
- **Track B · DSA.** Stage **B1** is theory by hand, in order, and comes in two parts.
  **Part 1 · classical DSA — complete as of 2026-08-13:** complexity & Big-O → arrays & dynamic
  arrays → linked lists → stacks → queues → hashing → trees & BST → heaps → graphs → sorting →
  recursion & divide-and-conquer.
  **Part 2 · engine theory** — each concept is pulled by a chess phase ahead of it. Take the next
  one not yet taught; the hand exercise is the 7-minute shape, still no Rust:

  | Concept | Hand exercise (forward) | Inverted variant | For phase |
  |---|---|---|---|
  | bitboards & bit manipulation | mask/shift one rank, popcount by hand | give the mask that silently wraps to the wrong rank | 2 |
  | game trees & minimax | score a 2-ply tree by hand | flip one leaf so the root's best move changes | 5 |
  | alpha-beta pruning | prune that same tree, count the nodes saved | give the tree where alpha-beta prunes nothing | 5 |
  | memoization vs tabulation | one recursion, two shapes | what memo key makes the cache return a wrong answer | 5 |
  | iterative deepening | why re-searching from depth 1 is nearly free | what branching factor makes re-searching expensive | 5 |
  | move ordering | why ordering multiplies pruning | the order that makes alpha-beta exactly as slow as minimax | 6 |
  | Zobrist hashing | XOR one move in and out; why XOR, not sum | three ways to make the same position hash differently | 7 |
  | transposition tables | collisions and replacement policy | three ways to make the TT return a wrong score | 7 |

  The third column is not a second concept — it is the same concept asked from the failure side,
  drawn on the days the form table above assigns *Inverted*.

  Stage **B2** implementation order is **pulled by the engine, not fixed in advance**:

  | Structure | Built for | When |
  |---|---|---|
  | `ds::Vec` | move lists | chess phase 2 |
  | `ds::Stack` | make/unmake undo | chess phase 3 |
  | `ds::BinaryHeap` | move ordering | chess phase 6 |
  | `ds::HashMap` | transposition table, repetition | chess phase 7 |
  | `ds::Queue`, `ds::LinkedList`, `ds::BST`, `ds::Graph` | nothing in chess | Sunday, standalone |

  Four of the eight get used by real code the same week they are written. The other four have **no
  honest role in chess** and are built on Sundays — inventing chess uses for them is exactly the
  busywork this redesign removed. Source: <https://github.com/tayllan/awesome-algorithms>.

**Sunday · Review day.** Sunday **replaces** the normal lesson — no new concept on either track,
same 15 minutes, same two headings so grading and `lesson-web.py` are unchanged. Its `title:` starts
with `Review week N ·` so it's recognisable in `history`. The word budgets apply unchanged.

| Slot | Budget | What | Verified by |
|---|---|---|---|
| **Track A** | ~8 min | **one standalone `ds::` structure**, or a review project | `cargo test` |
| **Track B** | ~7 min | **the test** — 5 short questions | `### My answer` |

- **Track B · the test.** Five short questions in the one `### My answer` block, drawn by the ladder
  below — **2 from this week**, **1 due at ~1 week**, **1 due at ~4 weeks**, **1 from the
  wrong-answer queue** (or a sixth due item when the queue is empty). Questions may be Rust *or*
  DSA. Drop a slot the loop is too young to fill; never pad to five.
- **Track A · Sunday is where the four non-chess structures get built** — the whole reason `Queue`,
  `LinkedList`, `BST` and `Graph` still exist in the goal. One per Sunday, in that order, once its
  B1 theory is banked and the Rust it needs is taught (`LinkedList` and `BST` want `Box`/`Option`,
  so they wait for `box1`). Same shape as a weekday chess step: the run writes the failing tests
  into `rust-dsa/src/ds/<name>.rs`, the owner writes the bodies. A structure too big for 8 minutes
  is **split across consecutive Sundays** — never crammed.

  When none is due, Sunday falls back to the **review project**:
  `rust-dsa/tests/review_<YYYY_MM_DD>.rs`, an integration test exercising a **due** concept from the
  ladder, not this week's. **On Sunday, Track A is graded on `cargo`, not on `rustlings.done`** —
  rustlings doesn't move that day, there is no chess half, and neither is a skip.
- **The ladder — every concept, not just the failures.** Spacing is derived, not stored: **every
  lesson comes back at ~1 week, ~4 weeks and ~12 weeks after it was taught.** The workflow hands
  over `due_review` — the lessons falling in one of those windows, each with its `title` and rung.
  Nothing needs writing down for a concept simply being reviewed on time.
- **The wrong-answer queue is the exception list**, not the mechanism. Two deviations, both recorded
  in *Current understanding*:
  - **Wrong → sooner.** A question answered wrong is appended to *Review queue*, re-asked the very
    next Sunday, then removed — right or wrong — and it keeps its normal ladder place. Cap 3;
    oldest falls off.
  - **Right at 12 weeks → retired.** Add it to *Retired* and stop drawing it.
- **Report on Sunday** the same schema. A review day leaves `dsa_topics` unchanged and keeps the
  streak like any other day.

**Code feedback on Track A.** The workflow hands over `reviewed_exercises` — every exercise the
owner finished since the last lesson, each with their `code`, rustlings' official `solution`, and
scoped `clippy` findings at **pedantic** level, each carrying `{code, message, line, level}`. Turn
it into a `### Yesterday's code` block at the top of `## Track A · Rust`, within its 200-word budget.

- **Deep-review exactly one**, in this order: the exercise with clippy warnings; else the one whose
  code diverges most from the official solution; else the newest. Any `level: 'error'` finding
  outranks warnings for that slot. Say what they did well, give **one** concrete improvement as
  rewritten lines, and note how the official solution differs *only where it genuinely does* —
  these files are five lines, and a mechanical diff teaches nothing. **One line each** for the rest.
- **`level` splits findings into two different things — never blur them.** `error` = genuinely
  rejected: clippy's deny-by-default `correctness` group, one of rustlings' own forbidden lints
  (`unsafe_code`, `clippy::todo`, `empty_loop`, `infinite_loop`, `mem_forget`), or a bare rustc
  error code. Rustlings passing an exercise says nothing about these, so it is reachable on a `done`
  exercise. Lead with them as real defects. `warning` = pedantic idiom advice on code the compiler
  accepted — explain the rule, show the tidier form, don't frame it as a mistake.
- **Quote each finding's `code` exactly as given** — never add a `clippy::` prefix that isn't there.
- **`clippy.ok: false` means unknown, never clean.** Say nothing about lints for that exercise.
- Findings arrive capped at 10 per exercise, errors never dropped for warnings, but in clippy's
  emission order — **partition by `level` yourself**. Show fewer for prose reasons, never by slicing.
- **Omit the whole block when there is nothing worth saying — the most important line here.**
  Pedantic is chatty; repeating the same lint daily trains the owner to stop reading it. Silence is
  the correct output for a clean day.
- Feedback is **read-only**: it never gates the next lesson and never spends Track A's ~8 minutes.

## Current understanding

- **Position (2026-09-11, lesson 37).** Lesson 36 graded **skipped** — twelfth empty room,
  `presence.any` false, answer box blank. Streak **0**, `consecutive_skips` **11**.
  `rustlings.done` **50/94** (still at `errors1`), chess **phase 1** (untouched since 08-14;
  `board_rank_line` still red, carried). Cargo **9 passing / 3 failing** (`board_rank_line` +
  both `graph_`). `structs_done` **1** (`Queue`, run-authored). `dsa_topics` **15**. Lesson 37
  held `errors1`+`errors2` / `board_rank_line` / inverted Zobrist, 641 words, no crate write.
  **`ds::Graph` is on miss 1 of the rot rule** — next Sunday is its second and last serve.
  Lesson 37's file was seeded with a `metrics:` line by the 09-11 evolution pass, so the fixed hold
  gate can fire from **09-12** without waiting a day for an agent run to write one.
- **The hold gate is keyed on the lesson file, NOT the host cursor — never send it back.** `prev`
  is the workflow's own returned `state` (host `dist/workflow.js:11`, `runner.js:265`
  `cursor = wf.result.state`), and the escalation path ends `return {}`, so **every agent day
  persists an undefined cursor**. The original interlock `prev && [...]` was therefore
  chicken-and-egg — it could only pass the day after it had already passed, and never fired once
  (diagnosed 09-09; four eligible days 09-08 – 09-11 each woke a ~$1.50 agent to copy a file).
  Two fixes were possible and the cursor one was **rejected**: making the escalation path return a
  cursor would also overwrite what the server reads as the run's `state`, clobbering the agent's
  reported metrics on exactly the day the owner returns and `chess_phase` moves. So the four
  cumulative numbers live in the lesson's own `metrics:` front-matter line instead (Spec,
  *Front-matter convention*) — a medium both the agent and the workflow already read and write,
  self-healing in one agent day if a run forgets it. Fixed and deployed 2026-09-11; two tests in
  `loop-src/daily-lesson.workflow.test.mjs` now prove it fires and that a missing line declines
  safely. Reporting all eight keys is still required — that is the chart, not the gate.
- **The loop is STALLED on owner absence, and holding is the correct output.** Last presence day
  was **2026-08-24**. `consecutive_skips ≥ 3` and `presence.any: false` independently forbid moving,
  so the *only* thing a run changes on a day like this is the opening note's grade line. A
  near-identical file is right. **Don't invent variation to feel productive, and don't read the
  sameness as a reason to redesign.**
- **Zero crate writes for eight runs running, and that is correct.** The chess step is a test that is
  *already* red (`board_rank_line`, `todo!("lesson 22")`), so the failing-test contract is satisfied
  with no edit. Consequence to protect: `owner_touched` stays a **pure** owner signal. The
  three-serve park rule counts only serves that were *read*, so the repeated `board_rank_line`
  serves cost it nothing — it is on serve **one** by that clock.
- **B1 part 2 has ONE concept genuinely unserved: transposition tables.** Taught and passed:
  bitboards, minimax, alpha-beta, move ordering. Parked to *Review queue*: memoization vs
  tabulation. Served into an empty room and never read: **iterative deepening (08-25)**. Served,
  taught, not passed: **Zobrist** (08-27, still held). The dry-out order is settled in the Spec
  (*B1 does not run dry*) — nothing left to decide here.
- **The crate is not too big and not badly delivered — it is not chosen. Every rival hypothesis is
  refuted; stop re-testing them.** The owner has not opened `rust-dsa` since **2026-08-12**; every
  `.rs` in it carries a *run's* mtime. What makes this selection rather than absence: on 08-17,
  08-19, 08-20, 08-21, 08-23 and 08-24 the owner *did* show up (evening mtimes ~22:30) and every
  time chose rustlings and skipped the crate.
  - **Refuted: "too big"** — `piece_at` was one line, assigned three times.
  - **Refuted: "shrinking is the lever"** — it closed phase 0, then failed every time since, and
    three runs shrank the *rustlings* half as collateral down to 1/day.
  - **Refuted: "it needs the rustlings half's reach"** — the runnable `cargo test` block shipped
    08-20 and changed nothing on 08-21/22/23.
  - **Refuted: "weekday crowding"** — Sunday's `ds::Queue` had a whole uncontested slot and sat
    seven days. **No `cargo`-crate step has landed on any day of the week since 08-13.**
  - **The owner's call came back 08-28: `Q1: a`, keep the crate daily** — closed, never re-ask. What
    it doesn't settle is why nine days of presence chose rustlings. **The answer-vs-behaviour check
    is UNMEASURED, not failing:** the 09-02 due date was confounded — of the five days since, three
    had no lesson and two were empty rooms. **The next day with presence is the whole measurement**;
    report it plainly, never redesign on it. Don't read an absent day as a verdict.
- **A Sunday structure can rot as quietly as a chess step — check `cargo`, not the calendar.**
  `Queue` was assigned 08-16, missed twice (08-16, 08-23), and the rot rule fired **2026-09-06**:
  the run wrote `pop` itself and moved on. `Queue` is green — **structure 1 of 8 done, and it is
  run-authored, so it proves nothing about the owner.** `Graph` is now assigned (`new`/`len`
  written, `add_edge`/`neighbors` `todo!()`); `LinkedList` and `BST` still wait on `Box`/`Option`.
  **The rot rule is one write per structure, same spirit as the chess half's one-body-per-phase —
  if `Graph` misses twice, park it and say so; do not write a second structure for them.** Check
  this list every Sunday before falling back to a review project.
- **A correct exercise can sit outside `rustlings.done` — the watcher has to run it.** Writing the
  file is not enough (08-22 `quiz2`, 08-27 `options3`, 08-28 `errors1` — all correct, none `done`).
  That is presence, not a miss; `owner_modified` carries it.
- **A body can be right and the exercise still red — read `main`, not just the TODO.** 08-19's
  `hashmaps2` was correct; it failed because `main` passed the map by value to a `&mut` parameter.
  A nearly-finished attempt is invisible in `reviewed_exercises` (which needs `done`) — **look at
  `next_exercises[0].code` when a half misses.**
- **A request in the answer box is presence, and it outranks the park rule.** Lesson 17's block
  asked for the prerequisite instead of answering: graded ✓, no queue slot burned, concept
  re-taught *as asked*. Parking a concept the owner just asked for is the loop reading its counter
  over their words.
- **The owner's broken `from_name` stayed theirs and it worked.** Two non-compiling attempts were
  left unrepaired; the lever was aiming the *rustlings* pair at the Rust that unblocked them
  (`as_bytes()`, `&str` vs `String`), and they shipped it the next day with validation the hint
  never asked for. Repeat that lever; **don't repair their code.** A non-compiling crate is a real
  owner-side state — if it recurs, make `cargo build` succeeding its own `### Done when`.
- **Never build a silent-failure device into a step.** A deliberately-undeclared
  `src/chess/piece.rs` failed silently instead of loudly and cost phase 1 two days; dismantled
  08-15. The failing-test contract depends on red meaning red.
- **Environment, all settled.** `rustlings/` (94 exercises, own git repo) and `rust-dsa/` live at
  `/Users/tamnm/code/personal/` — bootstrap is done, never redo it. The tree sits **outside
  `~/Documents` deliberately**: macOS TCC denies launchd-started processes access there and the
  daemon is a LaunchAgent — never move it back. **Your cwd is NOT the project tree** — runs start in
  an empty leftover directory, so **always use absolute paths under `/Users/tamnm/code/personal/`**
  and `cd` explicitly before any `loopany`, `cargo` or `rustlings` command. Schedule is **09:00
  Asia/Saigon daily** (cron `0 9 * * *`); the workflow does its date math in `Asia/Ho_Chi_Minh`.
- **The owner works in the evening, ~13 hours after the lesson lands** (mtimes cluster 22:15–22:47).
  So a lesson issued at 09:00 sits unread all day, next morning's grading correctly catches the
  previous evening's work, and any question gets answered a full day later at best. **Don't read a
  same-morning zero as a decision.**
- **Review queue** — the *exception* list only: answered wrong, waiting for next Sunday. Max 3,
  oldest falls off; removed after one retry, right or wrong. Everything else comes from
  `due_review`. **Two items, one slot free (heaps dropped 2026-09-07 after its week-6 retry):**
  - **Move ordering · ranking four candidate moves** — lesson 25 Q2, answered `(b)` only with a
    request to clarify. `PxQ` is second: the **TT move** leads, being a previous search's result
    rather than a heuristic, and `QxP` on a *defended* pawn is **last**. Added 2026-08-27.
  - **Memoization vs tabulation — parked, not answered wrong.** Served 08-22/23/24, blank every
    time; parked 08-25 under the three-serve cap. Draw it as a *question*, not a fourth lesson.
  - *Two standing weak spots, closed as queue items but still worth drawing on:* **ring-buffer
    wraparound** (wrong four times; the framing that worked is *count the moves each index made,
    don't track slots* — if it fails again it needs a drawn diagram, not another trace), and
    **Big-O generally** — prefer "what is the Big-O and why" over another hand-trace.
- **Retired** — answered right at the 12-week rung; no longer drawn by the ladder. *(empty)*
- **Everything the run needs is pre-fetched; duplicate wakes and confirmed hold days never reach
  the agent** (hold-day gate: see the Spec's *Absence, not difficulty*). A workflow
  runs before each lesson and hands over the payload the Spec's steps 1–2 name field by field
  (`today`, `weekday`, `is_review_day`, `week_number`, `due_review`, `prev_lesson`, `history`,
  `streak_before_prev`, `consecutive_skips`, `presence`, `gap_days`, `rustlings`,
  `reviewed_exercises`, `rust_dsa`, `cargo`), and short-circuits a duplicate same-day wake — so **a
  run that starts has work to do**. `prev_lesson.metrics` is yesterday's `metrics:` line already
  parsed to numbers — the base for today's cumulative values, and `null` if a run forgot it. Source:
  `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js`. Caveats not obvious from the
  field names:
  - `.rustlings-state.txt`: line 1 is a `DON'T EDIT` header, the first non-blank name after it is
    the current exercise, the rest are done — compiler-backed, not self-reported.
  - **The mtime cutoff is the previous lesson file's *birthtime*, not its mtime.**
    `reviewed_exercises` = up to 5 exercises both in `rustlings.done` **and** modified since it;
    `owner_modified` is its complement. **Caveat that bites:** work older than the cutoff reads
    `false` even when the file is complete, so after a gap trust *Position* over the flag.
  - **`rust_dsa.owner_touched` depends on the run writing the crate BEFORE the lesson file** — that
    is what excludes the run's own writes without filtering. Invert the order and every
    carried-forward day reads as a false "owner touched it". Files dropped by the 48 KB read cap are
    still stat'd, so the flag never under-reports absence.
  - **Clippy runs at pedantic on purpose and must stay there.** A sweep of all 17 exercises done as
    of 2026-08-04 found **zero default-level findings**. **Don't "simplify" back to default.**
  - **`cargo.ok` means "cargo ran", not "everything passed".** It keys on parseable
    `test … ok|FAILED` / `test result:` lines, not the exit code — which the chess contract turns
    false *every day*. A crate that doesn't compile emits none and lands on `ok: false`.
  - `rustlings/` has **no git baseline**: the official solution is the only reference. And the
    workflow's **test harness is 32/35 with three long-standing reds** (`selection caps at 5 …`,
    `one unreadable exercise …`, `… clippy level … denied1`) — all three are the same mtime
    fixture drift, not a regression; until reconciled, smoke-test by wrapping the body in an async
    arrow and running it against the real tree.
- **Fallback grading.** rustlings is **6.5.0 — there is no `rustlings list`.** If the pre-fetched
  data is missing, `cd rustlings && rustlings check-all 2>&1 | tail -3` prints `N/94 exercises
  pending`. It emits TUI escape noise (always pipe through `tail`) and recompiles 94 crates —
  prefer the pre-fetched data.
- **Owner profile** — starting from foundations; budget is a real 15 min/day. Wants both reading and
  doing, wants **DSA every day alongside Rust**, and wants the loop to check whether yesterday's
  work was actually done rather than marching on. Rejected a daily code-rework step as a tax on a
  track they already overshoot — hence read-only feedback. **2026-08-09: asked for harder, more
  connected lessons, then identified the real problem as *boring, not too hard*.** They chose: chess
  subsumes the goal, rustlings kept, chess graded by the compiler. **Don't re-raise difficulty as
  the lever** — connection was.
- **Gotchas** —
  - **A crate that doesn't compile makes ALL grading blind, not just chess.** `cargo test` parsing
    keys on `test <name> ... ok` lines; a build failure emits none, so Track B's structures grade as
    missing too. So the run **never leaves the crate non-compiling**: write the failing test *and* a
    stub whose body is `todo!()` (it coerces to any type), so the build stays green and the test
    fails by panicking. Never reference a function that doesn't exist yet.
  - **Read the Timeline before writing any lesson file**, and **a `pending` run with no metrics is
    not a failed run** — check `lessons/<today>.md`. Both from 08-19, when an owner-triggered second
    wake ran with no prefetch payload and overwrote that day's lesson.
  - **Lesson length drifts upward if nothing checks it** — 343 → 2,749 words over seven days, one
    `### Stuck?` reaching 813. That is what step 3's budget table exists to stop.
  - **Never trust section directory names for exercise order.** Quizzes sit in `exercises/quizzes/`,
    not a section dir (`if3 → quiz1 → primitive_types1`). Lesson 5 assumed otherwise and named an
    unreachable "done when". `next_exercises` settles it.
  - **B1 answers can be right-shaped but wrong.** Lesson 2's Q3 gave `O(n)` where the doubling test
    gives `O(n²)` — passed on substance, corrected in the next opening note. Don't silently move on.
  - **Never edit a file under `rustlings/exercises/` yourself.** Its mtime is what the birthtime
    cutoff compares against; touching one makes stale work look new. Feedback is prose, never an edit.
  - **Delivery is local, not push.** `notify: always` only writes the message into the run history
    on loopany.ai — nothing pops on the Mac. Opening the browser (step 5) *is* the delivery.
    **Notifications are a closed question** (2026-07-31): no CLI-reachable process is a registered
    notification client, and a hand-built `osacompile` applet is blocked by its ad-hoc signature.
  - **Runs do fail, and a failed run is a lost lesson day** — those surface as `gap_days`, never as
    the owner going quiet. **A run that can't report has still shipped the lesson — say so in one
    line and stop.** Two causes, neither worth re-diagnosing: a **server reclaim** after a long API
    stall (the lever is the run's own length) and the **npx-cache death**, fixed at the shim 08-26
    (`~/.loopany/bin/loopany` is now `exec npx -y loopany "$@"`). If it breaks again, `npx -y
    loopany <cmd>` is the workaround; **don't go spelunking in `~/.npm/_npx`** — nothing is there.
  - **Duplicate wakes happen.** The workflow gates them; if it ever falls back and
    `lessons/<today>.md` is already `assigned`, report `nothing-new` and stop.
  - The enclosing folder is not a git repo, and `~/.claude/tools` is a symlink to
    `~/dotfiles/AI/tools` — editing `lesson-web.py` edits the dotfiles copy.

## Timeline

<!-- one dated entry per run, appended below by the loop. Step 4 caps it at ≤60 words. -->

- **2026-07-30 – 08-09 (runs 1–10, three evolution passes)** — loop created and bootstrapped; the
  owner reshaped it so DSA became a **daily Track B** with a theory-first B1 stage, and Track A
  found its size once `next_exercises` proved the *assignment* had been wrong, not the owner.
  **Delivery solved locally** with `lesson-web.py` after notifications were abandoned with evidence.
  B1 ran Big-O → dynamic arrays → linked lists → stacks → queues → hashing. Lesson 8 was the first
  `partial`; first real Sunday review 08-09.
- **2026-08-09 (owner reshape)** — **the goal changed: a chess engine replaced the abstract
  8-structure library.** The complaint was *boring, not too hard*, so **connection** became the
  lever. Track A became two halves graded by a failing `#[test]` the run writes itself; the
  `generics2`/`box1` B2 gates were deleted in favour of structures pulled in by the phase that needs
  them, and the four with no honest chess use moved to Sundays.
- **2026-08-10 – 08-14 (runs 11–15)** — the chess track's best stretch: streak to **13**, **phase 0
  closed 08-13**, **phase 1 opened 08-14**. The winning lever was leaving the owner's two
  non-compiling `from_name` attempts unrepaired and aiming the *rustlings* pair at the Rust that
  unblocked them. B1 closed part 1 and **opened part 2** with bitboards.
- **2026-08-15 – 08-26 (runs 16–27)** — the **13-day streak broke to zero**; three shrinks bottomed
  out at **587 words** on 08-17, the point the ladder ran out of road. 08-16's Sunday shipped
  `ds::Queue`; Sunday week 4 gave it back with only `pop` left. Then five days of **Track A ✗ /
  Track B ✓** — the rustlings half and the answer box both landing while **the crate missed every
  single day** — and the *untouched* rule ran to its end twice, the run writing `piece_at` and
  `to_char` itself. **08-24 was the last day with presence** (46 → 48), the owner again choosing
  rustlings over the crate; then empty rooms, `consecutive_skips` to 4, memoization **parked**.
- **2026-08-13 – 08-26 — seven evolution passes** built the machinery the Spec now states as rules:
  B1 part 2; *Absence, not difficulty* + the park rule + `consecutive_skips`; *shrink the half that
  missed* + *the chess half is untouched* + `owner_touched`; the one-body-per-phase cap + *Asking
  the owner* + `owner_modified` + cumulative `dsa_topics`/`structs_done`; *Rotate forward on the
  RETURN day* + `presence`; and the owner-directed **inversion** pass (`### Stuck?` as an
  elimination, ≤20-word failure modes, inverted B1 forms, ship-it-broken fenced to `tests/`).
- **2026-08-27 – 08-28 (runs 28–29) — the owner came back, then the open question closed.** 25
  graded `partial` (Q2's ranking wrong → Review queue; `options3` held a correct answer the watcher
  never ran). `consecutive_skips` 4 → 0. The crate question, re-asked as Q1, came back **`Q1: a` —
  keep the crate daily**, so the Sundays-only fallback is off and the chess half returned after four
  days omitted. `options3` green → 50/94, streak 2.
- **2026-08-29 – 09-04 (runs 30–33) — five empty rooms and a three-day outage.** Every day graded
  `skipped`, nothing touched anywhere; both tracks held verbatim, no crate write. **08-30 – 09-01
  all failed** (`gap_days: 3`), losing Sunday review week 5 and `Queue::pop`'s assignment. The 09-02
  crate check came due **confounded**. Streak 0, `consecutive_skips` **4**. Lesson 31 (09-04) held
  `errors1`+`errors2` / `board_rank_line` / inverted Zobrist again, 655 words.
- **2026-09-03 (evolution pass)** — distilled the file after it blew the **25k Read cap** mid-read;
  settled B1 part 2's dry-out order in the Spec. Keep it under that cap.
- **2026-09-05 – 09-07 (runs 34–36)** — empty rooms six, seven and eight; `consecutive_skips` to
  **7**, streak 0, no crate write, both tracks held verbatim throughout. Review week 6 ran on the
  06th and was itself skipped. The rot rule fired once: the run wrote `Queue::pop`, `Queue` went
  green (**`structs_done` 1**, run-authored) and `ds::Graph` took its place. Heaps left the review
  queue after its retry.
- **2026-09-07 (evolution pass)** — proved runs 30–36 wrote **byte-identical lesson bodies**
  (`diff` of 09-05 vs 09-07 changes only front matter and the opening note) and moved the hold
  itself into the workflow: an absence weekday grades, re-serves and delivers with **no agent**.
  Gate and interlocks in the Spec's *Absence, not difficulty*.
- **2026-09-08 – 09-11 (runs 37–40)** — empty rooms nine to twelve; `consecutive_skips` to
  **11**, streak 0, no crate write, both tracks held verbatim (`errors1`+`errors2` /
  `board_rank_line` / inverted Zobrist), 624/641/641/641 words. **The hold gate never fired on any
  of the four**; run 39 root-caused it to the host's cursor contract and left the fix for evolve.
- **2026-09-11 (evolution pass)** — **fixed the hold gate**, re-keying its interlock from the host
  cursor (unwritable from the escalation path) to a `metrics:` line in the lesson's own front
  matter, and rejected the cursor fix because it would clobber the agent's reported metrics on a
  return day. Seeded lesson 37's file so the gate can fire from 09-12. Added the two tests the
  original gate never had. Spec gained the mandatory `metrics:` line.
