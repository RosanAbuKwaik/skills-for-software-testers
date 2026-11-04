# Construction

The HTML file is the source. `build.js` renders it and makes every other format from it, so these markers are a contract: the checks read them.

## The file
- One self-contained `<slug>.html`. No external files except web fonts from Google Fonts.
- The whole graphic is one `<svg id="art" viewBox="0 0 W H" xmlns="http://www.w3.org/2000/svg">`. W is 1080. H is 1080 for `single`, or what the panels need for `poster`.
- Put `data-cycle-ms` on the svg: the length of one animation loop in milliseconds (default 9600). The GIF and MP4 record exactly one loop.
- Put all styles inside `<svg><style>…</style>`, so the exported SVG keeps them. The palette lives in `:root` variables at the top.
- A first `<rect width="100%" height="100%">` paints the background inside the svg.
- Give the svg a `<title>` (the L1 title) and a `<desc>` (one sentence saying what it shows).
- A script may generate the drawing (useful for the sketch style or for placing stages along a path). It must not fetch anything.

## Markers the checks read
| Marker | On | Meaning |
|---|---|---|
| `data-node` | the `<g>` of each box (shape plus its text) | a box; other text must not sit on it, and its name appears once |
| `data-status="fail"` (or `pass`, `wait`) | a `data-node` or `data-step` in that state | must be red, green or amber (references/color-brand.md); a label with a word like fail, reopen, closed, passed, merged, retry or flaky must carry it |
| `data-repeat` | a `data-node` that is deliberately drawn twice | rare: only when two panels answer different questions about the same thing |
| `data-step="n"` | the `<g>` of each step (arrow, label, badge) | step n of the walkthrough; it must light up during the loop |
| `class="flow"` | a moving arrow path | gets the marching dashes |
| `data-kind="ask"` (or any kind name) | each arrow path | the kind of arrow: request, answer, CI, CD… |
| `data-legend="ask"` | the sample line in the legend for that kind | must look like the arrows of that kind |

## Motion
- Only flow lines move. Boxes, lanes and text stay still.
- Kinds differ by dash shape as well as colour: for example requests long dashes `14 10`, answers dots `2 8`.
- Sequenced steps: each `[data-step]` fades from 0.25 to 1 in turn with `animation-delay`, and one loop lasts `data-cycle-ms`.
- Under `@media (prefers-reduced-motion: reduce)`: no animation, every step at full opacity, and each kind keeps a distinct static line style (for example requests solid, answers dashed). The legend shows these static styles. PNG and SVG are made in this mode.

Baseline CSS:
```css
.flow { stroke-dasharray: 14 10; animation: march 1s linear infinite; }
.flow[data-kind="answer"] { stroke-dasharray: 2 8; }
@keyframes march { to { stroke-dashoffset: -24; } }
[data-step] { animation: lit var(--cycle) linear infinite; opacity: .25; }
@keyframes lit { 0% { opacity: .25 } 3% { opacity: 1 } 15% { opacity: 1 } 18% { opacity: .25 } 100% { opacity: .25 } }
@media (prefers-reduced-motion: reduce) {
  .flow, [data-step] { animation: none; opacity: 1; }
  .flow[data-kind="ask"] { stroke-dasharray: none; }
  .flow[data-kind="answer"] { stroke-dasharray: 6 6; }
}
```
Set each step's `animation-delay` to `(n - 1) × cycle / steps`.

## Group labels
A name for a group of boxes ("CI", "CD", "runs on the server") sits on a bracket under those boxes or on a frame around them. A coloured bar with a group name floating elsewhere on the page does not say which boxes it means.

## Canvas height
A `single` stays 1080×1080, the post format. A `poster` ends about 48px under its last line: `build.js` fails when more than 96px is left empty.

## Shapes in the legend
Every visual difference that carries meaning is in the legend: line styles, dashed or solid outlines, stamps, colours. If a box has a dashed outline, the legend says what dashed means. If you cannot name its meaning, make it solid.

## Arrows
- Arrowheads with a `<marker>` using `stroke="context-stroke"`, or a drawn chevron.
- A label sits above its arrow on a background pill, never across another arrow.
- On a loop path, place arrowheads along the path so direction reads without motion.

## Text
- Text is the most common failure. Keep labels within the word budget (words.md).
- `text-anchor="middle"` for centred labels; the box width must fit the longest line.
- Arabic: add `direction="rtl"` and `unicode-bidi="plaintext"` on Arabic text, and an Arabic-capable font such as "Noto Sans Arabic", "Segoe UI", sans-serif.

## Sketch recipe
```html
<filter id="rough" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="H">
  <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="4"/>
  <feDisplacementMap in="SourceGraphic" scale="5"/>
</filter>
```
- `filterUnits="userSpaceOnUse"` with the full canvas is required: with the default units a straight horizontal or vertical line has a zero-height box, and the filter makes it disappear.
- Apply the filter to shapes and lines, never to text.
- Fonts: `<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Patrick+Hand&display=swap" rel="stylesheet">`, with the fallback `"Segoe Print", "Comic Sans MS", cursive`.

## Skeleton
```html
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>How does MCP work?</title>
<style>html,body{margin:0;background:#E9EDF5} figure{margin:0 auto;max-width:1080px}</style></head>
<body><figure>
<svg id="art" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg" data-cycle-ms="9600" role="img" aria-labelledby="t d">
  <title id="t">How does MCP work?</title>
  <desc id="d">Sequence diagram: a tester asks Claude to read bug PROJ-142 through an MCP server.</desc>
  <style>:root{--bg:#F4F7FB;--theme:#2F3FBF;--accent:#D63A6E;--ink:#1B2233;--cycle:9600ms} …</style>
  <rect width="100%" height="100%" fill="var(--bg)"/>
  <g data-node>…</g>
  <g data-step="1"><path class="flow" data-kind="ask" …/>…</g>
  <g class="legend"><line data-legend="ask" class="flow" data-kind="ask" …/>…</g>
</svg>
</figure></body></html>
```
