#!/usr/bin/env python3
"""Downsample oversized images inside a .pptx.

    python3 compress.py deck.pptx --out smaller.pptx [--max-px 2400] [--min-kb 700]

Decks accumulate images at camera or export resolution — far beyond what a
13.3-inch slide can show. Resampling them to slide resolution is invisible on
screen and in print, and is usually where the file's weight actually is.
Video and anything the tool cannot decode are passed through untouched, and
each part keeps its own format so the package's relationships stay valid.
"""
import argparse, io, os, sys, zipfile

SKIP = (".mp4", ".mov", ".avi", ".wmv", ".m4v", ".wmf", ".emf", ".svg", ".wdp")


def shrink(data, ext, max_px, jpeg_q):
    from PIL import Image
    im = Image.open(io.BytesIO(data))
    im.load()
    if max(im.size) <= max_px and ext in (".jpg", ".jpeg"):
        return None
    scale = min(1.0, max_px / max(im.size))
    if scale < 1.0:
        im = im.resize((max(1, int(im.width * scale)),
                        max(1, int(im.height * scale))), Image.LANCZOS)
    out = io.BytesIO()
    if ext in (".jpg", ".jpeg"):
        im.convert("RGB").save(out, "JPEG", quality=jpeg_q, optimize=True,
                               progressive=True)
    elif ext == ".png":
        # a photo kept as PNG stays heavy; palette-quantise only when the
        # image has no alpha to lose
        if im.mode in ("RGBA", "LA", "P") and "transparency" in im.info or im.mode == "RGBA":
            im.save(out, "PNG", optimize=True)
        else:
            im.convert("RGB").quantize(colors=256, method=Image.MEDIANCUT) \
              .save(out, "PNG", optimize=True)
    else:
        return None
    return out.getvalue()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("deck")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-px", type=int, default=2400)
    ap.add_argument("--min-kb", type=int, default=700)
    ap.add_argument("--jpeg-q", type=int, default=85)
    a = ap.parse_args()

    saved = skipped = 0
    with zipfile.ZipFile(a.deck) as zf, \
         zipfile.ZipFile(a.out, "w", zipfile.ZIP_DEFLATED) as out:
        for item in zf.infolist():
            data = zf.read(item.filename)
            name = item.filename
            ext = os.path.splitext(name)[1].lower()
            if (name.startswith("ppt/media/") and ext not in SKIP
                    and len(data) > a.min_kb * 1024):
                try:
                    new = shrink(data, ext, a.max_px, a.jpeg_q)
                    if new and len(new) < len(data):
                        saved += len(data) - len(new)
                        data = new
                    else:
                        skipped += 1
                except Exception:
                    skipped += 1
            out.writestr(name, data)

    print(f"saved {saved/1e6:,.1f} MB across images "
          f"({skipped} left alone)")
    print(f"file: {os.path.getsize(a.deck)/1e6:,.1f} MB -> "
          f"{os.path.getsize(a.out)/1e6:,.1f} MB")


if __name__ == "__main__":
    sys.exit(main())
