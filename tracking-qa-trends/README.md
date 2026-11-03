# tracking-qa-trends

A Claude Code skill that finds what is new in QA and software testing and turns it into a few short experiments you can try right away.

## What it does

- Searches dated web sources for the window you ask for (default: the last 30 days).
- Opens every page it cites, reads its date, and keeps only changes that affect how software is tested.
- Gives 3 experiments by default. Each has a first step, a time limit, a success check, and a source with its date.
- Lists articles and videos worth reading or watching, and items to keep an eye on.
- Checks its own draft with a script, then saves the result as an HTML report in `qa-trends/<date>.html` in the folder you run it from. It never overwrites an existing report.

It does not change your project, and it does not sign in anywhere. Public pages only.

## Requirements

- Claude Code with web search and page-fetch tools.
- Node.js 18 or newer, for the helper scripts in `scripts/`. Without Node the skill still runs, but it does those steps by hand and says so.

## Install

Copy the `tracking-qa-trends` folder into a Claude Code skills folder.

For all your projects (user level):

```bash
# macOS / Linux / Git Bash
cp -r tracking-qa-trends ~/.claude/skills/
```

```powershell
# Windows PowerShell
Copy-Item -Recurse tracking-qa-trends "$HOME\.claude\skills\"
```

For one project only, copy it to `<project>/.claude/skills/` instead.

Start a new Claude Code session so the skill is picked up.

## Use

Ask in plain words, or type `/tracking-qa-trends`:

- "What is new in QA this month?"
- "Latest test automation updates from the last 10 days"
- "deep" in the request raises the search budget from 20 to 40 searches and pages.

## First run works without a profile

You do not need to set anything up. With no profile, the skill ranks news for a typical tester, asks you nothing during the run, and says so at the top of the result.

To rank by your own work, say "create profile". The skill asks 5 short questions (kind of testing and tools, role, the 3 tasks that take most of your time, sources you trust, topics to skip) and saves your answers to `~/.claude/qa-trends/profile.md` in your home folder, only after you agree. That file stays on your machine, outside this repository.

## What is in this folder

| Path | Purpose |
|---|---|
| `SKILL.md` | The skill instructions |
| `references/profile-template.md` | The 5 profile questions and the file layout |
| `scripts/fetch_releases.js` | Reads official GitHub releases of the tools in your profile |
| `scripts/check_result.js` | Checks the draft before it is shown |
| `scripts/render_html.js` | Writes the HTML report |
| `scripts/*.test.js` | Tests for the three scripts (`node scripts/<name>.test.js`) |
| `evals/` | Test scenarios and trigger tests for the skill |
