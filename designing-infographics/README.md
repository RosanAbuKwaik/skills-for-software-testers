# designing-infographics

Turns a topic, a link or pasted text into one explanatory graphic in the ByteByteGo style (or hand drawn), and delivers it in every format in one folder: HTML with moving arrows, SVG, PNG, GIF and MP4. Every build is checked in a real browser before it is delivered.

## Install
Copy this folder to `~/.claude/skills/designing-infographics/` (or to a project's `.claude/skills/`), then start a new session.

Needs Node.js 18+ for the scripts, Playwright with Chromium for PNG and the checks (`npm i -g playwright && npx playwright install chromium`), and ffmpeg for GIF and MP4. Without them you still get the HTML.

## Use
```
/designing-infographics How does MCP let Claude read a Jira bug?
/designing-infographics Hand-drawn poster: CI/CD
/designing-infographics https://example.com/an-article-you-found-hard
```
The first time, it asks once which colours and corner name you want, and keeps them for every graphic. Later, just say so in your own words ("make it green", "put my name on it").

## Folder
| Path | What |
|---|---|
| `SKILL.md` | the workflow |
| `references/` | styles, layouts, words, colour and brand, construction, sources |
| `templates/` | `plan.md` and `brand.md` |
| `scripts/` | `build.js` (render, export, check), `check_plan.js`, tests and fixtures |
| `examples/` | a finished sketch poster with its plan |
| `evals/` | scenarios and trigger tests |

Run the tests: `node scripts/check_plan.test.js && node scripts/build.test.js`

Adapted from infographic-design by Lu Yi (MIT). See NOTICE.
