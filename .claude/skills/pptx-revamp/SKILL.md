---
name: pptx-revamp
description: Convert picture-only PowerPoint slides (pasted screenshots, exported images) back into native, fully editable slides, and re-template weak slides onto a clean branded layout. Use when a .pptx contains slides that are "just an image", when text on a slide can't be selected or edited, or when a specific slide needs a better layout. Triggers on "make these slides editable", "this slide is an image", "redo slide N", "re-template the deck".
---

# pptx-revamp

Turn image slides into real slides, and weak slides into well-templated ones.

A picture cannot be un-pictured mechanically: the content has to be **read**
and **rebuilt**. That is the whole job — read each image slide with vision,
transcribe it faithfully, then re-emit it as native text boxes, shapes and
tables through `rebuild.py`. The output opens in PowerPoint like any
hand-made slide: selectable text, editable colours, no screenshots.

## Setup (once per machine)

```bash
bash .claude/skills/pptx-revamp/scripts/setup.sh
```

Installs `python-pptx`, `Pillow`, `pymupdf`. Rendering also needs
LibreOffice **with Impress** (`soffice`); `libreoffice-core` alone cannot open
a .pptx. On macOS: `brew install --cask libreoffice`.

## Workflow

Let `S=.claude/skills/pptx-revamp/scripts`.

### 1. Work on a copy, never the original

```bash
cp "<deck>.pptx" work.pptx
```

State the original's path back to the user so they can confirm it's the right file.

### 2. Audit — find out which slides are actually images

```bash
python3 $S/audit.py work.pptx --json audit.json --dump-media media/
```

Prints a per-slide verdict and a rebuild list:

| verdict | meaning | action |
|---|---|---|
| `IMAGE_ONLY` | pictures cover the slide, no live text | rebuild |
| `IMAGE_HEAVY` | big picture + a little live text | rebuild |
| `MIXED` | a real illustration next to real text | keep, unless asked |
| `NATIVE` | already editable | leave alone |

Show the user the list and confirm the scope before rebuilding.

### 3. Render those slides and *read* them

```bash
python3 $S/render.py work.pptx --out png/ --slides 4,9,26 --dpi 150
```

Then open each PNG with the Read tool and transcribe it. This step is the
quality of the whole job:

- **Transcribe, never invent.** Every number, name, date and label must come
  off the image. If something is genuinely illegible, put `[illegible]` in the
  spec and list it for the user — do not guess a figure on an executive deck.
- Keep the author's wording. Tighten only obvious overflow, and say so.
- Capture the *structure*, not just the words: is it a timeline, four pillars,
  a comparison, a metric row? That choice is the layout.
- Read the speaker notes in `audit.json` too — they often explain the slide.

### 4. Write the spec

One JSON object per slide, keyed by its 1-based `index`. Full schema and the
layout catalogue: `references/slide-spec.md`. Pick the layout that matches the
content's shape:

`timeline` · `cards` · `kpi` · `two-column` · `matrix` · `process` · `table` ·
`bullets` · `section` · `quote`

### 5. Rebuild

```bash
python3 $S/rebuild.py work.pptx spec.json --out deck_editable.pptx \
        --keep-media originals/ --number
```

Replaced images are archived to `originals/` — nothing is lost.

### 6. Verify before handing it over — always

```bash
python3 $S/render.py deck_editable.pptx --out check/ --slides 4,9,26 --dpi 150
python3 $S/audit.py  deck_editable.pptx        # rebuilt slides must read NATIVE
```

Read the `check/` PNGs. Look for text overflowing its box, a heading colliding
with the text under it, an empty band, a card taller than the slide. Fix the
spec and re-run — do not ship a slide you have not looked at.

### 7. Report

Tell the user, per slide: what it was, what layout it became, anything you
could not read, and anything you reworded.

## Re-templating a slide that is already native

Same path, minus the vision step: read the existing text out of `audit.json`,
choose a stronger layout, and rebuild that one index. Typical upgrades —
a wall of bullets describing phases → `timeline`; four parallel ideas →
`cards`; before/after → `two-column`; four metrics in a sentence → `kpi`.

## Rules

- Never edit the user's original file in place.
- Never rebuild a slide that isn't on the agreed list.
- Never fabricate data to fill a layout. A layout with three slots and two real
  facts becomes a two-slot layout.
- Keep the deck's own slide size; `rebuild.py` reads it from the file.
- Brand colours live in `scripts/theme.py` and can be overridden per run with
  `--theme my_theme.json`. Confirm the palette with the user before a
  client-facing deck.
- Fonts: the default is Calibri because it is safe everywhere. If the deck has
  a brand face installed, set `font` / `font_head` in the theme file.
