# Skills for software testers

Personal Claude Code skills for the test process (STLC). Each skill is one folder with a
`SKILL.md` file.

## analyzing-requirements

First STLC phase. Takes a requirement in any form (user story, ticket, spec paragraph,
informal message, design notes) and returns a report with: a verdict, numbered statements,
findings with questions for the product owner, testability, prioritized test conditions and
risks. It follows ISTQB test analysis and static review principles.

It does not write test cases, run tests, or change the ticket or the design.

### Install
Copy the folder `analyzing-requirements` (with its `references` folder) to
`~/.claude/skills/`, or to `.claude/skills/` inside a project. Restart Claude Code.

### Use
Ask in plain words, for example:

```
Analyze this requirement:
<paste the requirement, or give a link your connector can read>
```

For designs and design comments, paste or attach them: a connector may return only the text
of a page.

The report is saved to `requirement-analysis/<slug>.md` in your project. The skill asks before
overwriting an existing report.

### Status
Version 0.8. Tested by hand on several requirements. The ISTQB wording in
`references/quality-criteria.md` was written from memory and is not yet checked against the
CTFL v4.0 syllabus.

## estimating-testing-effort

Estimates how many hours one tester needs for a testing task. Reads the task (pasted text, a
file, or a Notion page, read only), counts what drives the work, splits it into testing
activities, and gives each one an optimistic, most likely and pessimistic number of hours
(three-point estimation). Returns the expected total, the range, the assumptions and what is
missing. The hours are judgment, not measured data. It never writes to a board or tracker.

Use: `Estimate this task: <text or Notion link>`

Status: version 0.3, draft. Test automation is estimated as its own activity. Tested by hand on one real ticket.

## designing-test-cases

Designs test cases from a requirement in any format (pasted text, a file, or a Notion page,
read only). Numbers the rules, picks an ISTQB technique for each (boundary values,
equivalence partitioning, decision table, state transition, use case, error guessing), and
gives every case preconditions, steps, test data, an expected result and a risk-based
priority. It never invents an expected result: an unknown one is written as "Unknown" with the
open question. After one approval it can create a Notion database with a Table view and a
Board view grouped by Status (Draft, Needs answer, Ready, Obsolete).

Use: `Design test cases using the designing-test-cases skill: <text or Notion link>`

Status: version 0.3, draft. Tested by hand on four tickets.
