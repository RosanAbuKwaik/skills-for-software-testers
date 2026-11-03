'use strict';
// Tests for fetch_releases.js — window filter, word-for-word commands, full dates, and the
// CLI contract. Offline: the GitHub API is replaced by the QA_TRENDS_RELEASES_FIXTURE seam.
// Run: node scripts/fetch_releases.test.js
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveRepo, extractCommands, isLinkOnly, pickReleases } = require('./fetch_releases.js');

let passed = 0; const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok - ${name}`); }
  catch (e) { failures.push(name); console.error(`  FAIL - ${name}: ${e.message}`); }
}

const rel = (tag, date, body = '', extra = {}) => ({ tag_name: tag, name: tag, published_at: `${date}T10:00:00Z`,
  html_url: `https://github.com/x/y/releases/tag/${tag}`, body, draft: false, prerelease: false, ...extra });

test('known tool names map to repos, owner/repo passes through, unknown is null', () => {
  assert.strictEqual(resolveRepo('Playwright'), 'microsoft/playwright');
  assert.strictEqual(resolveRepo('me/tool'), 'me/tool');
  assert.strictEqual(resolveRepo('nope'), null);
});

test('commands are kept word for word from code blocks and inline npm', () => {
  const body = 'Upgrade:\n```bash\nnpm i -D @playwright/test@1.64.0\nnpx playwright install\n```\nOr `npx playwright test --ui`.';
  assert.deepStrictEqual(extractCommands(body), ['npm i -D @playwright/test@1.64.0\nnpx playwright install', 'npx playwright test --ui']);
});

test('a body that is only a changelog link is marked linkOnly', () => {
  assert.strictEqual(isLinkOnly('Changelog: https://docs.cypress.io/app/references/changelog#16-2-0'), true);
  assert.strictEqual(isLinkOnly('See [the changelog](https://docs.cypress.io/changelog) for details.'), true);
  assert.strictEqual(isLinkOnly('## Highlights\n' + 'New shuffle option for test order. '.repeat(10) + 'https://x.y'), false);
  assert.strictEqual(isLinkOnly(''), false);
});

test('only releases inside the window, with the full date, no drafts', () => {
  const list = [rel('v2', '2026-10-07'), rel('v1', '2026-08-01'), rel('v3', '2026-10-20', '', { draft: true })];
  const out = pickReleases('playwright', 'microsoft/playwright', list, '2026-09-30', '2026-10-30');
  assert.deepStrictEqual(out.map(r => [r.tag, r.date]), [['v2', '2026-10-07']]);
});

test('a long body is cut and says so', () => {
  const out = pickReleases('t', 'x/y', [rel('v1', '2026-10-07', 'a'.repeat(5000))], '2026-10-01', '2026-10-30');
  assert.ok(out[0].body.endsWith('[cut: open the url for the rest]'));
});

test('CLI: one JSON line with releases, nothingNew, unknown and errors', () => {
  const fx = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qat-')), 'fx.json');
  fs.writeFileSync(fx, JSON.stringify({
    'microsoft/playwright': [rel('v1.64.0', '2026-10-07', '```\nnpm i -D @playwright/test@1.64.0\n```')],
    'cypress-io/cypress': [rel('v15.0.0', '2026-06-01')],
  }));
  const r = spawnSync(process.execPath, [path.join(__dirname, 'fetch_releases.js'), '--since', '2026-09-30', '--until', '2026-10-30',
    'playwright', 'cypress', 'nope', 'me/missing'], { encoding: 'utf8', env: { ...process.env, QA_TRENDS_RELEASES_FIXTURE: fx } });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout.trim().split('\n').length, 1);
  const j = JSON.parse(r.stdout);
  assert.strictEqual(j.releases[0].date, '2026-10-07');
  assert.deepStrictEqual(j.releases[0].commands, ['npm i -D @playwright/test@1.64.0']);
  assert.deepStrictEqual(j.nothingNew, ['cypress']);
  assert.deepStrictEqual(j.unknown, ['nope']);
  assert.deepStrictEqual(j.errors, [{ tool: 'me/missing', detail: 'HTTP 404' }]);
});

test('CLI: usage error exits 2', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'fetch_releases.js'), 'playwright'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
