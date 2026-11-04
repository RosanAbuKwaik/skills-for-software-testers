# Layouts

Choose the layout from the relation, not the other way round.

| Relation | Layout | Shape |
|---|---|---|
| flow between parties | **sequence lanes** | one column per party, numbered arrows going out and coming back like a staircase |
| ordered stages | **process** | boxes left to right or top to bottom, numbered, with a loop-back arrow if it repeats |
| a cycle that never ends | **loop** | a circle or an infinity sign, stages placed along the path, arrowheads along it |
| things inside things | **containment** | nested boxes, outer label top left |
| two or more options | **comparison** | mirrored columns, same row height on both sides, one attribute per row |
| change over time | **timeline** | a dated axis, milestones above and below |
| one big number as evidence | **hero number** | the number large, what it means in one line, the source small |
| cause and effect | **causality** | causes on the left, arrows into the effect, the strongest cause marked with the accent |

## single
One relation, one layout, 1080×1080. The title on top, the drawing in the middle, one takeaway line at the bottom.

## poster
2 to 4 panels stacked, each with a number in a circle, its own one-line title, and one relation. Width 1080; height grows with the panels (about 380 to 520 per panel).
- Each panel answers a different question. If two panels answer the same question, merge them.
- Never cut one flow into panels. A flow with a loop (a bug's life, a CI run) is one `single` graphic: each state drawn once, the loop as an arrow back to the same box.
- A thing keeps one name in every panel. Check this across panels before building.
- Order panels from the big picture to the detail.
- One page title on top, inside the image.

## Density
- **dense (default):** every party, every step, real values on the arrows.
- **light:** at most 6 steps, at most 6 words per label, no payloads. Only when the request asks for it.
- Past one screen, give the reader landmarks: one icon per node type and one surface that always means the same thing.

## Spacing
Spacing on an 8px grid: 8, 16, 24, 32, 48, 64. Keep about 40% of the canvas empty. When content grows, grow the canvas and keep the gaps.
