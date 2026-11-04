# Colour, brand and honest numbers

## 60 / 30 / 10
| Share | Role | From |
|---|---|---|
| 60% | **background**: canvas and card fills | brand, fixed |
| 30% | **theme**: outlines, arrows, headings | brand, fixed |
| 10% | **accent**: step badges and the takeaway, the single most important thing | the topic, or the brand if it fixes one |
| as needed | **status**: red, green, amber on parts that fail, pass or wait | fixed meanings, see Status colours |

The fixed background and theme make every graphic recognisable as the user's. The accent changes with the topic so graphics do not look the same:

| Topic world | Accent idea |
|---|---|
| security, auth, encryption | gold `#C99A2E` |
| bugs, failures, flaky tests | raspberry `#B0245E` |
| pipelines, releases, green builds | green `#1F9D6B` |
| AI, agents, protocols | pink `#D63A6E` |
| data, storage | teal `#13879A` |

Check that the accent passes contrast on the background (below). If it fails, darken it.

## Status colours
Some colours already mean something to every reader. Use them for the parts of the drawing that carry that meaning, on top of the brand colours:

| Meaning | Colour | Use on |
|---|---|---|
| failure, danger, error, rejected | red `#D64545` | a failed step, a fail or rollback arrow, a "Reopened" or "Blocked" box |
| success, done, passed, live | green `#1F9D6B` | a passed check, "Closed", "Merged", "Production" reached |
| warning, waiting, needs attention | amber `#E08A1E` | waiting for approval, flaky, retrying |
| everything else | the brand theme | normal boxes and arrows |

- A status colour goes only on what is in that state. A box that is not a failure is never red, however much red would brighten the page.
- Status colours always come with a second channel: a ✓ or ✕ icon, a word ("Fail", "Pass"), or a line style. Red and green look alike to many readers.
- They appear in the legend like any other meaning.
- Status colours replace the topic accent where they apply. The topic accent stays for step badges and the takeaway when the topic has no status in it.
- Check contrast: a status colour behind text needs a light tint fill (for example `#FDECEC` for red) with dark text, not text on the strong colour.

## Palettes
The first graphic offers three palettes (Ocean, Forest, Plum) from `templates/brand.md` and saves the choice. Ocean is the default: background `#F4F7FB`, cards `#FFFFFF`, theme `#2F3FBF`, ink `#1B2233`, muted `#5B6478`, font `Inter, "Segoe UI", system-ui, sans-serif`. The accent always comes from the topic table unless the brand fixes one. Check the accent's contrast against the chosen background.

## Never
- Any orange or terracotta between red and amber (hue about 8 to 30, like `#D97757`, `#BF5517`, `#E8742A`): it reads as AI-made. `build.js` fails on it. Amber `#E08A1E` is allowed only as the wait status.
- More than one accent in `single`. In `sketch` and `poster` more colours are allowed, but each one means one thing and the legend says what.

## Accessibility
- Text contrast at least 4.5:1, large text and lines at least 3:1.
- Colour never carries meaning alone: requests and answers differ by line style too, loaded and not loaded differ by solid and dashed outlines, and so on.
- `build.js` writes `checks/grayscale.png`. Look at it: the graphic must still read.

## Signature
If the brand file has a signature line (for example "Rosan Abu Kwaik · QA"), put it in the bottom right corner, L3 size, muted colour.

## Honest numbers
Numbers appear as evidence inside an explanation.
- Bars start at zero. No 3D. No two axes.
- A circle's area, not its width, scales with the value.
- Round unless precision is the point: 70%, not 69.83%.
- Every number has a source line. A number without a source stays out.
- A number earns its place only if it supports the one message. Before drawing it, write in `plan.md` under Facts what changed between the values and why, as the source says. If the cause is not the subject of the graphic (a score rose because the model changed, on a graphic about the harness), leave the number out: placed under the title it would claim a cause that is not true.
- A claim a company makes about its own product is written as theirs: "Databricks says…", never as a plain fact.
