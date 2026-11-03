'use strict';
// Tests for check_result.js — structure checks that work in any language.
// Run: node scripts/check_result.test.js
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { check } = require('./check_result.js');

let passed = 0; const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { failures.push(name); console.error(`  FAIL - ${name}: ${e.message}`); }
}
const codes = r => r.problems.map(p => p.code);

const exp = (n, src) => `### ${n}. Tool ${n}
- What it is: x
- Why it helps: y
- Time: 20 minutes
- Steps: 1. \`npm i x\`
- Worked if: z
- Source: [${src}] official, 2026-10-12`;

const draft = ({ exps = [exp(1, 1)], rows = ['| 1 | Notes | example.org | 2026-10-12 | https://example.org/1 |'], pages = 5 } = {}) => `# QA trends: 2026-09-30 to 2026-10-30
Start with: Tool 1 | Searched: 2026-10-30 | Pages opened: ${pages}
No profile found.

## Try
${exps.join('\n\n')}

## Read or watch
| Title | Type | Length | Why | Source |
|---|---|---|---|---|

## Coverage
- Checked: all

## Sources
| # | Title | Site | Date | Link |
|---|---|---|---|---|
${rows.join('\n')}
`;

test('a good draft passes', () => {
  const r = check(draft(), { experiments: 3, maxPages: 20 });
  assert.deepStrictEqual(r.problems, []); assert.strictEqual(r.experiments, 1); assert.strictEqual(r.sources, 1);
});

test('works with Arabic headings and labels', () => {
  const ar = `# ترندات QA: 2026-09-30 إلى 2026-10-30
ابدئي بـ: أداة | البحث: 2026-10-30 | صفحات: 4

## جرّبي
### 1. أداة
- شو هي: x
- ليش بتفيد: y
- الوقت: 20 دقيقة
- الخطوات: 1. \`npm i x\`
- نجحت إذا: z
- المصدر: [1] رسمي

## المصادر
| # | العنوان | الموقع | التاريخ | الرابط |
|---|---|---|---|---|
| 1 | Notes | example.org | 2026-10-12 | https://example.org/1 |
`;
  assert.deepStrictEqual(check(ar, { experiments: 3, maxPages: 20 }).problems, []);
});

test('source outside the window is caught', () => {
  const r = check(draft({ rows: ['| 1 | Notes | example.org | 2025-10-12 | https://example.org/1 |'] }));
  assert.ok(codes(r).includes('source-outside-window'));
});

test('year from a footer style date (no year) is caught as bad format', () => {
  const r = check(draft({ rows: ['| 1 | Notes | example.org | 07 Oct | https://example.org/1 |'] }));
  assert.ok(codes(r).includes('source-date-format'));
});

test('"not shown" is allowed in the table but not for an experiment', () => {
  const r = check(draft({ rows: ['| 1 | Notes | example.org | not shown | https://example.org/1 |'] }));
  assert.ok(!codes(r).includes('source-date-format'));
  assert.ok(codes(r).includes('experiment-undated-source'));
});

test('experiment citing a missing source is caught', () => {
  assert.ok(codes(check(draft({ exps: [exp(1, 7)] }))).includes('experiment-unknown-source'));
});

test('experiment with no source is caught', () => {
  const noSrc = exp(1, 1).replace('[1]', '');
  assert.ok(codes(check(draft({ exps: [noSrc] }))).includes('experiment-no-source'));
});

test('missing fields are caught', () => {
  const short = exp(1, 1).split('\n').filter(l => !/Time|Worked/.test(l)).join('\n');
  assert.ok(codes(check(draft({ exps: [short] }))).includes('experiment-fields'));
});

test('too many experiments are caught', () => {
  const r = check(draft({ exps: [exp(1, 1), exp(2, 1), exp(3, 1), exp(4, 1)] }), { experiments: 3 });
  assert.ok(codes(r).includes('too-many-experiments'));
});

test('duplicate links are caught', () => {
  const r = check(draft({ rows: ['| 1 | A | example.org | 2026-10-12 | https://example.org/1 |', '| 2 | B | example.org | 2026-10-13 | https://example.org/1 |'] }));
  assert.ok(codes(r).includes('duplicate-link'));
});

test('feed, tag and index links are caught, article links pass', () => {
  for (const l of ['https://dev.to/feed/cypress', 'https://blog.x.ai/tag/ai/', 'https://www.selenium.dev/blog/2026/']) {
    assert.ok(codes(check(draft({ rows: [`| 1 | A | x | 2026-10-12 | ${l} |`] }))).includes('index-link'), l);
  }
  assert.ok(!codes(check(draft())).includes('index-link'));
  const gh = 'https://github.com/SeleniumHQ/selenium/releases/tag/selenium-4.52.0';
  assert.ok(!codes(check(draft({ rows: [`| 1 | A | x | 2026-10-12 | ${gh} |`] }))).includes('index-link'), 'GitHub release page');
});

test('over the page budget is caught', () => {
  assert.ok(codes(check(draft({ pages: 25 }), { maxPages: 20 })).includes('over-budget'));
});

test('CLI prints one JSON line and exits 1 on problems, 2 on usage', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qat-')), 'd.md');
  fs.writeFileSync(f, draft({ exps: [exp(1, 9)] }));
  const r = spawnSync(process.execPath, [path.join(__dirname, 'check_result.js'), '--file', f], { encoding: 'utf8' });
  assert.strictEqual(r.status, 1); assert.strictEqual(r.stdout.trim().split('\n').length, 1);
  assert.strictEqual(JSON.parse(r.stdout).ok, false);
  const u = spawnSync(process.execPath, [path.join(__dirname, 'check_result.js')], { encoding: 'utf8' });
  assert.strictEqual(u.status, 2);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
