# Rust + DSA — Daily Lesson

> **Reading this file — don't `cat` it.** It is ~70 KB, so a single `cat` overflows the Bash
> tool's output budget, gets persisted to a scratch path, and the run then re-reads it in five
> or six chunks anyway. Runs 45 and 46 each spent **7–9 tool calls** doing exactly that before
> touching any work. Read it in these five targeted passes instead — each one fits in a single
> Bash result, and they are in priority order, so a run short on time can stop after pass 3:
>
> ```bash
> cd /Users/tamnm/code/personal/loopany/daily-lesson
> # 1. state — read this FIRST, it is what changed since yesterday (~22 KB)
> /usr/bin/sed -n '/^## Current understanding/,/^## Timeline/p' README.md
> # 2. the contracts: mission, tracks, chess roadmap (~10 KB)
> /usr/bin/sed -n '/^## Spec/,/^\*\*Each run, in order:\*\*/p' README.md
> # 3. the run procedure, steps 1–7 (~23 KB)
> /usr/bin/sed -n '/^\*\*Each run, in order:\*\*/,/^\*\*Curriculum\.\*\*/p' README.md
> # 4. curriculum + Friday + code-feedback tables (~9 KB)
> /usr/bin/sed -n '/^\*\*Curriculum\.\*\*/,/^## Current understanding/p' README.md
> # 5. recent history only — the older spine is almost never worth reading
> /usr/bin/awk 'f;/^## Timeline/{f=1}' README.md | /usr/bin/tail -40
> ```
>
> The Timeline's older stretch is a condensed spine and is almost never worth reading; every
> durable finding from it has been folded up into *Current understanding*.

## Spec

**Mission.** Take the owner from Rust foundations to a **working chess engine** in Rust, 15
minutes a day, teaching **both a Rust lesson and a DSA lesson every day**. The finish line:
`rust-dsa` plays legal chess — perft-verified move generation, alpha-beta search with a
transposition table, and a terminal binary you can play a full game against — built on
hand-written `ds::` structures rather than std's. The authoritative setpoint lives in the
loop's `goal`, not here — when it's met, the run calls `loopany finish`.

**Why chess (2026-08-09).** It replaced an abstract 8-structure library that was correct and
boring — nothing written on any day survived to the next, and B2's `generics2` gate held
`structs_done` at 0 for 11 lessons. Chess is reachable **now**, gives every rustlings concept
somewhere to be spent the same day, and genuinely needs five of the eight structures, so the
DSA goal is kept. The complaint was *boring, not too hard* — difficulty is unchanged.

**Waitzkin practice contract.** Every lesson is process-first: one smaller-circle fundamental per track, deliberate exposure to a named failure or invariant, and 3–5 Socratic grill questions tied to the day’s exact concepts. On repeats and review days, prefer investment-in-loss prompts that construct the breaking input or symptom. A short optional timer, distraction, or recovery breath may train the soft zone, but compiler and test evidence remain authoritative.

**Feynman–Munger grilling contract.** Teach for understanding, not recall: demand a plain explanation, the mechanism, observable evidence, uncertainty, and a test that could prove the answer wrong. Distrust jargon that hides weak understanding and treat “I don’t know” as the start of inquiry. For every grill, apply Munger’s rule—**invert, always invert**—by asking how the implementation, invariant, or reasoning would fail before asking how it succeeds.

**The 15-minute split — two tracks, one file, every day.**

| Track | Budget | What | Verified by |
|---|---|---|---|
| **A · Rust** | ~8 min | **2** rustlings exercises, then that same concept spent in chess | `rustlings.done` **and** a named `cargo` test |
| **B · DSA** | ~7 min | one concept, then one structure | see *Stage B1/B2* |

**Track A is two halves and both count.** ~4 min on the next two rustlings exercises, ~4 min
applying what they just taught inside `rust-dsa`. The step is **two exercises, not four** —
that is deliberate: it halves rustlings velocity (63 remaining ≈ 32 days instead of 16) and
buys the throughline in exchange. Don't quietly grow it back to four; the chess half is the
point of the redesign, and the first thing that dies under time pressure.

**The chess half's contract.** The run **writes one failing `#[test]` into the crate itself**
and names it in `### Done when`; the owner's job is to make it pass. The next run grades it
by looking that name up in `cargo.passing`. So a chess step is never self-reported — the
compiler judges it, exactly like rustlings. Write the test, not the implementation: a stub
with `todo!()` is fine, a working body is not. **One test per day, one name.**

**The inverted chess half — "ship it broken".** Once in a while the halves swap: **the run writes
a deliberately wrong implementation and names the test the owner must write.** Finding a bug
teaches an invariant that building the happy path does not. It is fenced, and every clause below
is load-bearing:

- **It lives in `rust-dsa/tests/invert_<YYYY_MM_DD>.rs`, never in `src/`.** The wrong function is
  a local `fn` inside that test file — same shape as Friday's `tests/review_<YYYY_MM_DD>.rs`. The
  engine stays clean, and nothing in `src/` can be mistaken for phase progress.
- **Only on a phase already closed, at most once per phase, never on the phase in flight.** It is
  a review of banked work, so it can never block or fake the current step.
- **It does not spend the one-run-written-body-per-phase budget** (*The chess half is untouched*
  below) and **never advances `chess_phase`**. That rule exists because the run kept building the
  engine while the owner didn't; a wrong body in `tests/` isn't the engine and isn't progress. If
  ship-it-broken ever looks like it is moving the phase, it is being used wrong — stop.
- **The bug must compile, pass a naive test, and fail a good one.** No compile errors, no
  `todo!()`, no panic on the first call. If the bug is visible without writing a test, there is
  no exercise.
- **Say that it's wrong; don't say where.** The lesson states plainly that today's implementation
  is wrong on purpose. Announcing the line is the whole exercise given away; hiding that a bug
  exists at all is a trap, not a lesson.
- **`### Done when`** stays one mechanical line: `cargo test <name>` green, with the run naming
  `<name>` as usual. The next run checks that name in `cargo.passing` **and** reads the file text
  out of `rust_dsa.files` — a test can be weakened instead of the code being fixed, and the run
  already applies that same judgement to `reviewed_exercises`. No new workflow data is needed.

Track B runs in two stages, because 15 minutes will not hold two coding tracks:

- **Stage B1 · theory-first** — the exercise is **by hand, no Rust**: trace an algorithm,
  derive the Big-O, hand-simulate an insert or a rebalance, write pseudocode. Fits 7 minutes
  honestly. The owner writes their answer into the lesson file's `## My answer` block; a
  collapsed worked answer sits below it to self-check against.

  **B1 has two question forms, and the day picks which.** *Forward* is the list above — compute
  it, trace it, derive it. *Inverted* asks the same concept from the failure side: **construct
  the input, the ordering, or the one-line change that breaks the invariant, and name the symptom
  it produces.** Same 7 minutes, same `### My answer` block, same collapsed worked answer — only
  the question changes, so nothing downstream moves.

  | Day | Form |
  |---|---|
  | A concept served for the first time | **Forward** |
  | A repeat serve — the held concept during `presence.any: false`, or a re-served pair | **Inverted** |
  | Friday review, and every wrong-answer-queue item | **Inverted** |

  The rule is not decoration: on those repeat days the Spec already **forbids re-teaching** and
  still requires re-asking (*Rotate forward on the RETURN day* says re-serve unchanged and cut
  the prose to a reminder). Inversion is the only question form that re-asks without explaining
  again — it is what the run does with a held concept instead of writing a second lecture. Left
  to itself the run will pick forward every day, so read this table before writing Track B.
- **Stage B2 · implement** — real code in `rust-dsa/src/ds/`, one structure at a time,
  verified by `cargo test`. That structure's theory is already banked from B1, so the step is
  just the code.

  **B2 is gated on the chess phase that needs the structure, not on a rustlings exercise.**
  The old `generics2`/`box1` gates are gone — they were what held `structs_done` at 0. The
  engine pulls each structure in when it actually needs it (see *Chess roadmap*), and the
  structure gets used by chess code the same week it is built.

  **B1 does not run dry — it has a part 2.** Part 1's classical-DSA list closed on 2026-08-13
  while chess was still at phase 1, so no structure was due. When that happens, Track B takes
  **the next untaught concept from *B1 part 2*** (see *Curriculum*) — the engine theory the
  phases ahead will need. Do **not** spend days hand-designing the same structure, and do not
  start B2 early: a structure built before its phase needs it is the busywork this redesign
  removed.

**Chess roadmap.** Phases, not dates. Each is several days; advance only when its test passes.

| Phase | ID | Chess | Rust it needs | Structure it earns |
|---|---|---|---|---|
| 0 | `chess.p0` | `Square` newtype, `"e4"` ↔ index round-trip | structs | — |
| 1 | `chess.p1` | `Color`/`PieceKind` enums, `Board([Option<Piece>; 64])`, `Display` | enums, `Option` | — |
| 2 | `chess.p2` | FEN parse, pseudo-legal moves per piece | strings, vecs, iterators | `ds::Vec` (move list) |
| 3 | `chess.p3` | make/unmake, legality via king-in-check | structs, generics | `ds::Stack` (undo) |
| 4 | `chess.p4` | perft 1–3, castling, en passant, promotion | — | — |
| 5 | `chess.p5` | eval, minimax, alpha-beta | recursion, lifetimes | the search tree |
| 6 | `chess.p6` | move ordering | traits, `Ord` | `ds::BinaryHeap` |
| 7 | `chess.p7` | Zobrist hashing, transposition table, threefold repetition | hashmaps, smart pointers | `ds::HashMap` |
| 8 | `chess.p8` | `[[bin]]` terminal game vs human | error handling | — |

`LinkedList`, `Queue`, `BST` and `Graph` have **no honest use in a chess engine**. Forcing
them in would rebuild the fake-exercise feeling this redesign exists to remove, so they are
built as standalone `ds::` modules on Fridays instead — see *Friday · Review day*.

**Keep `cargo test` under 8 seconds.** `CARGO_TEST_HARD_CAP_MS` in the workflow is 8000 ms and
covers compile *and* run; blow it and `cargo.ok` goes false, which means grading goes blind.
Routine perft tests stay at **depth ≤ 3**; anything deeper is `#[ignore]`d and run by hand.

**Where things live.** The loop folder is synced content, so all heavy work stays out of it:

| Path | What | Synced? |
|---|---|---|
| `loopany/daily-lesson/README.md` | this brief + memory | yes |
| `loopany/daily-lesson/lessons/YYYY-MM-DD.md` | the day's lesson (both tracks) | yes |
| `../../rustlings/` | rustlings exercises (has `target/`) | **no — keep out** |
| `../../rust-dsa/` | the chess engine + `ds::` modules (has `target/`) | **no — keep out** |

Never run `cargo`, `rustlings`, or create a checkout inside `loopany/`.

**Each run, in order:**

1. **Grade yesterday, per track.** The workflow hands over `prev_lesson` — yesterday's file,
   its full text, and its `### My answer` block already extracted — plus `history` (every
   lesson's date + graded `type`), `streak_before_prev`, and `gap_days`. Don't re-`ls` the
   folder or re-read the file; only touch disk if that data is null or looks wrong.

   **`gap_days > 0` means a run failed and the owner got no lesson those days.** That is the
   loop's fault, never theirs: say so in one line in today's opening note, don't grade the
   missing days, and don't break the streak over them.
   - *Track A* — **two halves, both from pre-fetched data, both required.** The rustlings half
     passes when yesterday's named exercises are in `rustlings.done`; the chess half passes
     when yesterday's named test is in `cargo.passing_tests`. Track A is `✓` only if **both**
     landed; one of two is a Track A miss, so the track re-teaches and does not advance. The
     compiler judges, never the owner's word.

     **`cargo.ok: true` does not mean everything passed** — it means cargo *ran* and its
     per-test verdicts are trustworthy. A failing test is the **normal daily state** here:
     every weekday leaves a `todo!()` test failing on purpose, so `cargo test` exits non-zero
     every day by design. Grade from `passing_tests` / `failing_tests` and **don't re-run
     `cargo test` yourself**. `cargo.ok: false` is the genuinely blind case — the call was
     skipped, or the crate didn't compile (check `compile_errors`): say the check didn't run
     and carry the test forward unchanged.
   - *Track B, stage B1* — judge `prev_lesson.track_b_answer`. Non-empty and substantively
     addressing the question → passed; empty → not (the owner never filled it in). This is
     the **only** evidence a B1 exercise was done. A substantive answer passes even when
     partly wrong — so when it *is* wrong, the correction goes in **today's lesson's opening
     note**, one line naming what was off, never silently dropped.
   - *Track B, stage B2* — `cargo` from the pre-fetched data.

   Then edit that file's front-matter `type:` in place: `done` (both tracks passed),
   `partial` (one track only), `skipped` (neither). A lesson issued before Track B existed
   has no Track B section — grade it on Track A alone, `done` or `skipped`.
   **Grading a Friday review day** uses the same two rules with one swap: Track A is judged on
   `cargo` alone (the `ds::` module's tests, or the `review_*` file's, whichever Friday
   assigned), never on `rustlings.done` and with no chess half. Any test question
   answered wrong goes into the *Review queue*, and the item that Friday pulled *from* the
   queue is dropped from it either way.

   **Attempt records.** In the same edit, add an `attempts:` list to that file's front-matter
   — one line per concept the lesson tested, exactly this shape:

       attempts:
         - id=b1.alpha-beta result=correct help=none kind=application

   `id` is the concept's ID (see *Concept IDs*). `result` is `correct`, `partial` or
   `incorrect`: Track A and B2 from `rustlings.done` / `cargo`, never your impression; B1 from
   `### My answer`. `help` is `none` on a first serve and `hint` when the concept was re-served,
   shrunk or held. `kind` is `retrieval` on review day or a ladder re-ask, otherwise
   `application`. A skipped track writes **no** line — no attempt is not an `incorrect`. Never
   edit an older lesson's attempts. The workflow derives each concept's level from these.
2. **Friday?** Then skip to the *Friday · Review day* section — no new concepts today, and no
   curriculum advance on either track. Otherwise **pick today's two steps** — see
   *Curriculum*, adapting per track **independently**. A track that was skipped re-teaches the
   same concept a different way and does **not** advance; two skips in a row on one concept →
   shrink the step and say so. The tracks will sit at different depths; that's expected, never
   resync them.

   **Shrink the half that missed — never the half that landed.** Track A's verdict is joint
   (both halves or `✗`), but the *response* is per half, and reading the joint `✗` as "shrink
   Track A" punishes the half that is working. It has: the rustlings half landed on three of
   the four days to 08-20 and was cut to one exercise each time because the chess half missed,
   dropping velocity to 1/day against the 2/day setpoint (49 left ≈ 49 days). **A half that
   landed goes back to its full setpoint the next day** — two exercises for rustlings — and
   only the missed half shrinks. The cold-start floor of one applies to a half recovering from
   *its own* miss, never to its sibling.

   **Absence, not difficulty — `consecutive_skips ≥ 3` stops the shrink ladder.** The workflow
   hands over `consecutive_skips`, the trailing run of `skipped` (excluding `prev_lesson`, so
   add 1 yourself if you just graded it `skipped`). Below 3, the shrink rule above applies
   normally. **At 3 or more, do not shrink again** — the ladder is out of road, and a lesson
   that landed for 13 straight days did not become too hard overnight. Nothing being touched
   at all — `rustlings.done` flat, `reviewed_exercises` empty, `### My answer` blank — is the
   signature of the owner not being there, and no lesson design fixes that. Instead:
   - **Hold the step size steady.** Don't shrink, don't stack up what was missed, don't
     re-teach a fourth time. Ship a normal small lesson.
   - **Rotate forward on the RETURN day, not on every absent day.** Rotate-don't-re-serve exists
     so nobody comes back to their fourth identical lesson — it is a rule about the day the owner
     shows up, and firing it daily during an absence burns the curriculum into an empty room.
     Evidence: iterative deepening (08-25) and move ordering (08-26) were each served once to
     `presence.any: false` and rotated past, spending **2 of B1 part 2's 8 concepts in two days on
     lessons nobody opened**. Two remain, and part 2 running dry is the exact failure it was
     written to fix. So while `presence.any` is false, **Track B holds its concept** exactly as
     Track A holds its pinned rustlings pair: re-serve it unchanged, cut the prose to a short
     reminder rather than re-teaching it, and don't advance. The three-serve park rule counts only
     serves that were **read** (`presence.any: true`) — a serve into an empty room doesn't count
     against it. Rotate once, on the first day with presence; that is the same rule as *the return
     day is a fresh start* below, not a second one.
   - **Say one plain line in the opening note** — that the loop noticed the gap, that nothing
     is owed, and that today starts clean. No guilt, no catch-up plan, no streak talk.
   - **The return day is a fresh start, not a retry.** The first lesson after a break of 3+
     opens on the *next* concept, not the one abandoned. Coming back to your fourth identical
     lesson is the most reliable way to lose someone twice.

   **The chess half is untouched, not too big — `rust_dsa.owner_touched` settles it.** The
   workflow hands over whether the owner opened the crate *at all* since the last lesson (and
   `touched_paths`). The run's own edits are excluded by construction, so **`owner_touched:
   false` with the chess test still red means the step was never attempted.** That is the same
   distinction *Absence, not difficulty* draws for the whole lesson, scoped to one half — and
   it is the one the loop kept getting wrong: `piece_at` is `self.squares[square.0 as usize]`,
   was assigned three times, and every `.rs` in the crate still carried the run's own 08-18
   mtime while rustlings advanced daily. A step nobody opened cannot be too big, and no amount
   of shrinking reaches it. So when `owner_touched` is false and the chess test missed:
   - **Don't shrink it and don't re-serve it a third time.**
   - **At most ONE run-written body per phase, and never two runs in a row.** Writing the
     owner's code was meant to unblock a stuck phase once. It fired three times instead
     (`from_char` 08-18, `piece_at` 08-21, `to_char` 08-22, plus `Queue::push`/`len` 08-23), and
     the result is that **the run is building the engine and the owner is not** — phase 1's code
     is run-authored end to end. So: **a run-written body never advances `chess_phase`**, and
     once one has been written in the current phase, the phase is **blocked on the owner**. Don't
     write another, don't advance, don't re-serve it daily. Say one line, and give those ~4
     minutes back to the rustlings half (which lands) until the owner opens the crate once.
     *(A ship-it-broken body is the one thing this doesn't count — it sits in `tests/`, targets a
     closed phase, and is wrong on purpose. See* The inverted chess half *above.)*
   - **The reach fix is spent — don't reach for it a third time.** Shipping the runnable
     `cargo test <name>` block (08-20) was the reach hypothesis, and it changed nothing across
     08-21/22/23. Combined with Sunday's `Queue` sitting untouched for seven days, **no
     `cargo`-crate step has landed since 08-13 regardless of size, weekday, or delivery shape.**
     Size and reach are both refuted; don't redesign the step a fourth time.
   - **Ask in the `### My answer` block, not the opening note** — see *Asking the owner* below.
     The 08-21 question was asked in the opening note and got silence; the answer box gets
     answered. Silence in the wrong channel is not an answer.

   **Asking the owner — use the channel that gets answered.** When the loop needs a decision
   from the owner, it asks as **Track B's Q1 inside the `### My answer` block**, never as a
   sentence in the opening note. Evidence: the opening-note question of 08-21 (does chess belong
   in the daily 15?) got silence, and the run then read that silence as consent and kept going.
   Meanwhile the answer box was answered on 08-21 and 08-22, and on 08-18 the owner used it to
   make a request. The box is the one channel with a demonstrated response rate; the opening note
   has none. One question, two named options, one line each, and it costs Q1's slot for that day.

   **Then take the answer as given — but only count silence as an answer when they were
   there.** An unanswered question on a day the owner never showed up is an empty room, not a
   decision. It is only a decision when the answer box comes back blank *and* `presence.any` is
   **true** — that is them choosing not to answer, and it stands. The workflow computes
   `presence.any` (and `presence.signals`); don't re-derive it from the underlying arrays, and
   don't restate the test in prose. Re-ask at most once, on the next day with presence.

   **The crate question is CLOSED (2026-09-21) — weekday chess stays, and a run of
   `crate_touched: 0` is a GAP, never a decision.** The question was whether `rust-dsa` belongs
   in the daily 15 or only on Sundays. It was asked into empty rooms (08-24), re-asked as lesson
   26's Q1 (08-27) and never answered — and twice the loop read that silence plus a long run of
   `crate_touched: 0` as consent and moved crate work off weekdays (08-27, then 09-19, the second
   one applied in full). **Both readings were wrong.** On 09-21 the owner opened
   `src/chess/board.rs` and turned `board_rank_line` green *with no lesson asking for it*, over a
   weekend whose Sunday run had failed so no crate slot existed at all. Hands beat silence. So:
   - **Don't re-ask it.** It has been answered from both directions and settled. A third ask
     spends Q1's slot re-litigating a closed question.
   - **Don't re-derive the fallback from zeros.** `crate_touched: 0` for a week, or for 38 days,
     is the owner working in bursts — it is *absence*, which the *Absence, not difficulty* rule
     already covers, and absence is never evidence about what they want. Only an answer in the
     box, or hands in the crate, is evidence.
   - **The right lever when the crate goes quiet is a step that survives a gap**, not a new
     schedule. Hold the step, don't shrink it, don't move it to another day.
   - **Never call `loopany finish` over any of this**; a goal that got slower is not a goal
     that was met.

   **A concept is re-taught at most three times, then parked.** Re-teaching without a cap
   freezes the curriculum forever — bitboards ran four times, phase 1 sat five days. On the
   third miss: move the concept to *Review queue*, advance the track to the next concept, and
   name the park in one line. It comes back on the ladder later, when the surrounding
   knowledge has moved on. This applies where the loop **chooses** what to teach — Track B's
   concept and the chess step. It does **not** apply to Track A's rustlings half: that order
   is pinned by `current_exercise` and can only shrink in count, never skip ahead.

   **Track A's step comes from `rustlings.next_exercises`** — the ordered slice starting at
   `current_exercise`, straight from Cargo.toml's bin list (the authoritative order, quizzes
   included), each with its source text. Size the step off it and quote the "done when" from
   it. Never grep the manifest, `cat` the sources, or infer order from section directory
   names — that last one is what mis-assigned lesson 5. Only if the array is empty does the
   run check the bin list itself. **The step is two exercises** unless a track is recovering
   from a skip, in which case the cold-start floor of one still applies.

   **`next_exercises[i].owner_modified` separates a keystroke from a miss** — don't judge it by
   reading the code. `true` on an exercise *not* in `rustlings.done` means the owner wrote it and
   the watcher never executed it, so rustlings never ticked it: that is **presence**, not a miss.
   Name it as a keystroke in the opening note ("run the watcher once"), **re-assign the same pair
   unchanged, and don't re-teach the concept** — the code is already there. `false` is a genuine
   miss and the ordinary rules apply. This is what the 08-22 `quiz2` case cost a whole run to
   derive by hand; it is now a field.

   **Track A's chess half comes from the *Chess roadmap* phase in *Current understanding*.**
   Pick the smallest next thing in that phase that the Rust taught so far can actually express
   — if today's exercises taught `enums`, the chess step uses an enum. Then write the failing
   test into `rust-dsa` yourself and name it in `### Done when`. Advance the phase only when
   its last test passes; a phase is several days, not one.

   **The crate is pre-fetched too — `rust_dsa.files` is every `.rs` under `src/` and `tests/`
   with its full text, plus `cargo_toml`.** Edit straight from it; never `ls -R`, `cat` or
   re-Read the crate to orient first, and register a new module in the `src/lib.rs` text you
   were handed rather than guessing at it. Only a file flagged `truncated: true` (clipped at
   8 KB; `bytes` is its real size) or an empty `files` array is worth a read of your own.
3. **Write today's lesson** to `lessons/<YYYY-MM-DD>.md`, front-matter `type: assigned`,
   both tracks in one file under `## Track A · Rust` and `## Track B · DSA`. Each track gets:
   - **Concept** — one idea, plain prose, one tiny snippet or worked trace. One idea, not three.
     **It closes with one sentence, ≤20 words, naming how this goes wrong in practice** — the
     same idea seen from the failure side, never a second idea. The failure mode is the part
     that sticks, and it fits inside the Concept budget without changing it.
   - **Do this** — the exact command(s) or the exact question, sized to that track's budget.
   - **Done when** — one checkable line the next run can verify mechanically.
   - **Stuck?** — one collapsed hint that **eliminates a wrong path and never points at the right
     one**. Three forms that work: *"if you got X, you answered a different question"*; *"one of
     these is a trap — check what it costs"*; *"two of the four are wrong for the same reason"*.
     **Banned**: restating the Concept, and handing over the first step of the derivation.
     Lesson 25 shipped ``Q1(b): `d/2` is 4, so it's `2·4⁴ − 1` `` — that hands over the answer.
     Inverted it is *"if your answer to (c) is 'twice as fast', you answered a different
     question"*: a third of the words, and the arithmetic stays the owner's.

   Track A additionally gets a `### Chess step` between its `### Do this` and `### Done when`:
   the file to edit, one sentence on what to build, and the exact test name to turn green. No
   second concept lives here — the chess step *spends* the Concept the rustlings half just
   taught. If it needs Rust the owner hasn't met yet, the step is too big.

   **It opens with a runnable command block, exactly like the rustlings half.** The rustlings
   half ships `cd …/rustlings && rustlings` — one command, a watcher, instant red/green — and
   it lands. The chess half shipped as prose naming a file and a test, and the crate went
   untouched for days. Same shape or it doesn't get done:

   ```bash
   cd /Users/tamnm/code/personal/rust-dsa && cargo test <test_name>
   ```

   Absolute path, the day's single test name, the file path on the line above it. It costs no
   words — it *replaces* the sentence describing where to go.

   Track B in stage B1 additionally gets an empty `### My answer` block for the owner to
   fill, and a collapsed **worked answer** below it. That heading is exact — `lesson-web.py`
   and the next run's grading both key on it, and prose referring to it should say
   `### My answer` too.

   **Length is capped, and the cap is the assignment.** 15 minutes is ~1,000 words of
   reading *if the owner does nothing else* — and they have to write Rust and answer a
   question in it. Every section has a hard budget; go over and the lesson has quietly
   eaten the time it was supposed to fit inside:

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

   Draft to the budget, then **at most one trim pass**: write the file, run `wc -w` **once**,
   and if it's over, cut *whole sections* back to their one idea in a single edit. Never
   word-shave in a loop — run 8 spent 95 minutes and eight `wc -w` calls interleaved with
   eighteen edits chasing the last hundred words, and lost its metrics to a server reclaim at
   the end. Being 5% over the cap costs the owner nothing; a run that never ships costs them
   the day. If one pass doesn't land it, ship it and note the overrun in the Timeline.

   Cut the Concept back to its one idea rather than trimming the exercise. A `### Stuck?`
   longer than its own Concept is the tell that the hint has become a second lecture. Depth
   belongs in *one* place per lesson — pick the track that earns it and keep the other lean.

   **An elimination hint rarely needs its 60 words.** Naming one wrong turn is one sentence;
   needing a paragraph means the hint has started explaining the concept again. That is why the
   `### Stuck?` form is an elimination and not a nudge — the shape holds the length down on its
   own, where the cap alone did not (run 7 shipped an 813-word hint under the same cap).
4. **Update this file** — append one dated Timeline line (one line, not a report), nudge
   *Current understanding* (each track's position, and B's current stage).
5. **Put the lesson in front of the owner.** After the file is written, open it in the
   browser — a lesson nobody sees is a skipped day:

   ```bash
   nohup python3 "$HOME/.claude/tools/lesson-web.py" --open >/dev/null 2>&1 &
   ```

   `lesson-web.py` serves the day's lesson at <http://127.0.0.1:7331> — rendered by pandoc,
   Track A's rustlings progress polled live from the state file, and a Track B answer box
   that **writes straight back into the lesson markdown's `## My answer` block**. That
   write-back is load-bearing: it keeps the markdown the single source of truth, so step 1's
   grading never reads a second copy. Starting it twice is safe — it detects the bound port
   and just opens the browser. If it fails, log it in the Timeline and carry on.
   `~/.claude/tools/lesson-open.sh` is the terminal fallback. Track A itself stays in the
   editor — rustlings already watches the file.
6. **Report.** `loopany report --state '{"day":<n>,"chess_phase":<n>,"crate_touched":<0|1>,"rustlings_done":<n>,"dsa_topics":<n>,"structs_done":<n>,"streak":<n>,"words":<n>}'`
   with a one-line message naming both topics. `words` is the `wc -w` you already ran in step 3
   — report the shipped number, so the length cap has a visible trend instead of a Timeline
   note nobody charts. `chess_phase` is the *Chess roadmap* phase the
   run is currently working in, 0–8 — the loop's real progress axis, so report it every day and
   remember a **run-written body does not advance it**. `crate_touched` is `rust_dsa.owner_touched`
   as 1 or 0 — the single number the crate question turns on, so it charts instead of hiding in
   prose. `structs_done` counts only structures whose tests pass.

   **`dsa_topics` and `structs_done` are cumulative — never report a number below the previous
   run's.** `dsa_topics` went 12 → 13 → 14 → **12** across 08-20…08-23, because each run
   recounted "B1 concepts passed plus B2 structures shipped" from scratch and counted differently.
   Take the previous value from the last run's report and add today's increment, if any; a review
   day adds nothing. `streak` =
   `streak_before_prev + 1` when you just graded `prev_lesson` `done` or `partial`, else `0`
   — don't recount it by hand, the workflow already walked the history.
7. **Judge the goal.** Chess roadmap through phase 8, all 8 `ds::` structures tested and
   documented, `cargo test` green, and the binary plays a full legal game → write a closing
   lesson, then `loopany finish`. Read the loop's `goal` for the exact setpoint; it wins over
   this list.

**Front-matter convention.** Every lesson file opens with flat scalars only:
`type:` one of exactly `assigned` | `partial` | `done` | `skipped` (the stage, nothing
else), `title:` both topics in one line, `date:` `YYYY-MM-DD`, and `metrics:`. The dashboard
board keys its columns on the `type` vocabulary — never invent a fifth value, never add a
`status:` field.

**`metrics:` is mandatory and load-bearing — a lesson without it costs the loop ~$1.50.**
The line is `metrics: day=<n> chess_phase=<n> dsa_topics=<n> structs_done=<n>` — the same four
cumulative numbers you `loopany report --state`, written into the file you are issuing today.
It is the **only** store for them: none is derivable from disk, and the host cursor cannot hold
them (the workflow's escalation path returns no state, so `prev` is always undefined — see
`metricsOf` in the workflow for why that can't be fixed without risking a real day's metrics).
The no-agent **hold path** reads this line to carry the numbers forward, and **declines
outright when it is missing or unparseable**, waking a full agent run instead. That path
carried five weekdays at **$0** during the 09-12…09-17 absence; one forgotten line turns the
next absent day back into a paid run. Take each value from `prev_lesson.metrics` (already
parsed for you) and add today's increment. Never report or write a value below the previous
day's.

**When to speak.** `notify: always` — this is a lesson, not a monitor; silence means an
unread lesson. The message is the notification the owner actually sees, so keep it to one
scannable line in exactly this shape:

```
Lesson 12 · A: structs3 + chess Square · B: heaps — yesterday A ✓ B ✗
```

Lesson number, then each track as `A:`/`B:` with the concrete thing to do, then yesterday's
per-track verdict as `✓`/`✗` after an em-dash. Track A names **both halves** joined by `+` —
the last exercise of the step, then `chess <thing>` (≤3 words). Track B stays one concept or
structure, ≤4 words of gloss.
On lesson 1 or after a duplicate wake, drop the verdict clause rather than inventing one.
No preamble, no encouragement, no second sentence — the dashboard's **Today** tab carries
the detail.

**Concept IDs.** Every concept has an ID in backticks: `b1.<slug>`, `ds.<struct>`,
`chess.p<n>`, and `rs.<exercise>` for rustlings (the exercise name itself — not listed here,
the workflow checks it against rustlings' bin list). **An ID is never renamed or reused:** a
renamed concept gets a new ID and the old one stays. The workflow reads IDs out of this file;
an attempt naming one it cannot find comes back in `unknown_ids`.

**Curriculum.**

- **Track A · Rust foundations** (`rustlings`, in order): variables, functions, if,
  primitive types, vecs, move semantics, structs, enums, strings, modules, hashmaps,
  options, error handling, generics, traits, lifetimes, smart pointers, then the rest.
  The order is handed over as `next_exercises`; this list is the shape, not the source.
  Source: <https://github.com/rust-lang/rustlings> + the Book chapter each section maps to.
- **Track B · DSA.** Stage **B1** is theory by hand, in order, and comes in two parts.
  **Part 1 · classical DSA — complete as of 2026-08-13:** complexity & Big-O `b1.big-o`
  → arrays & dynamic arrays (amortized growth) `b1.arrays` → linked lists `b1.linked-lists`
  → stacks `b1.stacks` → queues `b1.queues` → hashing `b1.hashing` → trees & BST
  `b1.trees-bst` → heaps `b1.heaps` → graphs (representations, BFS/DFS) `b1.graphs` →
  sorting `b1.sorting` → recursion & divide-and-conquer `b1.recursion`.
  **Part 2 · engine theory** — each concept is pulled by a chess phase ahead of it, so its
  theory is banked before the code needs it. Take the next one not yet taught; the hand
  exercise is the 7-minute shape, still no Rust:

  | Concept | ID | Hand exercise (forward) | Inverted variant | For phase |
  |---|---|---|---|---|
  | bitboards & bit manipulation | `b1.bitboards` | mask/shift one rank, popcount by hand | give the mask that silently wraps to the wrong rank | 2 |
  | game trees & minimax | `b1.minimax` | score a 2-ply tree by hand | flip one leaf so the root's best move changes | 5 |
  | alpha-beta pruning | `b1.alpha-beta` | prune that same tree, count the nodes saved | give the tree where alpha-beta prunes nothing | 5 |
  | memoization vs tabulation | `b1.memoization` | one recursion, two shapes | what memo key makes the cache return a wrong answer | 5 |
  | iterative deepening | `b1.iterative-deepening` | why re-searching from depth 1 is nearly free | what branching factor makes re-searching expensive | 5 |
  | move ordering | `b1.move-ordering` | why ordering multiplies pruning | the order that makes alpha-beta exactly as slow as minimax | 6 |
  | Zobrist hashing | `b1.zobrist` | XOR one move in and out; why XOR, not sum | three ways to make the same position hash differently | 7 |
  | transposition tables | `b1.transposition-tables` | collisions and replacement policy | three ways to make the TT return a wrong score | 7 |

  The third column is not a second concept — it is the same concept asked from the failure side,
  drawn on the days the table above assigns *Inverted*.

  Stage **B2** implementation order is
  now **pulled by the engine, not fixed in advance** — build the structure the next chess
  phase needs:

  | Structure | ID | Built for | When |
  |---|---|---|---|
  | `ds::Vec` | `ds.vec` | move lists | chess phase 2 |
  | `ds::Stack` | `ds.stack` | make/unmake undo | chess phase 3 |
  | `ds::BinaryHeap` | `ds.binary-heap` | move ordering | chess phase 6 |
  | `ds::HashMap` | `ds.hashmap` | transposition table, repetition | chess phase 7 |
  | `ds::Queue`, `ds::LinkedList`, `ds::BST`, `ds::Graph` | `ds.queue`, `ds.linked-list`, `ds.bst`, `ds.graph` | nothing in chess | Friday, standalone |

  Four of the eight are pulled in by the engine and get used by real code the same week they
  are written. The other four have **no honest role in chess** and are built on Fridays
  instead — inventing chess uses for them is exactly the busywork this redesign removed.
  B1's concept order still front-runs B2, so each structure's theory is banked before the
  phase that needs it. Source: <https://github.com/tayllan/awesome-algorithms>.

**Friday · Review day.** Friday **replaces** the normal lesson — no new concept on either
track, same 15 minutes, same two headings so grading and `lesson-web.py` are unchanged. Its
`title:` starts with `Review week N ·` so it's recognisable in `history`. The word budgets
in step 3 apply unchanged.

| Slot | Budget | What | Verified by |
|---|---|---|---|
| **Track A** | ~8 min | **one standalone `ds::` structure**, or a review project | `cargo test` |
| **Track B** | ~7 min | **the test** — 5 short questions | `### My answer` |

- **Track B · the test.** Five short questions in the one `### My answer` block, drawn by the
  ladder below — **2 from this week**, **1 due at ~1 week**, **1 due at ~4 weeks**, **1 from
  the wrong-answer queue** (or a sixth due item when the queue is empty). Questions may be
  Rust *or* DSA — both tracks are knowledge, and the title of each lesson carries both. Drop
  a slot the loop is too young to fill; never pad to five. Same collapsed worked answer below
  the block, same grading next run.
- **Track A · Friday is where the four non-chess structures get built.** This is the whole
  reason `Queue`, `LinkedList`, `BST` and `Graph` still exist in the goal. One per Friday,
  in that order, once its B1 theory is banked and the Rust it needs is taught (`LinkedList`
  and `BST` want `Box`/`Option`, so they wait for `box1`). Same shape as a weekday chess
  step: the run writes the failing tests into `rust-dsa/src/ds/<name>.rs`, the owner writes
  the bodies, `cargo test` grades it. A structure too big for 8 minutes is **split across
  consecutive Fridays** — `push` one week, `pop` and iteration the next — never crammed.

  When none is due (theory not banked, prerequisite Rust not taught, or all four are done),
  Friday falls back to the old **review project**: `rust-dsa/tests/review_<YYYY_MM_DD>.rs`,
  an integration test exercising a **due** concept from the ladder, not this week's — at
  stage B2 it drives the structures already shipped. `cargo test` already builds `tests/`, so
  either shape grades with no extra plumbing. **On Friday, Track A is graded on `cargo`, not
  on `rustlings.done`** — rustlings doesn't move that day, there is no chess half, and
  neither is a skip.
- **The ladder — every concept, not just the failures.** `due_review` holds two kinds of
  entry. `source: concept` is a concept with attempt records, due by its rung: it climbs
  ~1 → ~4 → ~12 weeks **only** when answered `correct` with `help=none` as a `retrieval`;
  anything else keeps its rung and restarts the clock, and an overdue concept stays due until
  it is asked. `concepts[id].level` says where it stands — `practicing`, `demonstrated`,
  `retained`, or `needs-repair` (was solid, now wrong). `source: lesson` is a lesson from
  before attempt records existed, still on the old date ladder (~1, ~4, ~12 weeks after it was
  taught). Nothing needs writing down for an item that is simply being reviewed on time.
- **The wrong-answer queue is the exception list**, not the mechanism. Two deviations from
  the ladder, both recorded in *Current understanding*:
  - **Wrong → sooner.** A question answered wrong (Friday's or a weekday's) is appended to
    *Review queue*, re-asked the very next Friday, then removed — right or wrong — and it
    keeps its normal place on the ladder regardless. Cap 3; oldest falls off.
  - **Needs repair → queue.** A concept whose `level` is `needs-repair` joins *Review queue*
    exactly like a wrong answer (same cap of 3).
  - **Right at 12 weeks → retired.** Add it to *Retired* and stop drawing it, so the ladder
    doesn't grow unbounded as the curriculum does.
- **Report on Friday** the same schema. A review day counts as `dsa_topics` unchanged (it
  teaches nothing new) and keeps the streak like any other day.

**Code feedback on Track A.** The workflow hands over `reviewed_exercises` — every exercise
the owner finished since the last lesson, each with their `code`, rustlings' official
`solution`, and scoped `clippy` findings at **pedantic** level, each carrying
`{code, message, line, level: 'warning' | 'error'}`. Turn it into a `### Yesterday's code`
block at the top of `## Track A · Rust`, above today's assignment, inside its 200-word budget.

- **Deep-review exactly one**, chosen in this order: the exercise with clippy warnings;
  failing that, the one whose code diverges most from the official solution; failing that,
  the newest. Any `level: 'error'` finding outranks warnings for that slot. Say what they did
  well, give **one** concrete improvement as rewritten lines, and note how the official
  solution differs *only where it genuinely does*. These files are five lines — a mechanical
  diff teaches nothing. **One line each** for the rest.
- **`level` splits findings into two different things — never blur them together.**
  `error` = genuinely rejected: clippy's deny-by-default `correctness` group, one of
  rustlings' own forbidden/denied lints (`unsafe_code`, `clippy::todo`, `empty_loop`,
  `infinite_loop`, `mem_forget`), or a bare rustc error code (e.g. `E0061`). Rustlings
  passing an exercise says nothing about any of these, so this is reachable on a `done`
  exercise. Lead with them, name them as real defects. `warning` = pedantic idiom advice on
  code the compiler already accepted — explain the rule, show the tidier form, don't frame it
  as a mistake.
- **Quote each finding's `code` exactly as given** — never add a `clippy::` prefix that isn't
  there. The code establishes *that* something is off; the lesson explains *why*.
- **`clippy.ok: false` means unknown, never clean.** Say nothing about lints for that exercise.
- Findings arrive capped at 10 per exercise, errors never dropped for warnings, but the array
  is in clippy's emission order — **partition by `level` yourself**; position doesn't imply
  severity. Show fewer for prose reasons, never by slicing.
- **Omit the whole block when there is nothing worth saying — the most important line here.**
  Pedantic is chatty; repeating the same lint daily is the same failure as "looks good!" —
  both train the owner to stop reading it. Silence is the correct output for a clean day.
- Feedback is **read-only**: it never gates the next lesson and never spends Track A's
  ~8 minutes. Grading is unchanged.

## Current understanding

- **Position (2026-10-01, lesson 50).** `presence.any` false, `gap_days` 0. Lesson 49 graded
  **skipped**; streak 0, `consecutive_skips` now **3**, so the **_Absence_ rule is live**: hold
  everything at its current size and don't shrink. On the first day with presence, rotate
  Track B forward to **Zobrist (inverted)** instead of serving iterative deepening a fourth
  time. Held: `errors4`+`errors5` (gate), `board_render` (standing one-liner, not the gate),
  iterative deepening inverted with the same Qs. No crate edit. 652 words. **Sunday 10-04
  serves `ds::Graph`** (overdue, two `todo!()` bodies). Last presence was 09-25 (`errors4`
  `value > 0?;`, doesn't compile). Crate: 10 pass / 3 fail (`board_render` + Graph's two).
- **The owner may use today's answer box for an older lesson's questions.** 09-21's box held
  09-19's TT answers. Before grading a box against its own questions, check whether it answers a
  previous lesson's — and grade what it actually answers.
- **THE FALLBACK IS REVERSED — weekday chess is back, and the reversal is behavioural, not a
  redesign.** Two days after lesson 45 concluded "presence-with-silence = move all crate work
  to Sunday", the owner opened `src/chess/board.rs` and made `board_rank_line` green — with
  **no lesson asking for it**, on a weekend whose Sunday run failed so no crate slot was ever
  served. That is the strongest possible refutation of "the crate is not chosen": they chose
  it unasked. Consequences, all of them live:
  - **Phase 1 is unblocked.** The *untouched, not too big* rule blocked it on "until the owner
    opens the crate once". They have. The run may write the next failing test (it did:
    `board_render`) — but the one-run-written-body-per-phase budget for phase 1 is still spent,
    so **still don't write bodies**.
  - **Don't re-ask the crate Q1.** It has now been answered twice — by silence in one
    direction and by hands in the other, and hands win. Asking a third time spends Q1's slot
    re-litigating something settled.
  - **Read `crate_touched`, not the calendar, and don't infer abandonment from a run of
    zeros again.** 38 days of `crate_touched: 0` produced a confident, wrong conclusion on
    09-19. The owner works in bursts with long gaps; a gap is not a decision, and the loop
    read one as a decision twice (08-27 → 09-19) in the same direction.
  - The **2026-10-05 check** (did a Sunday slot get opened?) is **moot** — answered early, in
    the wrong column: a *weekend* slot nobody offered got opened. Replace it with: **2026-10-05
    — has a run-written chess test gone green under the restored weekday shape?** If
    `board_render` and its successors land, the daily chess half works and the 09-19
    conclusion was purely a reading error. If the crate goes quiet again for a week, the real
    pattern is burst-work, and the right lever is a step that survives a gap, not a schedule.
- **B1 part 2 IS SPENT — the next serve must come from the extension, not the table.** All eight
  concepts in the Spec's part-2 table have been served: bitboards, minimax, alpha-beta and move
  ordering taught and passed; memoization vs tabulation parked to *Review queue*; transposition
  tables served 09-19 and answered late in 09-21's box (passed); iterative deepening served
  09-21 (unanswered) and re-served inverted 09-25. **Zobrist is the one exception worth re-serving** — five serves 09-14…09-18 but
  only the last into a non-empty room, so by the read-serves-only park rule it has **one** read
  serve, never answered. Order from here: **Zobrist (inverted)**, then extend the table with the
  phase 5+ theory the roadmap still needs — quiescence search, eval terms, repetition detection.
- **A Sunday structure can rot as quietly as a chess step — check `cargo`, not the calendar.**
  `Queue` sat as three `todo!()` bodies from 08-16 to 08-23 because the only Sunday between was
  the one that assigned it. The run wrote `push`/`len` (which teach nothing) and left `pop` (the
  idea: `Option` + `Vec::remove`). **`ds::Graph` is the one now overdue** — two `todo!()` bodies,
  assigned review week 6, red ever since; the 09-20 and 09-27 Sunday runs both failed, so it was
  never re-served. It is what's due on **2026-10-04**.
- **A correct exercise can sit outside `rustlings.done` — the watcher has to run it.** Rustlings
  records an exercise only when its watcher executes it; writing the file is not enough (08-22:
  `quiz2` complete and correct, still not `done`). That is presence, not a miss — the
  `owner_modified` field now carries it; name it as a keystroke and re-assign the pair unchanged.
- **A body can be right and the exercise still red — read `main`, not just the TODO.** 08-19's
  `hashmaps2` `fruit_basket` was correct; the exercise failed because `main` passed the map by
  value to a `&mut` parameter. A nearly-finished attempt is invisible in `reviewed_exercises`
  (which needs `done`) — **look at `next_exercises[0].code` when a half misses.**
- **Size, reach and crowding are all refuted as levers on the chess half — don't re-test them.**
  These survive the 09-21 reversal; only the *conclusion* drawn from them ("it is not chosen")
  was wrong. **Too big:** `piece_at` was one line and was assigned three times — and difficulty
  was already ruled out once (2026-08-09, *boring not too hard*). **Shrinking:** closed phase 0,
  then failed every time since, and three runs shrank the *rustlings* half as collateral,
  dropping it to 1/day against a 2/day setpoint. **Reach:** the runnable `cargo test <name>`
  block shipped 08-20 and changed nothing on 08-21/22/23. **Weekday crowding:** Sunday's
  `ds::Queue` had an uncontested ~8-minute slot and sat seven days. What was actually left was a
  **gap** — the owner works in bursts. Don't redesign the step a fifth time; wait it out.
- **A request in the answer box is presence, and it outranks the park rule.** Lesson 17's
  `### My answer` didn't answer the question — it asked for the prerequisite. That is the
  lessons-6/7 gotcha, not a blank: graded ✓, no Review-queue slot burned, and the concept is
  re-taught *as asked* rather than parked at its threshold. Parking a concept the owner just
  asked for would be the loop reading its own counter over their words.
- **The shrink ladder is spent — 587 words on 08-17 is the floor and there is nothing left to cut.**
  Three `skipped` days (08-14/15/16) were each read as difficulty and shrunk, bottoming out with all
  three sections cut at once. The Spec's *Absence, not difficulty* rule now stops the ladder at
  `consecutive_skips ≥ 3`. Don't restart it: a design that landed 13 days running did not become
  too hard overnight.
- **The four non-chess structures are unblocked and Friday is where they ship.** `Queue` needed
  only a struct and a `Vec`, both taught long ago — it sat undone because no run checked whether
  it was due. `LinkedList` and `BST` still wait on `Box`/`Option`; `Graph` is unblocked after
  `Queue`. Check this list every Friday before falling back to a review project.
- **Never build a silent-failure device into a step.** A deliberately-undeclared `src/chess/piece.rs`
  (missing `pub mod piece;` was meant to *be* the exercise) failed silently instead of loudly and
  cost phase 1 two days; dismantled 08-15. The failing-test contract depends on red meaning red.
- **A track that misses re-teaches, but "the track" is the half that missed.** 08-15: the
  rustlings half landed (`modules2`+`modules3`) so it advanced to hashmaps, while the chess half
  was carried forward unchanged. Don't freeze a passing half because its sibling failed.
- **The owner's broken `from_name` stayed theirs and it worked.** Two non-compiling attempts
  (08-11, 08-12) were left unrepaired; the lever was aiming the *rustlings* pair at the Rust
  that unblocked them (`as_bytes()`, `&str` vs `String`), and they shipped it the next day —
  with length and range validation the run's own hint didn't ask for. Repeat that lever;
  don't repair their code.
- **A non-compiling crate is a real owner-side state** (08-12), not just a rule binding the run.
  If it recurs, consider making `cargo build` succeeding its own visible `### Done when` step.
- **Both projects exist.** `rustlings/` (94 exercises, own git repo) and `rust-dsa/`
  (`cargo new --lib`) are at `/Users/tamnm/code/personal/`. Bootstrap is done — never redo it.
  Baseline at create: `93/94 pending`, `structs_done: 0`, `cargo test` green on the scaffold.
- **The tree lives outside `~/Documents` deliberately.** Moved 2026-08-03: macOS TCC denies
  launchd-started processes access to `~/Documents`, and the daemon runs as a LaunchAgent.
  Running from Documents cost the 08-03 lesson (`EPERM`). Never move it back.
- **Your cwd is NOT the project tree.** Runs start in `~/Documents/Manual Library/code/personal`,
  an **empty leftover directory**. Everything works only because every path is absolute.
  **Always use absolute paths under `/Users/tamnm/code/personal/`**, and `cd` explicitly before
  any `loopany`, `cargo` or `rustlings` command.
- **Schedule: 09:00 Asia/Saigon daily** (cron `0 9 * * *`), confirmed 2026-08-03. The workflow
  does its date math in `Asia/Ho_Chi_Minh` (same zone). The 15-minute budget has never moved.
- **The owner works in the evening, ~13 hours after the lesson lands.** Exercise mtimes cluster at
  **22:30, 22:47, 22:15** (08-17, 08-19, 08-21), with one 10:04 outlier. So a lesson issued at
  09:00 sits unread all day, and next morning's grading correctly catches the previous evening's
  work — the cutoff logic is right. Two consequences: a day graded `skipped` at 09:00 may simply
  not have happened *yet*, and any question the loop asks gets answered a full day later at best.
  Don't read a same-morning zero as a decision.
- **Review queue** — the *exception* list only: answered wrong, waiting for next Friday. Max 3,
  oldest falls off; removed after one retry, right or wrong. On-time review of everything else
  comes from `due_review`, never listed here. **At cap 3 after 08-11** (heaps added, so the
  08-09 BST item aged off unasked — the ladder still covers BST via lessons 8/9). **Borrows was
  drawn as 08-16's Q5, amortized growth as 08-23's Q4, both removed per the one-retry rule;
  at cap 3 again after 08-27:**
  - **Move ordering · ranking four candidate moves** — lesson 25 Q2, answered `(b)` only, with a
    request to clarify. `PxQ` is second: the **TT move** leads, because it is a previous search's
    result rather than a heuristic, and `QxP` on a *defended* pawn is **last** — a losing capture
    is still a losing move. Corrected in 26's opening note. Added 2026-08-27.
  - **Memoization vs tabulation — parked, not answered wrong.** Served 08-22, 08-23 (Q2) and
    08-24, blank every time; parked 2026-08-25 under the three-serve cap so Track B could rotate
    forward. Draw it on a Sunday as a *question*, not a fourth lesson.
  - **Heaps · what an insert does** — lesson 11 Q1, produced a *sorted* array
    (`[2,3,4,5,8,9]`). A heap is not sorted; insert appends at the end and sifts up one path
    (`[2,5,3,8,9,4]`). Corrected in 12's opening note. Added 2026-08-11.
  - **Ring buffer · index wraparound is now closed.** Wrong a fourth time on 08-09 (Q5, said
    both indices at 3). Per the standing rule it was **not** re-queued; 08-10's opening note
    re-explained it a different way — *count the moves each index made, don't track slots*
    (6 pushes → `tail = 6 % 5`, 2 pops → `head = 2 % 5`). If it fails again, the concept
    needs a drawn diagram, not another trace.
  - **Big-O is the recurring weak spot, not any one structure.** 08-09 gave `O(n)` for both
    amortized push *and* a halving loop. Both were separately taught and both regressed —
    prefer "what is the Big-O and why" over another hand-trace when picking a review slot.
- **Retired** — answered right at the 12-week rung; no longer drawn by the ladder. *(empty)*
- **Everything the run needs is pre-fetched; duplicate wakes never reach the agent.** A
  workflow runs before each lesson and hands over `today`, `weekday`, `is_review_day`,
  `week_number`, `due_review`, `prev_lesson` (path, `type`, full text, `### My answer`
  extracted), `history` (date + `type` + `title`), `streak_before_prev`, **`consecutive_skips`**
  (its mirror — the trailing run of `skipped`, same exclude-`prev_lesson` contract; the trigger
  for the Spec's *Absence, not difficulty* rule), **`presence`** (`{any, signals}` — the Spec's
  "empty room" test, an OR over `reviewed_exercises` / any `owner_modified` / `owner_touched`;
  three rules key on it, and runs 25–27 each re-derived it by hand, so it is now a field — added
  2026-08-26), `gap_days`,
  `rustlings` (current exercise, done list, and **`next_exercises`** — the ordered slice from
  Cargo.toml's bin list with source text and **`owner_modified`**, whether the owner wrote into that
  exercise since the last lesson), `reviewed_exercises`, **`rust_dsa`** (every `.rs`
  under the crate's `src/` and `tests/` with full text, plus `cargo_toml`, plus
  **`owner_touched`/`touched_paths`** — whether the owner opened the crate since the last lesson,
  the chess-half mirror of `reviewed_exercises`) and `cargo`. It also
  short-circuits a duplicate same-day wake (today's lesson present and still `assigned` →
  silent tick, no agent, no Timeline line), so **a run that starts has work to do**. Source of
  truth for the script: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js`, with a
  test harness beside it.
  - `rustlings/.rustlings-state.txt`: line 1 is a `DON'T EDIT` header, the first non-blank
    name after it is the current exercise, the rest are done. Rustlings only records an
    exercise once it compiles and passes — that list is compiler-backed, not self-reported.
  - `reviewed_exercises` covers up to 5 exercises both in `rustlings.done` **and** modified
    since the previous lesson file's **birthtime** (not mtime — the lesson gets rewritten
    after issue, so mtime means "last touched", not "when issued").
  - **`next_exercises[i].owner_modified` is its complement**, same birthtime cutoff: exercises
    *not* yet done that the owner wrote into anyway. Together they cover the three states —
    done-and-worked (`reviewed_exercises`), written-but-never-watched (`owner_modified` on a
    not-done exercise), and untouched. Caveat that bites: the cutoff is the *previous lesson's*
    birthtime, so work older than that reads `false` even if the file is complete — after a gap,
    trust *Position* over the flag.
  - **`rust_dsa.owner_touched` depends on the run writing the crate BEFORE the lesson file.**
    The cutoff is the previous lesson's birthtime, so a run-authored crate edit made in step 2
    always lands before the cutoff it is compared against tomorrow — that is what excludes the
    run's own writes without any filtering. Invert the order and every carried-forward day
    reads as a false "owner touched it". Files dropped by the 48 KB read cap are still stat'd,
    so the flag never under-reports absence.
  - **Clippy runs at pedantic on purpose, and must stay there.** A sweep of all 17 exercises the
    owner had completed as of 2026-08-04 found **zero default-level findings** — default clippy
    would have made this feature silent for weeks. Scoped clippy is 0.35s and cargo replays cached
    diagnostics, so no cache-busting. **Don't "simplify" back to default** — it kills the feature.
  - `rustlings/` has **no git baseline**: the official solution is the only reference.
  - **`cargo.ok` means "cargo ran", not "everything passed"** (fixed 2026-08-10). It keys on
    whether the output holds parseable `test … ok|FAILED` / `test result:` lines, not on the exit
    code — which the chess contract turns false *every day*. A crate that doesn't compile emits
    none of those and lands on `ok: false`, the case that genuinely is blind.
    **`cargo.why`** (added 2026-09-25) says why ok is false when it isn't broken code: `timeout`
    = the prefetch was killed mid-build (a cold `target/` after the laptop wakes, since the build
    has to fit in the host's 30s box), `skipped` = no budget left, null = real compile failure.
    Either way the answer is the same: run `cargo test` by hand once.
  - **The workflow's test harness is red on two pre-existing cases** (`selection caps at 5 …`,
    `one unreadable exercise …`) — the fixture drifted, not a regression. Until someone reconciles
    it, smoke-test by wrapping the body in an async arrow and running it against the real tree.
- **Fallback grading.** rustlings is **6.5.0 — there is no `rustlings list`.** If the
  pre-fetched data is missing, `cd rustlings && rustlings check-all 2>&1 | tail -3` prints
  `N/94 exercises pending`. It emits TUI escape noise (always pipe through `tail`) and
  recompiles 94 crates — prefer the pre-fetched data.
- **Owner profile** — starting from foundations; budget is a real 15 min/day. Wants both
  reading and doing, wants **DSA every day alongside Rust**, and wants the loop to check
  whether yesterday's work was actually done rather than marching on regardless. Rejected a
  daily code-rework step as a tax on a track they already overshoot — hence read-only feedback.
  **2026-08-09: asked for the lessons to be harder and more connected, then on questioning
  identified the real problem as *boring, not too hard*** — nothing built survived to the next
  day. Difficulty was explicitly left alone (the Review queue was at cap and the ring-buffer
  question had been wrong three times, so the DSA track was already at the limit). They chose:
  chess subsumes the goal, rustlings kept because it is fundamental and a third done, and the
  chess step graded by the compiler rather than self-reported. **Don't re-raise difficulty as
  the lever** — connection was.
- **Gotchas** —
  - **A crate that doesn't compile makes ALL grading blind, not just chess.** `cargo test`
    parsing keys on `test <name> ... ok` lines; a build failure emits none, so Track B's
    structures grade as missing too. So the run **never leaves the crate non-compiling**: write
    the failing test *and* a stub whose body is `todo!()` (it coerces to any type), so the
    build stays green and the test fails by panicking. The owner replaces the `todo!()`. Never
    reference a function that doesn't exist yet.
  - **Track A's step will try to drift back to four exercises.** It's the path of least
    resistance on any day the chess step is awkward. Two is the setpoint; the chess half is
    what the redesign bought and it is the first thing time pressure eats.
  - **`cargo test` has an 8-second budget covering compile *and* run** (`CARGO_TEST_HARD_CAP_MS`).
    A dependency-free crate is nowhere near it today, but perft is exponential — depth 4 from
    the start position is ~197k nodes and debug Rust is slow. Routine perft tests stay at depth
    ≤ 3; deeper ones get `#[ignore]`. Raise the constant only if cold builds genuinely approach
    the cap, and never above the host's own reserve.
  - **Lesson length drifts upward if nothing checks it.** Words went 343 → 2,749 over the first
    seven days with no single run doing anything unreasonable (by lesson 7 Track B's `### Stuck?`
    was **813 words**, longer than the Concept it hinted at). That is what step 3's budget table
    exists to stop; count before writing.
  - **Never trust section directory names for exercise order.** Quizzes sit in `exercises/quizzes/`,
    not in a section dir (`if3 → quiz1 → primitive_types1`). Lesson 5 assumed otherwise and named
    an unreachable "done when". `next_exercises` settles it — don't re-derive it.
  - **B1 answers can be right-shaped but wrong.** Lesson 2's Q3 gave `O(n)` where the doubling test
    gives `O(n²)` — passed on substance, corrected in the next opening note. Don't silently move on.
  - **A partly-filled `### My answer` block still passes.** The rule is non-empty + substantive;
    `partial` means *one track*, not half a track. Name the blanks in the opening note, re-ask one
    as today's Q1, put the other in the Review queue.
  - **Never edit a file under `rustlings/exercises/` yourself.** Its mtime is what the birthtime
    cutoff is compared against; touching one makes stale work look new. Feedback is prose in the
    lesson, never an edit to the owner's code.
  - **Delivery is local, not push.** `notify: always` only writes the message into the run
    history on loopany.ai — nothing pops on the Mac. Opening the browser (step 5) *is* the
    delivery. **Notifications are a closed question** (2026-07-31): `display notification`
    returns success but nothing draws — no CLI-reachable process is a registered notification
    client, and a hand-built `osacompile` applet is blocked by its ad-hoc signature. Don't
    spend another run on `osascript`; the only route is a properly signed app.
  - **Runs do fail, and a failed run is a lost lesson day** (08-02 API drop; 08-03 morning
    EPERM). Those days surface as `gap_days` — never read a gap as the owner going quiet.
    Since 09-20 the loop's own failures outnumber the owner's skips: in 09-20 → 09-30, 6 of 11
    slots were "machine unreachable" (laptop asleep/away — runs then fire late, on wake) and one
    (Sunday 09-27) died on **`Not logged in · Please run /login`** — expired Claude CLI auth, not
    sleep; only the owner can fix it with `/login`. **Two Sundays in a row lost `ds::Graph`**, so
    on 10-04 it is still the Sunday structure. Name the gap in the opening note in one line and
    move on — never diagnose it inside a lesson run.
  - **A run that can't report has still shipped the lesson — say so in one line and stop.** Two
    causes have cost days their metrics, neither worth re-diagnosing: a **server reclaim** after a
    long API stall (08-07, 08-09) and the **npx-cache death** (08-11, 08-18). The reclaim lever is
    the run's own length — see step 3's one-trim-pass rule. Never redo shipped work.
  - **The npx-cache death is structural and was fixed at the shim on 08-26.** `~/.loopany/bin/loopany`
    used to exec a `~/.npm/_npx/<hash>/…` path that npm reclaims, killing every `loopany` call with
    `MODULE_NOT_FOUND`. Repopulating doesn't help (npx picks a new hash, and on 08-26 didn't persist
    the package at all). The shim is now `exec npx -y loopany "$@"`, resolved fresh every call. If it
    breaks again, `npx -y loopany <cmd>` is the workaround — **don't go spelunking in `~/.npm/_npx`**,
    that was checked and there is nothing there.
  - **Duplicate wakes happen** (07-31 fired twice, 23 min apart). The workflow gates them; if it
    ever falls back and `lessons/<today>.md` is already `assigned`, report `nothing-new` and stop.
  - The enclosing folder is not a git repo — no commit history to read progress from.
  - `~/.claude/tools` is a symlink to `~/dotfiles/AI/tools` — editing `lesson-web.py` edits
    the dotfiles copy.

## Timeline

<!-- one dated entry per run, appended below by the loop -->

*(2026-07-30 → 08-27 condensed to milestones by the 2026-09-21 evolution pass. The durable
findings from that stretch all live in* Current understanding *; only the dated spine is kept.)*

- **2026-07-30 – 08-06 (runs 1–7)** — loop created and bootstrapped (`rustlings init`, 94
  exercises; `cargo new --lib rust-dsa`). Owner reshaped it immediately: DSA every day beside
  Rust, read-only code feedback, grading by compiler not self-report. Lesson words drifted
  343 → 2,749, which is what produced step 3's budget table.
- **2026-08-09 (owner reshape, not a lesson run)** — **the goal changed: a chess engine replaced
  the abstract 8-structure library.** The complaint was *boring, not too hard* — nothing built
  survived to the next day. Chess roadmap (phases 0–8) written; four structures kept as Sunday
  standalones because they have no honest chess use.
- **2026-08-10 – 08-14 (runs 11–15)** — chess track opened; the streak's best stretch, 11 → 13.
  Phase 0 closed. B1 part 1 (classical DSA) completed 08-13, so part 2 (engine theory) was
  written to stop Track B running dry.
- **2026-08-15 – 08-23 (runs 16–24)** — **the 13-day streak broke to zero and did not recover.**
  Three runs read it as difficulty and shrank the lesson to a 587-word floor; three run-written
  chess bodies were spent unblocking phase 1. 08-20's evolution pass measured the actual cause:
  every `.rs` in `rust-dsa` still carried the *run's* mtime, so the chess step was never opened
  at all. `owner_touched` / `crate_touched` were added as fields; the *Absence, not difficulty*
  and *untouched, not too big* rules were written.
- **2026-08-24 – 08-26 (runs 25–27)** — the crate A/B question asked in the answer box; then
  five consecutive empty rooms. Evolution added `presence` as a field, the read-serves-only park
  rule, and (owner-directed) the **inversion** contract — inverted B1 questions, elimination-only
  `### Stuck?` hints, and the fenced *ship-it-broken* chess half.
- **2026-08-27 (run 28, lesson 26)** — the owner came back for one day, answered Track B, and
  left the crate Q1 blank. That blank is what 09-19 later over-read as a decision.
- **2026-08-28 – 09-12 — blackout, cause unknown, 16 days with no lesson file.** `lessons/` jumps
  straight from 08-27 to 09-13. Lesson 26 (08-27) is still `type: assigned` — never graded, and
  deliberately left that way on 09-19 because regrading it now would desync the workflow's
  pre-computed `streak_before_prev`. Its Q1 (the crate question) went unanswered, which is what
  09-19 finally resolved. `ds::Queue::pop` was written by *someone* in this window (its tests pass
  now, `structs_done` 0 → 1) and `ds::Graph` was assigned on a review Sunday and left red.
- **2026-09-13 – 09-18 (lessons 39–44) — six runs shipped lessons and NONE of them updated this
  brief.** Zero `2026-09` entries existed in *Timeline* before today, and *Current understanding*
  still opened on 08-27. All six graded `skipped` into empty rooms; Track B held Zobrist hashing
  (inverted) unchanged across five of them, per *Rotate forward on the RETURN day*. Worth naming
  as a failure mode: **a run can ship its lesson and still lose the day's memory** — step 4 is not
  optional, and six consecutive misses meant run 45 had to reconstruct the position from
  `history` + `cargo` rather than read it.
- **2026-09-19 (run 45)** — `presence` true for the first time since 08-27; Track B rotated
  forward to transposition tables. The 08-27 crate Q1 was read as *answered by silence* and
  weekday chess was removed (all crate work → Sunday). That reading was wrong (next entry).
- **2026-09-21 (run 46) — the fallback REVERSED.** Sunday 09-20 failed, yet the owner opened
  `src/chess/board.rs` unprompted and turned `board_rank_line` green (`crate_touched` 0 → 1 after
  38 days). Weekday chess restored with `Board::render` / `board_render` (red by panic, 10/3).
  Track B opened iterative deepening, `dsa_topics` 16. Same day's **evolution pass** closed the
  crate question in the Spec ("a flat `crate_touched` is a gap, not a decision"), documented the
  mandatory `metrics:` line, added the reading recipe, and distilled the file 1,102 → ~930 lines.
- **2026-09-25 (run 47)** — `gap_days: 3` (machine unreachable). Lesson 46 **partial**: B ✓ on
  lesson 45's TT answers written into 46's box, `dsa_topics` 17. Prefetch `cargo.ok: false` with
  no errors; **evolve** traced it to a cold `target/` right after wake and added `cargo.why`.
- **2026-09-26 (run 48, lesson 48)** — Empty room (`presence.any` false, `gap_days` 0). Lesson 47
  **skipped**. Held everything: `errors4`+`errors5`, `board_render`, iterative deepening inverted (same Qs).
  No crate edit. `dsa_topics` 17, streak 0, 682 words.
- **2026-09-30 (run 49, lesson 49)** — `gap_days: 3` (09-27…29 failed; Sunday `ds::Graph` lost again). Empty room. Lesson 48 **skipped**. Held `errors4`+`errors5` and ID inverted; `board_render` demoted from gate to a standing one-liner after three unread serves. No crate edit. `dsa_topics` 17, streak 0, 679 words.
- **2026-10-01 (run 50, lesson 50)** — Empty room, `gap_days` 0. Lesson 49 **skipped**; `consecutive_skips` hits 3, so the Absence rule is live: held everything unchanged (`errors4`+`errors5`, `board_render` one-liner, ID inverted). No crate edit. `dsa_topics` 17, streak 0, 652 words.
