import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'daily-lesson.workflow.js');

async function runWorkflow(opts = {}) {
  const baseVal = opts.base || path.join(here, 'fixture');
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

export { runWorkflow };
