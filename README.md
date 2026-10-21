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
