const fs = await import('node:fs/promises');
const { execFile } = await import('node:child_process');
const { promisify } = await import('node:util');
const run = promisify(execFile);

// The loopany host kills the ENTIRE workflow — not just one block inside it — after
// LOOPANY_WORKFLOW_TIMEOUT_SECONDS seconds, which defaults to 30 (@crewlet/loopany/dist/workflow.js:
// `TIMEOUT_MS = (Number(process.env.LOOPANY_WORKFLOW_TIMEOUT_SECONDS) || 30) * 1000`). The
// LaunchAgent plist (~/Library/LaunchAgents/ai.loopany.daemon.plist) sets only PATH, so this
// default stands in production. WORKFLOW_START anchors every per-call budget below to wall-clock
// time actually spent in THIS run — raising any per-call timeout past what remainingMs() below
// says is left is meaningless, because the host kills the whole process first, prefetch and all.
const WORKFLOW_START = Date.now();
const HOST_TIMEOUT_MS = 30000;

// Held back from every remainingMs() calculation below for everything that ISN'T the external
// command being budgeted right then: node/module startup, the ~6 lesson-file reads + stat calls,
// the rustlings state/manifest reads, the rust-dsa source walk, and the final `await agent(...)`
// hand-off. None of that is
// individually slow, but none of it is free either, and all of it happens AROUND the two
// external-command budgets below, never inside them. 5000ms sits comfortably above everything
// that work has measured at.
const BASE_RESERVE_MS = 5000;

// Milliseconds left before the host's hard kill, minus `reserve` (defaults to BASE_RESERVE_MS).
// Passing a larger reserve holds back extra headroom for work that still has to happen after the
// call being budgeted — see CARGO_TEST_HARD_CAP_MS below. Never negative: callers that skip a
// call once this hits 0 depend on that floor.
const remainingMs = (reserve = BASE_RESERVE_MS) =>
  Math.max(0, HOST_TIMEOUT_MS - (Date.now() - WORKFLOW_START) - reserve);

const base = '/Users/tamnm/code/personal';
const lessonsDir = base + '/loopany/daily-lesson/lessons';

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
const isDate = (d) => Number.isFinite(Date.parse(d + 'T00:00:00Z'));

// Front-matter only: an `attempts:` line in the lesson body is prose, not a record. CRLF is
// normalised because lesson-web.py rewrites these files with the owner's answers.
const parseAttempts = (text) => {
  const attempts = [];
  const errors = [];
  const fm = /^---\n([\s\S]*?)\n---/.exec(text.replace(/\r\n/g, '\n'));
  const lines = fm ? fm[1].split('\n') : [];
  const start = lines.findIndex((l) => /^attempts:/.test(l));
  if (start < 0) return { present: false, attempts, errors };
  // An inline value (`attempts: [ … ]`) is not the contract: present, and an error, so it shows
  // up in attempt_parse_errors instead of reading as "no records".
  if (!/^attempts:\s*$/.test(lines[start])) errors.push(lines[start].trim());
  for (const line of lines.slice(start + 1)) {
    if (!/^\s*-/.test(line)) break; // the next top-level key ends the list; YAML allows `- ` at col 0
    const r = {};
    // One pair of surrounding quotes is YAML string habit, not part of the record.
    const item = line.trim().replace(/^-\s*/, '').replace(/^(["'])(.*)\1$/, '$2');
    // `key=value` is the contract; `key: value` is accepted because an agent copying YAML habits
    // would otherwise turn every record into a parse error.
    for (const m of item.matchAll(/(\w+)\s*[=:]\s*([^\s,]+)/g)) r[m[1]] = m[2];
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
  // An impossible date (`2026-13-45.md`) would make addDays throw a RangeError; skip it.
  const ordered = records.filter((r) => isDate(r.date)).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
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
    c.rung_label = RUNGS[c.rung].rung;
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
//
// A held day copies the previous weekday lesson verbatim and only bumps the lesson NUMBER, so
// the ladder sees N separate "lessons" that are one concept served once. Measured 2026-09-17:
// Sunday 09-20's 1w rung was SIX byte-identical held copies of the 08-27 Zobrist lesson plus one
// skipped Sunday — 14 due items of which 10 carried no information. The absence makes it worse
// weekly, because today's held copies reach the 4w rung a month from now.
// Dedupe on the topic (the title with its `Lesson N ·` / `Review week N ·` prefix stripped),
// per rung, keeping the EARLIEST date — the day that topic was actually served. Purely
// mechanical; which of the survivors is worth asking stays the run's judgment.
const topicOf = (title) =>
  (title || '').replace(/^"?(?:Lesson|Review week)\s+\d+\s*·\s*/, '').trim();
const lessonLadder = (history, today, skip) => {
  const dueSeen = new Map();
  // Sorted by date ascending so the first hit for a key is the earliest serve, whatever the
  // caller's order.
  const sorted = [...history].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (const h of sorted) {
    if (h.type === 'assigned' || skip.has(h.date)) continue; // never taught-and-graded yet
    if (!isDate(h.date)) continue; // an impossible file date is not on any rung
    const age = daysBetween(h.date, today);
    for (const r of RUNGS) {
      if (Math.abs(age - r.days) <= DUE_SLACK_DAYS) {
        const key = r.rung + '\u0000' + topicOf(h.title);
        if (dueSeen.has(key)) continue;
        dueSeen.set(key, { date: h.date, title: h.title, type: h.type, rung: r.rung, age_days: age, source: 'lesson' });
      }
    }
  }
  return [...dueSeen.values()];
};

// The concept half of due_review: due concepts only, most overdue first (ISO dates sort as text).
const conceptLadder = (concepts) =>
  Object.entries(concepts)
    .filter(([, c]) => c.is_due)
    .map(([id, c]) => ({ id, level: c.level, rung: c.rung_label, due: c.due, source: 'concept' }))
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));

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

// Today in the owner's timezone. The run fires at 09:00 Asia/Saigon (cron `0 9 * * *`);
// Asia/Ho_Chi_Minh is the same zone, kept here as the canonical IANA name.
const tz = { timeZone: 'Asia/Ho_Chi_Minh' };
const now = new Date();
const today = now.toLocaleDateString('en-CA', tz);
// REVIEW_DAY (Friday) = no new concept, a test + a small project instead. Weekday name is
// computed in the owner's zone, not UTC, or the boundary run flips to the wrong day.
const weekday = now.toLocaleDateString('en-US', { ...tz, weekday: 'long' });
const isReviewDay = isReviewDayOn(now, tz);

let files = [];
try {
  files = (await fs.readdir(lessonsDir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort();
} catch (e) {
  files = []; // no lessons yet — agent bootstraps
}

const typeOf = (text) => (/^type:\s*(\S+)/m.exec(text) || [])[1] || null;
const titleOf = (text) => ((/^title:\s*(.+)$/m.exec(text) || [])[1] || '').trim() || null;
const answerOf = (text) =>
  ((/^#{2,3} My answer\s*\n([\s\S]*?)(?=^#{1,3} )/m.exec(text) || [])[1] || '').trim();

// The lesson file's `metrics: k=v k=v` front-matter line — the loop's own store for the four
// CUMULATIVE numbers (`day`, `chess_phase`, `dsa_topics`, `structs_done`) that no run can derive
// from disk. It exists because the obvious store, the host cursor, does NOT work here: `prev` is
// the workflow's OWN returned `state` (host dist/workflow.js:11, runner.js:265 `cursor =
// wf.result.state`), and the escalation path below ends `return {}`, so every agent day persists
// an UNDEFINED cursor. The hold gate keyed on `prev` was therefore chicken-and-egg by
// construction — it could only fire the day after a hold day had already fired, so it never fired
// at all (four eligible days, 2026-09-08 → 09-11, all woke the agent at ~$1.50 apiece).
// Returning a cursor from the escalation path would fix `prev`, but the cursor is also what the
// server reads as the run's `state`, so it risks clobbering the metrics the agent reports on a day
// the owner actually shows up and `chess_phase` moves — the one day being wrong matters most.
// The lesson file is the medium both the agent and this workflow already read and write, so the
// numbers live there instead: the agent writes the line every day (Spec, *Front-matter
// convention*), a hold day below carries it forward, and a missing/garbled line simply declines
// the hold and wakes the agent. Null = no line = decline.
const metricsOf = (text) => {
  const line = (/^metrics:\s*(.+)$/m.exec(text) || [])[1];
  if (!line) return null;
  const out = {};
  for (const m of line.matchAll(/([a-z_]+)=(-?\d+(?:\.\d+)?)/g)) out[m[1]] = Number(m[2]);
  return out;
};

// Duplicate same-day wake: today's lesson is already issued and still `assigned`,
// so there is nothing to grade and nothing to write. Silent tick, no agent.
if (files.includes(today + '.md')) {
  const text = await fs.readFile(lessonsDir + '/' + today + '.md', 'utf8');
  if (typeOf(text) === 'assigned') return {};
}

// Every lesson's date + graded type + title — the agent's `ls lessons/` opener, done once
// here. `title` is what a review day builds its questions from without re-reading the week.
const history = [];
const attemptRecords = [];
const attemptParseErrors = [];
const datesWithAttempts = new Set();
for (const f of files) {
  const text = await fs.readFile(lessonsDir + '/' + f, 'utf8');
  const date = f.replace('.md', '');
  history.push({ date, type: typeOf(text), title: titleOf(text) });
  const parsed = parseAttempts(text);
  // Only real records move a lesson off the date ladder — an empty or all-malformed list would
  // otherwise drop it from review with nothing on the concept ladder to replace it.
  if (parsed.attempts.length > 0) datesWithAttempts.add(date);
  for (const a of parsed.attempts) attemptRecords.push({ date, ...a });
  for (const line of parsed.errors) attemptParseErrors.push({ date, line });
}

// Week 1 is the first 7 days from the first lesson ever. Only used to label a review day.
const dnum = (s) => Date.parse(s + 'T00:00:00Z') / 86400000;
const weekNumber = history.length
  ? Math.floor((dnum(today) - dnum(history[0].date)) / 7) + 1
  : 1;

// The spaced-repetition ladder, derived. Concepts with attempt records ride the concept
// ladder (rung climbs only on a clean retrieval); lessons without attempt records
// keep the old date ladder. A review day draws its questions from both; the wrong-answer
// queue in the task file is only the exception list on top of it.
const concepts = deriveConcepts(attemptRecords, today);
const dueReview = [
  ...lessonLadder(history, today, datesWithAttempts),
  ...conceptLadder(concepts),
];

// Yesterday's lesson — the one this run grades.
let prevLesson = null;
const prevName = files.filter((f) => f < today + '.md').pop();
if (prevName) {
  const text = await fs.readFile(lessonsDir + '/' + prevName, 'utf8');
  prevLesson = {
    path: 'lessons/' + prevName,
    date: prevName.replace('.md', ''),
    type: typeOf(text),
    track_b_answer: answerOf(text), // empty string = owner never filled it in = B skipped
    metrics: metricsOf(text), // null = the line is missing; the agent must write one today
    text,
  };
}

// Calendar days between the last lesson and today with no lesson at all. Non-zero means a
// run FAILED — the owner never saw a lesson those days, so they are not owner skips.
let gapDays = 0;
if (prevLesson) {
  const d = (s) => Date.parse(s + 'T00:00:00Z');
  gapDays = Math.max(0, Math.round((d(today) - d(prevLesson.date)) / 86400000) - 1);
}

// Streak over the ALREADY-graded lessons: trailing run of done|partial, newest first,
// stopping at the first `skipped`. Trailing `assigned` entries (today's, and yesterday's
// which this run is about to grade) are skipped, and missing days are ignored, not breaks.
// The agent adds 1 if it grades prev_lesson done|partial.
let streakBeforePrev = 0;
for (let i = history.length - 1; i >= 0; i--) {
  const t = history[i].type;
  if (t === 'assigned') continue;
  if (t === 'done' || t === 'partial') streakBeforePrev++;
  else break;
}

// The mirror of streakBeforePrev: the trailing run of `skipped`, newest first, over the
// already-graded lessons. Same contract — `assigned` entries are skipped, so prev_lesson
// (which this run is about to grade) is NOT counted and the agent adds 1 itself if it
// grades prev `skipped`. Exactly one of these two counters is ever non-zero.
//
// This exists because "how many zero days in a row" is the number the brief's shrink ladder
// now keys on, and every run was re-deriving it by eyeballing `history`. It is the signal
// that tells a difficulty problem (shrink) apart from an absence (don't) — three runs in a
// row shrank a lesson that had been landing for 13 straight days, which is the wrong lever
// for someone who simply wasn't there.
let consecutiveSkips = 0;
for (let i = history.length - 1; i >= 0; i--) {
  const t = history[i].type;
  if (t === 'assigned') continue;
  if (t === 'skipped') consecutiveSkips++;
  else break;
}

// rustlings progress: the state file lists every exercise rustlings recorded as passing.
// Line 1 is a "DON'T EDIT" header, the first name after it is the current exercise,
// the rest are done. Blank lines are noise. Instant, and no 94-crate recompile.
let currentExercise = null;
let doneExercises = [];
try {
  const raw = await fs.readFile(base + '/rustlings/.rustlings-state.txt', 'utf8');
  const names = raw.split('\n').map((s) => s.trim()).filter(Boolean).slice(1);
  currentExercise = names[0] ?? null;
  doneExercises = names.slice(1);
} catch (e) {
  currentExercise = null; // rustlings/ missing or unreadable — agent bootstraps / falls back to check-all
}

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

// The brief is the concept-ID registry. Unreadable → null, which the agent must read as
// "the check did not run", never as "no unknown IDs".
let briefText = null;
try {
  briefText = await fs.readFile(base + '/loopany/daily-lesson/README.md', 'utf8');
} catch (e) {
  briefText = null;
}
const unknownIds = unknownIdsOf(concepts, briefText, Object.keys(binMap));

// The next exercises in rustlings' OWN order — the one thing every run went hunting for by
// hand. Run 7 spent five shell commands on it (`ls exercises/`, greps over `info.toml`, then
// over Cargo.toml's names, then over its paths) and then `cat`-ed the sources on top; run 5
// guessed instead and got it wrong — it assumed `if3 → primitive_types1` and missed `quiz1`,
// which lives in `exercises/quizzes/` and in no section dir, so the owner could not reach the
// "done when" the lesson stated. Cargo.toml's bin list IS the exercise order and `binMap`
// already holds it (string-key insertion order is spec-guaranteed), so this costs one
// `Object.keys` plus six small reads. Source text rides along so the run doesn't `cat` either.
const NEXT_COUNT = 6;
const CODE_CAP = 3000;
const binOrder = Object.keys(binMap);
const nextExercises = [];
if (currentExercise) {
  const at = binOrder.indexOf(currentExercise);
  // at < 0 means the state file names an exercise the manifest doesn't — hand over nothing
  // rather than a wrong slice, and let the agent fall back to reading the bin list itself.
  if (at >= 0) {
    for (const name of binOrder.slice(at, at + NEXT_COUNT)) {
      const rel = binMap[name];
      let code = null;
      try {
        code = (await fs.readFile(base + '/rustlings/' + rel, 'utf8')).slice(0, CODE_CAP);
      } catch (e) {
        code = null; // unreadable — name + path still tell the run what to assign
      }
      // owner_modified is filled in below, once `since` is known. Defaulted to false here so
      // the key is always present — an absent key reads as "no attempt" to the agent either
      // way, but a missing one invites it to go stat the file itself, which is the hand-work
      // this field exists to remove.
      nextExercises.push({ name, path: rel, code, owner_modified: false });
    }
  }
}

// Which exercises the owner actually worked on since the last lesson. BOTH conditions are
// required: the done list alone cannot tell yesterday's work from last week's, and mtime
// alone would surface a file they opened but never got passing.
// The cutoff is the previous lesson file's own BIRTHTIME, not its mtime. The lesson file gets
// rewritten after it is issued — twice over: the next run's grading pass flips its `type:`
// front-matter, and the owner's lesson page writes their typed answers back into the same
// file at any hour. mtime therefore means "last touched", not "when issued": if the owner
// does rustlings work at 20:00 and then answers Track B at 22:00, an mtime cutoff would move
// to 22:00 and silently drop their 20:00 work. Birthtime is safe here specifically because
// this pre-fetch runs BEFORE grading — at this point the previous lesson has not yet been
// rewritten, so its birthtime still reflects its issue time. (A later grading pass resets
// birthtime, which is exactly why this is only trustworthy for the not-yet-graded previous
// lesson, never for older history entries.)
// Fall back to mtime when birthtime is absent/zero or reports later than mtime — some
// filesystems don't record birthtime at all and report garbage instead.
let since = 0;
if (prevName) {
  try {
    const st = await fs.stat(lessonsDir + '/' + prevName);
    since = st.birthtimeMs;
    if (!since || since > st.mtimeMs) since = st.mtimeMs;
  } catch (e) {
    since = 0; // unreadable — fall through to reviewing nothing rather than everything
  }
}

// Did the owner WRITE into an exercise rustlings has not yet recorded as done? That is a
// different state from both "done" and "never opened", and the loop had no field for it.
// 2026-08-22: `quiz2` was complete and correct in next_exercises[0].code — signature and the
// `use` both fixed — yet `current_exercise` was still `quiz2`, because rustlings only ticks an
// exercise whose watcher has actually executed it. The run had to infer "this is a finished
// attempt, not the pristine exercise" by reading the code and guessing, and the Spec had to
// carry a standing note telling it to. mtime settles it as a fact: owner_modified true with the
// name absent from rustlings.done means PRESENCE one keystroke short of a pass, which the
// absence rules must never score as a miss.
//
// Same cutoff, same reasoning as `reviewed_exercises` above — the previous lesson's birthtime.
// Deliberately NOT combined with the done-list check that `selected` makes: this field is for
// exercises that are precisely NOT done yet, so the two are complements, not variants.
if (since > 0) {
  for (const ex of nextExercises) {
    try {
      const st = await fs.stat(base + '/rustlings/' + ex.path);
      ex.owner_modified = st.mtimeMs > since;
    } catch (e) {
      ex.owner_modified = false; // file gone — never claim an attempt we cannot see
    }
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

const walkRs = async (dir, rel) => {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    return out; // directory absent (no tests/ yet) — not an error, just nothing to hand over
  }
  for (const ent of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const r = rel + '/' + ent.name;
    if (ent.isDirectory()) out.push(...(await walkRs(dir + '/' + ent.name, r)));
    else if (ent.name.endsWith('.rs')) out.push(r);
  }
  return out;
};

const rsPaths = [
  ...(await walkRs(base + '/rust-dsa/src', 'src')),
  ...(await walkRs(base + '/rust-dsa/tests', 'tests')),
];

// Did the OWNER open the chess crate since the last lesson was issued? This is the exact
// mirror of `reviewed_exercises` for Track A's rustlings half, and it answers the one question
// six days of shrinking the chess step never asked: is the step too big, or is the file never
// opened at all? On 2026-08-20 every .rs under the crate still carried an mtime of 08-18 09:01
// — the RUN's own write — while rustlings advanced daily, so a one-line `piece_at` had been
// re-assigned three times to a file nobody had opened. Shrinking cannot fix that; only the
// brief's chess-half absence rule can, and it keys on this flag.
//
// The run's own crate edits are excluded BY CONSTRUCTION, not by filtering: `since` is the
// PREVIOUS lesson file's birthtime, and the brief's step order writes the day's failing test
// (step 2) BEFORE the lesson file (step 3), so a run-authored edit always lands before the
// cutoff it will be compared against tomorrow. Keep that order — inverting it turns every
// carried-forward day into a false "owner touched it".
//
// Stats every walked path, deliberately independent of the RS_TOTAL_CAP read loop below: a
// file dropped for size still counts as touched, and this must never under-report absence.
const rsTouched = [];
if (since > 0) {
  for (const rel of rsPaths) {
    try {
      const st = await fs.stat(base + '/rust-dsa/' + rel);
      if (st.mtimeMs > since) rsTouched.push(rel);
    } catch (e) {
      continue; // file gone — skip it, never fail the run
    }
  }
}

// The Spec's "empty room" test, computed once. THREE live rules key on it — whether a blank
// `### My answer` counts as the owner's decision or as an empty room, whether to re-ask the
// crate Q1, and (with consecutive_skips) whether a zero day is absence at all — and the runs of
// 08-24, 08-25 and 08-26 each re-derived it by hand from these same three arrays. It is a pure
// OR over data already gathered above, so it costs nothing and stops three prose restatements
// of one boolean from drifting apart.
//
// "rustlings.done advanced" is deliberately NOT a fourth signal: an exercise only enters `done`
// by being written AND executed by the watcher, so any advance since the cutoff already shows up
// in reviewed_exercises. Adding it would need a cursor in `prev` and would double-count.
const presenceSignals = [];
if (selected.length) presenceSignals.push('reviewed_exercises');
if (nextExercises.some((e) => e.owner_modified)) presenceSignals.push('owner_modified');
if (rsTouched.length) presenceSignals.push('rust_dsa.owner_touched');
const presence = { any: presenceSignals.length > 0, signals: presenceSignals };

// ─── Hold day: a confirmed absence re-serves the last weekday lesson, no agent ───
//
// Runs 30–36 (2026-08-29 → 09-07) each wrote a lesson whose body was BYTE-IDENTICAL to the day
// before — `diff lessons/2026-09-05.md lessons/2026-09-07.md` changes only the front matter and
// the opening note. That is not a defect: the Spec MANDATES it ("hold the step size steady",
// "don't invent variation to feel productive"). But it cost ~$1.40 of agent per copy, and
// copying a file is not judgment. So on a day where every signal says nobody was here, the copy
// happens here and the agent is never woken.
//
// The gate is deliberately narrow — it fires only when ALL of:
//   · not Friday — review day is real work (a standalone ds:: structure + a five-question test)
//   · presence.any false — no rustlings keystroke, no crate touch, nothing
//   · consecutive_skips >= 3 — the Spec's own "Absence, not difficulty" threshold
//   · gap_days 0 — a failed run has to be explained in the opening note, which needs the agent
//   · yesterday still `assigned` with an empty answer box — nothing to grade but a skip
//   · yesterday's front matter carries a parseable `metrics:` line (see below)
// Anything else — a return, a Friday, an outage, a partly-filled box — falls through to the
// agent unchanged. Friday therefore guarantees at least one fully-agent run per week, and that
// is where the brief's Timeline and Position get their range entry for the held stretch.
//
// The `metrics:` check is the safety interlock, not a formality. `chess_phase`, `dsa_topics` and
// `structs_done` are cumulative and NOT derivable from the filesystem, so without them this path
// would have to report a regression the Spec explicitly forbids. It declines and lets the agent
// run — which is also how the very first hold day after a `metrics:`-less lesson behaves, and how
// the loop self-heals if a run ever forgets the line: one agent day, which rewrites it.
// Do NOT "fix" this back to reading `prev` — see metricsOf above for why that cannot work.
const prevMetrics = prevLesson ? prevLesson.metrics : null;
const holdEligible =
  !isReviewDay &&
  !presence.any &&
  consecutiveSkips >= 3 &&
  gapDays === 0 &&
  prevLesson &&
  prevLesson.type === 'assigned' &&
  prevLesson.track_b_answer === '' &&
  prevMetrics &&
  ['day', 'chess_phase', 'dsa_topics', 'structs_done'].every((k) => Number.isFinite(prevMetrics[k]));

if (holdEligible) {
  // Carry forward the last WEEKDAY lesson, which is not always yesterday: a Friday review file
  // teaches a standalone ds:: structure and a five-question test and must never become the next day's
  // lesson. Grading still applies to prev_lesson, whichever kind it was.
  const weekdayHistory = history.filter((h) => h.date < today && !/^"?Review week/.test(h.title || ''));
  const srcEntry = weekdayHistory[weekdayHistory.length - 1] || null;
  let held = null;
  if (srcEntry) {
    const srcText = await fs.readFile(lessonsDir + '/' + srcEntry.date + '.md', 'utf8');
    const srcLines = srcText.split('\n');
    // A lesson file is: `---` front matter `---` / `# Lesson N` + opening note / `---` / body.
    // The THIRD bare `---` opens the immutable body; everything above it is rewritten below.
    let seen = 0;
    let bodyAt = -1;
    for (let i = 0; i < srcLines.length; i++) {
      if (srcLines[i] === '---' && ++seen === 3) { bodyAt = i; break; }
    }
    if (bodyAt > 0) held = { srcLines, bodyAt, title: (srcEntry.title || '').replace(/^"|"$/g, '') };
  }
  // An unexpected file shape is a reason to wake the agent, never to write a broken lesson.
  if (held) {
    const day = prevMetrics.day + 1;
    const title = held.title.replace(/Lesson \d+/, 'Lesson ' + day);
    const text = [
      '---',
      'type: assigned',
      'title: ' + JSON.stringify(title),
      'date: ' + today,
      // Carried forward so a SECOND consecutive hold day still has its interlock — without this
      // line the gate would fire exactly once per absence stretch and then decline forever.
      // Nothing moved (that is what presence.any false means), so carrying is also correct.
      'metrics: day=' + day +
        ' chess_phase=' + prevMetrics.chess_phase +
        ' dsa_topics=' + prevMetrics.dsa_topics +
        ' structs_done=' + prevMetrics.structs_done,
      '---',
      '',
      '# Lesson ' + day,
      '',
      '*Track A ~8 min · Track B ~7 min.*',
      '',
      '> Nothing has moved since the last lesson — no exercise run, no crate opened, the answer',
      '> box still empty. **Nothing is owed and nothing has stacked up**: today is the normal',
      '> size, and both tracks are held exactly where you left them. Pick it up whenever.',
      '',
      ...held.srcLines.slice(held.bodyAt),
    ].join('\n');

    // Grade yesterday first. No presence means neither track landed, which is `skipped` under
    // the Spec's own two grading rules — the same verdict the last eight agent runs reached.
    await fs.writeFile(
      lessonsDir + '/' + prevName,
      prevLesson.text.replace(/^type:\s*assigned[ \t]*$/m, 'type: skipped'),
      'utf8',
    );
    await fs.writeFile(lessonsDir + '/' + today + '.md', text, 'utf8');

    // Step 5 of the brief — a lesson nobody sees is a skipped day. Detached and unref'd because
    // lesson-web.py serves until killed while this subprocess is about to exit.
    //
    // Both paths are absolute on purpose: the workflow subprocess runs with an ALLOWLISTED env,
    // so neither $HOME nor a full $PATH can be assumed (the LaunchAgent plist sets PATH only).
    // lesson-web.py is stdlib-only, so the system interpreter is enough.
    try {
      const { spawn } = await import('node:child_process');
      spawn('/usr/bin/python3', ['/Users/tamnm/.claude/tools/lesson-web.py', '--open'], {
        detached: true,
        stdio: 'ignore',
      }).unref();
    } catch (e) {
      // Delivery failed — the file is written regardless and tomorrow's run still sees it.
    }

    return {
      message: title + ' — held, yesterday A ✗ B ✗',
      state: {
        day,
        words: text.split(/\s+/).filter(Boolean).length,
        streak: 0,
        crate_touched: 0,
        rustlings_done: doneExercises.length,
        chess_phase: prevMetrics.chess_phase,
        dsa_topics: prevMetrics.dsa_topics,
        structs_done: prevMetrics.structs_done,
      },
    };
  }
}

// Scoped clippy: every exercise is its own bin target, so this lints one 5-line file, not
// 94 crates — measured at 0.35s. JSON format carries the lint NAME, which the prose quotes.
// Cargo replays cached clippy diagnostics on repeat runs, so no cache-busting flag is used —
// and source files are never touched here, because that would corrupt the mtime cutoff above.
//
// Pedantic is intentionally ON. A sweep of every exercise the owner has actually completed
// (intro1, intro2, variables1-6, functions1-5, if1-3, quiz1 — 17 in all) found ZERO default-
// level clippy findings across the whole set: default clippy is tuned for production code
// and has nothing to say about five-line teaching exercises. `-W clippy::pedantic` surfaces
// the idiom advice a learner actually wants — if1 alone has 2 pedantic findings. Do NOT
// "clean this up" back to default clippy: that silently kills the feature again.
const PEDANTIC_ARGS = ['--', '-W', 'clippy::pedantic'];

// Pedantic is chattier than default clippy, so cap what reaches the payload. The cap is
// error-aware: warning-level entries must never crowd out error-level ones. An error means
// clippy's deny-by-default `correctness` group fired (see the note in parseClippyJson below)
// — the single most important thing we can tell the owner — so every error-level entry
// survives the cap first, and only then do warnings fill whatever slots remain. The final
// list stays in clippy's own emission order (we filter the original array by kept index,
// never re-sort by level), so "the first N in emit order" still holds whenever nothing had
// to be dropped to make room for an error.
const WARNING_CAP = 10;
const capWarnings = (warnings, capSize = WARNING_CAP) => {
  const keepIdx = new Set();
  const errorIdx = [];
  const otherIdx = [];
  warnings.forEach((w, i) => (w.level === 'error' ? errorIdx : otherIdx).push(i));
  for (const i of errorIdx) {
    if (keepIdx.size >= capSize) break;
    keepIdx.add(i);
  }
  for (const i of otherIdx) {
    if (keepIdx.size >= capSize) break;
    keepIdx.add(i);
  }
  return warnings.filter((_, i) => keepIdx.has(i));
};

const parseClippyJson = (text) => {
  const out = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('{')) continue;
    let j;
    try { j = JSON.parse(line); } catch (e) { continue; }
    if (j.reason !== 'compiler-message') continue;
    const m = j.message;
    // Do NOT narrow this to 'warning' only. Clippy's `correctness` group is deny-by-default,
    // so a real correctness violation (e.g. clippy::eq_op) arrives at level "error", not
    // "warning" — and rustlings' own pass bar is rustc/test success, which says nothing
    // about clippy, so a `done` exercise can absolutely trip one. Dropping error-level
    // entries here would make that case indistinguishable from a genuinely clean exercise:
    // both would surface as {ok:true, warnings:[]}. Keep both levels and let `level` on each
    // entry carry the distinction downstream.
    if (!m || (m.level !== 'warning' && m.level !== 'error') || !m.code) continue;
    out.push({ code: m.code.code, message: m.message, line: m.spans?.[0]?.line_start ?? null, level: m.level });
  }
  return out;
};

// The loopany host kills the WHOLE workflow — not just this block — after
// LOOPANY_WORKFLOW_TIMEOUT_SECONDS, which defaults to 30s (@crewlet/loopany/dist/workflow.js;
// the LaunchAgent plist sets only PATH, so the default stands). 8000ms is the hard cap for the
// healthy case — >20x the ~0.35s a real scoped clippy run takes. But a flat cap alone is NOT
// enough: the assembly loop above admits an exercise whenever remainingMs() > 0, which can be as
// late as just before the shared host-timeout budget is gone, and granting a flat 8000ms at that
// point could still push the whole run past the host's 30s cap. Each call's ACTUAL timeout is
// therefore Math.min(CLIPPY_TIMEOUT_MS, remainingMs()) computed FRESH at call time, not once for
// the whole loop — remaining time shrinks with every exercise already processed. Do NOT raise
// CLIPPY_TIMEOUT_MS back toward "generous" — that silently reopens the original failure.
const CLIPPY_TIMEOUT_MS = 8000;

const clippyFor = async (name) => {
  const clippyBudgetMs = Math.min(CLIPPY_TIMEOUT_MS, remainingMs());
  // Same rule as cargo test's skip guard above: child_process's `timeout: 0` means NO TIMEOUT,
  // so a spent budget must SKIP the call rather than pass 0/negative through — that would
  // silently reopen the exact bug being fixed. ok:false means UNKNOWN, never clean — a skipped
  // clippy call must NEVER report {ok: true, warnings: []}; that would tell the owner their code
  // is clean when it was never actually checked, which an earlier round of fixes exists to prevent.
  if (clippyBudgetMs <= 0) return { ok: false, warnings: [] };
  try {
    const res = await run(
      'cargo',
      ['clippy', '--quiet', '--message-format=json', '--bin', name, ...PEDANTIC_ARGS],
      { cwd: base + '/rustlings', timeout: clippyBudgetMs, maxBuffer: 8e6 },
    );
    return { ok: true, warnings: capWarnings(parseClippyJson(res.stdout + res.stderr)) };
  } catch (e) {
    const text = (e.stdout || '') + (e.stderr || '');
    // ok is UNKNOWN unless the output actually contains parseable compiler-message JSON.
    // A non-zero exit WITH such output means real compile errors — still a usable signal,
    // so ok: true. A non-zero exit with no JSON at all (e.g. cargo's own "no bin target
    // named X" manifest error) means clippy never ran — we genuinely do not know, and that
    // must never be read as "clean".
    const hasJson = text.split('\n').some((l) => l.startsWith('{'));
    if (!hasJson) return { ok: false, warnings: [] };
    return { ok: true, warnings: capWarnings(parseClippyJson(text)) };
  }
};

// cargo test's budget must fit inside whatever the host cap has left, not a fixed literal that
// can outlive the whole workflow — see WORKFLOW_START / HOST_TIMEOUT_MS / remainingMs above.
// 8000ms is the hard cap: cargo test measured 0.42s warm on this dependency-free lib crate
// (empty [dependencies], so even a cold build only compiles the crate + libtest locally, never a
// crates.io fetch) — 8000ms is ~19x that, comfortably covering a cold build of the eventual
// 8-data-structure crate without reopening the "generous enough to outlive the host's 30s box"
// bug this closes.
const CARGO_TEST_HARD_CAP_MS = 8000;
// Held back on top of BASE_RESERVE_MS so the feedback-assembly loop below still has a floor of
// budget to work with even in the worst case where cargo test uses every millisecond it's given.
// cargo test is GRADING data (it judges Track B and Friday review days) and gets first claim on
// the budget; the feedback loop is a nicety and gets only what's left — never the reverse.
const FEEDBACK_LOOP_RESERVE_MS = 3000;

let out = '';
let cargoOk = false;
let cargoWhy = null; // why ok is false when it isn't a compile failure: 'timeout' | 'skipped'
const cargoBudgetMs = Math.min(CARGO_TEST_HARD_CAP_MS, remainingMs(BASE_RESERVE_MS + FEEDBACK_LOOP_RESERVE_MS));
// child_process's `timeout: 0` means NO TIMEOUT, not "no time left" — passing 0 or a negative
// number here would silently reopen the exact bug this closes (an unbounded call that can blow
// the host's 30s cap on its own). Skip the call entirely instead: cargoOk stays false and `out`
// stays empty, the same degraded shape a genuine cargo failure already produces in the catch
// below — never a thrown error.
if (cargoBudgetMs > 0) {
  try {
    const res = await run('cargo', ['test'], { cwd: base + '/rust-dsa', timeout: cargoBudgetMs, maxBuffer: 8e6 });
    out = res.stdout + res.stderr;
    cargoOk = true;
  } catch (e) {
    out = (e.stdout || '') + (e.stderr || '') + (e.stdout || e.stderr ? '' : String(e));
    // A non-zero exit is NOT the same as "cargo didn't run", and under the chess contract it is
    // the NORMAL case: every weekday the run writes a deliberately-failing `todo!()` test into
    // the crate, so `cargo test` exits non-zero EVERY DAY by design. Keying `ok` on the exit code
    // made the grading data read as UNKNOWN on every single run — run 11 dutifully re-ran
    // `cargo test` by hand because of it, and the brief's "carry the test forward unchanged"
    // rule would have frozen the chess track outright.
    //
    // Same distinction the clippy path already draws with `hasJson`: `ok` means "cargo produced
    // parseable test output", not "everything passed". Per-test verdicts live in passing_tests /
    // failing_tests. A crate that does not COMPILE emits no `test ... ok|FAILED` and no
    // `test result:` line at all, so it still lands on ok:false — which is exactly right, because
    // that is the case where grading really is blind.
    cargoOk = /^test (?:\S+ \.\.\. (?:ok|FAILED)|result:)/m.test(out);
    // 2026-09-25: target/ had vanished, so the prefetch hit a cold build right after a wake from
    // sleep, got killed at its budget, and handed over ok:false with every field empty — which
    // reads exactly like a crate that won't compile. Name the kill so the run knows it's a cold
    // build, not broken code.
    if (e.killed || e.signal) cargoWhy = 'timeout';
  }
} else {
  cargoWhy = 'skipped';
}

const passing = [...out.matchAll(/^test (\S+) \.\.\. ok$/gm)].map((m) => m[1]);
const failing = [...out.matchAll(/^test (\S+) \.\.\. FAILED$/gm)].map((m) => m[1]);
const summary = out.split('\n').filter((l) => l.startsWith('test result:')).join(' | ');
const compileErrors = out.split('\n').filter((l) => l.startsWith('error')).slice(0, 5);

// The official solution path mirrors the exercise path — rustlings keeps the two trees
// parallel, so swapping the prefix is exact, not a guess.
//
// This loop is the only place in the workflow that can run up to 5 SEQUENTIAL external
// commands (one clippy invocation per exercise), so it lives off the SAME remainingMs() budget
// as cargo test above rather than its own fixed deadline. cargo test already took first claim
// (see CARGO_TEST_HARD_CAP_MS / FEEDBACK_LOOP_RESERVE_MS above — it is GRADING data, this loop
// is a nicety), so by the time this runs, remainingMs() already reflects whatever cargo test
// actually spent. If the budget is already gone, stop before starting a single exercise and hand
// over whatever was gathered — partial feedback, or none, is always better than losing the
// entire prefetch. Never make this loop the reason the whole run fails.
const reviewedExercises = [];
for (const name of selected) {
  if (remainingMs() <= 0) break;
  const rel = binMap[name];
  // selected is already filtered against this same binMap above, so rel should never be
  // missing here — but that is an invariant held ACROSS two separate loops with nothing
  // enforcing it in this file, and a future edit to either loop could silently break it.
  // Guard explicitly rather than rely on "unreachable by inspection": an uncaught TypeError
  // here would abort the whole await agent(...) call and cost the owner the day's lesson.
  if (!rel) continue;
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

// The chess crate's own source. Run 11 — the first day of the chess track — opened with
// `ls -R src tests && cat src/lib.rs && cat Cargo.toml` to orient before writing the day's
// failing test, and then had to rewrite lib.rs to register `mod chess;`. Now that EVERY
// weekday assigns a chess step into this crate, that orientation is a per-run cost, and it is
// fully deterministic — so it moves here. Only `src/` and `tests/` are walked; `target/` is
// generated and enormous and is never touched.
//
// Caps exist because this crate grows: ~2.3KB of Rust today, but the goal is a full engine
// plus eight `ds::` modules. A file over the per-file cap is clipped and flagged, and `bytes`
// always carries the TRUE size, so a truncated file is visible as truncated rather than
// silently short — the run can Read the tail itself on the one day it needs it.
const RS_PER_FILE_CAP = 8000;
const RS_TOTAL_CAP = 48000;


const rustDsaFiles = [];
let rsTotal = 0;
for (const rel of rsPaths) {
  if (rsTotal >= RS_TOTAL_CAP) break;
  try {
    const code = await fs.readFile(base + '/rust-dsa/' + rel, 'utf8');
    const kept = code.slice(0, RS_PER_FILE_CAP);
    rsTotal += kept.length;
    rustDsaFiles.push({ path: rel, bytes: code.length, truncated: kept.length < code.length, code: kept });
  } catch (e) {
    continue; // one unreadable file must not cost the rest of the crate, or the lesson
  }
}

// Small, and it carries the `[[bin]]` section phase 8 eventually needs plus the (currently
// empty) dependency list the 8s cargo-test budget assumes.
let cargoToml = null;
try {
  cargoToml = await fs.readFile(base + '/rust-dsa/Cargo.toml', 'utf8');
} catch (e) {
  cargoToml = null; // unreadable — the run falls back to reading it itself
}

await agent(
  "Grading data is pre-fetched below — skip step 1's shell/read commands and go straight to judging yesterday's lesson against it, then write today's to lessons/<today>.md. " +
    "MANDATORY front matter: today's file must carry a `metrics:` line — `metrics: day=<n> chess_phase=<n> dsa_topics=<n> structs_done=<n>`, the same four numbers you `loopany report --state`. It is the ONLY store for those cumulative values (the host cursor cannot hold them; see metricsOf in the workflow), so a day without the line is a day the no-agent hold gate silently declines and every absent day costs a full agent run again. prev_lesson.metrics is yesterday's, already parsed — carry each value forward and add today's increment. " +
    'prev_lesson is the file to grade (its full text, plus track_b_answer already extracted — empty means Track B was skipped); ' +
    'history is every lesson so far with its graded type; streak_before_prev is the streak over those, so your reported streak is it +1 if you grade prev_lesson done|partial, else 0; ' +
    'consecutive_skips is its mirror — the trailing run of `skipped`, also excluding prev_lesson, so add 1 yourself if you grade prev `skipped`. It is the trigger for the brief\'s "Absence, not difficulty" rule: at 3 or more, STOP shrinking the lesson and follow that section instead — shrinking is the wrong lever for someone who simply was not there, and it has already been pulled to the floor. ' +
    'presence.any is the brief\'s "empty room" test, already computed — true means the owner showed up since the last lesson (presence.signals names which of reviewed_exercises / owner_modified / rust_dsa.owner_touched fired). Do NOT re-derive it. It decides three things the brief spells out: a blank `### My answer` is the owner\'s DECISION only when presence.any is true, and an EMPTY ROOM (no decision, question stays open) when it is false; the crate Q1 is re-asked only on a day with presence; and during an absence Track B holds its concept instead of rotating forward. ' +
    'gap_days > 0 means a run FAILED and the owner got no lesson those days — say so in the opening note, never count it as their skip; ' +
    'rustlings.done lists exercises rustlings recorded as passing; cargo carries rust-dsa\'s test state. ' +
    'cargo.ok true means cargo RAN and its per-test verdicts are trustworthy — it does NOT mean everything passed, and a failing test is the normal daily state under the chess contract, so grade from passing_tests/failing_tests and do not re-run `cargo test` yourself. cargo.ok false means the call was skipped or the crate did not compile (cargo.why says `timeout` = killed mid-build, usually a cold target/ after sleep; `skipped` = no budget left; null = real compile failure): grading is genuinely blind, so treat it as UNKNOWN, check compile_errors, and run `cargo test` yourself. ' +
    'Today\'s lesson does not exist yet — this is not a duplicate wake, that case never reaches you. ' +
    'is_review_day true means it is FRIDAY: follow the brief\'s "Friday · Review day" section instead of the ' +
    'curriculum — no new concept on either track, a 5-question test as Track B and a small project as Track A, ' +
    'and grade Track A on cargo (the review_* test file) rather than on rustlings.done. ' +
    'history carries each lesson\'s title, so build the test from those titles rather than re-reading the week. ' +
    'due_review is the spaced-repetition ladder already computed. Entries with source \'concept\' come from attempt records — concepts[id] holds that concept\'s level (practicing, demonstrated, retained, needs-repair), rung and due date, and they are sorted by due — take the most overdue first; entries with source \'lesson\' are lessons without attempt records, still on the old ~1w/~4w/~12w date ladder, already deduped so a stretch of held copies collapses to the one day that topic was actually served. ' +
    'Draw the older questions and the small project from both, preferring \'lesson\' entries whose type is done|partial: a `skipped` entry was served into an empty room and never learned, so asking it as recall asks for something never seen — teach it fresh or take the next candidate instead. Drop a slot rather than padding. The task file\'s Review queue is the exception list layered on top — a concept whose level is needs-repair goes into it like a wrong answer — and Retired items are dropped from the draw. ' +
    'When you grade prev_lesson, write its attempts: front-matter exactly as the brief\'s "Attempt records" paragraph says. unknown_ids lists attempt IDs the brief does not register — name them in your report (null means the brief was unreadable, so the check did not run); attempt_parse_errors lists record lines that did not parse — name them, never rewrite an older lesson. ' +
    'rustlings.next_exercises is the ordered slice of exercises starting AT current_exercise, straight from Cargo.toml\'s bin list (the authoritative exercise order, quizzes included), each with its path and source text. Size today\'s Track A step off it and quote its "done when" from it — never go grep the manifest or cat the sources, and never infer the order from section directory names, which is what mis-assigned lesson 5. Empty means the state file and manifest disagree: then, and only then, check the bin list yourself. ' +
    "rust_dsa is the chess crate itself — every .rs under src/ and tests/ with its path and full text, plus Cargo.toml. Write today's failing test straight into it and register any new module in the src/lib.rs text given here; never `ls -R`, `cat` or re-Read the crate to orient first. A file with truncated:true was clipped at 8KB (bytes is its real size) — Read only that one if you need its tail. Empty means the crate is unreadable: then, and only then, look yourself. " +
    "rust_dsa.owner_touched says whether the owner opened the crate at all since the last lesson (touched_paths names the files); your own edits are excluded by construction, so false with a red chess test means the step was never ATTEMPTED, not that it was too big. It is the trigger for the brief's \"The chess half is untouched, not too big\" rule — do not shrink or re-serve a step nobody opened. Write the crate edit BEFORE the lesson file, per the brief's step order, or you poison tomorrow's flag. " +
    'reviewed_exercises is the Rust the owner actually wrote since the last lesson: their code, rustlings\' official solution, and scoped clippy findings with real lint names. Open Track A with the brief\'s "Yesterday\'s code" block built from it — deep-review ONE exercise and give the rest a line each. clippy.ok false means UNKNOWN, never clean. When there is nothing worth saying, omit the block entirely rather than writing praise. ' +
    'Apply Waitzkin\'s learning principles without changing the 15-minute budget: process before result, one smaller-circle fundamental per track, and investment-in-loss exercises on repeats or review days. Ask exactly 3–5 Socratic grill questions tied to today\'s concepts: include a failure/invariant question, a complexity or mechanism question, and an honest transfer question to the chess engine. Use soft-zone pressure only as a short optional timer, distraction, or recovery trigger; never replace compiler or test evidence. Preserve the existing Friday review-day, shrink, absence, phase-gate, and one named failing-test rules. ' +
    'Only re-read files or re-run `rustlings check-all` / `cargo test` yourself if this data looks wrong or is null.',
  {
    today,
    weekday,
    is_review_day: isReviewDay,
    week_number: weekNumber,
    due_review: dueReview,
    concepts,
    unknown_ids: unknownIds,
    attempt_parse_errors: attemptParseErrors,
    prev_lesson: prevLesson,
    history,
    streak_before_prev: streakBeforePrev,
    consecutive_skips: consecutiveSkips,
    presence,
    gap_days: gapDays,
    selected,
    rustlings: {
      current_exercise: currentExercise,
      done: doneExercises,
      done_count: doneExercises.length,
      total: 94,
      next_exercises: nextExercises,
    },
    reviewed_exercises: reviewedExercises,
    rust_dsa: {
      files: rustDsaFiles,
      owner_touched: rsTouched.length > 0,
      touched_paths: rsTouched,
      cargo_toml: cargoToml,
    },
    cargo: {
      ok: cargoOk,
      why: cargoWhy,
      summary,
      passing_tests: passing,
      failing_tests: failing,
      compile_errors: compileErrors,
    },
  },
);

return {};