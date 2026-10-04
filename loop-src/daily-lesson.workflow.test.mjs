import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'daily-lesson.workflow.js');
const FIXTURE = path.join(here, 'fixture');

const day = (s) => new Date(s + 'T00:00:00Z');

// Git does not preserve mtimes: a fresh clone, or enough checkouts, can leave every fixture
// file stamped with the same checkout time. The selection tests only prove anything if the
// lesson-vs-exercise and exercise-vs-exercise mtime relationships are real, so the harness
// owns those timestamps explicitly here rather than trusting whatever the filesystem has —
// spread by whole days (or, for the birthtime probe below, whole minutes off an observed
// birthtime) so the intended ordering is unambiguous on any machine.
//
// `overrides` lets an individual test punch in extra rel-path -> Date stamps *after* the
// baseline below, to build a scenario-specific pool without duplicating this whole function.
async function stampFixtureMtimes(overrides = {}) {
  const stamp = async (rel, date) => {
    await fs.utimes(path.join(FIXTURE, rel), date, date);
  };

  await stamp('loopany/daily-lesson/lessons/2026-08-01.md', day('2026-08-01'));

  // Finding 1: the "since" cutoff is this file's BIRTHTIME, not its mtime. Lesson files get
  // rewritten after they are issued — twice over: the next run's grading pass flips the
  // `type:` front-matter, and the owner's lesson page writes their typed answers back into
  // the same file at any hour — so mtime means "last touched", not "when issued". Birthtime
  // cannot be set directly (only by actually creating the file), so recreate it here to get a
  // fresh, known birthtime, then push mtime forward to simulate a post-issue write-back.
  const cutoffLesson = path.join(FIXTURE, 'loopany/daily-lesson/lessons/2026-08-02.md');
  await fs.rm(cutoffLesson, { force: true });
  await fs.writeFile(cutoffLesson, '---\ntype: done\n---\nSome content\n');
  const birth = (await fs.stat(cutoffLesson)).birthtimeMs;
  const writeBackMs = birth + 60 * 60 * 1000; // +1h: simulated post-issue answer write-back
  await fs.utimes(cutoffLesson, new Date(writeBackMs), new Date(writeBackMs));

  // stale1: done, but must read as OLDER than the cutoff lesson's birthtime — excluded either way.
  await stamp('rustlings/exercises/01_demo/stale1.rs', day('2026-07-01'));
  await stamp('rustlings/solutions/01_demo/stale1.rs', day('2026-07-01'));

  // denied1: done, and — like a real owner's exercise — old, deliberately kept OUT of the
  // newest-5 selection window on mtime alone (same shape as stale1) so this Finding-4 fixture
  // addition cannot perturb any Task 3 selection assertion. It exists to prove clippy's
  // correctness group (deny-by-default, reported at level "error") is captured rather than
  // dropped, which selection timing has no bearing on: it is only ever probed directly via
  // clippyFor('denied1'), never through `selected`.
  await stamp('rustlings/exercises/01_demo/denied1.rs', day('2026-07-02'));
  await stamp('rustlings/solutions/01_demo/denied1.rs', day('2026-07-02'));

  // Finding 1 probe: modified strictly between the lesson's birthtime and its (later,
  // simulated write-back) mtime. A correct birthtime cutoff selects it; a regression back to
  // a plain-mtime cutoff excludes it. This is the only fixture evidence for that behavior.
  const probeMs = birth + 30 * 60 * 1000; // +30min: after birth, before the write-back
  await stamp('rustlings/exercises/01_demo/answered_between1.rs', new Date(probeMs));
  await stamp('rustlings/solutions/01_demo/answered_between1.rs', new Date(probeMs));

  // Finding 2 probe: the NEWEST mtime of the entire fixture, done or not — but NOT in the
  // done-list. Must never appear in `selected` no matter how recent it looks.
  await stamp('rustlings/exercises/01_demo/undone1.rs', day('2026-08-13'));
  await stamp('rustlings/solutions/01_demo/undone1.rs', day('2026-08-13'));

  // clean1 and lint1: both after the cutoff lesson's write-back mtime, a whole day apart from
  // each other so "newest-mtime first" (lint1 before clean1) does not depend on sub-second
  // timestamps.
  await stamp('rustlings/exercises/01_demo/clean1.rs', day('2026-08-10'));
  await stamp('rustlings/solutions/01_demo/clean1.rs', day('2026-08-10'));
  await stamp('rustlings/exercises/01_demo/lint1.rs', day('2026-08-11'));
  await stamp('rustlings/solutions/01_demo/lint1.rs', day('2026-08-11'));

  // Finding 3 probes: 5 more done, qualifying exercises (cap1..cap5), each strictly after the
  // write-back mtime (so they qualify under either cutoff interpretation — this pool must not
  // depend on Finding 1's fix) and a whole day apart from each other and from clean1/lint1.
  // Together with clean1 and lint1 that is 7 qualifying candidates, comfortably over the cap
  // of 5, so both the cap itself and the ordering across more than 2 candidates are exercised.
  await stamp('rustlings/exercises/01_demo/cap1.rs', day('2026-08-05'));
  await stamp('rustlings/solutions/01_demo/cap1.rs', day('2026-08-05'));
  await stamp('rustlings/exercises/01_demo/cap2.rs', day('2026-08-06'));
  await stamp('rustlings/solutions/01_demo/cap2.rs', day('2026-08-06'));
  await stamp('rustlings/exercises/01_demo/cap3.rs', day('2026-08-07'));
  await stamp('rustlings/solutions/01_demo/cap3.rs', day('2026-08-07'));
  await stamp('rustlings/exercises/01_demo/cap4.rs', day('2026-08-08'));
  await stamp('rustlings/solutions/01_demo/cap4.rs', day('2026-08-08'));
  await stamp('rustlings/exercises/01_demo/cap5.rs', day('2026-08-09'));
  await stamp('rustlings/solutions/01_demo/cap5.rs', day('2026-08-09'));

  for (const [rel, date] of Object.entries(overrides)) {
    await stamp(rel, date);
  }
}

// Used by the Finding-1 test to isolate the birthtime-vs-mtime probe: with cap1..cap5 pushed
// well before the cutoff, the only qualifying candidates are clean1, lint1 and
// answered_between1 — none of which can crowd answered_between1 out of the cap of 5, so the
// assertion tests the cutoff rule, not cap arithmetic.
const SUPPRESS_CAP_FILLERS = Object.fromEntries(
  ['cap1', 'cap2', 'cap3', 'cap4', 'cap5'].flatMap((n, i) => {
    const d = day(`2026-06-${11 + i}`);
    return [
      [`rustlings/exercises/01_demo/${n}.rs`, d],
      [`rustlings/solutions/01_demo/${n}.rs`, d],
    ];
  }),
);

async function runWorkflow(opts = {}) {
  const baseVal = opts.base || FIXTURE;
  if (baseVal === FIXTURE) {
    // Re-stamp before every fixture run so no test can accidentally run against whatever
    // mtimes the filesystem happens to have. Never touches the real tree (opts.base skips this).
    await stampFixtureMtimes(opts.mtimeOverrides || {});
  }
  let body = await fs.readFile(SRC, 'utf8');

  const searchStr = "const base = '/Users/tamnm/code/personal';";
  if (!body.includes(searchStr)) {
    throw new Error("Could not find the exact 'const base = ...' string in the workflow file");
  }
  body = body.replace(searchStr, `const base = '${baseVal}';`);

  // Lets a test force the shared host-timeout budget (WORKFLOW_START / HOST_TIMEOUT_MS /
  // remainingMs) to an exact value — e.g. 0, to prove both the cargo-test skip guard and the
  // reviewed_exercises assembly loop degrade to nothing rather than throwing once the budget is
  // already spent — without needing a real slow external command, which would be both slow and
  // flaky. Source-text surgery, same technique as the `base` override above. Supersedes the old
  // per-loop ASSEMBLY_DEADLINE_MS override now that both budgets are computed off one constant.
  if (opts.hostTimeoutOverrideMs !== undefined) {
    const hostTimeoutStr = /const HOST_TIMEOUT_MS = \d+;/;
    if (!hostTimeoutStr.test(body)) {
      throw new Error('Could not find the exact HOST_TIMEOUT_MS constant declaration in the workflow file');
    }
    body = body.replace(hostTimeoutStr, `const HOST_TIMEOUT_MS = ${opts.hostTimeoutOverrideMs};`);
  }

  const wrapped = `export default async function(){\n${body}\n}`;
  const tmp = path.join(here, `.wf.harness.${Date.now()}.${Math.random().toString(36).slice(2)}.mjs`);
  await fs.writeFile(tmp, wrapped);
  let captured = null;
  globalThis.agent = async (_prompt, payload) => { captured = payload; };
  try {
    const mod = await import(tmp + '?t=' + process.hrtime.bigint());
    await mod.default();
  } finally {
    await fs.rm(tmp, { force: true });
  }
  return captured;
}

test('workflow hands the run a payload with the fields the brief depends on', async () => {
  const p = await runWorkflow();
  assert.ok(p, 'agent() was never called — the workflow short-circuited');
  for (const k of ['today', 'is_review_day', 'week_number', 'due_review', 'history', 'rustlings', 'cargo']) {
    assert.ok(k in p, `payload missing ${k}`);
  }
  assert.ok(Array.isArray(p.rustlings.done), 'rustlings.done must be an array');
});

test('reviewed_exercises is present and well-shaped', async () => {
  const p = await runWorkflow();
  assert.ok(Array.isArray(p.reviewed_exercises), 'reviewed_exercises must be an array');
  // The fixture yields 2 qualifying candidates (clean1, lint1) at minimum — a test that
  // tolerates length === 0 would pass even if the assembly loop silently produced nothing.
  assert.ok(p.reviewed_exercises.length > 0, 'reviewed_exercises must not be empty for this fixture');
  assert.ok(p.reviewed_exercises.length <= 5, 'cap of 5 exceeded');
  for (const e of p.reviewed_exercises) {
    assert.equal(typeof e.name, 'string');
    assert.equal(typeof e.code, 'string');
    assert.equal(typeof e.solution, 'string');
    assert.equal(typeof e.clippy.ok, 'boolean');
    assert.ok(Array.isArray(e.clippy.warnings));
  }
});

test('each reviewed exercise carries the owner code AND the official solution', async () => {
  const p = await runWorkflow();
  // Populated, not vacuous: with clean1 + lint1 (at minimum) qualifying, an empty array here
  // would mean the assembly loop silently produced nothing.
  assert.ok(p.reviewed_exercises.length > 0, 'reviewed_exercises must not be empty for this fixture');
  for (const e of p.reviewed_exercises) {
    assert.match(e.path, /^exercises\//, 'path must be the exercise, not the solution');
    assert.ok(e.code.length > 0, `${e.name}: empty code`);
    assert.ok(e.solution.length > 0, `${e.name}: solution not found — check the path swap`);
    assert.notEqual(e.code, e.solution, `${e.name}: code and solution are the same string`);
  }
});

test('debug_bin_map is removed before deploy', async () => {
  const src = await fs.readFile(SRC, 'utf8');
  assert.ok(!src.includes('debug_bin_map'),
    'debug_bin_map is a scaffold from Task 2 — remove it before pushing');
});

// Finding: parseClippyJson tags every entry with its clippy-reported level, and denied1's
// clippy::eq_op is deny-by-default (level "error") — but denied1 is normally excluded from
// `selected` on mtime alone (kept old on purpose, see stampFixtureMtimes). Overriding its
// mtime forward is the only way to observe it flow all the way through the assembly loop
// into reviewed_exercises, proving `level` is threaded end-to-end and not flattened back to
// a plain warning anywhere between clippyFor and the payload.
test('reviewed_exercises carries the clippy level through end-to-end for an error-level finding (denied1)', async () => {
  const p = await runWorkflow({
    mtimeOverrides: { 'rustlings/exercises/01_demo/denied1.rs': day('2026-08-12') },
  });
  assert.ok(p.selected.includes('denied1'),
    'fixture setup error: denied1 must be selected for this test to prove anything');
  const denied = p.reviewed_exercises.find((e) => e.name === 'denied1');
  assert.ok(denied, 'denied1 missing from reviewed_exercises');
  const err = denied.clippy.warnings.find((w) => w.level === 'error');
  assert.ok(err, `expected an error-level warning in reviewed_exercises for denied1, got ${JSON.stringify(denied.clippy.warnings)}`);
  assert.equal(err.code, 'clippy::eq_op');
});

// Finding: the assembly loop's try/catch ("one unreadable exercise must not cost the other
// four") had zero coverage — a regression that dropped the catch/continue and let one bad
// read abort the whole loop (or the whole run) would still pass all other tests. cap4 is made
// unreadable AT READ TIME via chmod 0o000, not by deleting/renaming it: stat (and therefore
// selection, and stampFixtureMtimes' own utimes call) still succeeds against a mode-000 file
// for its owner, so cap4 stays in `selected` exactly as it would in production — only the
// content read inside the assembly loop's try fails, with EACCES, which is the specific path
// this test exists to exercise. Mode is restored in `finally` (captured before mutating, not
// hardcoded) so a failed assertion here can never leave the fixture — or a later test run —
// looking at a permanently-locked file.
test('one unreadable exercise does not cost the other four in reviewed_exercises, and the run does not throw', async () => {
  const targetPath = path.join(FIXTURE, 'rustlings/exercises/01_demo/cap4.rs');
  const originalMode = (await fs.stat(targetPath)).mode;
  await fs.chmod(targetPath, 0o000);
  try {
    const p = await runWorkflow();
    assert.ok(p, 'workflow must not throw / must still call agent() when one selected exercise cannot be read');
    assert.ok(p.selected.includes('cap4'),
      'fixture setup error: cap4 must still be selected — only its readability, not its mtime, is broken');
    const names = p.reviewed_exercises.map((e) => e.name);
    assert.ok(!names.includes('cap4'),
      'the unreadable exercise must be skipped entirely, never surfaced with broken/partial data');
    for (const n of ['lint1', 'clean1', 'cap5', 'cap3']) {
      assert.ok(names.includes(n),
        `${n} must still populate reviewed_exercises even though cap4's read failed`);
    }
  } finally {
    await fs.chmod(targetPath, originalMode);
  }
});

// Finding 4: the loopany host kills the WHOLE workflow (not just this block) at a 30s
// default (LOOPANY_WORKFLOW_TIMEOUT_SECONDS, see @crewlet/loopany/dist/workflow.js) and the
// LaunchAgent plist sets only PATH, so the default stands. The old per-command timeouts
// (clippy 120000ms x up to 5 sequential calls, cargo test 240000ms) could never fire before
// the host's own cap does — so a single stuck `cargo clippy` (e.g. blocked on rustlings'
// build-directory lock) used to cost the ENTIRE prefetch (prev_lesson, history, due_review,
// streak, cargo — all of it), not just the feedback block. cargo test and the assembly loop now
// share ONE host-timeout budget (WORKFLOW_START / HOST_TIMEOUT_MS / remainingMs), so forcing
// that shared budget to 0 must degrade BOTH: cargo test is skipped (see the dedicated
// timeout-vs-skip proof test further below for direct evidence it is never invoked with an
// unbounded timeout) and the assembly loop yields an empty reviewed_exercises — while every
// other prefetched field, gathered before either budget-gated call runs, survives untouched.
test('reviewed_exercises assembly loop and cargo test both degrade to empty, never throw, once the shared host-timeout budget is already spent (finding 4)', async () => {
  const p = await runWorkflow({ hostTimeoutOverrideMs: 0 });
  assert.ok(p, 'workflow must still call agent() when the host-timeout budget is already spent');
  assert.ok(p.selected.length > 0, 'fixture setup: selection itself must be unaffected by the host-timeout budget');
  assert.deepEqual(p.reviewed_exercises, [],
    'with zero budget, no exercise should be attempted, and the loop must not throw');
  assert.equal(p.cargo.ok, false, 'cargo test must be skipped (ok:false), never run with an unbounded timeout');
  assert.equal(p.cargo.summary, '', 'cargo.summary must be empty when the call is skipped');
  // The rest of the prefetch must survive completely — losing it all over a stuck external call
  // is exactly the failure this fix closes.
  assert.ok(p.prev_lesson, 'prev_lesson must still be present even when both budget-gated calls are skipped');
  assert.ok(Array.isArray(p.history) && p.history.length > 0, 'history must still be present');
  assert.ok(Array.isArray(p.due_review), 'due_review must still be present');
  assert.equal(typeof p.streak_before_prev, 'number', 'streak_before_prev must still be present');
  assert.ok(p.cargo, 'cargo must still be present as an object, even though its call was skipped');
});

// With a generous (production-sized) budget, both cargo test and the assembly loop must behave
// exactly as before — this guards against an off-by-one or inverted comparison in either budget
// check silently capping the fixture's qualifying candidates, or skipping cargo test, when there
// was no need to.
test('a generous host-timeout budget still runs cargo test and gathers every qualifying exercise (finding 4 regression guard)', async () => {
  const p = await runWorkflow({ hostTimeoutOverrideMs: 60000 });
  assert.equal(p.cargo.ok, true, 'a 60s budget must be more than enough for cargo test to actually run');
  assert.equal(p.reviewed_exercises.length, p.selected.length,
    'a 60s budget must be more than enough for the fixture — every selected exercise should be gathered');
});

test('clippy per-command timeout fits inside the loopany host\'s 30s workflow cap (finding 4)', async () => {
  const src = await fs.readFile(SRC, 'utf8');
  const m = /CLIPPY_TIMEOUT_MS\s*=\s*(\d+)/.exec(src);
  assert.ok(m, 'expected a named CLIPPY_TIMEOUT_MS constant so the value cannot silently drift back up');
  const clippyTimeoutMs = Number(m[1]);
  assert.ok(clippyTimeoutMs <= 10000,
    `clippy per-command timeout (${clippyTimeoutMs}ms) must fit well inside the loopany host's 30s workflow cap`);
  assert.ok(clippyTimeoutMs >= 1000,
    `clippy per-command timeout (${clippyTimeoutMs}ms) must stay well above real clippy's observed ~0.35s runtime`);
});

// Finding (Important, coordinator review): the assembly loop's admission guard uses the FULL
// remainingMs() budget, but a flat CLIPPY_TIMEOUT_MS granted to the LAST admitted exercise could
// still push the whole run past the host's 30s cap (worst case ~24999ms admission + 8000ms flat
// grant = ~32999ms). clippy's per-call timeout must therefore be Math.min(CLIPPY_TIMEOUT_MS,
// remainingMs()) computed FRESH at call time — not CLIPPY_TIMEOUT_MS alone — so the grant itself
// shrinks as the shared budget shrinks.
test("clippy's per-call timeout is Math.min(CLIPPY_TIMEOUT_MS, remainingMs()) computed at call time, not a stray literal (coordinator finding)", async () => {
  const src = await fs.readFile(SRC, 'utf8');
  assert.match(src, /run\(\s*\n?\s*'cargo',\s*\n?\s*\[[^\]]*'clippy'[\s\S]{0,300}?timeout:\s*clippyBudgetMs/,
    'the cargo clippy run() call must use a computed clippyBudgetMs, never CLIPPY_TIMEOUT_MS directly or a stray literal');
  assert.match(src, /clippyBudgetMs\s*=\s*Math\.min\(\s*CLIPPY_TIMEOUT_MS\s*,\s*remainingMs\(\s*\)\s*\)/,
    "clippy's budget must be Math.min(CLIPPY_TIMEOUT_MS, remainingMs()), recomputed for every call, not a flat cap");
});

// Proves the zero/negative-budget path SKIPS the clippy call rather than granting it a flat
// CLIPPY_TIMEOUT_MS — by driving the shared budget to 0 and calling the REAL clippyFor directly,
// not by inspecting source. A skipped call must read as ok:false (UNKNOWN), never ok:true — a
// skipped-but-reported-clean call would tell the owner their code is clean when it was never
// actually checked, which an earlier round of fixes exists to prevent.
test('clippy is SKIPPED (ok:false) rather than granted a flat CLIPPY_TIMEOUT_MS once the shared host-timeout budget is spent (coordinator finding)', async () => {
  const result = await callClippyFor('lint1', FIXTURE, { hostTimeoutOverrideMs: 0 });
  assert.deepEqual(result, { ok: false, warnings: [] },
    'a spent host-timeout budget must skip the clippy call entirely and report UNKNOWN (ok:false), ' +
      'never run it with an unbounded/flat timeout and never report ok:true');
});

// Regression guard: with a generous (production-sized) budget, clippy must still behave exactly
// as before — Math.min(CLIPPY_TIMEOUT_MS, remainingMs()) must resolve to the full 8000ms hard cap
// when there is no real time pressure, not an accidentally-shrunk value.
test('a generous host-timeout budget still grants clippy its full CLIPPY_TIMEOUT_MS hard cap (coordinator finding regression guard)', async () => {
  const result = await callClippyFor('lint1', FIXTURE, { hostTimeoutOverrideMs: 60000 });
  assert.equal(result.ok, true, 'with a generous budget, clippy should actually run and succeed as before');
  const codes = result.warnings.map((w) => w.code);
  assert.ok(codes.includes('clippy::needless_return'),
    'a generous budget must still surface lint1\'s real findings, not a degraded/skipped result');
});

// Finding 4 follow-up: the old fixed 240000ms cargo-test timeout could never fire inside the
// loopany host's 30s workflow cap, so a stuck/slow `cargo test` used to cost the ENTIRE prefetch
// exactly the way a stuck clippy call could before CLIPPY_TIMEOUT_MS bounded it. cargo test's
// timeout must now be Math.min(CARGO_TEST_HARD_CAP_MS, remainingMs(...)) — a computed budget
// derived from the same shared HOST_TIMEOUT_MS as everything else — never a stray literal.
test("cargo test's timeout is a computed budget derived from CARGO_TEST_HARD_CAP_MS and remainingMs(), not a fixed literal (finding 4 follow-up)", async () => {
  const src = await fs.readFile(SRC, 'utf8');
  const m = /CARGO_TEST_HARD_CAP_MS\s*=\s*(\d+)/.exec(src);
  assert.ok(m, 'expected a named CARGO_TEST_HARD_CAP_MS constant so the value cannot silently drift back up');
  const hardCapMs = Number(m[1]);
  assert.ok(hardCapMs <= 10000,
    `cargo test's hard cap (${hardCapMs}ms) must stay well under the loopany host's 30s workflow cap`);
  assert.ok(hardCapMs >= 1000,
    `cargo test's hard cap (${hardCapMs}ms) must stay well above real cargo test's observed ~0.42s warm runtime`);
  assert.match(src, /run\('cargo',\s*\['test'\][\s\S]{0,120}timeout:\s*cargoBudgetMs/,
    'the cargo test run() call must use a computed cargoBudgetMs, never a hardcoded literal like the old 240000');
  assert.match(src, /cargoBudgetMs\s*=\s*Math\.min\(\s*CARGO_TEST_HARD_CAP_MS\s*,\s*remainingMs\(/,
    "cargo test's budget must be Math.min(CARGO_TEST_HARD_CAP_MS, remainingMs(...)), not the old fixed 240000ms");
});

test('cargo payload shape (ok, summary, passing_tests, failing_tests, compile_errors) is unchanged on the happy path', async () => {
  const p = await runWorkflow();
  assert.equal(typeof p.cargo.ok, 'boolean');
  assert.equal(typeof p.cargo.summary, 'string');
  assert.ok(Array.isArray(p.cargo.passing_tests));
  assert.ok(Array.isArray(p.cargo.failing_tests));
  assert.ok(Array.isArray(p.cargo.compile_errors));
  assert.equal(p.cargo.ok, true, "the fixture rust-dsa crate's tests pass — cargo.ok should be true");
  assert.ok(p.cargo.passing_tests.includes('tests::it_works'),
    'expected the fixture rust-dsa test name to appear in passing_tests');
});

// remainingMs is extracted straight out of the real source (same technique as loadClippyModule
// below) so these are unit tests of the actual function the workflow calls, not a reimplementation.
async function loadTimingModule() {
  const body = await fs.readFile(SRC, 'utf8');
  const startMarker = 'const WORKFLOW_START = Date.now();';
  const endMarker = "const base = '/Users/tamnm/code/personal';";
  const start = body.indexOf(startMarker);
  const end = body.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error('Could not locate the WORKFLOW_START/HOST_TIMEOUT_MS/remainingMs block in the workflow source');
  }
  const slice = body.slice(start, end);
  const wrapped = `${slice}\nexport { remainingMs, HOST_TIMEOUT_MS, WORKFLOW_START, BASE_RESERVE_MS };\n`;
  const tmp = path.join(here, `.wf.timing.harness.${Date.now()}.${Math.random().toString(36).slice(2)}.mjs`);
  await fs.writeFile(tmp, wrapped);
  try {
    return await import(tmp + '?t=' + process.hrtime.bigint());
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

test('remainingMs shrinks as wall-clock time passes', async () => {
  const { remainingMs } = await loadTimingModule();
  const a = remainingMs();
  await new Promise((resolve) => setTimeout(resolve, 60));
  const b = remainingMs();
  assert.ok(b < a, `expected remainingMs() to shrink as real time passes, got ${a} then ${b}`);
});

test('remainingMs never goes negative, even when the reserve alone exceeds the whole host budget', async () => {
  const { remainingMs, HOST_TIMEOUT_MS } = await loadTimingModule();
  const result = remainingMs(HOST_TIMEOUT_MS + 1_000_000);
  assert.equal(result, 0, 'remainingMs must clamp to 0, never go negative, once the reserve exceeds the budget');
});

test('remainingMs respects its reserve argument — a bigger reserve leaves less remaining', async () => {
  const { remainingMs, BASE_RESERVE_MS } = await loadTimingModule();
  const small = remainingMs(BASE_RESERVE_MS);
  const big = remainingMs(BASE_RESERVE_MS + 2000);
  assert.ok(big < small, 'a larger reserve must leave less remaining budget than a smaller one');
  assert.ok(Math.abs((small - big) - 2000) <= 50,
    `expected the difference to track the 2000ms reserve delta, got ${small - big}`);
});

// Dedicated fixture crate whose single test sleeps 1500ms — used ONLY by the two tests below.
// It exists so "the call was skipped" can be proven by TIMING (it completes in a tiny fraction
// of 1500ms) rather than by inspecting source code, per the review's ask: prove the zero-budget
// path skips the call instead of passing timeout: 0 (which child_process treats as NO TIMEOUT).
const SLOW_CARGO_BASE = path.join(FIXTURE, 'slow-cargo-scenario');

test('a spent host-timeout budget SKIPS cargo test rather than passing timeout: 0 (finding 4 follow-up)', async () => {
  const startedAt = Date.now();
  const p = await runWorkflow({ base: SLOW_CARGO_BASE, hostTimeoutOverrideMs: 0 });
  const elapsedMs = Date.now() - startedAt;
  assert.ok(p, 'workflow must still call agent() when the host budget is already spent');
  // A real (unbounded) invocation would take at least the fixture's 1500ms sleep. Completing in
  // well under that proves cargo test was never started — not that it happened to run fast.
  assert.ok(elapsedMs < 800,
    `expected the skipped cargo test call to add negligible time, took ${elapsedMs}ms — this close ` +
      "to the fixture's 1500ms sleep would suggest it actually ran with an unbounded timeout");
  assert.equal(p.cargo.ok, false, 'cargo.ok must be false when the call is skipped, never a thrown error');
  assert.equal(p.cargo.summary, '', 'cargo.summary must be empty when the call is skipped');
  assert.deepEqual(p.cargo.passing_tests, []);
  assert.deepEqual(p.cargo.failing_tests, []);
  assert.deepEqual(p.cargo.compile_errors, []);
});

test('control: the slow-cargo fixture genuinely takes >= 1.4s when the budget is NOT spent (validates the skip-proof test above)', async () => {
  const startedAt = Date.now();
  const p = await runWorkflow({ base: SLOW_CARGO_BASE });
  const elapsedMs = Date.now() - startedAt;
  assert.ok(p);
  assert.equal(p.cargo.ok, true, 'with a real budget, cargo test should actually run and pass');
  assert.ok(elapsedMs >= 1400,
    `expected the real (unskipped) cargo test call to take >= ~1500ms (its sleep), took ${elapsedMs}ms — ` +
      'if this is fast, the skip-proof test above is not proving anything');
});

test('smoke test against the real tree', async () => {
  const p = await runWorkflow({ base: '/Users/tamnm/code/personal' });
  if (p === null) {
    console.log('Real tree smoke test: Duplicate-wake gate short-circuited (agent not called).');
  } else {
    console.log('Real tree smoke test: Captured payload from agent.');
    assert.ok(p);
  }
});

test('fixture Cargo.toml is valid and uses production inline-array format', async () => {
  const fixturePath = path.join(here, 'fixture', 'rustlings', 'Cargo.toml');
  const fixtureDir = path.dirname(fixturePath);
  const content = await fs.readFile(fixturePath, 'utf8');

  // Check format
  assert.ok(content.includes('bin = ['), 'fixture must use inline-array format "bin = ["');
  assert.ok(content.includes('{ name ='), 'fixture must use inline-table format "{ name ="');
  assert.ok(!content.includes('[[bin]]'), 'fixture must not use array-of-tables format "[[bin]]"');

  // Check that manifest is valid by verifying cargo metadata exits 0
  try {
    await run('cargo', ['metadata', '--no-deps', '--format-version', '1'], { cwd: fixtureDir });
  } catch (e) {
    throw new Error(`fixture Cargo.toml is not a valid manifest: ${e.message}`);
  }
});

test('selection requires BOTH done and modified-since-last-lesson', async () => {
  const p = await runWorkflow();
  const done = new Set(p.rustlings.done);
  for (const n of p.selected) {
    assert.ok(done.has(n), `${n} was selected but is not in rustlings.done`);
  }
  assert.ok(p.selected.length <= 5, 'cap of 5 exceeded');
  assert.equal(new Set(p.selected).size, p.selected.length, 'duplicate entries in selection');
});

test('an exercise older than the last lesson is not reviewed', async () => {
  const p = await runWorkflow();
  // stale1 is done but its mtime predates the previous lesson file — it must never be selected.
  assert.ok(!p.selected.includes('stale1'),
    'stale1 is done-but-stale and must never appear in the selection');
});

test('previous-lesson BIRTHTIME is the cutoff, not mtime (post-issue write-back must not hide same-evening work)', async () => {
  // cap1..cap5 are pushed well before the cutoff so only clean1, lint1 and answered_between1
  // qualify — none can crowd answered_between1 out of the cap of 5. This isolates the cutoff
  // rule from cap arithmetic (covered separately below).
  const p = await runWorkflow({ mtimeOverrides: SUPPRESS_CAP_FILLERS });
  assert.ok(
    p.selected.includes('answered_between1'),
    'answered_between1 was modified after the lesson was issued (its birthtime) but before ' +
      'the simulated write-back (its mtime) — a birthtime cutoff must select it; an mtime ' +
      'cutoff would wrongly exclude it',
  );
});

test('a recently modified exercise not in the done-list is never selected', async () => {
  const p = await runWorkflow();
  assert.ok(!p.rustlings.done.includes('undone1'), 'fixture setup error: undone1 must not be in the done-list');
  assert.ok(
    !p.selected.includes('undone1'),
    'undone1 has the newest mtime in the whole fixture but is not done — it must never be selected',
  );
});

test('selection caps at 5 and is newest-mtime first across more than 5 candidates', async () => {
  const p = await runWorkflow();
  // Qualifying pool (done AND modified after the cutoff): lint1, clean1, cap5, cap4, cap3,
  // cap2, cap1, answered_between1 — 8 candidates, well over the cap of 5. The 5 newest by
  // mtime are lint1, clean1, cap5, cap4, cap3; cap2, cap1 and answered_between1 (all older)
  // must be dropped.
  assert.deepEqual(p.selected, ['lint1', 'clean1', 'cap5', 'cap4', 'cap3'],
    'selection must be capped at the 5 newest-mtime qualifying exercises');
});

// reviewed_exercises does not exist until Task 5 assembles it (see the still-failing
// "reviewed_exercises is present and well-shaped" test above), so clippyFor cannot be
// observed through the agent() payload yet. Instead this extracts the exact clippyFor +
// parseClippyJson block straight out of the real source file — the same slice Task 5 will
// wire into reviewed_exercises — and runs it directly against the fixture's own real cargo
// project. No mocking of cargo/clippy: this is a real ~0.35s-per-bin clippy invocation,
// same as production.
// clippyFor now calls the shared remainingMs() budget helper (see WORKFLOW_START/HOST_TIMEOUT_MS
// at the top of the source), so that block is pulled into the wrapped module too — not just the
// clippy-specific slice — otherwise `remainingMs` would be an undefined reference here. An
// optional hostTimeoutOverrideMs lets a test force the shared budget to an exact value (e.g. 0),
// the same source-text-surgery technique runWorkflow uses, so the zero-budget skip guard can be
// proven directly against the real clippyFor function without waiting on a real slow process.
async function loadClippyModule(baseVal = FIXTURE, opts = {}) {
  if (baseVal === FIXTURE) await stampFixtureMtimes();
  const body = await fs.readFile(SRC, 'utf8');

  const timingStartMarker = 'const WORKFLOW_START = Date.now();';
  const timingEndMarker = "const base = '/Users/tamnm/code/personal';";
  const timingStart = body.indexOf(timingStartMarker);
  const timingEnd = body.indexOf(timingEndMarker);
  if (timingStart === -1 || timingEnd === -1) {
    throw new Error('Could not locate the WORKFLOW_START/HOST_TIMEOUT_MS/remainingMs block in the workflow source');
  }
  let timingSlice = body.slice(timingStart, timingEnd);
  if (opts.hostTimeoutOverrideMs !== undefined) {
    const hostTimeoutStr = /const HOST_TIMEOUT_MS = \d+;/;
    if (!hostTimeoutStr.test(timingSlice)) {
      throw new Error('Could not find the exact HOST_TIMEOUT_MS constant declaration in the timing slice');
    }
    timingSlice = timingSlice.replace(hostTimeoutStr, `const HOST_TIMEOUT_MS = ${opts.hostTimeoutOverrideMs};`);
  }

  const clippyStartMarker = '// Scoped clippy:';
  const clippyEndMarker = "let out = '';";
  const clippyStart = body.indexOf(clippyStartMarker);
  const clippyEnd = body.indexOf(clippyEndMarker);
  if (clippyStart === -1 || clippyEnd === -1) {
    throw new Error('Could not locate the clippy block (parseClippyJson/clippyFor/capWarnings) in the workflow source');
  }
  const clippySlice = body.slice(clippyStart, clippyEnd);

  const wrapped =
    "const fs = await import('node:fs/promises');\n" +
    "const { execFile } = await import('node:child_process');\n" +
    "const { promisify } = await import('node:util');\n" +
    'const run = promisify(execFile);\n' +
    `${timingSlice}\n` +
    `const base = ${JSON.stringify(baseVal)};\n` +
    `${clippySlice}\n` +
    'export { clippyFor, capWarnings };\n';
  const tmp = path.join(here, `.wf.clippy.harness.${Date.now()}.${Math.random().toString(36).slice(2)}.mjs`);
  await fs.writeFile(tmp, wrapped);
  try {
    return await import(tmp + '?t=' + process.hrtime.bigint());
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

async function callClippyFor(name, baseVal = FIXTURE, opts = {}) {
  const mod = await loadClippyModule(baseVal, opts);
  return mod.clippyFor(name);
}

test('clippy finds real lint names on a dirty exercise (lint1), pedantic on', async () => {
  const result = await callClippyFor('lint1');
  assert.equal(result.ok, true, 'lint1 compiles fine — clippy must be able to run');
  assert.ok(Array.isArray(result.warnings));
  const codes = result.warnings.map((w) => w.code);
  // Membership, not exact-equality: pedantic can surface more than these two over time
  // (clippy versions change), and the test must keep proving these specific codes are
  // captured rather than pinning the whole set and breaking on every clippy upgrade.
  assert.ok(codes.includes('clippy::needless_return'),
    `expected clippy::needless_return among ${JSON.stringify(codes)}`);
  assert.ok(codes.includes('clippy::ptr_arg'),
    `expected clippy::ptr_arg among ${JSON.stringify(codes)}`);
  for (const w of result.warnings) {
    // Finding 5: shape only, not a `clippy::` prefix — parseClippyJson deliberately keeps ANY
    // compiler-message with a `code`, so a level:'error' entry elsewhere can legitimately be a
    // rustlings-forbidden lint or a bare rustc code (e.g. `E0061`) with no `clippy::` prefix at
    // all (see the 'nonclippy1' test below). Asserting the prefix here would only be true
    // because lint1 happens to carry two genuine clippy lints — it must not be generalised
    // into a shape contract the fixture alone can satisfy.
    assert.equal(typeof w.code, 'string');
    assert.ok(w.code.length > 0, 'expected a non-empty lint/error code, not a scraped human-readable string');
    assert.equal(typeof w.message, 'string');
    assert.ok(w.message.length > 0);
    // lint1's two lints (needless_return, ptr_arg) are both warn-level, not deny-by-default —
    // locks in that the ordinary warning path still reports level correctly.
    assert.equal(w.level, 'warning', `expected lint1's lints to be warn-level, got ${w.level}`);
  }
});

// Finding 5: parseClippyJson keeps ANY compiler-message carrying a `code`, not only clippy's
// own lints — production rustlings' Cargo.toml has a [lints] section (unsafe_code = "forbid",
// clippy::todo = "forbid", empty_loop = "forbid", infinite_loop = "deny", mem_forget = "deny")
// that this fixture manifest otherwise lacks entirely, and a plain rustc diagnostic (a bare
// error code like E0061) is admitted the same way. `nonclippy1` (an unused variable) is
// deliberately NOT a clippy lint — it is rustc's own built-in `unused_variables` lint, chosen
// specifically because it is a stable, decades-old compiler diagnostic (not a clippy lint
// name, which do get renamed/moved across clippy versions), so this case is not
// clippy-version-fragile the way pinning a specific clippy lint name would be. It is also
// deliberately absent from `.rustlings-state.txt` / the done-list, so it can never enter
// `selected` and cannot perturb any selection-timing test — it is only ever probed directly
// via clippyFor('nonclippy1'), exactly like denied1's direct-probe tests above.
test('clippy captures a non-clippy diagnostic code (nonclippy1) without mislabeling it as a clippy:: lint (finding 5)', async () => {
  const result = await callClippyFor('nonclippy1');
  assert.equal(result.ok, true, 'nonclippy1 compiles fine — clippy must be able to run');
  const found = result.warnings.find((w) => w.code === 'unused_variables');
  assert.ok(found, `expected a rustc 'unused_variables' diagnostic among ${JSON.stringify(result.warnings)}`);
  assert.equal(found.level, 'warning', "rustc's unused_variables lint is warn-level by default");
  assert.equal(typeof found.message, 'string');
  assert.ok(found.message.length > 0);
  assert.ok(!/^clippy::/.test(found.code),
    'this is the whole point of the fixture case: a real, non-fixture-specific finding whose code has no clippy:: prefix at all');
});

// Re-verified genuinely clean under `-W clippy::pedantic` (not just default clippy):
// `clean1` is `fn main() { println!("ok"); }`, which pedantic still has nothing to say
// about. The {ok:true, warnings:[]} semantic depends on a real clean case existing —
// this is it.
test('clippy reports zero warnings on a clean exercise (clean1), distinguishable from unknown', async () => {
  const result = await callClippyFor('clean1');
  assert.deepEqual(result, { ok: true, warnings: [] },
    'a clean exercise must read as ok:true with no warnings, not merely "warnings is empty"');
});

test('clippy on a bin that does not exist in the manifest is ok:false, not a false "clean"', async () => {
  const result = await callClippyFor('does_not_exist_in_manifest_xyz');
  assert.deepEqual(result, { ok: false, warnings: [] },
    'a clippy invocation that cannot run at all must read as unknown (ok:false), never as clean');
});

// Finding: clippy's `correctness` lint group is deny-by-default, so a real correctness
// violation is reported at level "error", not "warning" — and rustlings' own pass bar
// (rustc/test success) says nothing about clippy, so a `done` exercise can absolutely trip
// one. A filter that only kept warning-level entries would silently collapse this into
// {ok:true, warnings:[]} — byte-identical to clean1's genuinely-clean result. denied1
// (clippy::eq_op, a self-comparison) locks in that this is caught and tagged distinctly.
test('an error-level correctness lint (denied1) is captured, not dropped, and is not read as clean', async () => {
  const denied = await callClippyFor('denied1');
  assert.equal(denied.ok, true, 'denied1 compiles fine — clippy must be able to run');
  const eqOp = denied.warnings.find((w) => w.code === 'clippy::eq_op');
  assert.ok(eqOp, `expected clippy::eq_op among ${JSON.stringify(denied.warnings)}`);
  assert.equal(eqOp.level, 'error', 'clippy::eq_op is deny-by-default and must report level "error"');
  assert.equal(typeof eqOp.message, 'string');
  assert.ok(eqOp.message.length > 0);
  assert.notDeepEqual(denied, { ok: true, warnings: [] },
    'a denied correctness violation must never be indistinguishable from a genuinely clean exercise');

  const clean = await callClippyFor('clean1');
  assert.notDeepEqual(denied, clean,
    'denied1 (a real correctness violation) must not read the same as clean1 (genuinely clean)');
});

// Pedantic is chattier than default clippy, so the payload is capped at WARNING_CAP (10).
// The cap must be error-aware: an error is the single most important thing we can tell the
// owner, so no warning-level entry may crowd one out. This is SIMULATED directly against
// the pure capWarnings function (not run through a real clippy invocation): the real
// fixture bins only ever produce 0-2 findings each, and constructing a genuine 10+-finding
// exercise would mean a fragile, clippy-version-dependent source file. Simulating the exact
// {code, message, line, level} shape parseClippyJson produces tests the identical algorithm
// clippyFor calls, without that fragility. Stated plainly per the review's ask: this case is
// simulated, not exercised through a real cargo/clippy run.
test('capWarnings never lets warning-level entries crowd an error-level one out of the cap', async () => {
  const { capWarnings } = await loadClippyModule();
  const warnings = [
    ...Array.from({ length: 14 }, (_, i) => ({
      code: `clippy::synthetic_warning_${i}`,
      message: `synthetic warning ${i}`,
      line: i + 1,
      level: 'warning',
    })),
    { code: 'clippy::synthetic_error', message: 'synthetic error', line: 99, level: 'error' },
  ];
  // 15 inputs, error last (index 14) — a naive `.slice(0, 10)` on emission order would keep
  // only the first 10 warnings and drop the error entirely.
  const capped = capWarnings(warnings);
  assert.equal(capped.length, 10, 'cap must not be exceeded');
  const errors = capped.filter((w) => w.level === 'error');
  assert.equal(errors.length, 1, 'the single error-level entry must survive the cap');
  assert.equal(errors[0].code, 'clippy::synthetic_error');
});

test('capWarnings keeps every error even when errors alone exceed the cap', async () => {
  const { capWarnings } = await loadClippyModule();
  const warnings = [
    ...Array.from({ length: 12 }, (_, i) => ({
      code: `clippy::synthetic_error_${i}`,
      message: `synthetic error ${i}`,
      line: i + 1,
      level: 'error',
    })),
    { code: 'clippy::synthetic_warning', message: 'synthetic warning', line: 99, level: 'warning' },
  ];
  const capped = capWarnings(warnings);
  assert.equal(capped.length, 10, 'cap must not be exceeded even when errors alone exceed it');
  assert.ok(capped.every((w) => w.level === 'error'),
    'when errors alone exceed the cap, no warning-level entry should take a slot that belongs to an error');
});

export { runWorkflow };

// The evidence-levels block is extracted straight out of the real source by its marker
// comments (same technique as loadTimingModule) so these test the functions the workflow runs.
async function loadEvidenceModule() {
  const body = await fs.readFile(SRC, 'utf8');
  const start = body.indexOf('// Evidence levels:');
  const end = body.indexOf('// End evidence levels.');
  if (start === -1 || end === -1) {
    throw new Error('Could not locate the evidence-levels block in the workflow source');
  }
  const wrapped = `${body.slice(start, end)}\nexport { REVIEW_DAY, RUNGS, parseAttempts, deriveConcepts, lessonLadder, conceptIdsIn, unknownIdsOf, isReviewDayOn };\n`;
  const tmp = path.join(here, `.wf.evidence.harness.${Date.now()}.${Math.random().toString(36).slice(2)}.mjs`);
  await fs.writeFile(tmp, wrapped);
  try {
    return await import(tmp + '?t=' + process.hrtime.bigint());
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

const rec = (date, id, result, help, kind) => ({ date, id, result, help, kind });

test('parseAttempts reads front-matter records only, in both key=value and key: value form, across CRLF', async () => {
  const { parseAttempts } = await loadEvidenceModule();
  // Shape copied from a real lesson's front-matter (lessons/2026-10-01.md), plus attempts.
  const lesson = [
    '---',
    'type: done',
    'title: "Lesson 51 · Rust: x · DSA: y"',
    'date: 2026-10-02',
    'metrics: day=51 chess_phase=1 dsa_topics=17 structs_done=1',
    'attempts:',
    '  - id=b1.alpha-beta result=correct help=none kind=application',
    '  - id: rs.errors2 result: partial help: hint kind: application',
    '  - id=B1.Alpha result=correct help=none kind=application',
    '  - id=b1.minimax result=maybe help=none kind=application',
    'answered_at: 2026-10-02',
    '---',
    '',
    '# Lesson 51',
    'attempts:',
    '  - id=b1.zobrist result=correct help=none kind=application',
    '',
  ].join('\r\n');
  const p = parseAttempts(lesson);
  assert.equal(p.present, true);
  assert.deepEqual(p.attempts, [
    { id: 'b1.alpha-beta', result: 'correct', help: 'none', kind: 'application' },
    { id: 'rs.errors2', result: 'partial', help: 'hint', kind: 'application' },
  ]);
  assert.deepEqual(p.errors, [
    '- id=B1.Alpha result=correct help=none kind=application',
    '- id=b1.minimax result=maybe help=none kind=application',
  ]);
});

test('parseAttempts on a pre-cutover lesson: present false, nothing parsed, never throws', async () => {
  const { parseAttempts } = await loadEvidenceModule();
  assert.deepEqual(parseAttempts('---\ntype: done\n---\n### My answer\nx\n'), { present: false, attempts: [], errors: [] });
  assert.deepEqual(parseAttempts('no front-matter at all'), { present: false, attempts: [], errors: [] });
});

test('deriveConcepts: every level transition', async () => {
  const { deriveConcepts } = await loadEvidenceModule();
  const c = deriveConcepts([
    rec('2026-10-01', 'b1.a', 'correct', 'none', 'application'),
    rec('2026-10-01', 'b1.b', 'correct', 'hint', 'application'),
    rec('2026-09-01', 'b1.c', 'correct', 'none', 'application'),
    rec('2026-09-08', 'b1.c', 'correct', 'none', 'retrieval'),
    rec('2026-09-01', 'b1.d', 'correct', 'none', 'application'),
    rec('2026-09-08', 'b1.d', 'correct', 'none', 'application'),
    rec('2026-09-01', 'b1.e', 'correct', 'none', 'application'),
    rec('2026-09-08', 'b1.e', 'incorrect', 'none', 'retrieval'),
    rec('2026-10-01', 'b1.f', 'incorrect', 'none', 'application'),
    rec('2026-09-01', 'b1.g', 'correct', 'none', 'application'),
    rec('2026-09-08', 'b1.g', 'partial', 'none', 'retrieval'),
    rec('2026-10-01', 'b1.k', 'correct', 'none', 'retrieval'),
  ], '2026-10-04');
  assert.equal(c['b1.a'].level, 'demonstrated');
  assert.equal(c['b1.b'].level, 'practicing', 'a hinted correct is not independent');
  assert.equal(c['b1.c'].level, 'retained', 'clean retrieval after an earlier clean success');
  assert.equal(c['b1.d'].level, 'demonstrated', 'a second application is not retrieval');
  assert.equal(c['b1.e'].level, 'needs-repair', 'was demonstrated, latest incorrect');
  assert.equal(c['b1.f'].level, 'practicing', 'incorrect without an earlier success is not a repair');
  assert.equal(c['b1.g'].level, 'practicing', 'partial after a success is practicing, not needs-repair');
  assert.equal(c['b1.k'].level, 'demonstrated', 'a first-ever clean retrieval has nothing to have retained');
  assert.equal(c['b1.k'].rung, 0);
  assert.deepEqual(Object.keys(c['b1.a']).sort(), ['due', 'is_due', 'last_date', 'level', 'rung']);
});

test('deriveConcepts: rung advances only on a clean retrieval, holds otherwise, caps at 12w', async () => {
  const { deriveConcepts } = await loadEvidenceModule();
  const c = deriveConcepts([
    rec('2026-10-01', 'b1.a', 'correct', 'none', 'application'),
    rec('2026-09-01', 'b1.c', 'correct', 'none', 'application'),
    rec('2026-09-08', 'b1.c', 'correct', 'none', 'retrieval'),
    rec('2026-09-01', 'b1.i', 'correct', 'none', 'application'),
    rec('2026-09-08', 'b1.i', 'correct', 'none', 'retrieval'),
    rec('2026-10-06', 'b1.i', 'correct', 'hint', 'retrieval'),
    ...['2026-01-01', '2026-01-08', '2026-02-05', '2026-04-30', '2026-07-23'].map((d, n) =>
      rec(d, 'b1.h', 'correct', 'none', n === 0 ? 'application' : 'retrieval')),
  ], '2026-10-04');
  assert.equal(c['b1.a'].rung, 0);
  assert.equal(c['b1.a'].due, '2026-10-08');
  assert.equal(c['b1.c'].rung, 1);
  assert.equal(c['b1.c'].due, '2026-10-06');
  assert.equal(c['b1.i'].rung, 1, 'a hinted retrieval keeps the rung');
  assert.equal(c['b1.i'].due, '2026-11-03', 'and restarts the clock from that attempt');
  assert.equal(c['b1.h'].rung, 2, 'never past 12w');
});

test('deriveConcepts: due from 3 days before, overdue stays due', async () => {
  const { deriveConcepts } = await loadEvidenceModule();
  const c = deriveConcepts([
    rec('2026-10-01', 'b1.later', 'correct', 'none', 'application'), // due 10-08: 4 days out
    rec('2026-09-30', 'b1.edge', 'correct', 'none', 'application'), // due 10-07: 3 days out
    rec('2026-08-01', 'b1.over', 'correct', 'none', 'application'), // due 08-08: long overdue
  ], '2026-10-04');
  assert.equal(c['b1.later'].is_due, false);
  assert.equal(c['b1.edge'].is_due, true);
  assert.equal(c['b1.over'].is_due, true);
});

test('deriveConcepts: date order wins across dates, file order wins within one date', async () => {
  const { deriveConcepts } = await loadEvidenceModule();
  const sameDayA = deriveConcepts([
    rec('2026-10-01', 'b1.x', 'correct', 'none', 'application'),
    rec('2026-10-01', 'b1.x', 'incorrect', 'none', 'retrieval'),
  ], '2026-10-04');
  assert.equal(sameDayA['b1.x'].level, 'needs-repair');
  const sameDayB = deriveConcepts([
    rec('2026-10-01', 'b1.x', 'incorrect', 'none', 'retrieval'),
    rec('2026-10-01', 'b1.x', 'correct', 'none', 'application'),
  ], '2026-10-04');
  assert.equal(sameDayB['b1.x'].level, 'demonstrated');
  const unsorted = deriveConcepts([
    rec('2026-09-08', 'b1.y', 'correct', 'none', 'retrieval'),
    rec('2026-09-01', 'b1.y', 'correct', 'none', 'application'),
  ], '2026-10-04');
  assert.equal(unsorted['b1.y'].level, 'retained');
});

test('lessonLadder keeps the old date ladder, tagged, and skips lessons that carry attempts', async () => {
  const { lessonLadder } = await loadEvidenceModule();
  const history = [
    { date: '2026-09-26', type: 'done', title: 'B' },
    { date: '2026-09-27', type: 'done', title: 'A' },
    { date: '2026-09-28', type: 'assigned', title: 'C' },
  ];
  assert.deepEqual(lessonLadder(history, '2026-10-04', new Set(['2026-09-26'])), [
    { date: '2026-09-27', title: 'A', type: 'done', rung: '1w', age_days: 7, source: 'lesson' },
  ]);
  assert.equal(lessonLadder(history, '2026-10-04', new Set()).length, 2, 'without the skip, 09-26 (age 8) is due too');
});

test('conceptIdsIn / unknownIdsOf: README registry, rustlings bin list, and null when unreadable', async () => {
  const { conceptIdsIn, unknownIdsOf } = await loadEvidenceModule();
  const readme = '| alpha-beta | `b1.alpha-beta` |\n| phase 2 `chess.p2` |\nprose b1.minimax without backticks\n`ds::Vec`';
  assert.deepEqual([...conceptIdsIn(readme)].sort(), ['b1.alpha-beta', 'chess.p2']);
  const concepts = { 'b1.alpha-beta': {}, 'b1.minimax': {}, 'rs.errors2': {}, 'rs.nope9': {} };
  assert.deepEqual(unknownIdsOf(concepts, readme, ['errors1', 'errors2']), ['b1.minimax', 'rs.nope9']);
  assert.equal(unknownIdsOf(concepts, null, ['errors2']), null, 'unreadable README = check did not run, not "no unknowns"');
});

test('isReviewDayOn is Friday in Asia/Ho_Chi_Minh, not UTC', async () => {
  const { isReviewDayOn, REVIEW_DAY } = await loadEvidenceModule();
  const tz = { timeZone: 'Asia/Ho_Chi_Minh' };
  assert.equal(REVIEW_DAY, 'Friday');
  assert.equal(isReviewDayOn(new Date('2026-10-09T02:00:00Z'), tz), true, '09:00 Friday local');
  assert.equal(isReviewDayOn(new Date('2026-10-08T17:30:00Z'), tz), true, '00:30 Friday local, still Thursday in UTC');
  assert.equal(isReviewDayOn(new Date('2026-10-11T02:00:00Z'), tz), false, 'Sunday is a normal day now');
});

test('payload carries derived concepts, unknown IDs, parse errors, and a tagged ladder', async () => {
  const p = await runWorkflow();
  assert.ok(p, 'agent() was never called');
  assert.equal(p.concepts['b1.alpha-beta'].level, 'demonstrated');
  assert.equal(p.concepts['b1.not-in-readme'].level, 'practicing');
  assert.deepEqual(p.unknown_ids, ['b1.not-in-readme']);
  assert.deepEqual(p.attempt_parse_errors, [{ date: '2026-08-01', line: '- id=garbage result=maybe' }]);
  // 2026-08-01 + 7 days is long past, and overdue stays due.
  assert.ok(
    p.due_review.some((d) => d.source === 'concept' && d.id === 'b1.alpha-beta' && d.rung === '1w'),
    `expected b1.alpha-beta on the concept ladder, got ${JSON.stringify(p.due_review)}`,
  );
  assert.ok(p.due_review.every((d) => d.source === 'concept' || d.source === 'lesson'));
  assert.equal(p.is_review_day, p.weekday === 'Friday');
});
