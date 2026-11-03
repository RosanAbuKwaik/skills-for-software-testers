# Scenarios for tracking-qa-trends (v0.4)

## How to run
1. Baseline first, WITHOUT the skill: rename the folder `tracking-qa-trends` to
   `tracking-qa-trends.off`, Reload Window, open a NEW chat, run the input, save the output.
   Then rename the folder back and Reload Window.
2. Then run the same input WITH the skill, in a NEW chat. Compare.
3. For every run, write one row in the results table at the end.
4. Count the WebSearch and WebFetch calls in the chat. The budget is 8 and 8 (20 and 20 with "deep").

## S1. General mode, no profile
Input: "What is new in QA this month?"
Expected:
- Asks no questions during the run.
- At most 3 experiments. Each has: what it is, why it helps, time, steps (at most 3), worked if,
  source with a date. The first is marked "start with this" and the first line says "Start with: ...".
- A line says it was ranked for a typical tester. At most 2 items are marked "if you use <tool>".
- The Coverage section says what was checked, where nothing was new, and what could not be opened.
  It says this is not a complete scan. Each line is short.
- The first lines say "No profile found at <path>". The last lines offer "more" and "create profile".
- Searches and opened pages are inside the budget.

## S2. Profile in the request
Input: "I do web UI testing with Playwright and most of my time goes to writing test cases.
What should I try this month?"
Expected:
- Each "Why it helps" names Playwright, web UI testing or writing test cases.
- Items that do not touch these are not in "Try".
- It opened the official Playwright releases page first.
- The commands are copied word for word from an official page. If the page shows none:
  "no official steps found" with the link.

## S3. "more"
Input (right after S1): "more"
Expected:
- Tables: Watch, and Worth reading or watching. No Wider QA field table (no profile).
- If a video appears, it says "based on title and description only". Length comes from the page or "not shown".

## S4. No search tools (optional)
Input: "Give me the latest QA trends." Run it with WebSearch and WebFetch denied in the permissions.
If you cannot turn them off, skip this one.
Expected:
- Says it has no web search and asks for links. Gives nothing from memory.

## S5. Not for choosing a tool
Input: "Which test automation tool should my team pick? Use the latest trends."
Expected:
- Does not recommend a tool. Says what the skill can do instead, or does not load.

## S6. Arabic
Input: "شو آخر ترندز الـ QA؟ وشو أجرّب؟"
Expected:
- Headings and labels in Arabic. Tool names, versions and commands in English.

## S7. Profile file present
Setup: create `~/.claude/qa-trends/profile.md` (in your home folder) using references/profile-template.md.
Input: "What should I try this month?"
Expected:
- Uses the profile without asking, from ANY folder you start the chat in. Says "Using profile: <path>".
- Ranks by it. Shows the tester's own area first. Opens the official releases pages of the profile tools first.
- With "more": a "Wider QA field" table with at most 3 items.

## S8. Create the profile
Input (after S1): "yes, create the profile"
Expected:
- Asks the 5 questions one at a time. Shows the text of the file and asks before saving.
- Saves to `~/.claude/qa-trends/profile.md` (home folder) and tells you the full path. Asks before overwriting an existing file.

## S9. Nothing new
Input: "What is new in game testing in the last 7 days?"
Expected:
- Fewer than 3 experiments, or none. No padding. It says so, shows what was checked, offers a longer window.

## S10. Other window, save to a file
Input: "What is new in API testing in the last 14 days? Save it."
Expected:
- Window is 14 days. Only that area.
- Asks before overwriting an existing `qa-trends/<date>.md`.

## Check by hand in every run (5 minutes)
1. Open 3 links from "Sources": does the page exist, show the date, and say what the result says?
2. Are all dates inside the window? A date without a year: did it say how it got the year?
3. Is every command copied from an official page? (A command without a source means it was invented.)
4. Is any number or version without a source? Does a speed or savings claim say "the maker says"?
5. Is it short? (At most 3 experiments, one line per field, Coverage in a few short lines.)
6. Does Coverage tell the truth, without saying the result is complete?
7. After reading it, do you want to go and try the first experiment? (The most important one.)

## Results table (one row per run)
| Scenario | Model | With skill? | Score /10 | Searches | Pages | Wants to try? | Notes |
|---|---|---|---|---|---|---|---|
