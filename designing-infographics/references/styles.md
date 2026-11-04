# Styles

Two styles share one construction (see construction.md). Pick one per graphic.

## clean (default): ByteByteGo style
For technical explainers: how a protocol, pipeline, tool or architecture works.

1. **Numbered walkthrough on the arrows.** Step badges (1, 2, 3) sit on the arrows themselves, so a still image reads as a walkthrough. Without numbers a flow diagram is a map with no route.
2. **Title inside the image,** phrased as a question ("How does MCP work?") or a finding ("Only what the task needs enters context"). A bare topic label ("MCP overview") is not a title.
3. **One graphic, one point.** A big system becomes a series or a poster, never one everything-diagram.
4. **Direction is explicit.** Every arrow has a head. Requests and answers differ by line style as well as colour. In HTML the flow lines move; structural lines stay still.
5. **One concrete example threads every step:** "bug PROJ-142", "a user in Tokyo requests video.mp4". The reader follows something specific.
6. **Grid variant for catalogues.** When the content is a set of categories rather than a flow, use tiles with a header and three short lines each.

Look: light background, thin outlines, rounded boxes, one icon per node type, generous white space.

## sketch: hand drawn
For posters, learning recaps and friendly social posts, or when the user asks for "hand drawn", "Excalidraw" or "sketch".

- **Wobbly lines** with an SVG displacement filter (recipe in construction.md). Apply it to shapes and lines, never to text.
- **Double outline** on boxes: one normal stroke and one thinner, offset, 55% opacity.
- **Handwritten fonts:** a display hand for titles (Caveat), a readable hand for labels (Patrick Hand), with a fallback stack. Body labels never go below 20px in this style.
- **Underline swashes** under panel titles, numbered circles for panels.
- **More colour is allowed,** but each colour still means one thing, and the legend says what.
- Everything else from `clean` still applies: numbers on arrows, one name per thing, title inside the image, arrowheads that read without motion.

## Choosing
| The request says | Style |
|---|---|
| nothing about style | clean |
| hand drawn, sketch, Excalidraw, notebook, doodle | sketch |
| a recap of what was just taught | sketch |
| for a document or a report figure | clean |
