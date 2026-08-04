const fs = await import('node:fs/promises');
const { execFile } = await import('node:child_process');
const { promisify } = await import('node:util');
const run = promisify(execFile);

const base = '/Users/tamnm/code/personal';
const lessonsDir = base + '/loopany/daily-lesson/lessons';

// Today in the owner's timezone. The run fires at 09:00 Asia/Saigon (cron `0 9 * * *`);
// Asia/Ho_Chi_Minh is the same zone, kept here as the canonical IANA name.
const tz = { timeZone: 'Asia/Ho_Chi_Minh' };
const now = new Date();
const today = now.toLocaleDateString('en-CA', tz);
// Sunday = review day: no new concept, a test + a small project instead. Weekday name is
// computed in the owner's zone, not UTC, or the boundary run flips to the wrong day.
const weekday = now.toLocaleDateString('en-US', { ...tz, weekday: 'long' });
const isReviewDay = weekday === 'Sunday';

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

// Duplicate same-day wake: today's lesson is already issued and still `assigned`,
// so there is nothing to grade and nothing to write. Silent tick, no agent.
if (files.includes(today + '.md')) {
  const text = await fs.readFile(lessonsDir + '/' + today + '.md', 'utf8');
  if (typeOf(text) === 'assigned') return {};
}

// Every lesson's date + graded type + title — the agent's `ls lessons/` opener, done once
// here. `title` is what a review day builds its questions from without re-reading the week.
const history = [];
for (const f of files) {
  const text = await fs.readFile(lessonsDir + '/' + f, 'utf8');
  history.push({ date: f.replace('.md', ''), type: typeOf(text), title: titleOf(text) });
}

// Week 1 is the first 7 days from the first lesson ever. Only used to label a review day.
const dnum = (s) => Date.parse(s + 'T00:00:00Z') / 86400000;
const weekNumber = history.length
  ? Math.floor((dnum(today) - dnum(history[0].date)) / 7) + 1
  : 1;

// The spaced-repetition ladder, derived — EVERY lesson comes back at ~1, ~4 and ~12 weeks,
// not just the ones answered wrong. A review day draws its questions from this; the
// wrong-answer queue in the task file is only the exception list on top of it.
// Windows are ±3 days so a rung can't be missed by landing between two Sundays.
const RUNGS = [{ rung: '1w', days: 7 }, { rung: '4w', days: 28 }, { rung: '12w', days: 84 }];
const dueReview = [];
for (const h of history) {
  if (h.type === 'assigned') continue; // never taught-and-graded yet
  const age = dnum(today) - dnum(h.date);
  for (const r of RUNGS) {
    if (Math.abs(age - r.days) <= 3) {
      dueReview.push({ date: h.date, title: h.title, type: h.type, rung: r.rung, age_days: age });
    }
  }
}

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
// the LaunchAgent plist sets only PATH, so the default stands). 120000ms could never actually
// fire before that host cap does, so a single `cargo clippy` stuck on e.g. rustlings' own
// build-directory lock used to cost the entire prefetch — prev_lesson, history, due_review,
// streak, cargo, all of it — not just this feedback block. 8s keeps one stuck call from doing
// that while staying >20x the ~0.35s a real scoped clippy run takes. Do NOT raise this back
// toward "generous" — that silently reopens the same failure.
const CLIPPY_TIMEOUT_MS = 8000;

const clippyFor = async (name) => {
  try {
    const res = await run(
      'cargo',
      ['clippy', '--quiet', '--message-format=json', '--bin', name, ...PEDANTIC_ARGS],
      { cwd: base + '/rustlings', timeout: CLIPPY_TIMEOUT_MS, maxBuffer: 8e6 },
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

let out = '';
let cargoOk = false;
try {
  const res = await run('cargo', ['test'], { cwd: base + '/rust-dsa', timeout: 240000, maxBuffer: 8e6 });
  out = res.stdout + res.stderr;
  cargoOk = true;
} catch (e) {
  out = (e.stdout || '') + (e.stderr || '') + (e.stdout || e.stderr ? '' : String(e));
}

const passing = [...out.matchAll(/^test (\S+) \.\.\. ok$/gm)].map((m) => m[1]);
const failing = [...out.matchAll(/^test (\S+) \.\.\. FAILED$/gm)].map((m) => m[1]);
const summary = out.split('\n').filter((l) => l.startsWith('test result:')).join(' | ');
const compileErrors = out.split('\n').filter((l) => l.startsWith('error')).slice(0, 5);

// The official solution path mirrors the exercise path — rustlings keeps the two trees
// parallel, so swapping the prefix is exact, not a guess.
//
// This loop is the only place in the workflow that can run up to 5 SEQUENTIAL external
// commands (one clippy invocation per exercise), so it gets its own wall-clock budget on top
// of CLIPPY_TIMEOUT_MS above — the same 30s loopany host cap applies to the whole workflow,
// not just this block, so a run that blows its budget here doesn't get partial feedback, it
// loses prev_lesson/history/due_review/streak/cargo too. 15s (half the host's cap) leaves
// headroom for everything else the workflow does before and after this loop; if the budget is
// already spent, stop adding entries and hand over whatever was gathered — partial feedback,
// or none, is always better than losing the entire prefetch. Never make this loop the reason
// the whole run fails.
const ASSEMBLY_DEADLINE_MS = 15000;
const assemblyStart = Date.now();
const reviewedExercises = [];
for (const name of selected) {
  if (Date.now() - assemblyStart >= ASSEMBLY_DEADLINE_MS) break;
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

await agent(
  "Grading data is pre-fetched below — skip step 1's shell/read commands and go straight to judging yesterday's lesson against it, then write today's to lessons/<today>.md. " +
    'prev_lesson is the file to grade (its full text, plus track_b_answer already extracted — empty means Track B was skipped); ' +
    'history is every lesson so far with its graded type; streak_before_prev is the streak over those, so your reported streak is it +1 if you grade prev_lesson done|partial, else 0; ' +
    'gap_days > 0 means a run FAILED and the owner got no lesson those days — say so in the opening note, never count it as their skip; ' +
    'rustlings.done lists exercises rustlings recorded as passing; cargo carries rust-dsa\'s test state. ' +
    'Today\'s lesson does not exist yet — this is not a duplicate wake, that case never reaches you. ' +
    'is_review_day true means it is SUNDAY: follow the brief\'s "Sunday · Review day" section instead of the ' +
    'curriculum — no new concept on either track, a 5-question test as Track B and a small project as Track A, ' +
    'and grade Track A on cargo (the review_* test file) rather than on rustlings.done. ' +
    'history carries each lesson\'s title, so build the test from those titles rather than re-reading the week. ' +
    'due_review is the spaced-repetition ladder already computed — every past lesson now sitting at its ~1w, ~4w or ~12w ' +
    'rung, whether or not it was ever answered wrong. Draw the older questions and the small project from it; the task ' +
    'file\'s Review queue is only the wrong-answer exceptions layered on top, and Retired items are dropped from the draw. ' +
    'reviewed_exercises is the Rust the owner actually wrote since the last lesson: their code, rustlings\' official solution, and scoped clippy findings with real lint names. Open Track A with the brief\'s "Yesterday\'s code" block built from it — deep-review ONE exercise and give the rest a line each. clippy.ok false means UNKNOWN, never clean. When there is nothing worth saying, omit the block entirely rather than writing praise. ' +
    'Only re-read files or re-run `rustlings check-all` / `cargo test` yourself if this data looks wrong or is null.',
  {
    today,
    weekday,
    is_review_day: isReviewDay,
    week_number: weekNumber,
    due_review: dueReview,
    prev_lesson: prevLesson,
    history,
    streak_before_prev: streakBeforePrev,
    gap_days: gapDays,
    selected,
    rustlings: {
      current_exercise: currentExercise,
      done: doneExercises,
      done_count: doneExercises.length,
      total: 94,
    },
    reviewed_exercises: reviewedExercises,
    cargo: {
      ok: cargoOk,
      summary,
      passing_tests: passing,
      failing_tests: failing,
      compile_errors: compileErrors,
    },
  },
);

return {};