# Per-concept Evidence Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The daily-lesson workflow derives each concept's evidence level and review rung from
`attempts:` records in lesson front-matter, and review day moves from Sunday to Friday.

**Architecture:** All new logic is pure functions in one marker-delimited block inside
`loop-src/daily-lesson.workflow.js`; the test harness slices that block out by its markers (the
same technique `loadTimingModule` / `loadClippyModule` already use) and unit-tests it. The
workflow body then wires the block into the existing history loop and agent payload. The brief
(`loopany/daily-lesson/README.md`) carries the contract the agent follows.

**Tech Stack:** Node ESM workflow script run by the loopany host; `node:test` + `node:assert/strict`.
No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-04-evidence-levels-design.md`

## Global Constraints

- The loopany host kills the whole workflow at 30s. New code does no external calls, and **never
  throws** — a throw means the run gets no prefetched data at all.
- Absolute paths only, built from the existing `base` constant (the harness rewrites `base`).
- Never touch mtimes under `rustlings/exercises/`. Never hand-edit files in
  `loopany/daily-lesson/lessons/`. The brief `loopany/daily-lesson/README.md` IS edited (Task 3);
  that is the contract, not loop output.
- ID regex: `(rs|b1|chess|ds)\.[a-z0-9_-]+`. `rs.<exercise>` IDs are valid when `<exercise>`
  is in rustlings' Cargo.toml bin list; all others must appear in backticks in the README.
- Field values: `result` ∈ `correct|partial|incorrect`, `help` ∈ `none|hint`,
  `kind` ∈ `application|retrieval`.
- Rungs: `1w`=7, `4w`=28, `12w`=84 days. Lesson ladder window ±3 days (unchanged). Concept
  ladder: due from 3 days before `due` onward, overdue included.
- Review day: `Friday`, computed in `Asia/Ho_Chi_Minh`.
- Test baseline before this work: `cd loop-src && node --test` → **30 pass / 3 fail** (the 3 are
  wall-clock selection-fixture failures, see `CLAUDE.md`). Compare against it; never "fix" them here.
- Commit messages containing backticks use **single quotes** (zsh substitutes backticks in `"…"`).

## Review Focus

1. **The agent writes colon-style records** (`- id: b1.x result: correct …`), as in an early
   preview of the design. Expected: parsed the same as `key=value`. → Task 1 test.
2. **CRLF line endings** after `lesson-web.py` writes answers back. Expected: records still parse.
   → Task 1 test.
3. **Typo or uppercase ID** (`B1.Alpha`). Expected: a parse error the agent sees, not a silent
   new concept. → Task 1 test.
4. **Same concept tested twice in one lesson.** Expected: file order decides which is latest.
   → Task 1 test.
5. **README unreadable.** Expected: `unknown_ids: null` (check did not run), never `[]`.
   → Task 1 test (`unknownIdsOf`).

## Preconditions (before Task 1)

- [ ] **P1:** `git -C /Users/tamnm/code/personal status --short`. The owner has **uncommitted
  edits** in `loop-src/daily-lesson.workflow.js` and `loopany/daily-lesson/README.md`. Stop and
  ask the owner to commit or stash them; do not commit them yourself as part of this work.
- [ ] **P2:** `git -C /Users/tamnm/code/personal switch -c feat/evidence-levels`
- [ ] **P3:** Record the baseline: `cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | tail -15`.
  Expected `# pass 30`, `# fail 3`. If it differs, stop and report — the baseline is wrong.

---

### Task 1: Evidence-levels block (pure functions) + unit tests

**Files:**
- Modify: `loop-src/daily-lesson.workflow.js` — insert the block directly after the line
  `const lessonsDir = base + '/loopany/daily-lesson/lessons';`
- Test: `loop-src/daily-lesson.workflow.test.mjs` — append a loader and tests at the end of file.

**Interfaces:**
- Produces (exact names, used by Task 2):
  - `REVIEW_DAY: 'Friday'`
  - `RUNGS: [{rung:'1w',days:7},{rung:'4w',days:28},{rung:'12w',days:84}]`
  - `parseAttempts(text: string) → { present: boolean, attempts: {id,result,help,kind}[], errors: string[] }`
  - `deriveConcepts(records: {date,id,result,help,kind}[], today: 'YYYY-MM-DD') → { [id]: { level, rung: 0|1|2, last_date, due, is_due } }`
  - `lessonLadder(history: {date,type,title}[], today, skip: Set<date>) → {date,title,type,rung,age_days,source:'lesson'}[]`
  - `conceptIdsIn(readme: string) → Set<string>`
  - `unknownIdsOf(concepts, readme: string|null, binNames: string[]) → string[] | null`
  - `isReviewDayOn(date: Date, tz: {timeZone}) → boolean`

- [ ] **Step 1: Write the failing tests.** Append to `loop-src/daily-lesson.workflow.test.mjs`:

```js
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
```

- [ ] **Step 2: Run to verify they fail.**
  Run: `cd /Users/tamnm/code/personal/loop-src && node --test --test-name-pattern='parseAttempts|deriveConcepts|lessonLadder|conceptIdsIn|isReviewDayOn' 2>&1 | tail -20`
  Expected: 9 failures, each `Could not locate the evidence-levels block in the workflow source`.

- [ ] **Step 3: Insert the block.** In `loop-src/daily-lesson.workflow.js`, directly after
  `const lessonsDir = base + '/loopany/daily-lesson/lessons';` add:

```js

// Evidence levels: per-concept attempt records in lesson front-matter, and the levels and
// review rungs derived from them (docs/superpowers/specs/2026-10-04-evidence-levels-design.md;
// the idea is Gnos's learner-tracking evidence model). Pure functions, no I/O, never throw —
// the test harness slices this block out by its two marker comments, so keep them intact.
const REVIEW_DAY = 'Friday';
const RUNGS = [{ rung: '1w', days: 7 }, { rung: '4w', days: 28 }, { rung: '12w', days: 84 }];
const DUE_SLACK_DAYS = 3;
const ID_RE = /^(rs|b1|chess|ds)\.[a-z0-9_-]+$/;
const RESULTS = ['correct', 'partial', 'incorrect'];
const HELPS = ['none', 'hint'];
const KINDS = ['application', 'retrieval'];

const isReviewDayOn = (date, tz) =>
  date.toLocaleDateString('en-US', { ...tz, weekday: 'long' }) === REVIEW_DAY;

const daysBetween = (a, b) => (Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000;
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

// Front-matter only: an `attempts:` line in the lesson body is prose, not a record. CRLF is
// normalised because lesson-web.py rewrites these files with the owner's answers.
const parseAttempts = (text) => {
  const attempts = [];
  const errors = [];
  const fm = /^---\n([\s\S]*?)\n---/.exec(text.replace(/\r\n/g, '\n'));
  const lines = fm ? fm[1].split('\n') : [];
  const start = lines.findIndex((l) => /^attempts:\s*$/.test(l));
  if (start < 0) return { present: false, attempts, errors };
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+-/.test(line)) break; // the next top-level key ends the list
    const r = {};
    // `key=value` is the contract; `key: value` is accepted because an agent copying YAML habits
    // would otherwise turn every record into a parse error.
    for (const m of line.matchAll(/(\w+)\s*[=:]\s*([^\s,]+)/g)) r[m[1]] = m[2];
    if (ID_RE.test(r.id || '') && RESULTS.includes(r.result) && HELPS.includes(r.help) && KINDS.includes(r.kind)) {
      attempts.push({ id: r.id, result: r.result, help: r.help, kind: r.kind });
    } else {
      errors.push(line.trim());
    }
  }
  return { present: true, attempts, errors };
};

// Level of each concept = its latest attempt, read against whether it was EVER cleanly
// correct before. The rung climbs only on a clean retrieval, so a hint or an application
// never moves a concept further from review. Sort is stable: same-date records keep file order.
const deriveConcepts = (records, today) => {
  const out = {};
  const prior = {};
  const ordered = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const r of ordered) {
    const c = out[r.id] || (out[r.id] = { level: null, rung: 0, last_date: null });
    const clean = r.result === 'correct' && r.help === 'none';
    if (clean && r.kind === 'retrieval' && prior[r.id]) {
      c.level = 'retained';
      c.rung = Math.min(c.rung + 1, RUNGS.length - 1);
    } else if (clean) {
      c.level = 'demonstrated';
    } else if (r.result === 'incorrect' && prior[r.id]) {
      c.level = 'needs-repair';
    } else {
      c.level = 'practicing';
    }
    if (clean) prior[r.id] = true;
    c.last_date = r.date;
  }
  for (const c of Object.values(out)) {
    c.due = addDays(c.last_date, RUNGS[c.rung].days);
    // Overdue stays due: the due date only moves on a new attempt, so a strict window would
    // drop a concept for good after one failed review-day run.
    c.is_due = daysBetween(today, c.due) <= DUE_SLACK_DAYS;
  }
  return out;
};

// The pre-cutover ladder, unchanged: every graded lesson comes back at ~1, ~4 and ~12 weeks.
// Windows are ±3 days so a rung can't be missed by landing between two review days. Lessons
// that carry attempt records are skipped — their concepts are on the concept ladder instead.
const lessonLadder = (history, today, skip) => {
  const due = [];
  for (const h of history) {
    if (h.type === 'assigned' || skip.has(h.date)) continue; // never taught-and-graded yet
    const age = daysBetween(h.date, today);
    for (const r of RUNGS) {
      if (Math.abs(age - r.days) <= DUE_SLACK_DAYS) {
        due.push({ date: h.date, title: h.title, type: h.type, rung: r.rung, age_days: age, source: 'lesson' });
      }
    }
  }
  return due;
};

// The README is the ID registry: every ID written in backticks. rustlings IDs are not listed
// there — `rs.<name>` is valid when <name> is in rustlings' own bin list.
const conceptIdsIn = (readme) =>
  new Set([...readme.matchAll(/`((?:rs|b1|chess|ds)\.[a-z0-9_-]+)`/g)].map((m) => m[1]));

// null means the README could not be read, so the check never ran — that must not read as
// "no unknown IDs".
const unknownIdsOf = (concepts, readme, binNames) => {
  if (readme === null) return null;
  const known = conceptIdsIn(readme);
  return Object.keys(concepts).filter(
    (id) => !known.has(id) && !(id.startsWith('rs.') && binNames.includes(id.slice(3))),
  );
};
// End evidence levels.
```

- [ ] **Step 3b: Remove the now-duplicate constant.** The block declares `RUNGS`; the old
  ladder further down declares the identical array (`const RUNGS = [{ rung: '1w', days: 7 }, …];`,
  ~line 82 before this task). Delete that one line only — the old `dueReview` loop keeps working
  off the block's `RUNGS` until Task 2 replaces it. Leaving it is a `SyntaxError: Identifier
  'RUNGS' has already been declared` that fails every workflow test.

- [ ] **Step 4: Run to verify they pass.**
  Run: `cd /Users/tamnm/code/personal/loop-src && node --test --test-name-pattern='parseAttempts|deriveConcepts|lessonLadder|conceptIdsIn|isReviewDayOn' 2>&1 | tail -20`
  Expected: 9 pass, 0 fail.

- [ ] **Step 5: Break-it check (the fixture must be able to go red).** One at a time, make each
  edit, run the Step 4 command, confirm the named test FAILS, then revert:
  - delete `&& prior[r.id]` from the `retained` branch → `every level transition` fails (b1.k).
  - change `<= DUE_SLACK_DAYS` in `deriveConcepts` to `Math.abs(...) <=` style
    (`Math.abs(daysBetween(today, c.due)) <= DUE_SLACK_DAYS`) → `overdue stays due` fails.
  - change `[=:]` to `=` → `parseAttempts reads front-matter records` fails.
  - change `return null` in `unknownIdsOf` to `return []` → `conceptIdsIn / unknownIdsOf` fails.
  Run `git diff --stat` afterwards: only the intended block is changed.

- [ ] **Step 6: Full suite.** `cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | tail -15`
  Expected: `# pass 39`, `# fail 3` (baseline 30/3 + 9 new). The 3 failures are the same
  selection tests as in P3.

- [ ] **Step 7: Commit.**
```bash
cd /Users/tamnm/code/personal
git add loop-src/daily-lesson.workflow.js loop-src/daily-lesson.workflow.test.mjs
git commit -m 'feat(daily-lesson): pure evidence-level derivation from attempt records

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 2: Wire the block into the workflow + Friday switch

**Files:**
- Modify: `loop-src/daily-lesson.workflow.js` — the `isReviewDay` line (~43 before Task 1, its
  comment above it), the history loop (`const history = [];` …), the ladder block
  (`const RUNGS = …` through the end of the `dueReview` loop), after the `binMap` try/catch,
  and the payload object passed to `agent(...)`.
- Modify: `loop-src/fixture/loopany/daily-lesson/lessons/2026-08-01.md`
- Create: `loop-src/fixture/loopany/daily-lesson/README.md`
- Test: `loop-src/daily-lesson.workflow.test.mjs`

**Interfaces:**
- Consumes: everything Task 1 produces.
- Produces (payload keys the brief and Task 3 rely on): `concepts` (object from
  `deriveConcepts`), `unknown_ids` (`string[] | null`), `attempt_parse_errors`
  (`{date, line}[]`), and `due_review` entries with `source: 'lesson' | 'concept'`; concept
  entries are `{ id, level, rung: '1w'|'4w'|'12w', due, source: 'concept' }`.

- [ ] **Step 1: Fixture.** Replace the whole of
  `loop-src/fixture/loopany/daily-lesson/lessons/2026-08-01.md` with (real lesson shape: title,
  date, metrics, then attempts):

```
---
type: done
title: "Lesson 1 · Rust: variables · DSA: alpha-beta pruning"
date: 2026-08-01
metrics: day=1 chess_phase=0 dsa_topics=1 structs_done=0
attempts:
  - id=b1.alpha-beta result=correct help=none kind=application
  - id=b1.not-in-readme result=partial help=hint kind=application
  - id=garbage result=maybe
---
### My answer
Here is my answer.
```

  Create `loop-src/fixture/loopany/daily-lesson/README.md`:

```
# Fixture brief

| Concept | ID |
|---|---|
| alpha-beta pruning | `b1.alpha-beta` |
```

- [ ] **Step 2: Write the failing integration test.** Append to the test file:

```js
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
```

- [ ] **Step 3: Run to verify it fails.**
  Run: `cd /Users/tamnm/code/personal/loop-src && node --test --test-name-pattern='payload carries derived' 2>&1 | tail -15`
  Expected: FAIL — `Cannot read properties of undefined (reading 'b1.alpha-beta')`.

- [ ] **Step 4: Friday switch.** Replace

```js
// Sunday = review day: no new concept, a test + a small project instead. Weekday name is
// computed in the owner's zone, not UTC, or the boundary run flips to the wrong day.
const weekday = now.toLocaleDateString('en-US', { ...tz, weekday: 'long' });
const isReviewDay = weekday === 'Sunday';
```
  with
```js
// REVIEW_DAY (Friday) = no new concept, a test + a small project instead. Weekday name is
// computed in the owner's zone, not UTC, or the boundary run flips to the wrong day.
const weekday = now.toLocaleDateString('en-US', { ...tz, weekday: 'long' });
const isReviewDay = isReviewDayOn(now, tz);
```

- [ ] **Step 5: History loop.** Replace

```js
const history = [];
for (const f of files) {
  const text = await fs.readFile(lessonsDir + '/' + f, 'utf8');
  history.push({ date: f.replace('.md', ''), type: typeOf(text), title: titleOf(text) });
}
```
  with
```js
const history = [];
const attemptRecords = [];
const attemptParseErrors = [];
const datesWithAttempts = new Set();
for (const f of files) {
  const text = await fs.readFile(lessonsDir + '/' + f, 'utf8');
  const date = f.replace('.md', '');
  history.push({ date, type: typeOf(text), title: titleOf(text) });
  const parsed = parseAttempts(text);
  if (parsed.present) datesWithAttempts.add(date);
  for (const a of parsed.attempts) attemptRecords.push({ date, ...a });
  for (const line of parsed.errors) attemptParseErrors.push({ date, line });
}
```

- [ ] **Step 6: Ladder.** Delete the old block from its comment
  `// The spaced-repetition ladder, derived — EVERY lesson comes back …` through the closing `}`
  of the `for (const h of history)` loop (the `RUNGS` const and the `dueReview` loop now live in
  the evidence block). Put in its place:

```js
// The spaced-repetition ladder, derived. Concepts with attempt records ride the concept
// ladder (rung climbs only on a clean retrieval); lessons from before attempt records existed
// keep the old date ladder. A review day draws its questions from both; the wrong-answer
// queue in the task file is only the exception list on top of it.
const concepts = deriveConcepts(attemptRecords, today);
const dueReview = [
  ...lessonLadder(history, today, datesWithAttempts),
  ...Object.entries(concepts)
    .filter(([, c]) => c.is_due)
    .map(([id, c]) => ({ id, level: c.level, rung: RUNGS[c.rung].rung, due: c.due, source: 'concept' })),
];
```
  Check `dnum` is still used (`weekNumber` uses it) — keep it.

- [ ] **Step 7: Unknown IDs.** Directly after the `binMap` try/catch block (the one ending
  `binMap = {}; // manifest unreadable …` `}`), add:

```js
// The brief is the concept-ID registry. Unreadable → null, which the agent must read as
// "the check did not run", never as "no unknown IDs".
let briefText = null;
try {
  briefText = await fs.readFile(base + '/loopany/daily-lesson/README.md', 'utf8');
} catch (e) {
  briefText = null;
}
const unknownIds = unknownIdsOf(concepts, briefText, Object.keys(binMap));
```

- [ ] **Step 8: Payload.** In the object passed to `agent(...)`, directly after
  `due_review: dueReview,` add:

```js
    concepts,
    unknown_ids: unknownIds,
    attempt_parse_errors: attemptParseErrors,
```

- [ ] **Step 9: Run the new test, then the full suite.**
  `cd /Users/tamnm/code/personal/loop-src && node --test --test-name-pattern='payload carries derived' 2>&1 | tail -15` → PASS.
  `node --test 2>&1 | tail -15` → `# pass 40`, `# fail 3`, same three selection tests as P3.
  If any other test changed state, the fixture edit broke an assumption — read its assertion
  before touching anything else.

- [ ] **Step 10: Break-it check.** Replace `lessonLadder(history, today, datesWithAttempts)`
  with `lessonLadder(history, today, new Set())` and confirm nothing in the suite goes red —
  then note in the commit body that the skip is covered only by the Task 1 unit test (the fixture
  lesson is too old to sit on a lesson rung). Revert. Then delete the `unknown_ids:` payload line,
  confirm the integration test fails, revert.

- [ ] **Step 11: Commit.**
```bash
cd /Users/tamnm/code/personal
git add loop-src/daily-lesson.workflow.js loop-src/daily-lesson.workflow.test.mjs \
  loop-src/fixture/loopany/daily-lesson/lessons/2026-08-01.md loop-src/fixture/loopany/daily-lesson/README.md
git commit -m 'feat(daily-lesson): hand concepts, unknown_ids and attempt_parse_errors to the run; review day is Friday

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 3: The contract — agent prompt + brief

**Files:**
- Modify: `loop-src/daily-lesson.workflow.js` — the prompt string inside `agent(...)`.
- Modify: `loopany/daily-lesson/README.md` (the brief).
- Modify: `CLAUDE.md` (repo root) — test counts.
- Test: `loop-src/daily-lesson.workflow.test.mjs`

**Interfaces:**
- Consumes: the payload keys from Task 2; the ID namespaces from Global Constraints.

- [ ] **Step 1: Failing test — the brief registers every concept the curriculum names.** Append:

```js
test('the real brief registers IDs for every B1 part 2 concept, every ds:: structure and chess phases 0-8', async () => {
  const { conceptIdsIn } = await loadEvidenceModule();
  const brief = await fs.readFile(path.join(here, '..', 'loopany/daily-lesson/README.md'), 'utf8');
  const ids = conceptIdsIn(brief);
  const expected = [
    'b1.bitboards', 'b1.minimax', 'b1.alpha-beta', 'b1.memoization', 'b1.iterative-deepening',
    'b1.move-ordering', 'b1.zobrist', 'b1.transposition-tables',
    'b1.big-o', 'b1.arrays', 'b1.linked-lists', 'b1.stacks', 'b1.queues', 'b1.hashing',
    'b1.trees-bst', 'b1.heaps', 'b1.graphs', 'b1.sorting', 'b1.recursion',
    'ds.vec', 'ds.stack', 'ds.binary-heap', 'ds.hashmap', 'ds.queue', 'ds.linked-list', 'ds.bst', 'ds.graph',
    ...Array.from({ length: 9 }, (_, n) => `chess.p${n}`),
  ];
  assert.deepEqual(expected.filter((id) => !ids.has(id)), []);
});

test('the prompt names Friday and the new payload keys, and no longer says Sunday', async () => {
  const src = await fs.readFile(SRC, 'utf8');
  const prompt = src.slice(src.indexOf('await agent('));
  for (const s of ['FRIDAY', 'concepts', 'unknown_ids', 'attempt_parse_errors', "source 'concept'", 'Attempt records']) {
    assert.ok(prompt.includes(s), `prompt is missing ${s}`);
  }
  assert.ok(!/Sunday|SUNDAY/.test(prompt), 'prompt still mentions Sunday');
});
```

  Run: `cd /Users/tamnm/code/personal/loop-src && node --test --test-name-pattern='real brief registers|prompt names Friday' 2>&1 | tail -15`
  Expected: both FAIL (missing IDs; prompt missing `FRIDAY`).

- [ ] **Step 2: Prompt.** In the `agent(...)` prompt string make these exact replacements:
  - `'is_review_day true means it is SUNDAY: follow the brief\'s "Sunday · Review day" section instead of the ' +`
    → `'is_review_day true means it is FRIDAY: follow the brief\'s "Friday · Review day" section instead of the ' +`
  - Replace the three lines starting `'due_review is the spaced-repetition ladder already computed — every past lesson now sitting at its ~1w, ~4w or ~12w ' +`
    through `'file\'s Review queue is only the wrong-answer exceptions layered on top, and Retired items are dropped from the draw. ' +` with:
```js
    'due_review is the spaced-repetition ladder already computed. Entries with source \'concept\' come from attempt records — concepts[id] holds that concept\'s level (practicing, demonstrated, retained, needs-repair), rung and due date; entries with source \'lesson\' are lessons from before attempt records existed, still on the old ~1w/~4w/~12w date ladder. ' +
    'Draw the older questions and the small project from both; the task file\'s Review queue is the exception list layered on top — a concept whose level is needs-repair goes into it like a wrong answer — and Retired items are dropped from the draw. ' +
    'When you grade prev_lesson, write its attempts: front-matter exactly as the brief\'s "Attempt records" paragraph says. unknown_ids lists attempt IDs the brief does not register — name them in your report (null means the brief was unreadable, so the check did not run); attempt_parse_errors lists record lines that did not parse — name them, never rewrite an older lesson. ' +
```
  - In the Waitzkin sentence: `Preserve the existing Sunday, shrink,` → `Preserve the existing Friday review-day, shrink,`

- [ ] **Step 3: Brief — concept IDs.** In `loopany/daily-lesson/README.md`:
  - Directly before the line `**Curriculum.**`, add:
```
**Concept IDs.** Every concept has an ID in backticks: `b1.<slug>`, `ds.<struct>`,
`chess.p<n>`, and `rs.<exercise>` for rustlings (the exercise name itself — not listed here,
the workflow checks it against rustlings' bin list). **An ID is never renamed or reused:** a
renamed concept gets a new ID and the old one stays. The workflow reads IDs out of this file;
an attempt naming one it cannot find comes back in `unknown_ids`.

```
  - B1 Part 1 list: after each topic, add its ID in backticks: complexity & Big-O `b1.big-o`
    → arrays & dynamic arrays (amortized growth) `b1.arrays` → linked lists `b1.linked-lists`
    → stacks `b1.stacks` → queues `b1.queues` → hashing `b1.hashing` → trees & BST
    `b1.trees-bst` → heaps `b1.heaps` → graphs (representations, BFS/DFS) `b1.graphs` →
    sorting `b1.sorting` → recursion & divide-and-conquer `b1.recursion`.
  - B1 Part 2 table: add an `ID` column after `Concept` (header `| Concept | ID | Hand exercise (forward) | …`,
    separator gains one `|---`), with rows in order: `b1.bitboards`, `b1.minimax`,
    `b1.alpha-beta`, `b1.memoization`, `b1.iterative-deepening`, `b1.move-ordering`,
    `b1.zobrist`, `b1.transposition-tables`.
  - B2 table: add an `ID` column after `Structure`: `ds.vec`, `ds.stack`, `ds.binary-heap`,
    `ds.hashmap`, and for the combined row `` `ds.queue`, `ds.linked-list`, `ds.bst`, `ds.graph` ``.
  - Chess roadmap table: add an `ID` column after `Phase`: `chess.p0` … `chess.p8`.

- [ ] **Step 4: Brief — attempt records.** In grading step 1, directly after the paragraph that
  ends `queue is dropped from it either way.`, add:
```
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
```

- [ ] **Step 5: Brief — the ladder.** Replace the bullet starting
  `- **The ladder — every concept, not just the failures.** Spacing is derived, not stored:`
  (through `concept that is simply being reviewed on time.`) with:
```
- **The ladder — every concept, not just the failures.** `due_review` holds two kinds of
  entry. `source: concept` is a concept with attempt records, due by its rung: it climbs
  ~1 → ~4 → ~12 weeks **only** when answered `correct` with `help=none` as a `retrieval`;
  anything else keeps its rung and restarts the clock, and an overdue concept stays due until
  it is asked. `concepts[id].level` says where it stands — `practicing`, `demonstrated`,
  `retained`, or `needs-repair` (was solid, now wrong). `source: lesson` is a lesson from
  before attempt records existed, still on the old date ladder (~1, ~4, ~12 weeks after it was
  taught). Nothing needs writing down for an item that is simply being reviewed on time.
```
  And in the wrong-answer-queue bullet, after the `**Wrong → sooner.**` sub-bullet, add:
```
  - **Needs repair → queue.** A concept whose `level` is `needs-repair` joins *Review queue*
    exactly like a wrong answer (same cap of 3).
```

- [ ] **Step 6: Brief — Friday.** Replace "Sunday" with "Friday" (and "Sundays" with "Fridays")
  in **rules** only: the TOC comment (`# 4. curriculum + Sunday + code-feedback`), grading step 1
  (`Grading a Sunday review day`, `whichever Sunday assigned`, `that Sunday pulled`), step 2
  (`**Sunday?**`, *Sunday · Review day*), the B2 table and the paragraph under it, the whole
  *Sunday · Review day* section, and the queue bullets. **Leave dated history alone** — the
  Timeline, *Current understanding* notes and any line carrying a date (e.g. `Sunday 10-04`) are
  records of what happened. Then:
  `grep -n -i 'sunday' /Users/tamnm/code/personal/loopany/daily-lesson/README.md`
  — every remaining hit must be a dated record. Paste the list into the commit body.

- [ ] **Step 7: CLAUDE.md.** In `/Users/tamnm/code/personal/CLAUDE.md` update the test line to the
  real counts: `node --test        # 45 tests. Baseline is 42 pass / 3 fail (see below), not 45/0.`
  (verify the numbers in Step 8 first and use those).

- [ ] **Step 8: Full suite.** `cd /Users/tamnm/code/personal/loop-src && node --test 2>&1 | tail -15`
  Expected: `# pass 42`, `# fail 3` (same three).

- [ ] **Step 9: Commit.**
```bash
cd /Users/tamnm/code/personal
git add loop-src/daily-lesson.workflow.js loop-src/daily-lesson.workflow.test.mjs loopany/daily-lesson/README.md CLAUDE.md
git commit -m 'docs(daily-lesson): attempt-record contract, concept IDs, Friday review day

<paste the remaining Sunday grep hits here>

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>'
```

---

### Task 4: Dry-run against the live loop (no apply without the owner)

**Files:** none modified.

- [ ] **Step 1:** Find the loop id: `loopany loops` → the `Rust + DSA — Daily Lesson` row.
- [ ] **Step 2:** `cd /Users/tamnm/code/personal/loop-src && npx @crewlet/loopany@latest edit <loop-id> --workflow-file daily-lesson.workflow.js --dry-run`
  Expected: the diff shows the evidence block, the history/ladder changes and the prompt edits,
  and nothing else. Any parse/validation error → stop and report.
- [ ] **Step 3:** Run the workflow against the **real tree** via the existing
  `smoke test against the real tree` test: `node --test --test-name-pattern='smoke test against the real tree'`
  → PASS. Real lessons carry no `attempts:` yet, so expect `concepts: {}`, `unknown_ids: []`.
- [ ] **Step 4:** STOP. Report the dry-run output to the owner and ask before applying (the
  next fire is 09:00 Asia/Ho_Chi_Minh; a broken workflow costs a real lesson day). Applying is
  the same command without `--dry-run`, run only on an explicit yes.
- [ ] **Step 5 (after apply, next two runs):** the first graded lesson carries `attempts:` in its
  front-matter, and `loopany log <loop-id>` for the run after it shows non-empty `concepts`.
