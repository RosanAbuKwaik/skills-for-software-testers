'use strict';
// Infographic plan checker — makes sure the plan step really happened before building.
//
// Usage: node check_plan.js --plan <plan.md> [--svg <graphic.svg | graphic.html>]
// Checks that every required field of templates/plan.md is filled (no empty value, no
// leftover <placeholder>), that the message is one "After seeing this…" sentence, that a
// critique line exists, and — when the source is a link or pasted text — that the graphic
// names it on a "Source:" line. Every percentage drawn needs a real source: with a brief-only
// source it fails; with a link or pasted text, it must be listed under Facts.
// Prints ONE JSON line: {"ok": bool, "fields": {...}, "problems": [{code, detail}]}.
// Exit: 0 = ok, 1 = problems, 2 = usage error.
// (Whether the plan is good or generic stays with the agent: that is judgment.)

const fs = require('fs');

const REQUIRED = ['Source', 'Message', 'Relation', 'Density', 'Palette', 'Layout idea', 'Signature', 'Names', 'Critique'];
const RELATIONS = ['flow', 'sequence', 'containment', 'comparison', 'quantity', 'causality'];

function parsePlan(text) {
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z][A-Za-z ]*?):\s*(.*)$/);
    if (m) fields[m[1].trim()] = m[2].trim();
  }
  return fields;
}

function check(planText, svgText) {
  const fields = parsePlan(planText);
  const problems = [];
  const add = (code, detail) => problems.push({ code, detail });

  for (const f of REQUIRED) {
    const v = fields[f];
    if (v === undefined) add('missing-field', `"${f}:" is missing.`);
    else if (!v || /<[^>]+>/.test(v)) add('empty-field', `"${f}:" is empty or still has a <placeholder>.`);
  }
  const msg = fields.Message || '';
  if (msg && !/^after seeing this/i.test(msg)) add('message-form', 'Message must start "After seeing this, the reader understands…".');
  if (msg && (msg.match(/[.!?](\s|$)/g) || []).length > 1) add('message-one-sentence', 'Message must be one sentence.');
  const rel = (fields.Relation || '').toLowerCase();
  if (rel && !RELATIONS.some(r => rel.startsWith(r))) add('relation-unknown', `Relation must be one of: ${RELATIONS.join(', ')}.`);

  const src = (fields.Source || '').toLowerCase();
  const external = /https?:\/\//.test(src) || src.startsWith('pasted');
  if (external && svgText !== undefined && !/Source:\s*\S/.test(svgText)) {
    add('source-not-shown', 'The source is a link or pasted text, but the graphic has no "Source: …" line.');
  }
  if (svgText !== undefined) {
    const visible = svgText.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');
    const nums = [...new Set((visible.match(/\d+(?:\.\d+)?\s?%/g) || []).map(n => n.replace(/\s/g, '')))].filter(n => n !== '100%' && n !== '0%');
    for (const n of nums) {
      if (!external) add('number-without-source', `${n} is drawn but the source is "${fields.Source || 'brief only'}". Leave it out, or ask the user for a source and add it.`);
      else if (!(fields.Facts || '').includes(n.replace('%', ''))) add('number-not-in-facts', `${n} is drawn but not listed under Facts with the sentence it came from.`);
    }
  }
  return { ok: problems.length === 0, fields, problems };
}

function main(argv) {
  let plan, svg;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--plan') plan = argv[++i];
    else if (argv[i] === '--svg') svg = argv[++i];
  }
  if (!plan) { console.log(JSON.stringify({ error: 'usage: --plan <plan.md> [--svg <file>]' })); process.exitCode = 2; return; }
  for (const f of [plan, svg].filter(Boolean)) {
    if (!fs.existsSync(f)) { console.log(JSON.stringify({ error: `file not found: ${f}` })); process.exitCode = 2; return; }
  }
  const r = check(fs.readFileSync(plan, 'utf8'), svg ? fs.readFileSync(svg, 'utf8') : undefined);
  console.log(JSON.stringify(r));
  process.exitCode = r.ok ? 0 : 1;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { check, parsePlan, REQUIRED };
