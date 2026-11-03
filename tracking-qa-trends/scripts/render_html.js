'use strict';
// QA trends HTML report — turns the checked Markdown result into one self-contained HTML page
// (no external files, no scripts), so the tester can open it in a browser, keep it or share it.
//
// Usage: node render_html.js --file <checked-draft.md> --out <report.html>
// Reads the Markdown subset the Output template uses: headings, bullet and numbered lists,
// tables, `code`, **bold**, [text](link), bare links and fenced code. Text in Arabic, Hebrew or
// Persian makes the page right to left; code, commands and links stay left to right.
// Prints ONE JSON line: {"out": "<absolute path>", "bytes": n, "rtl": bool}.
// Exit: 0 = written, 2 = usage error. It creates the folder of --out if needed.
// (Run it only on a draft that passed check_result.js: it formats, it does not check.)

const fs = require('fs');
const path = require('path');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(text, links = {}) {
  const codes = [];
  let s = text.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)|]+)/g, (_, p, u) => `${p}<a href="${u}" dir="ltr">${u}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // [n] points at the Sources table: link it straight to that source.
  s = s.replace(/\[(\d+)\](?![(<])/g, (m, n) => links[n] ? `<a href="${links[n]}" title="${links[n]}">[${n}]</a>` : m);
  s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code dir="ltr">${esc(codes[Number(i)])}</code>`);
  return s;
}

// Number -> link, from every table row shaped "| n | ... | https://... |".
function sourceLinks(lines) {
  const links = {};
  for (const l of lines) {
    const c = l.split('|').map(x => x.trim());
    if (c.length >= 4 && /^\d+$/.test(c[1]) && /^https?:\/\/\S+$/.test(c[c.length - 2])) links[c[1]] = c[c.length - 2];
  }
  return links;
}

function render(md) {
  const lines = md.split(/\r?\n/);
  const links = sourceLinks(lines);
  const il = t => inline(t, links);
  const out = []; let title = 'QA trends'; let list = null; let i = 0;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      closeList(); const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<pre dir="ltr"><code>${esc(buf.join('\n'))}</code></pre>`); i++; continue;
    }
    if (/^\|/.test(line)) {
      closeList(); const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.replace(/^\||\|\s*$/g, '').split('|').map(c => c.trim());
      const body = rows.slice(1).filter(r => !/^\|[\s:|-]+\|?\s*$/.test(r));
      // A row whose first cell is a title and whose last cell is one [n] gets a clickable title.
      const row = r => { const c = cells(r); const m = c[c.length - 1].match(/^\[(\d+)\]$/);
        return c.map((x, j) => `<td>${j === 0 && m && links[m[1]] && !/^\d+$/.test(x) ? `<a href="${links[m[1]]}">${il(x)}</a>` : il(x)}</td>`).join(''); };
      out.push('<div class="table"><table><thead><tr>' + cells(rows[0]).map(c => `<th>${il(c)}</th>`).join('') + '</tr></thead><tbody>'
        + body.map(r => '<tr>' + row(r) + '</tr>').join('') + '</tbody></table></div>');
      continue;
    }
    let m;
    if ((m = line.match(/^(#{1,3}) (.*)/))) {
      closeList(); const lvl = m[1].length;
      if (lvl === 1) title = m[2];
      out.push(`<h${lvl}>${il(m[2])}</h${lvl}>`);
    } else if ((m = line.match(/^\s+(\d+)\. (.*)/))) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${il(m[2])}</li>`);
    } else if ((m = line.match(/^- (.*)/))) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${il(m[1])}</li>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList(); out.push(`<p>${il(line)}</p>`);
    }
    i++;
  }
  closeList();
  const rtl = /[֐-ࣿ]/.test(md);
  const html = `<!DOCTYPE html>
<html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title.replace(/[*`]/g, ''))}</title>
<style>
:root { --bg: #f7f7f5; --card: #ffffff; --text: #1f2328; --muted: #5b636b; --line: #d9dcdf; --accent: #1a6b55; --code: #eef1f3; }
@media (prefers-color-scheme: dark) { :root { --bg: #16181b; --card: #1e2125; --text: #e6e8ea; --muted: #a2a9b0; --line: #343a40; --accent: #5cc8a3; --code: #2a2f35; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, "Segoe UI", Tahoma, sans-serif; }
main { max-width: 960px; margin: 0 auto; padding: 24px 16px 48px; }
h1 { font-size: 1.6rem; margin: 0 0 8px; }
h2 { font-size: 1.25rem; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid var(--accent); }
h3 { font-size: 1.05rem; margin: 20px 0 8px; padding: 12px 14px; background: var(--card); border: 1px solid var(--line); border-inline-start: 4px solid var(--accent); border-radius: 8px; }
p { margin: 6px 0; } p:nth-of-type(-n+3) { color: var(--muted); }
ul, ol { margin: 6px 0 12px; padding-inline-start: 24px; }
a { color: var(--accent); overflow-wrap: anywhere; }
code { background: var(--code); padding: 1px 5px; border-radius: 4px; font: 0.9em ui-monospace, Consolas, monospace; unicode-bidi: isolate; }
pre { background: var(--code); padding: 12px; border-radius: 8px; overflow-x: auto; }
.table { overflow-x: auto; margin: 8px 0 16px; }
table { border-collapse: collapse; width: 100%; background: var(--card); }
th, td { border: 1px solid var(--line); padding: 8px 10px; text-align: start; vertical-align: top; }
th { background: var(--code); }
</style>
</head>
<body>
<main>
${out.join('\n')}
</main>
</body>
</html>
`;
  return { html, rtl };
}

function main(argv) {
  let file, outPath;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--file') file = argv[++i];
    else if (argv[i] === '--out') outPath = argv[++i];
  }
  if (!file || !outPath) { console.log(JSON.stringify({ error: 'usage: --file <checked-draft.md> --out <report.html>' })); process.exitCode = 2; return; }
  if (!fs.existsSync(file)) { console.log(JSON.stringify({ error: `file not found: ${file}` })); process.exitCode = 2; return; }
  const { html, rtl } = render(fs.readFileSync(file, 'utf8'));
  fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
  fs.writeFileSync(outPath, html);
  console.log(JSON.stringify({ out: path.resolve(outPath), bytes: Buffer.byteLength(html), rtl }));
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { render, inline };
