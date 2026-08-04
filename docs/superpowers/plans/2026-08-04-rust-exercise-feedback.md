# Rust Exercise Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each daily lesson open Track A with a short, clippy-grounded review of the Rust exercises the owner finished since the last lesson.

**Architecture:** All new logic lives in the loop's **workflow** — the deterministic JS pre-stage that runs before the coding agent. It selects the exercises worth reviewing, reads each one alongside rustlings' official solution, runs scoped `cargo clippy`, and hands the result to the run as `reviewed_exercises`. The run turns that data into prose. Nothing new is computed by the agent, and nothing new gates the lesson.

**Tech Stack:** Node (the workflow runtime — `node:fs/promises`, `node:child_process`), `cargo clippy` with `--message-format=json`, the `loopany` CLI for deployment.

## Global Constraints

Copied verbatim from the spec and the loop's brief. Every task's requirements implicitly include these.

- **Absolute paths only.** Runs start in `~/Documents/Manual Library/code/personal`, an empty leftover directory. Everything works because every path is absolute under `/Users/tamnm/code/personal/`.
- **Never write inside `loopany/`.** That folder is synced content. No `cargo`, no `rustlings`, no checkouts, no build artifacts.
- **Best-effort, always.** Any failure in this feature yields `reviewed_exercises: []` or a partial entry — never a thrown error. Code feedback must never cost a lesson day.
- **`ok: false` means unknown, never clean.** A failed clippy invocation must be distinguishable from a clean one.
- **Cap at 5 exercises**, newest mtime first.
- **Read-only.** Grading is unchanged: `rustlings.done` on weekdays, `cargo` on Sundays. No new metric in `stateSchema`.
- **Loop id:** `loop-ms79033a-b8c219c7`. **CLI prefix:** `npx @crewlet/loopany@latest` (the `loopany` shim is not on PATH in this shell).
- **`rtk` rewrites `cargo` in the interactive shell and filters its output.** Use `rtk proxy cargo …` when you need to read real cargo output by hand. The workflow is unaffected — it calls `execFile('cargo', …)` directly.

## File Structure

| Path | Responsibility | New? |
|---|---|---|
| `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js` | Source of truth for the loop's workflow body. Pushed with `--workflow-file`. | **Create** (rescued from scratchpad) |
| `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.test.mjs` | Harness: wraps the workflow in an async function, stubs the `agent` global, captures the handoff payload, asserts on it. | **Create** |
| `/Users/tamnm/code/personal/loopany/daily-lesson/README.md` | The loop's brief — tells the run what to do with `reviewed_exercises`. | Modify |

**Why `loop-src/` exists.** The workflow's only current copies are on the loopany server and in an ephemeral scratchpad. That is a real risk: the scratchpad is session-scoped, so the source can vanish. `loop-src/` is outside the synced `loopany/` folder, so it satisfies the "never write inside `loopany/`" constraint while giving the workflow a durable home next to its test.

**Testing approach.** The workflow body uses top-level `await` and a top-level `return`, and calls an injected `agent()` global — so it cannot be imported as a module directly. The harness wraps it:

```js
export default async function () { <workflow body> }
```

then sets `globalThis.agent = (prompt, payload) => { captured = payload }` and calls it. This tests the real workflow end to end against the real `rustlings/` tree with zero logic duplication. It is the same wrapping trick already used to syntax-check this workflow.

**Note on commits.** `/Users/tamnm/code/personal/` is **not a git repository**, so the "commit" step of a normal TDD cycle cannot run. Each task ends with a verification step instead. Running `git init` there is out of scope for this plan.

---

### Task 1: Rescue the workflow into `loop-src/` and stand up the test harness

The tracer bullet: no behaviour change, but it proves the harness can execute the real workflow and capture its handoff. Everything after this is additive.

**Files:**
- Create: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js`
- Create: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `daily-lesson.workflow.js` (the workflow body, verbatim — the file `--workflow-file` will be pointed at from here on) and a test harness exposing `runWorkflow(): Promise<object>` which returns the payload passed to `agent()`.

- [ ] **Step 1: Pull the live workflow down from the server into the new home**

```bash
mkdir -p /Users/tamnm/code/personal/loop-src
cd /Users/tamnm/code/personal/loop-src
npx @crewlet/loopany@latest show loop-ms79033a-b8c219c7 --json \
  | node -e 'let b="";process.stdin.on("data",d=>b+=d).on("end",()=>{const d=JSON.parse(b);const l=Array.isArray(d)?d[0]:d;process.stdout.write(l.workflow)})' \
  > daily-lesson.workflow.js
wc -l daily-lesson.workflow.js
```

Expected: roughly 160–180 lines. The server copy is authoritative — it already contains the Sunday review-day and spaced-repetition ladder work from earlier today.

- [ ] **Step 2: Write the failing test**

Create `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.test.mjs`:

```js
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'daily-lesson.workflow.js');

// The workflow body uses top-level `await` and a top-level `return`, and calls an
// injected `agent()` global. Wrapping it in an async function makes it importable
// without duplicating a single line of its logic.
async function runWorkflow() {
  const body = await fs.readFile(SRC, 'utf8');
  const wrapped = `export default async function(){\n${body}\n}`;
  const tmp = path.join(here, '.wf.harness.mjs');
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

export { runWorkflow };
```

- [ ] **Step 3: Run the test to verify the first passes and the second fails**

```bash
cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | tail -20
```

Expected: the first test **passes** (the harness works against today's live workflow), the second **fails** with `reviewed_exercises must be an array` — the field does not exist yet. If the *first* test fails with "agent() was never called", the duplicate-wake gate short-circuited because today's lesson already exists and is still `assigned`; that is a real condition, not a bug — note it and move to Task 2, which is tested in isolation.

- [ ] **Step 4: Confirm the rescued file is byte-identical to what the server has**

```bash
cd /Users/tamnm/code/personal/loop-src
npx @crewlet/loopany@latest edit loop-ms79033a-b8c219c7 --workflow-file daily-lesson.workflow.js --dry-run 2>&1 | tail -5
```

Expected: `rejections: none`, and either "nothing changed" or a workflow diff whose `from` and `to` are the same length. A length change here means the download mangled the file — stop and re-download before going further.

---

### Task 2: Parse the exercise-name → path map out of `rustlings/Cargo.toml`

**Files:**
- Modify: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js`
- Modify: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `parseBinMap(cargoToml: string) -> Record<string, string>` mapping exercise name to its repo-relative source path, e.g. `{ if1: 'exercises/03_if/if1.rs' }`. Solution targets (`<name>_sol`) are excluded. Task 3 and Task 4 both consume this.

- [ ] **Step 1: Write the failing test**

Append to `daily-lesson.workflow.test.mjs`:

```js
test('parseBinMap reads real exercise paths and drops _sol targets', async () => {
  const p = await runWorkflow();
  const map = p.debug_bin_map;
  assert.ok(map, 'workflow did not expose debug_bin_map');
  assert.equal(map.if1, 'exercises/03_if/if1.rs');
  assert.equal(map.variables5, 'exercises/01_variables/variables5.rs');
  assert.equal(map.if1_sol, undefined, '_sol targets must be excluded');
  assert.ok(Object.keys(map).length > 90, 'expected ~94 exercise targets');
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | grep -A3 "parseBinMap"
```

Expected: FAIL with `workflow did not expose debug_bin_map`.

- [ ] **Step 3: Implement the parser**

In `daily-lesson.workflow.js`, insert immediately after the `rustlings` state-file block (the one ending with the `currentExercise = null;` catch):

```js
// Exercise name -> source path, straight from rustlings' own manifest, so the map tracks
// their layout instead of hardcoding one. `<name>_sol` targets point at the official
// solutions and are excluded here; the solution path is derived from the exercise path.
const parseBinMap = (toml) => {
  const map = {};
  for (const m of toml.matchAll(/name\s*=\s*"([^"]+)"\s*,\s*path\s*=\s*"([^"]+)"/g)) {
    if (m[1].endsWith('_sol')) continue;
    map[m[1]] = m[2];
  }
  return map;
};

let binMap = {};
try {
  binMap = parseBinMap(await fs.readFile(base + '/rustlings/Cargo.toml', 'utf8'));
} catch (e) {
  binMap = {}; // manifest unreadable — feedback degrades to nothing, never to a failed run
}
```

Then add `debug_bin_map: binMap,` to the object passed to `agent(...)`, directly above `rustlings:`.

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | tail -20
```

Expected: the `parseBinMap` test PASSES.

- [ ] **Step 5: Verify against the real manifest by hand**

```bash
grep -c '_sol' /Users/tamnm/code/personal/rustlings/Cargo.toml
```

Expected: a count roughly equal to the exercise count. The map size from Step 4 plus this count should approximate the total `name =` lines — confirming nothing was silently dropped.

---

### Task 3: Select which exercises to review

**Files:**
- Modify: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js`
- Modify: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.test.mjs`

**Interfaces:**
- Consumes: `binMap` from Task 2; `doneExercises` and `prevLesson` already present in the workflow.
- Produces: `selected: string[]` — up to 5 exercise names, newest-modified first. Task 4 consumes this.

**Design note — the cutoff.** "Since the last lesson" is the **mtime of the previous lesson file**, not a calendar date. The lesson is written at 09:00 Asia/Saigon (02:00 UTC), so a date-based cutoff at midnight would wrongly include work the owner did the evening *before* they were assigned it. The lesson file's own mtime is exactly "when the last lesson was issued" and needs no timezone arithmetic.

- [ ] **Step 1: Write the failing test**

Append to `daily-lesson.workflow.test.mjs`:

```js
test('selection requires BOTH done and modified-since-last-lesson', async () => {
  const p = await runWorkflow();
  const names = p.reviewed_exercises.map((e) => e.name);
  const done = new Set(p.rustlings.done);
  for (const n of names) {
    assert.ok(done.has(n), `${n} was selected but is not in rustlings.done`);
    assert.ok(p.debug_bin_map[n], `${n} was selected but has no bin target`);
  }
  assert.ok(names.length <= 5, 'cap of 5 exceeded');
  assert.equal(new Set(names).size, names.length, 'duplicate entries in selection');
});

test('an exercise older than the last lesson is not reviewed', async () => {
  const p = await runWorkflow();
  // intro1 ships passing and is never edited by the owner — it must never be selected.
  assert.ok(!p.reviewed_exercises.some((e) => e.name === 'intro1'),
    'intro1 ships pre-solved and must never appear as reviewed work');
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | grep -A3 "selection requires"
```

Expected: FAIL — `reviewed_exercises` is still absent or empty of the required shape.

- [ ] **Step 3: Implement the selection**

In `daily-lesson.workflow.js`, immediately after the `binMap` block from Task 2:

```js
// Which exercises the owner actually worked on since the last lesson. BOTH conditions are
// required: the done list alone cannot tell yesterday's work from last week's, and mtime
// alone would surface a file they opened but never got passing.
// The cutoff is the previous lesson file's own mtime — literally "when the last lesson was
// issued" — which avoids any timezone arithmetic against the 09:00 Asia/Saigon fire time.
let since = 0;
if (prevName) {
  try {
    since = (await fs.stat(lessonsDir + '/' + prevName)).mtimeMs;
  } catch (e) {
    since = 0; // unreadable — fall through to reviewing nothing rather than everything
  }
}

const REVIEW_CAP = 5;
let selected = [];
if (since > 0) {
  const stamped = [];
  for (const name of doneExercises) {
    const rel = binMap[name];
    if (!rel) continue;
    try {
      const st = await fs.stat(base + '/rustlings/' + rel);
      if (st.mtimeMs > since) stamped.push({ name, mtime: st.mtimeMs });
    } catch (e) {
      continue; // file gone — skip it, never fail the run
    }
  }
  stamped.sort((a, b) => b.mtime - a.mtime);
  selected = stamped.slice(0, REVIEW_CAP).map((s) => s.name);
}
```

- [ ] **Step 4: Run the test to verify selection behaves**

```bash
cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | tail -20
```

Expected: the two selection tests PASS. They will pass vacuously if `selected` is empty — that is acceptable and expected on a day with no new work; Step 5 proves the non-empty path.

- [ ] **Step 5: Prove the non-empty path with a temporary probe**

```bash
cd /Users/tamnm/code/personal/loop-src
node -e '
const fs=require("fs");
const toml=fs.readFileSync("/Users/tamnm/code/personal/rustlings/Cargo.toml","utf8");
const map={};for(const m of toml.matchAll(/name\s*=\s*"([^"]+)"\s*,\s*path\s*=\s*"([^"]+)"/g)){if(m[1].endsWith("_sol"))continue;map[m[1]]=m[2];}
const done=fs.readFileSync("/Users/tamnm/code/personal/rustlings/.rustlings-state.txt","utf8").split("\n").map(s=>s.trim()).filter(Boolean).slice(2);
const rows=done.filter(n=>map[n]).map(n=>({n,m:fs.statSync("/Users/tamnm/code/personal/rustlings/"+map[n]).mtime.toISOString()}));
rows.sort((a,b)=>b.m.localeCompare(a.m));console.log(rows.slice(0,8));'
```

Expected: a list of the owner's most recently touched completed exercises with real timestamps. This confirms mtimes are meaningfully spread and the newest-first ordering is not degenerate. Delete nothing — this is a read-only probe.

---

### Task 4: Capture clippy findings per selected exercise

**Files:**
- Modify: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js`
- Modify: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.test.mjs`

**Interfaces:**
- Consumes: `selected` from Task 3.
- Produces: `clippyFor(name: string) -> Promise<{ok: boolean, warnings: Array<{code: string, message: string, line: number|null}>}>`. Task 5 assembles this into `reviewed_exercises`.

**Design note.** `--message-format=json` gives the lint name (`clippy::needless_return`), the human message, and the line directly — verified 2026-08-04 on a scratch crate. Regex-scraping the human-readable output cannot recover the lint name without fragile pairing against `#[warn(...)]` note lines. Cargo **replays cached diagnostics** on repeat runs (also verified), so no cache-busting flag and no touching of source files is needed — important, because touching a file would corrupt Task 3's mtime cutoff.

- [ ] **Step 1: Write the failing test**

Append to `daily-lesson.workflow.test.mjs`:

```js
test('clippy results distinguish clean from unknown', async () => {
  const p = await runWorkflow();
  for (const e of p.reviewed_exercises) {
    assert.equal(typeof e.clippy.ok, 'boolean');
    assert.ok(Array.isArray(e.clippy.warnings));
    if (!e.clippy.ok) {
      assert.equal(e.clippy.warnings.length, 0,
        'a failed clippy run must not report warnings — ok:false means unknown');
    }
    for (const w of e.clippy.warnings) {
      assert.match(w.code, /^clippy::/, 'expected a clippy lint name');
      assert.equal(typeof w.message, 'string');
    }
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | grep -A3 "clippy results"
```

Expected: FAIL — `reviewed_exercises` does not yet carry a `clippy` field.

- [ ] **Step 3: Implement the clippy capture**

In `daily-lesson.workflow.js`, immediately after the `selected` block:

```js
// Scoped clippy: every exercise is its own bin target, so this lints one 5-line file, not
// 94 crates — measured at 0.35s. JSON format carries the lint NAME, which the prose quotes.
const parseClippyJson = (text) => {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('{')) continue;
    let j;
    try { j = JSON.parse(line); } catch (e) { continue; }
    if (j.reason !== 'compiler-message') continue;
    const m = j.message;
    if (!m || m.level !== 'warning' || !m.code) continue;
    out.push({ code: m.code.code, message: m.message, line: m.spans?.[0]?.line_start ?? null });
  }
  return out;
};

const clippyFor = async (name) => {
  try {
    const res = await run(
      'cargo',
      ['clippy', '--quiet', '--message-format=json', '--bin', name],
      { cwd: base + '/rustlings', timeout: 120000, maxBuffer: 8e6 },
    );
    return { ok: true, warnings: parseClippyJson(res.stdout + res.stderr) };
  } catch (e) {
    const text = (e.stdout || '') + (e.stderr || '');
    // Non-zero exit with parseable output = real compile errors, still a usable signal.
    // Non-zero with nothing readable = we genuinely do not know; must not read as clean.
    const parsed = text ? parseClippyJson(text) : [];
    return text ? { ok: true, warnings: parsed } : { ok: false, warnings: [] };
  }
};
```

- [ ] **Step 4: Verify clippy capture by hand against a file with a known lint**

```bash
cd /Users/tamnm/code/personal/rustlings
rtk proxy cargo clippy --quiet --message-format=json --bin variables5 2>&1 | grep -c compiler-message
```

Expected: `0` — `variables5` is clippy-clean (verified 2026-08-04). This confirms the clean path yields an empty warnings list rather than noise. Do **not** edit an exercise file to manufacture a lint: that would change its mtime and pollute Task 3's cutoff.

- [ ] **Step 5: Run the test suite**

```bash
cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | tail -20
```

Expected: the clippy test PASSES (vacuously if nothing is selected today — Task 5's end-to-end step exercises the populated path).

---

### Task 5: Assemble `reviewed_exercises`, hand it to the run, and deploy

**Files:**
- Modify: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js`
- Modify: `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.test.mjs`

**Interfaces:**
- Consumes: `binMap` (Task 2), `selected` (Task 3), `clippyFor` (Task 4).
- Produces: `reviewed_exercises` on the agent payload — `Array<{name, path, code, solution, clippy}>`. The brief (Task 6) consumes this.

- [ ] **Step 1: Write the failing test**

Append to `daily-lesson.workflow.test.mjs`:

```js
test('each reviewed exercise carries the owner code AND the official solution', async () => {
  const p = await runWorkflow();
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
```

- [ ] **Step 2: Run the test to verify both fail**

```bash
cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | tail -25
```

Expected: the first fails on missing fields (or passes vacuously with zero selected), the second FAILS because `debug_bin_map` is still present.

- [ ] **Step 3: Assemble the payload entries**

In `daily-lesson.workflow.js`, immediately after `clippyFor`:

```js
// The official solution path mirrors the exercise path — rustlings keeps the two trees
// parallel, so swapping the prefix is exact, not a guess.
const reviewedExercises = [];
for (const name of selected) {
  const rel = binMap[name];
  const solRel = rel.replace(/^exercises\//, 'solutions/');
  try {
    const [code, solution, clippy] = await Promise.all([
      fs.readFile(base + '/rustlings/' + rel, 'utf8'),
      fs.readFile(base + '/rustlings/' + solRel, 'utf8').catch(() => ''),
      clippyFor(name),
    ]);
    reviewedExercises.push({ name, path: rel, code, solution, clippy });
  } catch (e) {
    continue; // one unreadable exercise must not cost the other four, or the lesson
  }
}
```

- [ ] **Step 4: Wire it into the handoff and drop the scaffold**

In the `agent(...)` call: delete the `debug_bin_map: binMap,` line added in Task 2, and add `reviewed_exercises: reviewedExercises,` immediately above `cargo:`.

Then extend the prompt string — append this sentence after the `due_review` sentence:

```
'reviewed_exercises is the Rust the owner actually wrote since the last lesson: their code, rustlings\' official solution, and scoped clippy findings with real lint names. Open Track A with the brief\'s "Yesterday\'s code" block built from it — deep-review ONE exercise and give the rest a line each. clippy.ok false means UNKNOWN, never clean. When there is nothing worth saying, omit the block entirely rather than writing praise. ' +
```

Note that Task 2's test asserts on `debug_bin_map`; delete that whole test now — its job was to prove the parser, and Task 5's `e.path` assertion covers the map from here on.

- [ ] **Step 5: Run the full suite**

```bash
cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | tail -25
```

Expected: all tests PASS, including `debug_bin_map is removed before deploy`.

- [ ] **Step 6: Syntax-check, dry-run, then deploy**

```bash
cd /Users/tamnm/code/personal/loop-src
{ echo 'export default async function(){'; cat daily-lesson.workflow.js; echo '}'; } > /tmp/wfcheck.mjs
node --check /tmp/wfcheck.mjs && echo "SYNTAX OK"
npx @crewlet/loopany@latest edit loop-ms79033a-b8c219c7 --workflow-file daily-lesson.workflow.js --dry-run 2>&1 | tail -6
```

Expected: `SYNTAX OK`, then `rejections: none`. Only if both hold:

```bash
npx @crewlet/loopany@latest edit loop-ms79033a-b8c219c7 --workflow-file daily-lesson.workflow.js 2>&1 | tail -4
```

Expected: `applied[1]: workflow`.

---

### Task 6: Teach the brief what to do with the feedback

The workflow now supplies the data; this task is what turns it into a lesson section. Without it the run receives `reviewed_exercises` and has no instruction to render it.

**Files:**
- Modify: `/Users/tamnm/code/personal/loopany/daily-lesson/README.md`

**Interfaces:**
- Consumes: the `reviewed_exercises` payload shape from Task 5.
- Produces: nothing consumed by later tasks — this is the last one.

- [ ] **Step 1: Add the feedback rules to the Spec**

Insert a new block immediately after the *Sunday · Review day* section and before *Each run, in order*:

```markdown
**Code feedback on Track A.** The workflow hands over `reviewed_exercises` — every exercise
the owner finished since the last lesson, each with their `code`, rustlings' official
`solution`, and scoped `clippy` findings carrying real lint names. Turn it into a
`### Yesterday's code` block at the top of `## Track A · Rust`, above today's assignment.

- **Deep-review exactly one**, chosen in this order: the exercise with clippy warnings;
  failing that, the one whose code diverges most from the official solution; failing that,
  the newest. Say what they did well, give **one** concrete improvement as rewritten lines,
  and note how the official solution differs *only where it genuinely does*. These files are
  five lines — a mechanical diff teaches nothing.
- **One line each** for the rest.
- **Quote clippy lints by name** (`clippy::needless_return`) and explain why the rule exists.
  Clippy establishes *that* something is off; the lesson explains *why*.
- **`clippy.ok: false` means unknown, never clean.** Say nothing about lints for that
  exercise rather than implying it passed.
- **Omit the whole block when there is nothing worth saying.** A daily "looks good!" trains
  the owner to skip it, which destroys it as a channel. Silence is the correct output for a
  clean day — and early rustlings exercises mostly lint clean, so expect silence at first.
- Feedback is **read-only**: it never gates the next lesson and never spends Track A's
  ~8 minutes. Grading is unchanged.
```

- [ ] **Step 2: Record the mechanism in Current understanding**

Append to the *Current understanding* list, after the pre-fetch bullet:

```markdown
- **Code feedback is pre-fetched too.** `reviewed_exercises` carries the owner's code, the
  official `solutions/<sec>/<name>.rs`, and `cargo clippy --bin <name> --message-format=json`
  findings, for up to 5 exercises that are both in `rustlings.done` **and** modified since
  the previous lesson file's mtime. Never re-read those files or re-run clippy by hand.
  Verified 2026-08-04: scoped clippy is 0.35s, cargo replays cached diagnostics (so no
  cache-busting is needed), and `rustlings/` has **no git baseline** — the official solution
  is the only reference, there is no diff against the owner's earlier attempt.
```

- [ ] **Step 3: Add the gotcha**

Append to the *Gotchas* list:

```markdown
  - **Never edit a file under `rustlings/exercises/` yourself.** Its mtime is the cutoff that
    decides what gets reviewed; touching one makes stale work look new. Feedback is prose in
    the lesson, never an edit to the owner's code.
  - **Early exercises lint clean.** `variables5` and its neighbours produce no clippy output
    at all. That is expected, not a broken pre-fetch — clippy starts earning its keep around
    `move_semantics`.
```

- [ ] **Step 4: Append the Timeline entry**

```markdown
- **2026-08-04** — **code feedback on Track A** added. The workflow now pre-fetches
  `reviewed_exercises` (owner's code + rustlings' official solution + scoped clippy JSON) for
  exercises finished since the last lesson, and the lesson opens Track A with a
  `### Yesterday's code` review. Read-only by design — the owner rejected a daily rework step
  as a tax on a track they already overshoot. Workflow source now lives durably at
  `/Users/tamnm/code/personal/loop-src/daily-lesson.workflow.js` with a test harness beside
  it, instead of only on the server.
```

- [ ] **Step 5: Verify the brief renders and the loop still accepts it**

```bash
cd /Users/tamnm/code/personal/loopany/daily-lesson
grep -c "Yesterday's code" README.md
npx @crewlet/loopany@latest show loop-ms79033a-b8c219c7 --fields taskFile 2>&1 | tail -3
```

Expected: `grep` returns at least 1, and `taskFile` still points at this README. The brief syncs to the server on the loop's next run — no push command is needed for it.

- [ ] **Step 6: End-to-end check on the next real run**

After the next scheduled fire (09:00 Asia/Saigon):

```bash
npx @crewlet/loopany@latest log loop-ms79033a-b8c219c7 --limit 1 2>&1 | tail -10
grep -A15 "Yesterday's code" "/Users/tamnm/code/personal/loopany/daily-lesson/lessons/$(date +%F).md"
```

Expected: run outcome `ok`, and either a populated review block, or no match at all if the owner did no new exercises and everything lint-clean — both are correct outcomes. A block containing empty praise ("great job!") means Step 1's silence rule was not followed; fix the brief, not the workflow.

---

## Self-Review

**Spec coverage.** Component 1 (`reviewed_exercises` pre-fetch) → Tasks 2–5; its two-condition selection → Task 3; the cap → Tasks 3 and 5's tests; name→path from `Cargo.toml` → Task 2; the `ok:false` = unknown rule → Task 4 test and Task 6 Step 1; best-effort failure policy → try/catch in every task's implementation step. Component 2 (the `### Yesterday's code` block) → Task 6. "What deliberately does not change" → asserted by omission: no task touches grading, `lesson-web.py`, or `stateSchema`. The spec's verification list maps to Task 2 Step 5, Task 3 Step 5, Task 4 Step 4, Task 5 Step 6, and Task 6 Step 6.

**Type consistency.** `parseBinMap` → `binMap` (Task 2) is consumed by name in Tasks 3 and 5. `selected: string[]` (Task 3) is consumed in Task 5's loop. `clippyFor(name)` returning `{ok, warnings[]}` (Task 4) is stored unchanged as `clippy` in Task 5. The payload key is `reviewed_exercises` (snake_case, matching every other key in the handoff) while the JS variable is `reviewedExercises` (camelCase, matching `streakBeforePrev` and `dueReview`) — deliberate and consistent with the existing file.

**Known scaffold.** `debug_bin_map` is introduced in Task 2 purely to make the parser testable and is explicitly deleted in Task 5 Step 4, with a test that fails if it survives to deploy.
