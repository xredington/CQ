# Slide spec format

`rebuild.py` takes a JSON file:

```json
{ "slides": [ { "index": 26, "layout": "timeline", "title": "…" } ] }
```

A bare array works too. `index` is **1-based** and refers to the slide's
position in the deck being rebuilt. Anything you omit is simply not drawn.

## Keys every layout understands

| key | type | notes |
|---|---|---|
| `index` | int | required, 1-based |
| `layout` | string | required, see catalogue |
| `eyebrow` | string | small green kicker above the title; auto-uppercased |
| `title` | string | the headline — write it as a claim, not a label |
| `subtitle` | string | one line of context under the title |
| `footnote` | string | source / caveat, bottom left |
| `notes` | string | replaces the slide's speaker notes |

Bullets are `["text", …]`, or `{"text": "…", "level": 1}` for a sub-bullet.

## Layout catalogue

### `timeline` (aka `roadmap`) — phases across time
Best single upgrade for "plan / roadmap / summit-to-execution" slides.
```json
{"index":26,"layout":"timeline","eyebrow":"From summit to execution",
 "title":"The 12-month execution path","subtitle":"Four phases, each with a gate.",
 "steps":[{"phase":"Phase 1","date":"Q1 FY26","heading":"Mobilise",
           "bullets":["Owners named","Baselines locked"]}]}
```
2–6 steps. Each step: `phase`, `date`, `heading`, and `bullets` **or** `body`.

### `cards` — 2–4 parallel ideas
```json
{"layout":"cards","cards":[{"badge":"1","heading":"Cloud-first",
  "bullets":["…"]}]}
```
`badge` is optional; use `body` (string or list) instead of `bullets` for prose.
All cards are sized to the tallest, so the row reads as one band.

### `kpi` — a row of 2–5 headline numbers
```json
{"layout":"kpi","kpis":[{"value":"$1.4B","label":"Cloud & software GMV"}],
 "bullets":["So-what line under the numbers."]}
```
`value` stays short — `$1.4B`, `38%`, `2.1x`. The `label` carries the meaning.

### `two-column` — comparison, before/after, us/them
```json
{"layout":"two-column","columns":[{"heading":"Today","bullets":["…"]},
                                  {"heading":"FY26","bullets":["…"]}]}
```

### `matrix` — four quadrants
```json
{"layout":"matrix","quadrants":[{"heading":"Grow","bullets":["…"]}]}
```
Exactly 4 reads best. Each: `heading` + `bullets` or `body`.

### `process` — a chevron chain of sequential steps
```json
{"layout":"process","steps":[{"heading":"Assess","body":"Two weeks"}]}
```
Use for a flow with no dates; use `timeline` when there *are* dates.

### `table` — native, editable PowerPoint table
```json
{"layout":"table","header":["Market","Owner","Q1 target"],
 "rows":[["UAE","—","$40M"]]}
```
Keep to ~6 columns and ~9 rows; beyond that, split the slide.

### `bullets` (aka `title-bullets`) — the honest default
```json
{"layout":"bullets","bullets":["…"],"side_note":["Optional pull-out panel"]}
```
`side_note` puts a tinted panel down the right third.

### `section` — full-bleed divider
```json
{"layout":"section","eyebrow":"Part two","title":"Execution",
 "subtitle":"What changes on Monday."}
```

### `quote` — a single pull-quote
```json
{"layout":"quote","quote":"We left Singapore with owners, not opinions.",
 "attribution":"GLT close-out"}
```

## Theming

`--theme my.json` overrides any key in `scripts/theme.py`:

```json
{"primary":"0A9D4E","ink":"04120A","accent":"F44609",
 "font":"Calibri","font_head":"Calibri","size_title":30}
```

Geometry keys (`margin_x`, `margin_top`, `margin_bot`, `gutter`) are inches
and apply to every layout — widen the margins for a roomier deck.

## Keeping it honest

The layouts have fixed slot counts on purpose. If the source slide has three
real facts, use three cards — do not pad to four. If a value is unreadable in
the source image, write `[illegible]` and raise it with the user rather than
inventing a plausible number.
