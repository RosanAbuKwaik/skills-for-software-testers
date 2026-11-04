'use strict';
// Tests for build.js: the pure checks, then a real render of the fixtures when Playwright
// is installed (good.html must pass everything; bad.html must fail the planted mistakes).
// Run: node scripts/build.test.js
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { normDash, overlapArea, staticChecks, readViewBox, statusOf, hueMatches, isAiOrange } = require('./build.js');
let passed = 0; const failures = [];
function test(name, fn) { try { fn(); passed++; console.log(`  ok - ${name}`); } catch (e) { failures.push(name); console.error(`  FAIL - ${name}: ${e.message}`); } }
const failed = r => r.filter(c => !c.ok).map(c => c.name);
const base = () => ({ W: 1080, H: 1080, texts: [], nodes: [], steps: [], legends: [], arrows: [] });

test('dash patterns are compared by numbers, not spelling', () => {
  assert.strictEqual(normDash('14px, 10px'), '14 10'); assert.strictEqual(normDash('none'), 'none'); assert.strictEqual(normDash(''), 'none');
});
test('overlap area', () => {
  assert.strictEqual(overlapArea({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), 25);
  assert.strictEqual(overlapArea({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 5, h: 5 }), 0);
});
test('viewBox size is read from the art svg', () => {
  assert.deepStrictEqual(readViewBox('<svg id="art" viewBox="0 0 1080 1580">'), { W: 1080, H: 1580 });
  assert.deepStrictEqual(readViewBox('<div>'), { W: 1080, H: 1080 });
});
test('text outside the canvas is caught', () => {
  const m = base(); m.texts = [{ i: 0, s: 'Title', r: { x: 80, y: 90, w: 1100, h: 60 } }];
  assert.ok(failed(staticChecks(m)).includes('canvas'));
});
test('text on text, and text on a box it does not belong to, are caught', () => {
  const m = base();
  m.texts = [{ i: 0, s: 'Code', r: { x: 200, y: 100, w: 60, h: 24 } }, { i: 1, s: 'legend', r: { x: 210, y: 105, w: 80, h: 20 } }];
  m.nodes = [{ j: 0, s: 'Code', r: { x: 190, y: 90, w: 110, h: 44 }, inside: [0] }];
  assert.deepStrictEqual(failed(staticChecks(m)).sort(), ['node-overlap', 'text-overlap']);
});
test('a legend that does not match its arrows is caught', () => {
  const m = base(); m.legends = [{ k: 'ask', d: 'none' }]; m.arrows = [{ k: 'ask', d: '14px, 10px', m: '' }, { k: 'answer', d: '6px, 6px', m: '' }];
  assert.ok(failed(staticChecks(m)).includes('legend'));
});
test('kinds that differ by colour only are caught; different dashes pass', () => {
  const m = base(); m.arrows = [{ k: 'ask', d: 'none', m: 'a' }, { k: 'answer', d: 'none', m: 'a' }];
  assert.ok(failed(staticChecks(m)).includes('colour-only'));
  m.arrows[1].d = '6px, 6px'; assert.ok(!failed(staticChecks(m)).includes('colour-only'));
});
test('a box drawn twice is caught, unless marked as a deliberate repeat', () => {
  const m = base(); m.nodes = [{ j: 0, s: 'Assigned', r: { x: 0, y: 0, w: 10, h: 10 }, inside: [] }, { j: 1, s: ' assigned ', r: { x: 500, y: 0, w: 10, h: 10 }, inside: [] }];
  assert.ok(failed(staticChecks(m)).includes('node-once'));
  m.nodes[1].repeat = true; assert.ok(!failed(staticChecks(m)).includes('node-once'));
});
test('a tall canvas with a big empty band is caught; a square post is not', () => {
  const m = base(); m.H = 1600; m.contentBottom = 1300;
  assert.ok(failed(staticChecks(m)).includes('canvas-fit'));
  m.contentBottom = 1540; assert.ok(!failed(staticChecks(m)).includes('canvas-fit'));
  const sq = base(); sq.contentBottom = 600; assert.ok(!failed(staticChecks(sq)).includes('canvas-fit'));
});
test('status words are read from labels; a failure word wins', () => {
  assert.strictEqual(statusOf('Closed Retest passed'), 'pass');
  assert.strictEqual(statusOf('Still dead: reopen'), 'fail');
  assert.strictEqual(statusOf('Tests fail: retry'), 'fail');
  assert.strictEqual(statusOf('Flaky: retrying'), 'wait');
  assert.strictEqual(statusOf('Fixed Waits for tester'), '');
  assert.strictEqual(statusOf('In progress Dev on it'), '');
});
test('status hues: red, green, amber; grey has none', () => {
  assert.ok(hueMatches('rgb(214, 69, 69)', 'fail')); assert.ok(hueMatches('rgb(31, 157, 107)', 'pass'));
  assert.ok(hueMatches('rgb(224, 138, 30)', 'wait')); assert.ok(!hueMatches('rgb(191, 85, 23)', 'pass'));
  assert.ok(!hueMatches('rgb(128, 128, 128)', 'fail'));
});
test('a Closed box in orange and an unmarked reopen arrow are caught; correct ones pass', () => {
  const m = base();
  m.statuses = [{ s: 'Closed Retest passed', status: '', colour: 'rgb(191, 85, 23)' }, { s: 'Still dead: reopen', status: '', colour: 'rgb(110, 70, 170)' }];
  const r = staticChecks(m).find(c => c.name === 'status-colour');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.detail.length, 2);
  m.statuses = [{ s: 'Closed Retest passed', status: 'pass', colour: 'rgb(31, 157, 107)' }, { s: 'Still dead: reopen', status: 'fail', colour: 'rgb(214, 69, 69)' }, { s: 'Fixed', status: '', colour: 'rgb(110, 70, 170)' }];
  assert.ok(staticChecks(m).find(c => c.name === 'status-colour').ok);
});
test('terracotta and dark orange are caught as AI-made; amber, red, raspberry and white are not', () => {
  for (const c of ['rgb(217, 119, 87)', 'rgb(191, 85, 23)', 'rgb(232, 116, 42)']) assert.ok(isAiOrange(c), c);
  for (const c of ['rgb(224, 138, 30)', 'rgb(214, 69, 69)', 'rgb(176, 36, 94)', 'rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)']) assert.ok(!isAiOrange(c), c);
  const m = base(); m.colours = ['rgb(191, 85, 23)']; assert.ok(failed(staticChecks(m)).includes('ai-orange'));
});
test('a step hidden with motion off is caught', () => {
  const m = base(); m.steps = [{ n: '1', o: 1 }, { n: '2', o: 0.25 }];
  assert.ok(failed(staticChecks(m)).includes('static-steps'));
});

let pw = true; try { require.resolve('playwright'); } catch { pw = false; }
if (!pw) console.log('  skip - real render tests (Playwright not installed)');
else {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'infog-'));
  const fx = n => { const src = n.replace(/\d+$/, ''); const d = path.join(tmp, n); fs.mkdirSync(d); fs.copyFileSync(path.join(__dirname, 'fixtures', `${src}.html`), path.join(d, `${n}.html`)); return path.join(d, `${n}.html`); };
  const build = args => spawnSync(process.execPath, [path.join(__dirname, 'build.js'), ...args], { encoding: 'utf8', timeout: 120000 });
  test('real render: good.html passes every check and writes every format', () => {
    const r = build(['--html', fx('good'), '--plan', path.join(__dirname, 'fixtures', 'plan-good.md')]);
    assert.strictEqual(r.stdout.trim().split('\n').length, 1);
    const j = JSON.parse(r.stdout);
    assert.deepStrictEqual(j.failures, [], JSON.stringify(j.failures));
    assert.strictEqual(r.status, 0);
    for (const k of ['svg', 'png', 'grayscale', 'readme']) assert.ok(fs.statSync(j.files[k]).size > 0, k);
    const ff = spawnSync('ffmpeg', ['-version']).status === 0;
    if (ff) for (const k of ['gif', 'mp4']) assert.ok(fs.statSync(j.files[k]).size > 0, k);
    assert.ok(fs.readFileSync(j.files.svg, 'utf8').includes('<style'), 'svg keeps its styles');
    assert.strictEqual(j.files.pdf, undefined, 'no PDF is made');
  });
  test('real render: bad.html fails exactly the planted mistakes', () => {
    const r = build(['--html', fx('bad')]);
    const j = JSON.parse(r.stdout);
    assert.strictEqual(r.status, 1);
    assert.deepStrictEqual(j.failures.map(f => f.name).sort(), ['animation', 'colour-only', 'node-overlap', 'static-steps', 'text-overlap']);
  });
  test('usage error exits 2', () => assert.strictEqual(build([]).status, 2));
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
