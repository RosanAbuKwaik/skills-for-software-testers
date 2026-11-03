'use strict';
// QA trends release fetcher — reads the official GitHub releases of the profile tools, in one
// call, so every version, full date (with the year) and command comes from the source itself.
//
// Usage: node fetch_releases.js --since YYYY-MM-DD [--until YYYY-MM-DD] <tool | owner/repo>...
//   A tool name is looked up in KNOWN_REPOS (e.g. playwright, cypress); anything with a "/" is
//   used as owner/repo. Public API only: no token is read or sent.
// Prints ONE JSON line:
//   {"since": "...", "until": "...", "releases": [{tool, repo, tag, name, date, url, prerelease,
//    commands: [...], linkOnly, body}], "nothingNew": [...], "unknown": [...], "errors": [{tool, detail}]}
// commands holds every fenced code block and inline `npm|npx|pip|yarn|pnpm|docker ...` command,
// word for word. linkOnly is true when the body is little more than a link (e.g. to a changelog):
// open that link for the notes and commands. date is GitHub's publish time in UTC, so it can be a
// day off from the changelog date. Exit: 0 = done (even with errors listed), 2 = usage error.
// (Deciding try, watch or skip stays with the agent: that is judgment.)

const KNOWN_REPOS = {
  playwright: 'microsoft/playwright',
  cypress: 'cypress-io/cypress',
  selenium: 'SeleniumHQ/selenium',
  webdriverio: 'webdriverio/webdriverio',
  puppeteer: 'puppeteer/puppeteer',
  vitest: 'vitest-dev/vitest',
  jest: 'jestjs/jest',
  'axe-core': 'dequelabs/axe-core',
  k6: 'grafana/k6',
  bruno: 'usebruno/bruno',
  appium: 'appium/appium',
  testcafe: 'DevExpress/testcafe',
  pytest: 'pytest-dev/pytest',
  newman: 'postmanlabs/newman',
  'robot framework': 'robotframework/robotframework',
};
const BODY_LIMIT = 4000;

function resolveRepo(tool) {
  if (tool.includes('/')) return tool;
  return KNOWN_REPOS[tool.trim().toLowerCase()] || null;
}

function extractCommands(body) {
  const out = [];
  const text = body || '';
  for (const m of text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) out.push(m[1].trim());
  const rest = text.replace(/```[\s\S]*?```/g, '');
  for (const m of rest.matchAll(/`((?:npm|npx|pip|pip3|yarn|pnpm|docker|brew)\s[^`]+)`/g)) out.push(m[1].trim());
  return [...new Set(out)].filter(Boolean);
}

function isLinkOnly(body) {
  const text = (body || '').trim();
  if (!/https?:\/\//.test(text)) return false;
  const withoutLinks = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '');
  return withoutLinks.replace(/[\s#*_>:.-]/g, '').length < 120;
}

function inWindow(isoDate, since, until) {
  const d = (isoDate || '').slice(0, 10);
  return d >= since && d <= until;
}

function pickReleases(tool, repo, list, since, until) {
  return list
    .filter(r => !r.draft && inWindow(r.published_at, since, until))
    .map(r => ({
      tool, repo, tag: r.tag_name, name: r.name || r.tag_name,
      date: r.published_at.slice(0, 10), url: r.html_url, prerelease: !!r.prerelease,
      commands: extractCommands(r.body),
      linkOnly: isLinkOnly(r.body),
      body: (r.body || '').length > BODY_LIMIT ? r.body.slice(0, BODY_LIMIT) + '\n[cut: open the url for the rest]' : (r.body || ''),
    }));
}

async function loadReleases(repo) {
  // Test seam: a JSON file mapping owner/repo -> GitHub releases array.
  if (process.env.QA_TRENDS_RELEASES_FIXTURE) {
    const all = JSON.parse(require('fs').readFileSync(process.env.QA_TRENDS_RELEASES_FIXTURE, 'utf8'));
    if (!all[repo]) throw new Error('HTTP 404');
    return all[repo];
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=30`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'tracking-qa-trends' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function main(argv) {
  let since, until; const tools = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--since') since = argv[++i];
    else if (argv[i] === '--until') until = argv[++i];
    else tools.push(argv[i]);
  }
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  until = until || new Date().toISOString().slice(0, 10);
  if (!since || !iso.test(since) || !iso.test(until) || tools.length === 0) {
    console.log(JSON.stringify({ error: 'usage: --since YYYY-MM-DD [--until YYYY-MM-DD] <tool | owner/repo>...' }));
    process.exitCode = 2; return;
  }
  const releases = [], nothingNew = [], unknown = [], errors = [];
  for (const tool of tools) {
    const repo = resolveRepo(tool);
    if (!repo) { unknown.push(tool); continue; }
    try {
      const found = pickReleases(tool, repo, await loadReleases(repo), since, until);
      if (found.length) releases.push(...found); else nothingNew.push(tool);
    } catch (e) { errors.push({ tool, detail: e.message }); }
  }
  console.log(JSON.stringify({ since, until, releases, nothingNew, unknown, errors }));
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { resolveRepo, extractCommands, isLinkOnly, inWindow, pickReleases, KNOWN_REPOS };
