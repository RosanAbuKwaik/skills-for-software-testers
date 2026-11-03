# Profile template

Used when the user agrees to create the profile. The file always lives at `~/.claude/qa-trends/profile.md` in the user's home folder (on Windows, `C:\Users\<name>\.claude\qa-trends\profile.md`).

## Questions
Ask them one at a time, in the user's language. Accept short answers. "None" is a valid answer.

1. What kind of testing do you do, and with which tools?
2. What is your role?
3. Which 3 tasks take most of your time?
4. Which blogs, channels or sites do you trust?
5. Which topics should I skip?

## File layout
```
# QA trends profile
Testing and tools: <answer 1>
Role: <answer 2>
Time goes to: <answer 3>
Trusted sources: <answer 4, or none>
Skip: <answer 5, or none>
Focus: own area plus up to 3 from the wider QA field
```

The user can change the last line to "own area only" or "everything".

## Rules
- Show the text to the user and write the file only after they agree.
- Create the folder if it is missing. Tell the user the full path you wrote to.
- Ask before overwriting an existing profile.
- Do not store credentials, e-mail addresses or personal data.
