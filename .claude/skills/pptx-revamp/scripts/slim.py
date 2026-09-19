#!/usr/bin/env python3
"""Drop media left orphaned inside a .pptx after slides were rebuilt.

    python3 slim.py deck.pptx --out deck_slim.pptx

Removing a picture from a slide unlinks it but leaves the image file inside
the package, so a rebuilt deck keeps the weight of the screenshots it no
longer shows. This rewrites the archive with only the media still referenced
by a relationship.
"""
import argparse, posixpath, re, shutil, sys, zipfile


def referenced(zf):
    """Every media part reachable from some .rels file."""
    keep = set()
    for name in zf.namelist():
        if not name.endswith(".rels"):
            continue
        base = posixpath.dirname(posixpath.dirname(name))   # strip /_rels
        xml = zf.read(name).decode("utf-8", "replace")
        for target in re.findall(r'Target="([^"]+)"', xml):
            if "media/" not in target or target.startswith(("http:", "https:")):
                continue
            keep.add(posixpath.normpath(posixpath.join(base, target)))
    return keep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("deck")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    with zipfile.ZipFile(a.deck) as zf:
        keep = referenced(zf)
        media = [n for n in zf.namelist() if n.startswith("ppt/media/")]
        drop = [n for n in media if n not in keep]
        before = sum(zf.getinfo(n).file_size for n in media)
        freed = sum(zf.getinfo(n).file_size for n in drop)
        with zipfile.ZipFile(a.out, "w", zipfile.ZIP_DEFLATED) as out:
            for item in zf.infolist():
                if item.filename in drop:
                    continue
                out.writestr(item, zf.read(item.filename))

    print(f"media parts: {len(media)}, orphaned: {len(drop)}")
    print(f"media bytes: {before/1e6:,.1f} MB -> {(before-freed)/1e6:,.1f} MB")
    import os
    print(f"file: {os.path.getsize(a.deck)/1e6:,.1f} MB -> "
          f"{os.path.getsize(a.out)/1e6:,.1f} MB")


if __name__ == "__main__":
    sys.exit(main())
