'use strict';
// QA trends result checker — the deterministic part of the self-check. Run it on the draft
// result before showing it; fix every problem it lists, then run it again.
//
// Usage: node check_result.js --file <draft.md> [--experiments N] [--max-pages N]
//        node check_result.js --stdin [...]          (draft piped in)
// Reads the structure only, so it works in any language:
//   - the title line (first "# ") holds two ISO dates: the window start and today;
//   - experiments are the "### " headings in the first "## " section;
//   - each experiment cites a source as [n];
//   - no source links to a feed, tag or index page;
//   - the Sources table is the last table whose rows are "| n | ... | date | link |".
// Prints ONE JSON line: {"ok": bool, "window": {...}, "experiments": n, "sources": n,
//   "problems": [{code, detail}]}. Exit: 0 = ok, 1 = problems found, 2 = usage error.
// (Whether a source is trustworthy, or an item is QA, stays with the agent: that is judgment.)

const ISO = /\b(\d{4}-\d{2}-\d{2})\b/g;

function parseSources(lines) {
  const rows = {};
  for (const line of lines) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length < 6 || !/^\d+$/.test(cells[1])) continue;
    const link = cells[cells.length - 2];
    const date = cells[cells.length - 3];
    if (!/^https?:\/\//.test(link)) continue;
    rows[cells[1]] = { n: cells[1], date, link };
  }
  return rows;
}

function parseExperiments(lines) {
  const exps = []; let inFirst = false, seenFirst = false, cur = null;
  for (const line of lines) {
    if (/^## /.test(line)) {
      if (seenFirst) { inFirst = false; } else { seenFirst = true; inFirst = true; }
      cur = null; continue;
    }
    if (!inFirst) continue;
    if (/^### /.test(line)) { cur = { title: line.slice(4).trim(), lines: [] }; exps.push(cur); }
    else if (cur) cur.lines.push(line);
  }
  return exps;
}

function check(text, opts = {}) {
  const lines = text.split(/\r?\n/);
  const problems = [];
  const add = (code, detail) => problems.push({ code, detail });

  const title = lines.find(l => /^# /.test(l)) || '';
  const dates = [...title.matchAll(ISO)].map(m => m[1]);
  const window = { start: dates[0] || null, end: dates[1] || null };
  if (dates.length < 2) add('title-dates', 'The title line needs the window start and today as YYYY-MM-DD.');

  const sources = parseSources(lines);
  const links = Object.values(sources).map(s => s.link);
  const dup = links.filter((l, i) => links.indexOf(l) !== i);
  for (const l of new Set(dup)) add('duplicate-link', `The same link is listed twice: ${l}`);
  if (Object.keys(sources).length === 0) add('no-sources', 'No Sources table rows with a number, a date and a link were found.');

  for (const s of Object.values(sources)) {
    // A GitHub release page (/releases/tag/<version>) is the release itself, not an index.
    if (!/\/releases\/tag\//i.test(s.link) && /\/(feed|rss|tag|tags|category|categories)(\/|$|\?)|\/feed\.xml$|\/blog\/\d{4}\/?$/i.test(s.link)) {
      add('index-link', `Source [${s.n}] links to a feed, tag or index page: ${s.link}. Cite the article itself.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) {
      if (!s.date || /\d/.test(s.date)) add('source-date-format', `Source [${s.n}]: the date must be YYYY-MM-DD or the words "not shown": "${s.date}".`);
      continue;
    }
    if (window.start && window.end && (s.date < window.start || s.date > window.end)) {
      add('source-outside-window', `Source [${s.n}] is dated ${s.date}, outside ${window.start} to ${window.end}.`);
    }
  }

  const exps = parseExperiments(lines);
  if (opts.experiments && exps.length > opts.experiments) {
    add('too-many-experiments', `${exps.length} experiments, the setting is ${opts.experiments}.`);
  }
  exps.forEach((e, i) => {
    const body = e.lines.join('\n');
    const label = `Experiment ${i + 1} (${e.title})`;
    const refs = [...body.matchAll(/\[(\d+)\]/g)].map(m => m[1]);
    if (refs.length === 0) { add('experiment-no-source', `${label} cites no source [n].`); return; }
    for (const r of refs) {
      const s = sources[r];
      if (!s) add('experiment-unknown-source', `${label} cites [${r}], which is not in the Sources table.`);
      else if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date)) add('experiment-undated-source', `${label} cites [${r}], which has no date. An experiment needs a dated source.`);
    }
    const fields = e.lines.filter(l => /^- \S[^:]*:/.test(l)).length;
    if (fields < 6) add('experiment-fields', `${label} has ${fields} of the 6 fields (what, why, time, steps, worked if, source).`);
  });

  if (opts.maxPages) {
    // The "Start with: ... | Searched: ... | Pages opened: <n>" line ends with the page count.
    const head = lines.find(l => /\|/.test(l) && !/^\|/.test(l)) || '';
    const n = Number((head.match(/(\d+)\s*$/) || [])[1]);
    if (n && n > opts.maxPages) add('over-budget', `${n} pages opened, the budget is ${opts.maxPages}.`);
  }

  return { ok: problems.length === 0, window, experiments: exps.length, sources: Object.keys(sources).length, problems };
}

function main(argv) {
  let file, stdin = false; const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') file = argv[++i];
    else if (argv[i] === '--stdin') stdin = true;
    else if (argv[i] === '--experiments') opts.experiments = Number(argv[++i]);
    else if (argv[i] === '--max-pages') opts.maxPages = Number(argv[++i]);
  }
  const fs = require('fs');
  if (!file && !stdin) { console.log(JSON.stringify({ error: 'usage: --file <draft.md> | --stdin [--experiments N] [--max-pages N]' })); process.exitCode = 2; return; }
  if (file && !fs.existsSync(file)) { console.log(JSON.stringify({ error: `file not found: ${file}` })); process.exitCode = 2; return; }
  const text = fs.readFileSync(file || 0, 'utf8');
  const result = check(text, opts);
  console.log(JSON.stringify(result));
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { check, parseSources, parseExperiments };
