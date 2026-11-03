'use strict';
// Tests for render_html.js — Markdown subset to one self-contained HTML page.
// Run: node scripts/render_html.test.js
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { render, inline } = require('./render_html.js');

let passed = 0; const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { failures.push(name); console.error(`  FAIL - ${name}: ${e.message}`); }
}

const md = `# QA trends: 2026-10-23 to 2026-10-30
Start with: Tool | Searched: 2026-10-30 | Pages opened: 4

## Try
### 1. Tool (start with this)
- What it is: x
- Steps:
  1. \`npm install cypress --save-dev\`
  2. Run it
- Source: [1] official, 2026-10-28

## Sources
| # | Title | Site | Date | Link |
|---|---|---|---|---|
| 1 | Notes | example.org | 2026-10-28 | https://example.org/a |
`;

test('headings, lists, numbered steps and the title', () => {
  const { html } = render(md);
  assert.ok(html.includes('<title>QA trends: 2026-10-23 to 2026-10-30</title>'));
  assert.ok(html.includes('<h3>1. Tool (start with this)</h3>'));
  assert.ok(html.includes('<ol>') && html.includes('<ul>'));
});

test('tables become HTML tables without the separator row', () => {
  const { html } = render(md);
  assert.ok(html.includes('<th>Title</th>'));
  assert.ok(html.includes('<td>Notes</td>'));
  assert.ok(!html.includes('<td>---</td>'));
});

test('links are clickable, commands stay word for word', () => {
  const { html } = render(md);
  assert.ok(html.includes('<a href="https://example.org/a" dir="ltr">https://example.org/a</a>'));
  assert.ok(html.includes('<code dir="ltr">npm install cypress --save-dev</code>'));
});

test('[n] links to its source, and a reading title links to its page', () => {
  const doc = md + `
## Read or watch
| Title | Type | Length | Why | Source |
|---|---|---|---|---|
| A talk | video | 46 min | x | [1] |
`;
  const { html } = render(doc);
  assert.ok(html.includes('<a href="https://example.org/a" title="https://example.org/a">[1]</a>'));
  assert.ok(html.includes('<td><a href="https://example.org/a">A talk</a></td>'));
  assert.ok(html.includes('<td>1</td>'), 'the Sources table number stays plain');
});

test('HTML in the source is escaped, never run', () => {
  assert.ok(!inline('<script>alert(1)</script>').includes('<script>'));
  assert.ok(inline('`<b>`').includes('&lt;b&gt;'));
});

test('Arabic text makes the page right to left; English stays left to right', () => {
  assert.strictEqual(render('# ترندات QA\n').rtl, true);
  assert.ok(render('# ترندات QA\n').html.includes('dir="rtl"'));
  assert.strictEqual(render(md).rtl, false);
});

test('the page loads nothing from outside', () => {
  const { html } = render(md);
  assert.ok(!/<script|<link|src=/.test(html));
});

test('CLI writes the file, creates the folder, prints one JSON line; usage error exits 2', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qat-'));
  const src = path.join(dir, 'd.md'); fs.writeFileSync(src, md);
  const out = path.join(dir, 'reports', 'r.html');
  const r = spawnSync(process.execPath, [path.join(__dirname, 'render_html.js'), '--file', src, '--out', out], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim().split('\n').length, 1);
  assert.strictEqual(JSON.parse(r.stdout).out, out);
  assert.ok(fs.readFileSync(out, 'utf8').startsWith('<!DOCTYPE html>'));
  assert.strictEqual(spawnSync(process.execPath, [path.join(__dirname, 'render_html.js')], { encoding: 'utf8' }).status, 2);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
