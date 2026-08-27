# Rust + DSA — Daily Lesson

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
  a local `fn` inside that test file — same shape as Sunday's `tests/review_<YYYY_MM_DD>.rs`. The
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
  | Sunday review, and every wrong-answer-queue item | **Inverted** |

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

`LinkedList`, `Queue`, `BST` and `Graph` have **no honest use in a chess engine**. Forcing
them in would rebuild the fake-exercise feeling this redesign exists to remove, so they are
built as standalone `ds::` modules on Sundays instead — see *Sunday · Review day*.

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
   **Grading a Sunday review day** uses the same two rules with one swap: Track A is judged on
   `cargo` alone (the `ds::` module's tests, or the `review_*` file's, whichever Sunday
   assigned), never on `rustlings.done` and with no chess half. Any test question
   answered wrong goes into the *Review queue*, and the item that Sunday pulled *from* the
   queue is dropped from it either way.
2. **Sunday?** Then skip to the *Sunday · Review day* section — no new concepts today, and no
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

   **The open question and its fallback (raised 2026-08-24).** Does `rust-dsa` belong in the
   daily 15 minutes, or should weekdays be rustlings + theory with all crate work on Sundays?
   Ask it per the rule above. If it resolves either way, or resolves by presence-with-silence,
   apply the answer and record it in *Current understanding*. If the answer is *move it*, the
   shape is: weekday Track A = **2 rustlings exercises for the full ~8 minutes, no chess half**;
   Sunday's Track A carries **all** `cargo`-crate work, chess step and `ds::` structure both,
   alternating so neither starves. That slows the chess roadmap and makes the goal's timeline
   the owner's choice rather than the loop's — note it plainly and keep running. **Never call
   `loopany finish` over it**; a goal that got slower is not a goal that was met.

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
else), `title:` both topics in one line, `date:` `YYYY-MM-DD`. The dashboard board keys its
columns on that vocabulary — never invent a fifth value, never add a `status:` field.

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

**Curriculum.**

- **Track A · Rust foundations** (`rustlings`, in order): variables, functions, if,
  primitive types, vecs, move semantics, structs, enums, strings, modules, hashmaps,
  options, error handling, generics, traits, lifetimes, smart pointers, then the rest.
  The order is handed over as `next_exercises`; this list is the shape, not the source.
  Source: <https://github.com/rust-lang/rustlings> + the Book chapter each section maps to.
- **Track B · DSA.** Stage **B1** is theory by hand, in order, and comes in two parts.
  **Part 1 · classical DSA — complete as of 2026-08-13:** complexity & Big-O → arrays &
  dynamic arrays (amortized growth) → linked lists → stacks → queues → hashing → trees & BST
  → heaps → graphs (representations, BFS/DFS) → sorting → recursion & divide-and-conquer.
  **Part 2 · engine theory** — each concept is pulled by a chess phase ahead of it, so its
  theory is banked before the code needs it. Take the next one not yet taught; the hand
  exercise is the 7-minute shape, still no Rust:

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
  drawn on the days the table above assigns *Inverted*.

  Stage **B2** implementation order is
  now **pulled by the engine, not fixed in advance** — build the structure the next chess
  phase needs:

  | Structure | Built for | When |
  |---|---|---|
  | `ds::Vec` | move lists | chess phase 2 |
  | `ds::Stack` | make/unmake undo | chess phase 3 |
  | `ds::BinaryHeap` | move ordering | chess phase 6 |
  | `ds::HashMap` | transposition table, repetition | chess phase 7 |
  | `ds::Queue`, `ds::LinkedList`, `ds::BST`, `ds::Graph` | nothing in chess | Sunday, standalone |

  Four of the eight are pulled in by the engine and get used by real code the same week they
  are written. The other four have **no honest role in chess** and are built on Sundays
  instead — inventing chess uses for them is exactly the busywork this redesign removed.
  B1's concept order still front-runs B2, so each structure's theory is banked before the
  phase that needs it. Source: <https://github.com/tayllan/awesome-algorithms>.

**Sunday · Review day.** Sunday **replaces** the normal lesson — no new concept on either
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
- **Track A · Sunday is where the four non-chess structures get built.** This is the whole
  reason `Queue`, `LinkedList`, `BST` and `Graph` still exist in the goal. One per Sunday,
  in that order, once its B1 theory is banked and the Rust it needs is taught (`LinkedList`
  and `BST` want `Box`/`Option`, so they wait for `box1`). Same shape as a weekday chess
  step: the run writes the failing tests into `rust-dsa/src/ds/<name>.rs`, the owner writes
  the bodies, `cargo test` grades it. A structure too big for 8 minutes is **split across
  consecutive Sundays** — `push` one week, `pop` and iteration the next — never crammed.

  When none is due (theory not banked, prerequisite Rust not taught, or all four are done),
  Sunday falls back to the old **review project**: `rust-dsa/tests/review_<YYYY_MM_DD>.rs`,
  an integration test exercising a **due** concept from the ladder, not this week's — at
  stage B2 it drives the structures already shipped. `cargo test` already builds `tests/`, so
  either shape grades with no extra plumbing. **On Sunday, Track A is graded on `cargo`, not
  on `rustlings.done`** — rustlings doesn't move that day, there is no chess half, and
  neither is a skip.
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

- **Position (2026-08-27, lesson 26). THE OWNER IS BACK — `presence.any` true after four empty
  rooms.** Signals: `reviewed_exercises` (`options2`) and `owner_modified` on `options3`. Lesson 25
  graded **partial**: Track B ✓ (answered, Q1 arithmetic right, Q2 ranking wrong) and Track A ✗ on
  a technicality — `options3` carries a **correct** `Some(ref p)` that the watcher never executed,
  so it is presence, not a miss. Streak **1**, `consecutive_skips` back to **0**; the *Absence*
  rule is off. Track A: `rustlings.done` **49/94**, today `options3` + `errors1` at the full
  two-exercise setpoint (the landed half went straight back up, no cold-start floor). Chess
  **phase 1, still blocked on the owner** — `owner_touched` false a **ninth** day, `board_rank_line`
  red, cargo 7 passing / 3 failing unchanged, **no chess half and no crate edit for the fourth day**.
  `ds::Queue::pop` still `todo!()`. Track B: **stage B1, part 2**, **rotated forward on the return
  day** — move ordering is now taught *and passed*, so `dsa_topics` **15**, and today serves
  **Zobrist hashing** (first serve → forward form). `structs_done: 0`. 919 words, no trim pass.
- **B1 part 2 has ONE concept left after today.** Taught and passed: bitboards, minimax,
  alpha-beta, **move ordering (08-26, answered on the return day)**. Parked to *Review queue*:
  memoization vs tabulation. **Served once into an empty room and rotated past, never read:
  iterative deepening (08-25).** Serving Zobrist today leaves only **transposition tables** — so
  Track B runs dry in two days and the next run must decide what follows part 2. The obvious
  candidate is **iterative deepening**, which was rotated past unread and is genuinely untaught;
  it was skipped today only because the Spec's *return day is a fresh start, not a retry* forbids
  opening a comeback on the abandoned concept. Draw it once part 2 closes, or extend the table.
- **The Q1 crate question was RE-ASKED TODAY (08-27) — the first day with presence since it was
  raised.** Lesson 23 asked the A/B choice (daily crate vs Sundays-only) into three consecutive
  empty rooms (08-24/25/26), which per the Spec is not a decision and is why it was never treated
  as resolved. It is now Q1 of lesson 26's `### My answer`, one re-ask as the rule allows. **The
  next run applies whatever comes back, including presence-with-silence** — a blank Q1 on a day
  with presence *is* the answer, and the fallback shape (weekdays = 2 rustlings + theory, all crate
  work on Sunday) is written into the Spec. Do not re-ask a third time. Note the deliberate
  sequencing: no chess step was served today *because* the question was on the table — shipping one
  would have pre-empted the answer it asks for.
- **A weekday with no chess half is now a real, rule-derived state — not a lapse.** 08-24 is the
  first one: the *untouched, not too big* rule's own clause ("give those ~4 minutes back to the
  rustlings half until the owner opens the crate once") means the phase-blocked case ships
  rustlings-only. Consequence worth remembering: with no run-authored crate edit, tomorrow's
  `owner_touched` is a **pure** owner signal with nothing to filter out.
- **A Sunday structure can rot as quietly as a chess step — check `cargo`, not the calendar.**
  `Queue` was assigned 08-16 and was still three `todo!()` bodies on 08-23, a full week later,
  because the only Sunday in between was the one that assigned it. Its first miss, so the
  *untouched* rule doesn't fire yet — the response was the ordinary shrink: the run wrote the two
  bodies that teach nothing (`push`, `len`) and left `pop`, the one carrying the idea (`Option` +
  `Vec::remove`). If it misses again, write `pop` and move to `Graph`.
- **A correct exercise can sit outside `rustlings.done` — the watcher has to run it.** Rustlings
  records an exercise only when its watcher executes it; writing the file is not enough (08-22:
  `quiz2` complete and correct, still not `done`). That is presence, not a miss — the
  `owner_modified` field now carries it; name it as a keystroke and re-assign the pair unchanged.
- **A body can be right and the exercise still red — read `main`, not just the TODO.** 08-19's
  `hashmaps2` `fruit_basket` was correct; the exercise failed because `main` passed the map by
  value to a `&mut` parameter. A nearly-finished attempt is invisible in `reviewed_exercises`
  (which needs `done`) — **look at `next_exercises[0].code` when a half misses.**
- **The crate is not too big and not badly delivered — it is not chosen. Every rival hypothesis is
  refuted, and the loop must stop re-testing them.** The owner has not opened `rust-dsa` since
  **2026-08-12**; every `.rs` in it carries a *run's* mtime. What makes this selection rather than
  absence: on **08-17, 08-19, 08-20, 08-21 and 08-23** the owner *did* show up (evening exercise
  mtimes ~22:30) and on every one of those days chose rustlings and skipped the crate — five
  independent observations, not one gap.
  - **Refuted: "the step is too big."** `piece_at` was one line and was assigned three times.
    Difficulty was already ruled out as the lever once (2026-08-09, *boring not too hard*).
  - **Refuted: "shrinking is the lever."** It closed phase 0, then failed every time since — and
    three runs shrank the *rustlings* half as collateral, dropping it to 1/day against a 2/day
    setpoint.
  - **Refuted: "the chess half needs the rustlings half's reach."** The runnable `cargo test`
    block shipped 08-20 and changed nothing on 08-21/22/23.
  - **Refuted: "it is weekday crowding."** Sunday's `ds::Queue` had a whole uncontested ~8-minute
    slot and sat seven days. **No `cargo`-crate step has landed on any day of the week since 08-13.**
  - **What is left is the owner's call**, asked in the answer box (Spec's *Asking the owner*). The
    run stops writing bodies: three run-written bodies plus Sunday's `push`/`len` mean phase 1 is
    the loop's work, not the owner's.
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
- **The four non-chess structures are unblocked and Sunday is where they ship.** `Queue` needed
  only a struct and a `Vec`, both taught long ago — it sat undone because no run checked whether
  it was due. `LinkedList` and `BST` still wait on `Box`/`Option`; `Graph` is unblocked after
  `Queue`. Check this list every Sunday before falling back to a review project.
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
- **Watch this — convergence. The 08-27 check is resolved early, on 08-23, because its conditions
  are already answered.** The flag asked: has the owner opened the crate once, and is `chess_phase`
  still 1? **No and yes** — untouched since 08-12, phase 1 open since 08-14 (nine days; phase 0
  took four). One phase in three weeks against eight phases plus four Sunday structures: **the
  goal is not reachable at this rate, and daily chess is falsified on evidence.** The lever is no
  longer a redesign — it is the owner's answer to the Q1 question, and the fallback shape is
  written into the Spec. **New check, 2026-08-31:** has the question been answered or resolved by
  presence-with-silence, and has `crate_touched` been 1 even once? If the answer box has been
  answered on other days while Q1 stays blank, that *is* the answer — apply the fallback and stop
  re-asking. `structs_done` stays 0 until a Sunday closes `Queue` or phase 2 pulls in `ds::Vec`.
  **Update 08-27: the check now has a live channel.** Q1 went out on a day with presence, and the
  owner demonstrably answers the box (08-26 came back filled). So 08-28's data resolves it either
  way — an answer, or presence-with-silence. Sunday **2026-08-30** is the first Sunday after that
  and is where the resolution first bites: under fallback (b) it carries the chess step *and*
  `Queue`, which the Spec says to split across consecutive Sundays rather than cram.
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
- **Review queue** — the *exception* list only: answered wrong, waiting for next Sunday. Max 3,
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

- **2026-07-30 – 08-06 (runs 1–7, two evolution passes)** — loop created and bootstrapped
  (`rustlings init`, 94 exercises; `cargo new --lib rust-dsa`); the owner immediately reshaped
  it so DSA became a **daily Track B** with a theory-first B1 stage. Track A found its size the
  hard way (1 → 3 → the exact step) once `next_exercises` proved the *assignment* had been
  wrong, not the owner. **Delivery solved locally** with `lesson-web.py` after notifications
  were abandoned with evidence. Two evolution passes built most of the current machinery:
  `history` / `streak_before_prev` / `gap_days` (deterministic streak, failed-run gaps
  distinguishable from owner skips), **Sunday review day + derived ~1w/~4w/~12w spaced
  repetition** via `due_review`, `reviewed_exercises` (owner's code + official solution +
  pedantic clippy), `next_exercises`, and the **per-section length cap** after words/lesson grew
  343 → 2,749 in seven days. B1 ran Big-O → dynamic arrays → linked lists → stacks → queues →
  hashing. 08-02's run failed, so that day has no lesson.
- **2026-08-07 – 08-09 (runs 8–10)** — the length cap started biting. Lesson 8 graded the first
  **`partial`**: Track A clean, Track B **blank** — read as *load, not concept*, so trees & BST
  were re-taught at half the ask and came back answered. First real Sunday review day on 08-09.
  Runs 8 and 10 both stalled (95 min, 2h15) and lost their metrics to server reclaims.
- **2026-08-09 (owner reshape, not a lesson run)** — **the goal changed: a chess engine replaced
  the abstract 8-structure library.** The complaint was *boring, not too hard*, so difficulty
  was left alone and **connection** became the lever. Track A became two halves (2 rustlings
  exercises, down from 4, plus that concept spent in `rust-dsa`, graded by a failing `#[test]`
  the run writes itself); the `generics2`/`box1` B2 gates were deleted in favour of structures
  pulled in by the chess phase that needs them. The four with no honest chess use moved to
  Sundays. Loop `goal` rewritten; cron, schema and workflow all unchanged.
- **2026-08-10 – 08-11 (runs 11–12, one evolution pass)** — the chess track's first two days,
  both revealing the same thing: the owner overshoots rustlings and drops the chess half
  (four exercises for an assigned two on 08-10, `square_round_trip` untouched on 08-11), so
  lesson 11 graded `partial` and phase 0 did not advance. Track B's Sunday test came back four
  of five wrong, establishing **Big-O as the weak spot rather than any one structure**, and
  ring-buffer wraparound hit its fourth miss and was re-explained rather than re-queued. The
  evolution pass fixed `cargo.ok` (it keyed on cargo's exit code, which the day-old chess
  contract turns false *every* day, so grading read as blind on every run) and lifted `rust_dsa`
  into the prefetch, killing the daily `ls -R && cat lib.rs` opener; it also added `chess_phase`
  as the real progress axis. Run 12 shipped its lesson but **could not report** — the `loopany`
  CLI shim was dead that night — so 08-11 has no `state`.
- **2026-08-12 – 08-14 (runs 13–15)** — the streak's best stretch, 11 → 13, and the two levers
  that produced it. **Phase 0 closed 08-13**: the owner's two non-compiling `from_name` attempts
  were left unrepaired and the *rustlings* pair was aimed at the Rust that unblocked them
  (`as_bytes()`), which shipped a working `from_name` with validation the hint never asked for —
  the unrepaired-code lever, vindicated. **Phase 1 opened 08-14** on modules, spent on a
  `src/chess/piece.rs` the run left deliberately *undeclared* so the missing `pub mod piece;`
  was itself the exercise. That trap worked exactly as designed — silence, no error — and cost
  phase 1 a day for one `match`; it was dismantled on 08-15 and the rule against silent-failure
  devices is now standing. Track B ran sorting → recursion (closing B1 part 1), then **opened
  B1 part 2** with bitboards on 08-14. Lessons ran 930 / 905 / 958 words, no trim passes.
- **2026-08-15 – 08-17 (runs 16–18)** — the **13-day streak broke to zero and stayed there**, three
  `skipped` days running. 08-15's miss dismantled the undeclared-module trap (the run wrote the
  `pub mod` + `pub use` into `src/chess.rs` itself); 08-16 and 08-17 were genuine zero days —
  rustlings flat, `reviewed_exercises` empty two Mondays running, every `### My answer` blank. Each
  run read that as difficulty and shrank, bottoming out at **587 words** on 08-17 with all three
  sections cut at once — the smallest lesson the loop has issued, and the point the shrink ladder
  ran out of road. 08-16's Sunday **shipped the first `ds::` structure**: `Queue` had been
  buildable for eleven days and nothing had checked. It is deliberately **not** a ring buffer —
  `pop` is `O(n)` via `remove(0)`, documented as such, because wraparound is the owner's
  most-missed idea (four times) and `Option::take` isn't taught yet.
- **2026-08-18 – 08-19 (runs 19–20)** — the stall broke to two `partial` days, **streak 0 → 1 → 2**,
  both Track A ✗ / Track B ✓. 08-18: with `consecutive_skips` at 3, the new *Absence, not
  difficulty* rule held the step steady instead of shrinking a fourth time, and its "fresh start"
  clause forced the run to write `PieceKind::from_char`'s `match` itself — closing piece parsing and
  opening `src/chess/board.rs` (`piece_at` the single `todo!()`, test `board_set_and_read`). The
  answer box came back as a *request* ("teach me shift bit/byte first"), so bitboards was taught
  from scratch rather than parked. 08-19: the Track A miss was a near-miss worth the lesson —
  `fruit_basket` was **correct** and `hashmaps2` red only because `main` passed the map by value to
  a `&mut` parameter; that code was invisible in `reviewed_exercises` and only visible in
  `next_exercises[0].code`, now a standing note. Bitboards closed (dsa 11 → 12) and minimax opened.
  08-18 **could not report** (the npx shim died as on 08-11), so it has no `state`; its metrics
  would have been `day 18 · phase 1 · rustlings 44 · dsa 11 · structs 0 · streak 1 · 705 words`.
- **2026-08-19, second wake (owner-triggered)** — the owner reactivated the loop believing the day
  had no lesson (the run showed `pending` with no metrics, so from outside it looked failed); the
  second run had no prefetch payload and **overwrote that day's lesson file**, recovered from the
  Timeline. Two standing lessons, now in *Gotchas*: **read the Timeline before writing any lesson
  file**, and **a `pending` run with no metrics is not a failed run** — check `lessons/<today>.md`.
- **2026-08-20 – 08-22 (runs 21–23)** — streak 0 → 1 → 2, all three **Track A ✗ / Track B ✓**: the
  rustlings half and the answer box both landed while **the crate missed every single day**.
  `hashmaps2`/`hashmaps3` green, Track B ran minimax → **alpha-beta**, right on all counts. Two
  findings became standing notes: the `hashmaps2` near-miss (a correct body, red only because
  `main` passed the map by value to a `&mut` parameter), and **`quiz2` written and correct yet not
  in `done`** because rustlings only ticks what its watcher has run — now the `owner_modified`
  field. The *untouched* rule meanwhile ran to its end twice: the run wrote `piece_at` and
  `to_char` itself, advancing phase 1 on its own code, and asked the crate question in the 08-21
  **opening note** — unanswered, and wrongly closed. 743 / 799 / 844 words.
- **2026-08-23** — run 24, **Sunday review week 4**. Lesson 22 `skipped`, streak 2 → **0**; a
  genuine zero day, fifth with `owner_touched` false. **Track A went to `ds::Queue`, unbuilt since
  08-16** — the run wrote `push`/`len` (one line each, teach nothing) and left **`pop`** as the
  single body, where the idea is (`Option` answers *is there anything* and *what* at once;
  `Vec::remove(0)` panics on empty, so the guard comes first). Tests `queue_is_fifo` +
  `queue_empty_pops_none`. **Track B ran 4 questions, not 5** — the ~4-week rung is unfillable at
  24 days old and padding is against the rule. 727 words.
- **2026-08-24 – 08-25 (runs 25–26, lessons 23–24)** — the last day with presence, then the first
  of the run of empty rooms. **08-24**: `quiz2` + `options1` went green (46 → 48) — the owner
  showed up and **again chose rustlings over the crate, a seventh independent observation**. Rules
  fired as written: rustlings half landed → back to the **full setpoint of two**; the chess half
  was **omitted entirely for the first time** (phase 1's run-written-body cap spent, *untouched*
  rule gives those ~4 min back), and the run made **no crate edit at all**, deliberately, so the
  next `owner_touched` is a pure owner signal. **Q1 became the A/B crate decision asked in the
  answer box** per *Asking the owner* — first time; the 08-21 opening-note attempt is superseded.
  **08-25**: zero presence anywhere, so the blank Q1 was an **empty room, not a decision** — the
  question stays open and was not re-asked. `consecutive_skips` → 3, *Absence, not difficulty*
  fired for the second time in the loop's life. Memoization vs tabulation **parked** at its third
  serve → *Review queue*; Track B rotated to iterative deepening. 895 / 688 words, no trim passes.
- **2026-08-26** — run 27, **lesson 25**. Lesson 24 `skipped`, `consecutive_skips` → **4**, third
  straight day under *Absence, not difficulty*. Step held at two; rustlings' order is pinned so the
  **same pair went out a third time**, but the *concept* was cut to a two-line reminder and the
  day's depth moved wholesale to Track B. Chess half and crate edit omitted for the third day
  (phase 1 blocked, cap spent). Q1 **not** re-asked — third empty room. Track B rotated forward a
  second time, to **move ordering** — the rotation the 08-26 evolution pass then ruled out for
  absent days (see *Rotate forward on the RETURN day*). 786 words, no trim pass. The `loopany` shim
  died mid-run and was repaired; the incident lives in *Gotchas · npx-cache death*, not here.
- **2026-08-13 — evolution pass.** B1's part-1 list closed with chess still at phase 1, so no
  structure was due and Track B had nothing to teach; gave B1 a **part 2** of eight engine-theory
  concepts, each pulled by the phase that needs it (see *Curriculum*). Declared `words` so the
  length cap charts. Workflow unchanged. Distilled runs 1–12 to a dated spine.
- **2026-08-17 — evolution pass.** A 13-day streak ended 08-14 into three zero days that three runs
  read as difficulty, shrinking to a 587-word floor. **Task**: added *Absence, not difficulty* and
  the **park rule**. **Workflow**: added `consecutive_skips`.
- **2026-08-20 — evolution pass.** Measured the cause: every `.rs` in `rust-dsa` carried the *run's
  own* mtime, so a one-line `piece_at` had been assigned three times to a file nobody had opened.
  **Task**: *shrink the half that missed, never the half that landed*; *the chess half is untouched,
  not too big*; and a runnable `cargo test <name>` block in `### Chess step` (the reach hypothesis,
  falsified three days later). **Workflow**: `rust_dsa.owner_touched` + `touched_paths`.
  **Dashboard**: split the Progress chart off `rustlings_done`.
- **2026-08-23 — evolution pass. The 08-27 check resolved four days early: daily chess is falsified,
  and the cause is selection, not absence or difficulty** (evidence now consolidated in *Current
  understanding*'s refuted-hypotheses list). **Task**: capped run-written bodies at one per phase
  and stopped them advancing `chess_phase`; added *Asking the owner* (decisions go in Track B's Q1
  box, and the 08-21 question is **re-opened**); wrote the Sundays-only fallback shape; keyed
  keystroke-vs-miss on `owner_modified`; pinned `dsa_topics`/`structs_done` as cumulative after
  `dsa_topics` reported 12 → 13 → 14 → **12**. **Workflow**: added
  `next_exercises[i].owner_modified`. **Dashboard**: declared `crate_touched` and charted it.
- **2026-08-26 — evolution pass.** Still stalled (phase 1 since 08-14, `crate_touched` 0 since
  08-12, streak 0, four straight empty rooms), but the stall's cause is already diagnosed and the
  lever is the owner's answer — so this pass fixed the two things the *runs* were doing wrong while
  they wait. **Task**: (1) *Rotate forward on the RETURN day, not on every absent day* — the
  *Absence* rule's rotate-don't-re-serve clause was firing daily and had spent **2 of B1 part 2's 8
  concepts (iterative deepening, move ordering) on lessons nobody opened**, with only Zobrist and
  transposition tables left; Track B now holds its concept while `presence.any` is false, and the
  three-serve park rule counts only serves that were *read*. (2) Pointed the *take the answer as
  given* rule at the new `presence.any` field instead of restating its test in prose.
  **Workflow**: added `presence` (`{any, signals}`), the OR over `reviewed_exercises` / any
  `owner_modified` / `owner_touched` that runs 25–27 each re-derived by hand and that three rules
  key on. Smoke-tested wrapped as an async fn against the real tree, clock shifted to 08-27 (730 ms,
  `presence.any` false, cross-checked against all three underlying fields) plus a five-case check of
  the OR's true branches. **Dashboard**: rewrote the Rustlings paragraph, which credited every dip
  to a wrongful shrink and so misread its own flat line; it now distinguishes 1/day (shrink) from
  flat (absence). **Distilled 970 → 891 lines (~29.5k → ~19.4k tokens)** — the file had outgrown the
  Read cap, and every run was paging it in 2–6 times (the 08-26 run: five Reads plus a grep, the
  $2.70 outlier). Merged runs 25–26, compressed runs 21–24 and the three prior evolution passes to
  milestone lines, folded the resolved npx incident into its gotcha, and cut duplicated narration
  from *Current understanding*. Kept every baseline, gotcha, queue item, open question, and the
  08-31 check.
- **2026-08-26 — evolution pass (owner-directed): inversion.** Exercises and hints were
  forward-only, and both known failure modes have the same fix. (1) **`### Stuck?` is now an
  elimination, not a nudge** — it names a wrong turn and never points at the right one. The 60-word
  cap alone did not hold (run 7 shipped **813 words** under it); a hint that closes one door is
  structurally one sentence, so the *shape* enforces the length the cap couldn't. (2) **Every
  Concept closes with a ≤20-word failure mode**, inside the existing budget. (3) **B1 has two
  question forms** — forward on a first serve, **inverted** on a repeat serve, on Sunday, and on
  every wrong-answer-queue item; part 2's table gained an inverted variant per concept. This fills
  the hole the *Rotate forward on the RETURN day* rule left: on a held concept the run must re-ask
  without re-teaching, and inversion is the only form that does. (4) **The inverted chess half
  ("ship it broken")** — the run writes a wrong body, the owner writes the catching test. Fenced to
  `tests/invert_<date>.rs`, a closed phase, once per phase; it never advances `chess_phase` and does
  **not** spend the one-run-written-body-per-phase budget. Nothing downstream moved: no new
  headings, `### My answer` and the worked-answer heading untouched, no word-budget change, no
  workflow change (grading reuses `cargo.passing` + `rust_dsa.files`), so no push — the brief syncs
  on the next run.
- **2026-08-27 (run 28, lesson 26)** — **the owner came back.** Graded 25 `partial`: Track B ✓
  (Q1's `2·b^(d/2)−1` right, Q2's ranking wrong → Review queue, corrected in today's note) and
  Track A ✗ only because `options3` holds a **correct** `Some(ref p)` the watcher never ran —
  presence, not a miss, so no re-teach and the pair advanced to `options3` + `errors1` at the full
  two-exercise setpoint. `consecutive_skips` 4 → 0, streak 1, `rustlings.done` 49/94. Three return-day
  rules fired at once: Track B **rotated forward** off the held concept (move ordering passed,
  `dsa_topics` 15) to **Zobrist hashing**, the lesson opened on the next concept rather than
  retrying the abandoned one, and **the open crate question was re-asked as Q1** — its first day
  with a live channel after three empty rooms. No chess half and no crate edit for the fourth day:
  phase 1 is blocked on the owner (`owner_touched` false a ninth day, body budget spent), and
  serving a chess step while asking whether chess belongs in weekdays would pre-empt the answer.
  `### Yesterday's code` omitted — `options2` matched the official solution with clippy clean, and
  the Spec makes silence the correct output for a clean day. 919 words, no trim pass.
