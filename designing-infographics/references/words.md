# Words

Most of a graphic is text. Labels go generic as easily as layouts do.

## Three levels
Every text element sits at exactly one level.
- **L1, the title:** inside the image, a question or a finding, 2 to 3 times the body size, the boldest text.
- **L2, sections:** node names, panel titles, key values. Reading L1 and L2 alone tells the skeleton.
- **L3, support:** arrow labels, captions, the source line. Small and quiet.

One font family per style. Vary size, weight and colour, not the family.

## Write from the reader's side
Name things the way the reader would: "Tester", "your laptop", "live for users". Not the system's internal names, unless the reader uses them.

## Concrete labels
Every arrow label carries a value from the example.
- Generic: "Request data", "Return result", "Title, status, steps".
- Concrete: "Read bug PROJ-142", "Pay button dead, Safari", "Repro steps, plain words".
Test: if the label would fit any other example, rewrite it.

## One name per thing
Pick one name for each thing and use it everywhere: every panel, label, legend and caption. Before building, list the names in `plan.md` under Names. If two names appear for one thing, keep the one the reader uses.

## Word budget
- Title: at most 8 words.
- Node name: at most 3 words.
- Arrow label: at most 6 words.
- Takeaway line: at most 12 words.
When text does not fit, cut words first, then shrink type, then enlarge the box.

## The source line
When the input was a link or pasted text, the last line of the graphic says `Source: <site or document name>`. Small, L3, never left out.
