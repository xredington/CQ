#!/usr/bin/env python3
"""Download a Google Drive file straight to disk by its share link or ID.

For decks too big to attach to a chat: share the file in Drive
("Anyone with the link" -> Viewer), then

    python3 fetch_drive.py <link-or-id> -o deck.pptx

Streams to disk, so file size is bounded by disk, not by any upload limit.
Handles Drive's virus-scan interstitial, which every file over ~25 MB hits.
"""
import argparse, html, re, sys, urllib.parse, urllib.request

UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
BASE = "https://drive.google.com/uc?export=download&id="


def file_id(s):
    """Accept a raw ID or any of Drive's share-link shapes."""
    for pat in (r"/file/d/([A-Za-z0-9_-]{10,})",
                r"/d/([A-Za-z0-9_-]{10,})",
                r"[?&]id=([A-Za-z0-9_-]{10,})"):
        m = re.search(pat, s)
        if m:
            return m.group(1)
    if re.fullmatch(r"[A-Za-z0-9_-]{10,}", s.strip()):
        return s.strip()
    sys.exit(f"Could not find a Drive file ID in: {s}")


def _open(opener, url, data=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    return opener.open(req, timeout=600)


def fetch(fid, out):
    cj = __import__("http.cookiejar", fromlist=["CookieJar"]).CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cj))
    resp = _open(opener, BASE + fid)
    head = resp.read(8192)

    # a small HTML body means the scan-warning page, not the file
    if head[:1] in (b"<", b"\n") and b"<html" in head[:2048].lower():
        page = (head + resp.read()).decode("utf-8", "replace")
        action = re.search(r'<form[^>]*action="([^"]+)"', page)
        if not action:
            sys.exit("Drive returned a page, not a file — is the link set to "
                     "'Anyone with the link'?")
        fields = dict(re.findall(r'<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"',
                                 page))
        url = html.unescape(action.group(1)) + "?" + urllib.parse.urlencode(fields)
        resp = _open(opener, url)
        head = resp.read(8192)
        if b"<html" in head[:2048].lower():
            sys.exit("Still no file after confirming — check the sharing setting.")

    total = 0
    with open(out, "wb") as fh:
        fh.write(head)
        total += len(head)
        while True:
            chunk = resp.read(1 << 20)
            if not chunk:
                break
            fh.write(chunk)
            total += len(chunk)
            print(f"\r  {total/1e6:,.1f} MB", end="", flush=True)
    print(f"\rwrote {out}  ({total/1e6:,.1f} MB)")
    return total


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("link", help="Drive share link or file ID")
    ap.add_argument("-o", "--out", required=True)
    a = ap.parse_args()
    n = fetch(file_id(a.link), a.out)
    with open(a.out, "rb") as fh:
        if fh.read(2) != b"PK":
            print("warning: this does not look like a .pptx/.zip file",
                  file=sys.stderr)
    return 0 if n else 1


if __name__ == "__main__":
    sys.exit(main())
