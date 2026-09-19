#!/usr/bin/env python3
"""Rasterise a deck (or selected slides) to PNG so Claude can *read* the
image slides with vision before rebuilding them.

    python3 render.py deck.pptx --out DIR [--slides 3,7,26] [--dpi 140]

Needs LibreOffice (soffice) on PATH + PyMuPDF.
"""
import argparse, os, shutil, subprocess, sys, tempfile


def to_pdf(deck, workdir):
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        sys.exit("LibreOffice not found — install it or convert to PDF yourself.")
    subprocess.run([soffice, "--headless", "--norestore",
                    "--convert-to", "pdf", "--outdir", workdir, deck],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                   timeout=900)
    pdf = os.path.join(workdir,
                       os.path.splitext(os.path.basename(deck))[0] + ".pdf")
    if not os.path.exists(pdf):
        sys.exit("LibreOffice produced no PDF — is the file a valid .pptx?")
    return pdf


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("deck")
    ap.add_argument("--out", required=True)
    ap.add_argument("--slides", help="comma list / ranges, 1-based e.g. 3,7,20-26")
    ap.add_argument("--dpi", type=int, default=140)
    a = ap.parse_args()

    want = None
    if a.slides:
        want = set()
        for part in a.slides.split(","):
            part = part.strip()
            if "-" in part:
                lo, hi = part.split("-")
                want.update(range(int(lo), int(hi) + 1))
            elif part:
                want.add(int(part))

    os.makedirs(a.out, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        pdf = to_pdf(os.path.abspath(a.deck), tmp)
        import pymupdf
        doc = pymupdf.open(pdf)
        zoom = a.dpi / 72.0
        mat = pymupdf.Matrix(zoom, zoom)
        n = 0
        for i, page in enumerate(doc, start=1):
            if want and i not in want:
                continue
            dst = os.path.join(a.out, f"slide{i:03d}.png")
            page.get_pixmap(matrix=mat).save(dst)
            print(dst)
            n += 1
        doc.close()
    print(f"rendered {n} slide(s) at {a.dpi} dpi -> {a.out}")


if __name__ == "__main__":
    main()
