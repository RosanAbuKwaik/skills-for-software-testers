'use strict';
// Infographic builder — renders the HTML source in a real browser, exports every format next
// to it, and checks the RENDERED result (not the source code), including the animation.
//
// Usage: node build.js --html <folder>/<slug>.html [--plan <folder>/plan.md]
// Writes next to the HTML: <slug>.svg, <slug>.png, <slug>.gif, <slug>.mp4, README.md,
// checks/grayscale.png, checks/report.json.
// Checks (see references/construction.md for the markers they read):
//   page-errors   the page ran without script errors
//   canvas        no text outside the canvas
//   text-overlap  no text sits on other text
//   node-overlap  no text sits on a box it does not belong to ([data-node])
//   canvas-fit    a tall canvas (poster) leaves no big empty band under the graphic
//   node-once     each box name appears once; a loop points back to the same box
//                 (mark a deliberate repeat with data-repeat)
//   static-steps  with motion off, every [data-step] is fully visible
//   legend        each [data-legend=k] line looks like the arrows [data-kind=k] (motion off)
//   colour-only   two kinds of arrow never differ by colour alone (motion off)
//   ai-orange     no orange or terracotta near Claude's #D97757 (hue 8-30)
//   status-colour a box or step that fails, passes or waits is red, green or amber and says
//                 so with data-status (fail | pass | wait)
//   animation     during one loop, every [data-step] lights up at least once
//   plan          plan.md is complete (check_plan.js), when --plan is given
// Prints ONE JSON line: {"ok", "folder", "files", "skipped", "checks", "failures"}.
// Exit: 0 = all checks passed (skipped formats are listed), 1 = a check failed, 2 = usage error.
// (Whether the design is clear and specific stays with the agent: that is judgment.)

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const { check: checkPlan } = require('./check_plan.js');

const normDash = d => (!d || d === 'none') ? 'none' : d.replace(/px/g, '').split(/[\s,]+/).filter(Boolean).map(Number).join(' ');

// Words that put a box or a step in a state every reader knows by colour.
const STATUS_WORDS = {
  fail: /\b(fail(s|ed|ing|ure)?|reopen(s|ed)?|blocked|error|rejected|broken|rollback|rolled back)\b/i,
  pass: /\b(pass(es|ed)?|closed|merged|done|success(ful)?|approved|live)\b/i,
  wait: /\b(retry(ing)?|retries|flaky|pending|on hold|awaiting)\b/i,
};
const STATUS_HUE = { fail: [[340, 360], [0, 15]], pass: [[85, 175]], wait: [[22, 52]] };
const STATUS_NAME = { fail: 'red', pass: 'green', wait: 'amber' };
function statusOf(text) {
  // A failure word wins: "Tests fail: retry" is a failure path even though it also retries.
  for (const k of ['fail', 'pass', 'wait']) if (STATUS_WORDS[k].test(text)) return k;
  return '';
}
function hue(colour) {
  const m = String(colour).match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/);
  if (!m) return null;
  const [r, g, b] = m.slice(1, 4).map(n => Number(n) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 0.06) return null; // grey: no hue
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; return h < 0 ? h + 360 : h;
}
function isAiOrange(colour) {
  const m = String(colour).match(/rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?/);
  if (!m || (m[4] !== undefined && Number(m[4]) === 0)) return false;
  const [r, g, b] = m.slice(1, 4).map(n => Number(n) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  const h = hue(colour);
  return h !== null && h >= 8 && h <= 30 && sat >= 0.4 && l >= 0.25 && l <= 0.75;
}
function hueMatches(colour, status) {
  const h = hue(colour);
  return h !== null && STATUS_HUE[status].some(([a, b]) => h >= a && h <= b);
}

function overlapArea(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

// Playwright is often installed in the user's project or globally, not next to this skill.
function loadPlaywright(htmlDir) {
  const paths = [__dirname, process.cwd(), htmlDir];
  try {
    const g = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root', '-g'], { encoding: 'utf8', shell: process.platform === 'win32' });
    if (g.status === 0 && g.stdout.trim()) paths.push(g.stdout.trim());
  } catch { /* npm missing: try the other places */ }
  for (const base of paths) {
    try { return require(require.resolve('playwright', { paths: [base] })); } catch { /* next */ }
  }
  return null;
}

function hasFfmpeg() {
  try { return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0; } catch { return false; }
}

// Collected inside the page: geometry and computed styles of the rendered graphic.
function measure() {
  const svg = document.getElementById('art');
  if (!svg) return { error: 'no <svg id="art"> found' };
  const box = svg.getBoundingClientRect();
  const vb = svg.viewBox.baseVal;
  const k = vb && vb.width ? vb.width / box.width : 1;
  const rel = el => { const r = el.getBoundingClientRect(); return { x: (r.left - box.left) * k, y: (r.top - box.top) * k, w: r.width * k, h: r.height * k }; };
  const visible = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getBoundingClientRect().width > 0; };
  const texts = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim() && visible(t))
    .map((t, i) => {
      t.dataset.mi = i;
      // The line box includes the font's full ascent and descent, which makes stacked lines of
      // one label look like they overlap. Keep the band where the letters actually are.
      const r = rel(t); const fs = parseFloat(getComputedStyle(t).fontSize) * k; const ink = Math.min(r.h, fs * 0.8);
      return { i, s: t.textContent.trim().slice(0, 40), r: { x: r.x, y: r.y + (r.h - ink) / 2, w: r.w, h: ink } };
    });
  const nodes = [...svg.querySelectorAll('[data-node]')].map((n, j) => ({ repeat: n.hasAttribute('data-repeat'),
    j, r: rel(n), inside: [...n.querySelectorAll('text')].map(t => Number(t.dataset.mi)).filter(x => !Number.isNaN(x)),
    s: (n.querySelector('text') || {}).textContent || `node ${j}` }));
  const steps = [...svg.querySelectorAll('[data-step]')].map(s => ({ n: s.dataset.step, o: Number(getComputedStyle(s).opacity) }));
  // Colour of a box (its first filled shape, else its outline) or of a step (its arrow stroke).
  const colourOf = el => {
    const shape = el.querySelector('rect, path, circle, ellipse, polygon') || el;
    const cs = getComputedStyle(shape);
    const pick = v => v && v !== 'none' && !/rgba?\(\s*255,\s*255,\s*255/.test(v) && !/rgba\([^)]*,\s*0\)/.test(v) ? v : '';
    return el.hasAttribute('data-step') ? (pick(cs.stroke) || pick(cs.fill)) : (pick(cs.fill) || pick(cs.stroke));
  };
  const statuses = [...svg.querySelectorAll('[data-node], [data-step]')].map(el => ({
    s: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 50), status: el.getAttribute('data-status') || '', colour: colourOf(el) }));
  const colours = [...new Set([...svg.querySelectorAll('*')].filter(e => !e.closest('defs')).flatMap(e => { const cs = getComputedStyle(e); return [cs.fill, cs.stroke]; })
    .filter(c => c && c.startsWith('rgb')))];
  const legends = [...svg.querySelectorAll('[data-legend]')].map(l => ({ k: l.dataset.legend, d: getComputedStyle(l).strokeDasharray }));
  const arrows = [...svg.querySelectorAll('[data-kind]:not([data-legend])')].map(a => ({ k: a.dataset.kind, d: getComputedStyle(a).strokeDasharray, m: a.getAttribute('marker-end') || '' }));
  const VW = vb ? vb.width : box.width, VH = vb ? vb.height : box.height;
  // The lowest drawn thing, ignoring full-page backgrounds and sheets.
  const contentBottom = Math.max(0, ...[...svg.querySelectorAll('text, rect, path, line, circle, ellipse, polygon, polyline, image, use')]
    .filter(e => !e.closest('defs, marker, clipPath, mask, pattern, filter') && visible(e))
    .map(rel).filter(r => !(r.w >= VW * 0.9 && r.h >= VH * 0.9)).map(r => r.y + r.h));
  return { W: VW, H: VH, contentBottom, colours, statuses, texts, nodes, steps, legends, arrows,
    cycle: Number(svg.dataset.cycleMs) || 9600, hasFlow: !!svg.querySelector('.flow, animate, animateMotion') || steps.length > 0 };
}

function staticChecks(m) {
  const out = [];
  const push = (name, problems) => out.push({ name, ok: problems.length === 0, detail: problems.slice(0, 8) });
  push('canvas', m.texts.filter(t => t.r.x < -2 || t.r.y < -2 || t.r.x + t.r.w > m.W + 2 || t.r.y + t.r.h > m.H + 2)
    .map(t => `"${t.s}" goes outside the canvas`));
  const tt = [];
  for (let a = 0; a < m.texts.length; a++) for (let b = a + 1; b < m.texts.length; b++) {
    const A = m.texts[a].r, B = m.texts[b].r;
    if (overlapArea(A, B) > 6) tt.push(`"${m.texts[a].s}" overlaps "${m.texts[b].s}"`);
  }
  push('text-overlap', tt);
  const tn = [];
  for (const n of m.nodes) for (const t of m.texts) {
    if (!n.inside.includes(t.i) && overlapArea(n.r, t.r) > 6) tn.push(`"${t.s}" sits on the box "${n.s.trim()}"`);
  }
  push('node-overlap', tn);
  // A square canvas is a fixed post format; a tall canvas should end where the graphic ends.
  const empty = m.H > m.W && m.contentBottom ? Math.round(m.H - m.contentBottom) : 0;
  push('canvas-fit', empty > 96 ? [`${empty}px of empty space under the graphic: shrink the canvas height to about ${Math.ceil(m.contentBottom + 48)}`] : []);
  const seenNames = {}; const dup = [];
  for (const n of m.nodes) {
    const name = String(n.s).trim().toLowerCase();
    if (!name || n.repeat) continue;
    if (seenNames[name]) dup.push(`the box "${String(n.s).trim()}" is drawn more than once: draw it once and point arrows back to it`);
    seenNames[name] = true;
  }
  push('node-once', [...new Set(dup)]);
  push('static-steps', m.steps.filter(s => s.o < 0.9).map(s => `step ${s.n} is at opacity ${s.o} with motion off`));
  const lg = [];
  for (const l of m.legends) {
    const mine = m.arrows.filter(a => a.k === l.k);
    if (!mine.length) lg.push(`legend "${l.k}" has no arrows with data-kind="${l.k}"`);
    for (const a of mine) if (normDash(a.d) !== normDash(l.d)) { lg.push(`legend "${l.k}" is "${normDash(l.d)}" but its arrows are "${normDash(a.d)}"`); break; }
  }
  push('legend', lg);
  const byKind = {};
  for (const a of m.arrows) byKind[a.k] = byKind[a.k] || `${normDash(a.d)}|${a.m}`;
  const kinds = Object.keys(byKind); const co = [];
  for (let a = 0; a < kinds.length; a++) for (let b = a + 1; b < kinds.length; b++) {
    if (byKind[kinds[a]] === byKind[kinds[b]]) co.push(`"${kinds[a]}" and "${kinds[b]}" arrows look the same without colour`);
  }
  push('colour-only', co);
  const sc = [];
  for (const e of m.statuses || []) {
    const want = statusOf(e.s);
    const status = e.status || '';
    if (want && status !== want) { sc.push(`"${e.s}" reads as ${want} but is not marked data-status="${want}" and coloured ${STATUS_NAME[want]}`); continue; }
    if (status && !STATUS_HUE[status]) { sc.push(`"${e.s}" has an unknown data-status="${status}" (use fail, pass or wait)`); continue; }
    if (status && !hueMatches(e.colour, status)) sc.push(`"${e.s}" is ${status} but its colour ${e.colour || 'none'} is not ${STATUS_NAME[status]}`);
  }
  push('status-colour', sc);
  push('ai-orange', (m.colours || []).filter(isAiOrange).map(c => `${c} is an orange that reads as AI-made: use the brand theme, a topic accent or a status colour`));
  return out;
}

const FRAME_CSS = (W, H) => `html,body{margin:0!important;padding:0!important;background:transparent}
figure{margin:0!important;padding:0!important;max-width:none!important}
body>*:not(figure):not(svg){display:none!important}
svg#art{width:${W}px!important;height:${H}px!important;display:block!important}
@page{size:${W}px ${H}px;margin:0}`;

function readViewBox(html) {
  const m = html.match(/<svg[^>]*id=["']art["'][^>]*>/i) || [];
  const vb = (m[0] || '').match(/viewBox=["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)/i);
  return vb ? { W: Math.round(Number(vb[1])), H: Math.round(Number(vb[2])) } : { W: 1080, H: 1080 };
}

async function openPage(browser, url, W, H, motion, video) {
  const opts = { viewport: { width: W, height: H }, reducedMotion: motion };
  if (video) opts.recordVideo = { dir: video, size: { width: W, height: H } };
  const t0 = Date.now();
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.addStyleTag({ content: FRAME_CSS(W, H) });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(400);
  return { ctx, page, errors, readyMs: Date.now() - t0 };
}

async function run(htmlPath, planPath) {
  const abs = path.resolve(htmlPath);
  const dir = path.dirname(abs);
  const slug = path.basename(abs, '.html');
  const checksDir = path.join(dir, 'checks');
  fs.mkdirSync(checksDir, { recursive: true });
  const html = fs.readFileSync(abs, 'utf8');
  const { W, H } = readViewBox(html);
  const files = { html: abs };
  const skipped = [];
  let checks = [];

  let chromium;
  const pw = loadPlaywright(dir);
  if (pw) ({ chromium } = pw); else {
    skipped.push({ what: 'svg, png, gif, mp4 and the rendered checks', why: 'Playwright is not installed (npm i -D playwright, then npx playwright install chromium)' });
  }

  let svgText;
  if (chromium) {
    const browser = await chromium.launch();
    try {
      const url = 'file://' + abs;
      // Still formats and static checks: motion off.
      const st = await openPage(browser, url, W, H, 'reduce');
      const m = await st.page.evaluate(measure);
      if (m.error) throw new Error(m.error);
      checks.push({ name: 'page-errors', ok: st.errors.length === 0, detail: st.errors.slice(0, 5) });
      checks.push(...staticChecks(m));
      svgText = await st.page.evaluate(() => {
        const svg = document.getElementById('art').cloneNode(true);
        svg.querySelectorAll('script').forEach(s => s.remove());
        svg.querySelectorAll('[data-mi]').forEach(e => e.removeAttribute('data-mi'));
        const css = [...document.querySelectorAll('head style')].map(s => s.textContent).join('\n');
        const imports = [...document.querySelectorAll('link[rel="stylesheet"]')].map(l => `@import url("${l.href}");`).join('\n');
        if (css || imports) {
          const st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
          st.textContent = imports + '\n' + css;
          svg.insertBefore(st, svg.firstChild);
        }
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('width', svg.viewBox.baseVal.width);
        svg.setAttribute('height', svg.viewBox.baseVal.height);
        return new XMLSerializer().serializeToString(svg);
      });
      files.svg = path.join(dir, `${slug}.svg`);
      fs.writeFileSync(files.svg, '<?xml version="1.0" encoding="UTF-8"?>\n' + svgText);
      files.png = path.join(dir, `${slug}.png`);
      await st.page.locator('svg#art').screenshot({ path: files.png });
      await st.page.addStyleTag({ content: 'svg#art{filter:grayscale(1)}' });
      files.grayscale = path.join(checksDir, 'grayscale.png');
      await st.page.locator('svg#art').screenshot({ path: files.grayscale });
      await st.ctx.close();


      // Moving formats and the animation check: motion on, one loop recorded.
      if (m.hasFlow) {
        const vidDir = fs.mkdtempSync(path.join(checksDir, 'rec-'));
        const mv = await openPage(browser, url, W, H, 'no-preference', vidDir);
        const samples = 24; const seen = {};
        for (let i = 0; i < samples; i++) {
          const ops = await mv.page.evaluate(() => [...document.querySelectorAll('#art [data-step]')].map(s => [s.dataset.step, Number(getComputedStyle(s).opacity)]));
          for (const [n, o] of ops) seen[n] = Math.max(seen[n] ?? 0, o);
          await mv.page.waitForTimeout(m.cycle / samples);
        }
        const never = Object.entries(seen).filter(([, o]) => o < 0.9).map(([n, o]) => `step ${n} never lit up (max opacity ${o.toFixed(2)})`);
        checks.push({ name: 'animation', ok: never.length === 0, detail: never });
        const video = mv.page.video();
        await mv.ctx.close();
        const webm = await video.path();
        if (hasFfmpeg()) {
          const ss = (mv.readyMs / 1000).toFixed(2); const t = (m.cycle / 1000).toFixed(2);
          files.mp4 = path.join(dir, `${slug}.mp4`);
          spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', ss, '-t', t, '-i', webm, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', files.mp4]);
          files.gif = path.join(dir, `${slug}.gif`);
          spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', ss, '-t', t, '-i', webm, '-vf',
            'fps=12,scale=720:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse', files.gif]);
          for (const k of ['mp4', 'gif']) if (!fs.existsSync(files[k]) || fs.statSync(files[k]).size === 0) { skipped.push({ what: k, why: 'ffmpeg failed to convert the recording' }); delete files[k]; }
        } else {
          skipped.push({ what: 'gif, mp4', why: 'ffmpeg is not installed (Windows: winget install Gyan.FFmpeg, macOS: brew install ffmpeg, Linux: apt install ffmpeg), then run the build again' });
        }
        fs.rmSync(vidDir, { recursive: true, force: true });
      } else {
        skipped.push({ what: 'gif, mp4', why: 'the graphic has no moving parts' });
      }
    } finally {
      await browser.close();
    }
  }

  if (planPath) {
    const p = checkPlan(fs.readFileSync(planPath, 'utf8'), svgText ?? html);
    checks.push({ name: 'plan', ok: p.ok, detail: p.problems.map(x => x.detail) });
  }

  const has = k => files[k] ? `- \`${path.basename(files[k])}\`` : null;
  const readme = [`# ${slug}`, '', '| File | Use it for |', '|---|---|',
    has('html') && `| ${path.basename(files.html)} | the source, with moving arrows: open it in a browser |`,
    has('svg') && `| ${slug}.svg | still and editable, sharp at any size |`,
    has('png') && `| ${slug}.png | posts and chats |`,
    has('gif') && `| ${slug}.gif | moving, for slides and email |`,
    has('mp4') && `| ${slug}.mp4 | moving, for LinkedIn and other video posts |`,
    '| checks/ | grayscale.png and report.json from the build |', '',
    ...(skipped.length ? ['Not made:', ...skipped.map(s => `- ${s.what}: ${s.why}`)] : [])].filter(Boolean).join('\n');
  files.readme = path.join(dir, 'README.md');
  fs.writeFileSync(files.readme, readme + '\n');

  const failures = checks.filter(c => !c.ok);
  const result = { ok: failures.length === 0, open: pathToFileURL(abs).href, folderUrl: pathToFileURL(dir).href, folder: dir, files, skipped, checks: checks.map(c => ({ name: c.name, ok: c.ok })), failures };
  fs.writeFileSync(path.join(checksDir, 'report.json'), JSON.stringify({ ...result, checks }, null, 2));
  return result;
}

async function main(argv) {
  let html, plan;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--html') html = argv[++i];
    else if (argv[i] === '--plan') plan = argv[++i];
  }
  if (!html) { console.log(JSON.stringify({ error: 'usage: --html <file.html> [--plan <plan.md>]' })); process.exitCode = 2; return; }
  for (const f of [html, plan].filter(Boolean)) {
    if (!fs.existsSync(f)) { console.log(JSON.stringify({ error: `file not found: ${f}` })); process.exitCode = 2; return; }
  }
  try {
    const r = await run(html, plan);
    console.log(JSON.stringify(r));
    process.exitCode = r.ok ? 0 : 1;
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e.message }));
    process.exitCode = 1;
  }
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { normDash, overlapArea, staticChecks, readViewBox, statusOf, hueMatches, isAiOrange };
