#!/usr/bin/env python3
"""Drop parts left unreachable inside a .pptx after slides were rebuilt.

    python3 slim.py deck.pptx --out deck_slim.pptx

Removing a picture (or a whole slide) unlinks it but leaves its parts inside
the package, so a rebuilt deck keeps the weight of screenshots it no longer
shows. This walks the relationship graph out from the package root and keeps
only what is actually reachable — which is what PowerPoint reads.
"""
import argparse, os, posixpath, re, sys, zipfile

CT = "[Content_Types].xml"
ROOT = "_rels/.rels"


def rels_path(part):
    return posixpath.join(posixpath.dirname(part), "_rels",
                          posixpath.basename(part) + ".rels")


def reachable(zf):
    """Every part reachable from the package root by following relationships."""
    names = set(zf.namelist())
    seen, queue = {CT, ROOT}, [ROOT]
    while queue:
        rels = queue.pop()
        if rels not in names:
            continue
        seen.add(rels)
        base = posixpath.dirname(posixpath.dirname(rels))   # strip /_rels
        xml = zf.read(rels).decode("utf-8", "replace")
        for tag in re.findall(r"<Relationship\b[^>]*>", xml):
            if 'TargetMode="External"' in tag:
                continue
            m = re.search(r'Target="([^"]+)"', tag)
            if not m:
                continue
            target = m.group(1)
            if target.startswith(("http:", "https:", "../ppt/")) and "://" in target:
                continue
            part = posixpath.normpath(posixpath.join(base, target))
            if part in seen or part not in names:
                continue
            seen.add(part)
            queue.append(rels_path(part))
    return seen


def prune_content_types(xml, kept):
    """Drop Override entries for parts that are no longer in the package."""
    def keep(match):
        name = re.search(r'PartName="([^"]+)"', match.group(0))
        if name and name.group(1).lstrip("/") not in kept:
            return ""
        return match.group(0)
    return re.sub(r"<Override\b[^>]*/>", keep, xml)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("deck")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    with zipfile.ZipFile(a.deck) as zf:
        keep = reachable(zf)
        all_names = [i.filename for i in zf.infolist()]
        dropped = [n for n in all_names if n not in keep]
        media = [n for n in all_names if n.startswith("ppt/media/")]
        freed = sum(zf.getinfo(n).file_size for n in dropped)
        with zipfile.ZipFile(a.out, "w", zipfile.ZIP_DEFLATED) as out:
            for item in zf.infolist():
                if item.filename in dropped:
                    continue
                data = zf.read(item.filename)
                if item.filename == CT:
                    data = prune_content_types(
                        data.decode("utf-8", "replace"), keep).encode("utf-8")
                out.writestr(item.filename, data)

    kept_media = [n for n in media if n in keep]
    print(f"parts: {len(all_names)} -> {len(all_names) - len(dropped)} "
          f"({len(dropped)} unreachable, {freed/1e6:,.1f} MB)")
    print(f"media: {len(media)} -> {len(kept_media)}")
    print(f"file:  {os.path.getsize(a.deck)/1e6:,.1f} MB -> "
          f"{os.path.getsize(a.out)/1e6:,.1f} MB")


if __name__ == "__main__":
    sys.exit(main())
