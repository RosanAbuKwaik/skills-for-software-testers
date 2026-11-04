'use strict';
// Tests for check_plan.js. Run: node scripts/check_plan.test.js
const assert = require('node:assert');
const { check } = require('./check_plan.js');
let passed = 0; const failures = [];
function test(name, fn) { try { fn(); passed++; console.log(`  ok - ${name}`); } catch (e) { failures.push(name); console.error(`  FAIL - ${name}: ${e.message}`); } }
const codes = r => r.problems.map(p => p.code);
const plan = (over = {}) => {
  const f = { Source: 'brief only', Message: 'After seeing this, the reader understands that MCP is a door into Jira.',
    Relation: 'flow', Density: 'dense, default', Palette: 'background #F4F7FB, theme #2F3FBF, accent #D63A6E for badges',
    'Layout idea': 'four lanes', Signature: 'the staircase of arrows', Names: 'MCP server, Jira', Critique: 'swapped generic labels for PROJ-142', ...over };
  return Object.entries(f).filter(([, v]) => v !== null).map(([k, v]) => `${k}: ${v}`).join('\n');
};

test('a complete plan passes', () => assert.deepStrictEqual(check(plan()).problems, []));
test('a missing field is caught', () => assert.ok(codes(check(plan({ Critique: null }))).includes('missing-field')));
test('a leftover placeholder is caught', () => assert.ok(codes(check(plan({ Signature: '<the one thing>' }))).includes('empty-field')));
test('the message must be one "After seeing this" sentence', () => {
  assert.ok(codes(check(plan({ Message: 'MCP is cool.' }))).includes('message-form'));
  assert.ok(codes(check(plan({ Message: 'After seeing this, X. And also Y.' }))).includes('message-one-sentence'));
});
test('an unknown relation is caught', () => assert.ok(codes(check(plan({ Relation: 'vibes' }))).includes('relation-unknown')));
test('a link source must be named on the graphic', () => {
  const p = plan({ Source: 'https://example.com/post (read on 2026-11-04)' });
  assert.ok(codes(check(p, '<svg><text>no credit</text></svg>')).includes('source-not-shown'));
  assert.ok(!codes(check(p, '<svg><text>Source: example.com</text></svg>')).includes('source-not-shown'));
});
test('a percentage with no real source is caught; a sourced one listed under Facts passes', () => {
  assert.ok(codes(check(plan(), '<svg><text>70% of flaky tests</text></svg>')).includes('number-without-source'));
  const p = plan({ Source: 'https://example.com/study (read on 2026-11-04)', Facts: '70% from "timing caused 70%", example.com' });
  assert.deepStrictEqual(check(p, '<svg><text>70% timing</text><text>Source: example.com</text></svg>').problems, []);
  assert.ok(codes(check(p, '<svg><text>45%</text><text>Source: example.com</text></svg>')).includes('number-not-in-facts'));
  assert.ok(!codes(check(plan(), '<svg><style>.a{width:100%}</style><text>0% to 100%</text></svg>')).includes('number-without-source'));
});
test('a brief-only source needs no source line', () => assert.ok(!codes(check(plan(), '<svg></svg>')).includes('source-not-shown')));

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
