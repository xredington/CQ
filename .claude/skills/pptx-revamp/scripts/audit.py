#!/usr/bin/env python3
"""Inventory a .pptx and classify every slide as image-only / image-heavy /
mixed / native, so you know exactly which slides need rebuilding.

    python3 audit.py deck.pptx [--json report.json] [--dump-media DIR]

Verdicts
  IMAGE_ONLY   pictures cover the slide and there is (almost) no live text
               -> must be rebuilt as native shapes
  IMAGE_HEAVY  a big picture plus some live text -> usually rebuild
  MIXED        picture is a genuine illustration beside real text -> keep
  NATIVE       already editable -> leave alone
"""
import argparse, json, os, sys
from pptx import Presentation
from pptx.util import Emu

MSO_PICTURE, MSO_GROUP, MSO_TABLE, MSO_CHART = 13, 6, 19, 3


def _walk(shapes):
    for s in shapes:
        yield s
        if s.shape_type == MSO_GROUP:
            yield from _walk(s.shapes)


def _area(s):
    try:
        return (s.width or 0) * (s.height or 0)
    except Exception:
        return 0


def analyse(path, dump_media=None):
    prs = Presentation(path)
    slide_area = prs.slide_width * prs.slide_height
    out = {
        "deck": os.path.abspath(path),
        "slide_size_in": [round(prs.slide_width / 914400, 2),
                          round(prs.slide_height / 914400, 2)],
        "slide_count": len(prs.slides),
        "slides": [],
    }
    if dump_media:
        os.makedirs(dump_media, exist_ok=True)

    for idx, slide in enumerate(prs.slides, start=1):
        pics, texts, tables, charts, others = [], [], 0, 0, 0
        pic_area = 0
        for s in _walk(slide.shapes):
            st = s.shape_type
            if st == MSO_PICTURE:
                pic_area += _area(s)
                rec = {"name": s.name,
                       "in": [round((s.left or 0) / 914400, 2),
                              round((s.top or 0) / 914400, 2),
                              round((s.width or 0) / 914400, 2),
                              round((s.height or 0) / 914400, 2)]}
                if dump_media:
                    try:
                        img = s.image
                        fn = f"slide{idx:03d}_{len(pics)+1}.{img.ext}"
                        with open(os.path.join(dump_media, fn), "wb") as fh:
                            fh.write(img.blob)
                        rec["file"] = fn
                    except Exception as e:
                        rec["file_error"] = str(e)
                pics.append(rec)
            elif st == MSO_TABLE:
                tables += 1
            elif st == MSO_CHART:
                charts += 1
            elif s.has_text_frame and s.text_frame.text.strip():
                texts.append(s.text_frame.text.strip())
            elif st != MSO_GROUP:
                others += 1

        chars = sum(len(x) for x in texts)
        cover = round(pic_area / slide_area, 3) if slide_area else 0
        if pics and cover >= 0.55 and chars < 40:
            verdict = "IMAGE_ONLY"
        elif pics and cover >= 0.35 and chars < 400:
            verdict = "IMAGE_HEAVY"
        elif pics:
            verdict = "MIXED"
        else:
            verdict = "NATIVE"

        notes = ""
        if slide.has_notes_slide:
            # a slide built from a layout with no notes placeholder has none
            tf = slide.notes_slide.notes_text_frame
            notes = tf.text.strip() if tf is not None else ""
        out["slides"].append({
            "index": idx,
            "verdict": verdict,
            "picture_coverage": cover,
            "pictures": pics,
            "text_chars": chars,
            "tables": tables, "charts": charts, "other_shapes": others,
            "title": (texts[0][:90] if texts else ""),
            "text": texts,
            "notes": notes[:600],
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("deck")
    ap.add_argument("--json", dest="json_out")
    ap.add_argument("--dump-media")
    a = ap.parse_args()
    rep = analyse(a.deck, a.dump_media)

    todo = [s for s in rep["slides"] if s["verdict"] in ("IMAGE_ONLY", "IMAGE_HEAVY")]
    print(f"{os.path.basename(rep['deck'])} — {rep['slide_count']} slides, "
          f"{rep['slide_size_in'][0]}x{rep['slide_size_in'][1]} in")
    print(f"{len(todo)} slide(s) need rebuilding\n")
    print(f"{'#':>4}  {'verdict':<12} {'pic%':>5} {'chars':>6}  title")
    print("-" * 78)
    for s in rep["slides"]:
        print(f"{s['index']:>4}  {s['verdict']:<12} "
              f"{int(s['picture_coverage']*100):>4}% {s['text_chars']:>6}  "
              f"{s['title'][:40]}")
    print("\nrebuild list:", ", ".join(str(s["index"]) for s in todo) or "none")
    if a.json_out:
        with open(a.json_out, "w") as fh:
            json.dump(rep, fh, indent=2)
        print("wrote", a.json_out)


if __name__ == "__main__":
    sys.exit(main())
