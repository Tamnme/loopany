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
  assert.ok(p.reviewed_exercises.length <= 5, 'cap of 5 exceeded');
  for (const e of p.reviewed_exercises) {
    assert.equal(typeof e.name, 'string');
    assert.equal(typeof e.code, 'string');
    assert.equal(typeof e.solution, 'string');
    assert.equal(typeof e.clippy.ok, 'boolean');
    assert.ok(Array.isArray(e.clippy.warnings));
  }
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

test('parseBinMap reads exercise paths and drops _sol targets', async () => {
  const p = await runWorkflow();
  const map = p.debug_bin_map;
  assert.ok(map, 'workflow did not expose debug_bin_map');
  assert.equal(map.clean1, 'exercises/01_demo/clean1.rs');
  assert.equal(map.lint1, 'exercises/01_demo/lint1.rs');
  assert.equal(map.stale1, 'exercises/01_demo/stale1.rs');
  assert.equal(map.answered_between1, 'exercises/01_demo/answered_between1.rs');
  assert.equal(map.undone1, 'exercises/01_demo/undone1.rs');
  assert.equal(map.cap1, 'exercises/01_demo/cap1.rs');
  assert.equal(map.clean1_sol, undefined, '_sol targets must be excluded');
  assert.equal(map.lint1_sol, undefined, '_sol targets must be excluded');
  assert.equal(map.stale1_sol, undefined, '_sol targets must be excluded');
  assert.equal(map.undone1_sol, undefined, '_sol targets must be excluded');
  assert.equal(Object.keys(map).length, 10, 'fixture has exactly 10 exercise targets after _sol exclusion');
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
    assert.ok(p.debug_bin_map[n], `${n} was selected but has no bin target`);
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
async function callClippyFor(name, baseVal = FIXTURE) {
  if (baseVal === FIXTURE) await stampFixtureMtimes();
  const body = await fs.readFile(SRC, 'utf8');
  const startMarker = '// Scoped clippy:';
  const endMarker = "let out = '';";
  const start = body.indexOf(startMarker);
  const end = body.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error('Could not locate the clippy block (parseClippyJson/clippyFor) in the workflow source');
  }
  const slice = body.slice(start, end);
  const wrapped =
    "const fs = await import('node:fs/promises');\n" +
    "const { execFile } = await import('node:child_process');\n" +
    "const { promisify } = await import('node:util');\n" +
    'const run = promisify(execFile);\n' +
    `const base = ${JSON.stringify(baseVal)};\n` +
    `${slice}\n` +
    'export { clippyFor };\n';
  const tmp = path.join(here, `.wf.clippy.harness.${Date.now()}.${Math.random().toString(36).slice(2)}.mjs`);
  await fs.writeFile(tmp, wrapped);
  try {
    const mod = await import(tmp + '?t=' + process.hrtime.bigint());
    return await mod.clippyFor(name);
  } finally {
    await fs.rm(tmp, { force: true });
  }
}

test('clippy finds real lint names on a dirty exercise (lint1)', async () => {
  const result = await callClippyFor('lint1');
  assert.equal(result.ok, true, 'lint1 compiles fine — clippy must be able to run');
  assert.ok(Array.isArray(result.warnings));
  const codes = result.warnings.map((w) => w.code);
  assert.ok(codes.includes('clippy::needless_return'),
    `expected clippy::needless_return among ${JSON.stringify(codes)}`);
  for (const w of result.warnings) {
    assert.match(w.code, /^clippy::/, 'expected a clippy lint name, not a scraped human-readable string');
    assert.equal(typeof w.message, 'string');
    assert.ok(w.message.length > 0);
  }
});

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

export { runWorkflow };
