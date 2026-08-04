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

// Git does not preserve mtimes: a fresh clone, or enough checkouts, can leave every fixture
// file stamped with the same checkout time. The selection tests only prove anything if the
// lesson-vs-exercise and exercise-vs-exercise mtime relationships are real, so the harness
// owns those timestamps explicitly here rather than trusting whatever the filesystem has —
// spread by whole days so the intended ordering is unambiguous on any machine.
async function stampFixtureMtimes() {
  const day = (s) => new Date(s + 'T00:00:00Z');
  const stamp = async (rel, date) => {
    await fs.utimes(path.join(FIXTURE, rel), date, date);
  };
  await stamp('loopany/daily-lesson/lessons/2026-08-01.md', day('2026-08-01'));
  await stamp('loopany/daily-lesson/lessons/2026-08-02.md', day('2026-08-02')); // newest lesson = the "since" cutoff
  // stale1: done but must read as OLDER than the cutoff lesson above.
  await stamp('rustlings/exercises/01_demo/stale1.rs', day('2026-07-01'));
  await stamp('rustlings/solutions/01_demo/stale1.rs', day('2026-07-01'));
  // clean1 and lint1: both AFTER the cutoff lesson, and a whole day apart from each other so
  // "newest-mtime first" (lint1 before clean1) does not depend on sub-second timestamps.
  await stamp('rustlings/exercises/01_demo/clean1.rs', day('2026-08-10'));
  await stamp('rustlings/solutions/01_demo/clean1.rs', day('2026-08-10'));
  await stamp('rustlings/exercises/01_demo/lint1.rs', day('2026-08-11'));
  await stamp('rustlings/solutions/01_demo/lint1.rs', day('2026-08-11'));
}

async function runWorkflow(opts = {}) {
  const baseVal = opts.base || FIXTURE;
  if (baseVal === FIXTURE) {
    // Re-stamp before every fixture run so no test can accidentally run against whatever
    // mtimes the filesystem happens to have. Never touches the real tree (opts.base skips this).
    await stampFixtureMtimes();
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
  assert.equal(map.clean1_sol, undefined, '_sol targets must be excluded');
  assert.equal(map.lint1_sol, undefined, '_sol targets must be excluded');
  assert.equal(map.stale1_sol, undefined, '_sol targets must be excluded');
  assert.equal(Object.keys(map).length, 3, 'fixture has exactly 3 exercise targets after _sol exclusion');
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

test('selection is newest-mtime first', async () => {
  const p = await runWorkflow();
  // fixture: lint1.rs mtime is a few ms newer than clean1.rs; stale1 is excluded entirely.
  assert.deepEqual(p.selected, ['lint1', 'clean1'],
    'fixture candidates should be lint1 then clean1, newest-mtime first');
});

export { runWorkflow };
