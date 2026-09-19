#!/usr/bin/env python3
"""Rebuild slides as native, fully editable PowerPoint shapes from a JSON spec.

    python3 rebuild.py deck.pptx spec.json --out deck_rebuilt.pptx [--theme t.json]

Every shape it emits is a real text box / rectangle / table — no images — so
the result is editable in PowerPoint like any hand-made slide.
See references/slide-spec.md for the spec format and the layout catalogue.
"""
import argparse, json, os, sys
from copy import deepcopy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import theme as TH
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

IN = 914400


class Canvas:
    """Slide-sized drawing surface with the deck's own margins."""

    def __init__(self, slide, prs, t):
        self.s, self.t = slide, t
        self.W, self.H = prs.slide_width / IN, prs.slide_height / IN
        self.mx, self.mt, self.mb = t["margin_x"], t["margin_top"], t["margin_bot"]
        self.cw = self.W - 2 * self.mx          # content width
        self.y = self.mt                        # running cursor
        self.foot_h = 0.0                       # space reserved at the bottom

    # -- primitives -----------------------------------------------------
    def tb(self, x, y, w, h):
        return TH.textbox(self.s.shapes, x, y, w, h)

    def rect(self, x, y, w, h, **kw):
        kw.setdefault("t", self.t)
        return TH.box(self.s.shapes, x, y, w, h, **kw)

    def line(self, x, y, w, color="hairline", h=0.012):
        return self.rect(x, y, w, h, fill=color)

    def text(self, frame, runs, **kw):
        kw.setdefault("t", self.t)
        return TH.set_text(frame, runs, **kw)

    # -- chrome ---------------------------------------------------------
    def header(self, spec):
        t = self.t
        y = self.mt
        if spec.get("eyebrow"):
            b = self.tb(self.mx, y, self.cw, 0.26)
            self.text(b.text_frame, spec["eyebrow"].upper(), size=t["size_eyebrow"],
                      color="c1", bold=True, font=t["font_head"])
            y += 0.3
        if spec.get("title"):
            h = TH.text_h(spec["title"], self.cw, t["size_title"],
                          line=1.05, bold=True, pad=0.1)
            b = self.tb(self.mx, y, self.cw, h)
            self.text(b.text_frame, spec["title"], size=t["size_title"],
                      color="ink", bold=True, font=t["font_head"], line=1.05)
            y += h + 0.04
        if spec.get("subtitle"):
            h = TH.text_h(spec["subtitle"], self.cw, t["size_sub"],
                          line=1.2, pad=0.08)
            b = self.tb(self.mx, y, self.cw, h)
            self.text(b.text_frame, spec["subtitle"], size=t["size_sub"],
                      color="ink_soft", line=1.2)
            y += h + 0.14
        for i in range(4):                      # colourful accent bar
            self.rect(self.mx + i * 0.32, y + 0.04, 0.28, 0.06,
                      fill=TH.SERIES[i])
        self.y = y + 0.32
        if spec.get("footnote"):
            self.foot_h = TH.text_h(spec["footnote"], self.cw - 0.8,
                                    self.t["size_small"], line=1.2) + 0.1
        return self.y

    def footer(self, spec, number=None):
        t = self.t
        base = self.H - self.mb
        if spec.get("footnote"):
            h = TH.text_h(spec["footnote"], self.cw - 0.8, t["size_small"],
                          line=1.2)
            b = self.tb(self.mx, self.H - 0.16 - h, self.cw - 0.8, h)
            self.text(b.text_frame, spec["footnote"], size=t["size_small"],
                      color="ink_soft", line=1.2)
        if number is not None:
            b = self.tb(self.W - self.mx - 0.7, base - 0.02, 0.7, 0.3)
            self.text(b.text_frame, str(number), size=t["size_small"],
                      color="ink_soft", align="right")

    @property
    def bottom(self):
        """Lowest y content may occupy."""
        return self.H - self.mb - self.foot_h

    @property
    def body_h(self):
        return self.bottom - self.y - 0.12


# ----------------------------------------------------------------------
# layouts
# ----------------------------------------------------------------------
def _bullets(c, x, y, w, h, items, size=None, color="ink", fit=True):
    """Draw a bullet list, shrinking the type until it fits `h`."""
    t = c.t
    size = size or t["size_body"]
    gap = 9
    if fit and h and h > 0:
        while size > 8 and bullets_h(items, w, size, gap) > h:
            size -= 1
            if size <= 11:
                gap = 6
    tb = c.tb(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        sub = isinstance(item, dict)
        txt = item.get("text", "") if sub else str(item)
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.text = "\u2022  " + txt if not (sub and item.get("level")) else "\u2013  " + txt
        p.space_after = Pt(gap)
        p.line_spacing = 1.22
        if sub and item.get("level"):
            p.level = 1
        for r in p.runs:
            r.font.size = Pt(size - (1 if sub and item.get("level") else 0))
            r.font.name = t["font"]
            r.font.color.rgb = TH.rgb(t, "ink_soft" if (sub and item.get("level")) else color)
    return tb


def bullets_h(items, w, size, gap=9):
    """Height a bullet block needs, in inches."""
    h = 0.0
    for it in items:
        txt = it.get("text", "") if isinstance(it, dict) else str(it)
        sz = size - (1 if isinstance(it, dict) and it.get("level") else 0)
        h += TH.text_h("\u2022  " + txt, w, sz, line=1.22, pad=0) + gap / 72.0
    return h


def place_image(c, card, x, y, w, h):
    """Drop a picture into a box, cropping the overflow rather than squashing."""
    path = card["image"]
    if not os.path.exists(path):
        print(f"!! image not found: {path}")
        return
    if card.get("image_mode") == "logo":
        # letterbox a logo inside the box, keeping its aspect and some air
        try:
            from PIL import Image
            iw, ih = Image.open(path).size
            ar = iw / ih
        except Exception:
            ar = 3.0
        bw, bh = w - 0.5, h - 0.14
        dw, dh = (bw, bw / ar) if bw / ar <= bh else (bh * ar, bh)
        c.s.shapes.add_picture(path, Emu(int((x + (w - dw) / 2) * IN)),
                               Emu(int((y + (h - dh) / 2) * IN)),
                               Emu(int(dw * IN)), Emu(int(dh * IN)))
        return
    pic = c.s.shapes.add_picture(path, Emu(int(x * IN)), Emu(int(y * IN)),
                                 Emu(int(w * IN)), Emu(int(h * IN)))
    try:                                    # centre-crop to the box's aspect
        from PIL import Image
        iw, ih = Image.open(path).size
        want, have = w / h, iw / ih
        if have > want:                     # too wide -> trim the sides
            f = (1 - want / have) / 2
            pic.crop_left = pic.crop_right = f
        elif have < want:                   # too tall -> trim top and bottom
            f = (1 - have / want) / 2
            pic.crop_top = pic.crop_bottom = f
    except Exception:
        pass
    return pic


def lay_bullets(c, spec):
    c.header(spec)
    items = spec.get("bullets", [])
    img = spec.get("side_note")
    w = c.cw * (0.6 if img else 1.0)
    _bullets(c, c.mx, c.y, w, c.body_h, items)
    if img:
        x = c.mx + c.cw * 0.64
        bw = c.cw * 0.36
        c.rect(x, c.y, bw, c.body_h, fill="primary_lt", radius=0.04)
        b = c.tb(x + 0.26, c.y + 0.26, bw - 0.52, c.body_h - 0.52)
        c.text(b.text_frame, img if isinstance(img, list) else [img],
               size=c.t["size_body"], color="primary_dk", line=1.25, space_after=8)


def lay_two_column(c, spec):
    c.header(spec)
    cols = spec.get("columns", [])[:2]
    gut = c.t["gutter"]
    w = (c.cw - gut) / 2
    for i, col in enumerate(cols):
        x = c.mx + i * (w + gut)
        y = c.y
        if col.get("heading"):
            b = c.tb(x, y, w, 0.38)
            c.text(b.text_frame, col["heading"], size=c.t["size_sub"],
                   bold=True, color=TH.series(c.t, i), font=c.t["font_head"])
            c.line(x, y + 0.4, w * 0.35, TH.series(c.t, i), h=0.05)
            y += 0.6
        _bullets(c, x, y, w, c.bottom - y - 0.1, col.get("bullets", []))


def _strip(c, items):
    """A compact left-to-right band of labelled segments above the content."""
    t = c.t
    n = len(items)
    gap = 0.08
    w = (c.cw - gap * (n - 1)) / n
    hsz, bsz = t["size_small"], t["size_small"] - 2
    head_h = max(TH.text_h(it.get("heading", "") if isinstance(it, dict) else str(it),
                           w - 0.24, hsz, line=1.1, bold=True)
                 for it in items)
    body_h = max(TH.text_h(it.get("body", "") if isinstance(it, dict) else "",
                           w - 0.24, bsz, line=1.15) for it in items)
    h = 0.16 + head_h + body_h
    for i, it in enumerate(items):
        x = c.mx + i * (w + gap)
        head = it.get("heading", "") if isinstance(it, dict) else str(it)
        sub = it.get("body", "") if isinstance(it, dict) else ""
        edge = i == 0 or i == n - 1
        c.rect(x, c.y, w, h, fill="ink" if edge else TH.tint(t, i),
               radius=0.08)
        b = c.tb(x + 0.12, c.y + 0.08, w - 0.24, head_h)
        c.text(b.text_frame, head.upper(), size=hsz, bold=True,
               color="on_dark" if edge else TH.series(t, i),
               align="center", font=t["font_head"])
        if sub:
            b = c.tb(x + 0.12, c.y + 0.08 + head_h, w - 0.24, body_h)
            c.text(b.text_frame, sub, size=bsz,
                   color="surface_alt" if edge else "ink_soft",
                   align="center", line=1.15)
    c.y += h + 0.24


def lay_cards(c, spec):
    c.header(spec)
    if spec.get("strip"):
        _strip(c, spec["strip"])
    cards = spec.get("cards", [])[:5]
    if not cards:
        return
    t, gut = c.t, c.t["gutter"] if len(cards) < 5 else 0.16
    n = len(cards)
    w = (c.cw - gut * (n - 1)) / n
    iw = w - 0.44                      # inner (padded) width
    avail = c.body_h

    def img_h(card, mode="fill"):
        """Height an image occupies in a card of width w."""
        if not card.get("image"):
            return 0.0
        if card.get("image_mode", mode) == "logo":
            return 0.62
        return w * 9.0 / 16.0          # generated art is 16:9

    def measure(hsize, bsize):
        worst = 0.0
        for card in cards:
            body = card.get("body", [])
            body = [body] if isinstance(body, str) else body
            blk = (bullets_h(card["bullets"], iw, bsize) if card.get("bullets")
                   else sum(TH.text_h(x, iw, bsize, line=1.25) for x in body))
            worst = max(worst, 0.3 + (0.56 if card.get("badge") else 0)
                        + TH.text_h(card.get("heading", ""), iw, hsize,
                                    line=1.15, bold=True, pad=0.12)
                        + (TH.text_h(card["sub"], iw, bsize - 1, line=1.15) + 0.06
                           if card.get("sub") else 0)
                        + 0.12 + blk + 0.26 + img_h(card))
        return worst

    hsize, bsize = t["size_sub"], t["size_body"] - 2
    need = measure(hsize, bsize)
    while need > avail and (hsize > 11 or bsize > 8):
        hsize = max(11, hsize - 1)
        bsize = max(8, bsize - 1)
        need = measure(hsize, bsize)

    h = min(avail, max(need, 1.6))
    c.y += max(0.0, (avail - h) / 2)

    for i, card in enumerate(cards):
        x = c.mx + i * (w + gut)
        c.rect(x, c.y, w, h, fill=TH.tint(t, i), radius=0.05)
        c.rect(x, c.y, w, 0.09, fill=TH.series(t, i))
        ih = img_h(card)
        if ih:
            place_image(c, card, x, c.y + h - ih, w, ih)
        y = c.y + 0.3
        if card.get("badge"):
            bd = c.rect(x + 0.22, y, 0.46, 0.46, fill=TH.series(t, i), radius=0.5)
            tfb = bd.text_frame
            tfb.margin_left = tfb.margin_right = Emu(0)
            tfb.margin_top = tfb.margin_bottom = Emu(0)
            tfb.word_wrap = False
            c.text(tfb, str(card["badge"]), size=13, bold=True,
                   color="on_dark", align="center", font=t["font_head"])
            tfb.vertical_anchor = MSO_ANCHOR.MIDDLE
            y += 0.56
        hh = TH.text_h(card.get("heading", ""), iw, hsize, line=1.15,
                       bold=True, pad=0.12)
        b = c.tb(x + 0.22, y, iw, hh)
        c.text(b.text_frame, card.get("heading", ""), size=hsize, bold=True,
               color="ink", font=t["font_head"], line=1.15)
        y += hh + 0.12
        if card.get("sub"):
            sh_ = TH.text_h(card["sub"], iw, bsize - 1, line=1.15)
            b = c.tb(x + 0.22, y, iw, sh_)
            c.text(b.text_frame, card["sub"], size=bsize - 1, color="ink_soft",
                   line=1.15)
            y += sh_ + 0.06
        avail = c.y + h - y - 0.2 - img_h(card)
        if card.get("bullets"):
            _bullets(c, x + 0.22, y, iw, avail, card["bullets"], size=bsize)
        else:
            body = card.get("body", [])
            if body:
                b = c.tb(x + 0.22, y, iw, avail)
                c.text(b.text_frame, [body] if isinstance(body, str) else body,
                       size=bsize, color="ink_soft", line=1.25, space_after=6)


def lay_kpi(c, spec):
    c.header(spec)
    kpis = spec.get("kpis", [])[:5]
    if not kpis:
        return
    t, gut = c.t, c.t["gutter"]
    n = len(kpis)
    w = (c.cw - gut * (n - 1)) / n
    iw = w - 0.32
    lsize = t["size_body"] - 2

    # the headline number must sit on one line, so shrink it until it does
    vsize = min(TH.fit_one_line(k.get("value", ""), iw, t["size_kpi"], 16)
                for k in kpis)
    vh = TH.text_h("0", iw, vsize, line=1.05, bold=True)
    lh = max(TH.text_h(k.get("label", ""), iw, lsize, line=1.15)
             for k in kpis)
    h = 0.2 + vh + 0.08 + lh + 0.2

    band = c.y
    if not spec.get("bullets"):
        band += max(0.0, (c.body_h - h) / 2)
    for i, k in enumerate(kpis):
        x = c.mx + i * (w + gut)
        c.rect(x, band, w, h, fill=TH.tint(t, i), radius=0.06)
        b = c.tb(x + 0.16, band + 0.2, iw, vh)
        c.text(b.text_frame, k.get("value", ""), size=vsize, bold=True,
               color=TH.series(t, i), align="center", font=t["font_head"],
               line=1.05)
        b = c.tb(x + 0.16, band + 0.2 + vh + 0.08, iw, lh)
        c.text(b.text_frame, k.get("label", ""), size=lsize,
               color="ink_soft", align="center", line=1.15)
    rest = band + h + 0.3
    if spec.get("bullets"):
        _bullets(c, c.mx, rest, c.cw, c.bottom - rest - 0.1, spec["bullets"])


def lay_timeline(c, spec):
    """Phased roadmap — the workhorse for 'from summit to execution' slides."""
    c.header(spec)
    steps = spec.get("steps", [])[:6]
    if not steps:
        return
    t = c.t
    n, gut = len(steps), 0.18
    w = (c.cw - gut * (n - 1)) / n
    iw = w - 0.36
    hsize, bsize = t["size_body"] + 1, t["size_body"] - 3
    rail_y = c.y + 0.46
    c.rect(c.mx, rail_y, c.cw, 0.035, fill="hairline")
    top = rail_y + 0.34

    need = 0.0
    for s_ in steps:
        blk = (bullets_h(s_["bullets"], iw, bsize, gap=7) if s_.get("bullets")
               else TH.text_h(s_.get("body", ""), iw, bsize, line=1.2))
        need = max(need, 0.22 + TH.text_h(s_.get("heading", ""), iw, hsize,
                                          line=1.1, bold=True) + 0.1
                   + (0.32 if s_.get("date") else 0) + blk + 0.24)
    h = min(c.bottom - top - 0.1, max(need, 1.4))

    for i, s_ in enumerate(steps):
        x = c.mx + i * (w + gut)
        col = TH.SERIES[i % len(TH.SERIES)]
        if s_.get("phase"):
            b = c.tb(x, c.y, w, 0.34)
            c.text(b.text_frame, str(s_["phase"]).upper(), size=t["size_eyebrow"],
                   bold=True, color=col, font=t["font_head"])
        c.rect(x, rail_y, w * 0.98, 0.035, fill=col)
        c.rect(x, rail_y - 0.1, 0.24, 0.24, fill=col, radius=0.5)
        c.rect(x, top, w, h, fill=TH.tint(t, i), radius=0.05)
        y = top + 0.22
        hh = TH.text_h(s_.get("heading", ""), iw, hsize, line=1.1, bold=True)
        b = c.tb(x + 0.18, y, iw, hh)
        c.text(b.text_frame, s_.get("heading", ""), size=hsize, bold=True,
               color="ink", font=t["font_head"], line=1.1)
        y += hh + 0.1
        if s_.get("date"):
            b = c.tb(x + 0.18, y, iw, 0.28)
            c.text(b.text_frame, s_["date"], size=t["size_small"], color=col, bold=True)
            y += 0.32
        avail = top + h - y - 0.16
        if s_.get("bullets"):
            _bullets(c, x + 0.18, y, iw, avail, s_["bullets"], size=bsize)
        elif s_.get("body"):
            b = c.tb(x + 0.18, y, iw, avail)
            c.text(b.text_frame, s_["body"], size=bsize, color="ink_soft", line=1.2)


def lay_process(c, spec):
    c.header(spec)
    steps = spec.get("steps", [])[:6]
    n = len(steps)
    if not n:
        return
    t = c.t
    gap = 0.06
    w = (c.cw - gap * (n - 1)) / n
    h = 1.25
    labels = [s.get("heading", s if isinstance(s, str) else "") for s in steps]
    descs = [s.get("body", "") if isinstance(s, dict) else "" for s in steps]

    # a shallower point leaves more room for the label
    adj, ml, mr = 0.12, 0.16, 0.12
    notch = adj * h
    # 0.88 is headroom: the renderer wraps a shade earlier than a pure
    # character-width estimate predicts, and a broken word looks like a bug
    usable = (w - 2 * notch - ml - mr) * 0.88
    size = t["size_body"] - 1
    for lab in labels:
        longest = max(str(lab).split() or [""], key=len)
        size = min(size, TH.fit_one_line(longest, usable, size, 8, bold=True))

    desc_h = max([TH.text_h(d, w, t["size_body"] - 3, line=1.2)
                  for d in descs] or [0])
    band = c.y + max(0.0, (c.body_h - (h + 0.3 + desc_h)) / 2)

    for i, sd in enumerate(steps):
        x = c.mx + i * (w + gap)
        shp = c.s.shapes.add_shape(
            MSO_SHAPE.CHEVRON if i else MSO_SHAPE.PENTAGON,
            Emu(int(x * IN)), Emu(int(band * IN)),
            Emu(int(w * IN)), Emu(int(h * IN)))
        try:
            shp.adjustments[0] = adj
        except (IndexError, ValueError):
            pass
        shp.fill.solid()
        shp.fill.fore_color.rgb = TH.rgb(c.t, TH.series(c.t, i))
        shp.line.fill.background()
        shp.shadow.inherit = False
        TH.no_shadow(shp)
        tf = shp.text_frame
        tf.word_wrap = True
        tf.margin_left = Emu(int((ml + (notch if i else 0)) * IN))
        tf.margin_right = Emu(int((mr + notch) * IN))
        tf.margin_top = tf.margin_bottom = Emu(int(0.03 * IN))
        c.text(tf, labels[i], size=size, bold=True, color="on_dark",
               align="center", font=t["font_head"], line=1.1)
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE

    if any(descs):
        y = band + h + 0.22
        for i, d in enumerate(descs):
            x = c.mx + i * (w + gap)
            b = c.tb(x, y, w, desc_h)
            c.text(b.text_frame, d, size=t["size_body"] - 3, color="ink_soft",
                   align="center", line=1.2)


def lay_matrix(c, spec):
    c.header(spec)
    q = spec.get("quadrants", [])[:4]
    gut = c.t["gutter"]
    w = (c.cw - gut) / 2
    h = (min(c.body_h, 4.4) - gut) / 2
    for i, item in enumerate(q):
        x = c.mx + (i % 2) * (w + gut)
        y = c.y + (i // 2) * (h + gut)
        col = TH.SERIES[i % len(TH.SERIES)]
        c.rect(x, y, w, h, fill=TH.tint(c.t, i), radius=0.04)
        c.rect(x, y, 0.09, h, fill=col)
        b = c.tb(x + 0.26, y + 0.2, w - 0.5, 0.42)
        c.text(b.text_frame, item.get("heading", ""), size=c.t["size_sub"],
               bold=True, color="ink", font=c.t["font_head"])
        if item.get("bullets"):
            _bullets(c, x + 0.26, y + 0.66, w - 0.5, h - 0.86, item["bullets"],
                     size=c.t["size_body"] - 2)
        elif item.get("body"):
            b = c.tb(x + 0.26, y + 0.66, w - 0.5, h - 0.86)
            c.text(b.text_frame, item["body"], size=c.t["size_body"] - 2,
                   color="ink_soft", line=1.22)


def lay_table(c, spec):
    c.header(spec)
    rows = spec.get("rows", [])
    head = spec.get("header", [])
    if not rows:
        return
    ncol = len(head or rows[0])
    nrow = len(rows) + (1 if head else 0)
    data = ([head] if head else []) + rows
    avail = c.bottom - c.y - 0.1

    # first column carries the row label, so give it less room than the rest
    lead = 1.35 if spec.get("row_headers") and ncol > 3 else c.cw / ncol
    other = (c.cw - lead) / (ncol - 1) if ncol > 1 else c.cw
    widths = [lead] + [other] * (ncol - 1)
    pad_x, pad_y = 0.08, 0.04

    def table_h(size):
        total = 0.0
        for r, row in enumerate(data):
            cell_h = max(
                TH.text_h(str(row[i]) if i < len(row) else "",
                          widths[i] - 2 * pad_x, size, line=1.2, pad=0,
                          bold=(head and r == 0))
                for i in range(ncol))
            total += max(0.26, cell_h) + 2 * pad_y
        return total

    size = c.t["size_body"] - (3 if ncol <= 5 else 5)
    while size > 7 and table_h(size) > avail:
        size -= 1
    h = min(avail, table_h(size))

    gfx = c.s.shapes.add_table(nrow, ncol, Emu(int(c.mx * IN)), Emu(int(c.y * IN)),
                               Emu(int(c.cw * IN)), Emu(int(h * IN)))
    tbl = gfx.table
    tbl.first_row = bool(head)
    for i, wd in enumerate(widths):
        tbl.columns[i].width = Emu(int(wd * IN))

    for r, row in enumerate(data):
        for col in range(ncol):
            cell = tbl.cell(r, col)
            cell.text = str(row[col]) if col < len(row) else ""
            cell.margin_left = cell.margin_right = Emu(int(pad_x * IN))
            cell.margin_top = cell.margin_bottom = Emu(int(pad_y * IN))
            is_head = head and r == 0
            is_rowhead = spec.get("row_headers") and col == 0 and not is_head
            cell.fill.solid()
            cell.fill.fore_color.rgb = TH.rgb(
                c.t, "primary" if is_head else
                ("primary_lt" if is_rowhead else
                 ("surface" if r % 2 else "surface_alt")))
            for p in cell.text_frame.paragraphs:
                p.line_spacing = 1.15
                for run in p.runs:
                    run.font.size = Pt(size)
                    run.font.name = c.t["font"]
                    run.font.bold = bool(is_head or is_rowhead)
                    run.font.color.rgb = TH.rgb(
                        c.t, "on_dark" if is_head else
                        ("primary_dk" if is_rowhead else "ink"))


def lay_section(c, spec):
    t = c.t
    c.rect(0, 0, c.W, c.H, fill="primary_dk")
    c.rect(0, c.H - 0.28, c.W, 0.28, fill="primary")
    y = c.H / 2 - 0.9
    if spec.get("eyebrow"):
        b = c.tb(c.mx + 0.3, y, c.cw, 0.32)
        c.text(b.text_frame, spec["eyebrow"].upper(), size=t["size_eyebrow"] + 1,
               bold=True, color="primary_lt", font=t["font_head"])
        y += 0.42
    b = c.tb(c.mx + 0.3, y, c.cw - 0.6, 1.2)
    c.text(b.text_frame, spec.get("title", ""), size=t["size_title"] + 10,
           bold=True, color="on_dark", font=t["font_head"], line=1.05)
    if spec.get("subtitle"):
        b = c.tb(c.mx + 0.3, y + 1.3, c.cw - 0.6, 0.6)
        c.text(b.text_frame, spec["subtitle"], size=t["size_sub"],
               color="primary_lt", line=1.25)


def lay_quote(c, spec):
    t = c.t
    c.rect(0, 0, c.W, c.H, fill="surface_alt")
    c.rect(c.mx, c.H / 2 - 1.3, 0.08, 2.6, fill="primary")
    b = c.tb(c.mx + 0.42, c.H / 2 - 1.25, c.cw - 0.8, 1.8)
    c.text(b.text_frame, spec.get("quote", spec.get("title", "")),
           size=t["size_title"] - 4, color="ink", font=t["font_head"], line=1.22)
    if spec.get("attribution"):
        b = c.tb(c.mx + 0.42, c.H / 2 + 0.72, c.cw - 0.8, 0.5)
        c.text(b.text_frame, spec["attribution"], size=t["size_body"],
               color="primary_dk", bold=True)


LAYOUTS = {
    "bullets": lay_bullets, "title-bullets": lay_bullets,
    "two-column": lay_two_column, "columns": lay_two_column,
    "cards": lay_cards, "kpi": lay_kpi, "kpis": lay_kpi,
    "timeline": lay_timeline, "roadmap": lay_timeline,
    "process": lay_process, "matrix": lay_matrix,
    "table": lay_table, "section": lay_section, "quote": lay_quote,
}


# ----------------------------------------------------------------------
def set_notes(slide, text):
    """Write speaker notes, tolerating layouts with no notes placeholder."""
    try:
        tf = slide.notes_slide.notes_text_frame
        if tf is not None:
            tf.text = text
    except (AttributeError, KeyError):
        pass


def blank_layout(prs):
    """The deck's emptiest layout — fewest placeholders to fight with."""
    return min(prs.slide_layouts, key=lambda l: len(l.placeholders))


def move_slide(prs, slide, new_pos):
    """Move an existing slide to 0-based position `new_pos`."""
    lst = prs.slides._sldIdLst
    target = None
    for el in list(lst):
        if prs.slides.get(int(el.get("id"))) is slide:
            target = el
            break
    if target is None:                  # newly added slides land last
        target = list(lst)[-1]
    lst.remove(target)
    lst.insert(new_pos, target)


def drop_slides(prs, indices):
    """Delete slides by 1-based original index."""
    lst = prs.slides._sldIdLst
    ids = list(lst)
    for i in sorted(indices, reverse=True):
        if 1 <= i <= len(ids):
            lst.remove(ids[i - 1])


def clear_slide(slide, media_dir=None, idx=0):
    """Remove every shape, saving any pictures to media_dir first.

    Also drops the picture relationships: deleting the shape alone leaves the
    image part in the package, so the file keeps the weight of screenshots it
    no longer shows.
    """
    saved, rels = [], []
    for shp in list(slide.shapes):
        if shp.shape_type == 13:
            try:
                rels.append(shp._element.blipFill.blip.rEmbed)
            except Exception:
                pass
            if media_dir:
                try:
                    img = shp.image
                    fn = os.path.join(
                        media_dir, f"orig_slide{idx:03d}_{len(saved)+1}.{img.ext}")
                    with open(fn, "wb") as fh:
                        fh.write(img.blob)
                    saved.append(fn)
                except Exception:
                    pass
        shp._element.getparent().remove(shp._element)
    for rid in rels:
        try:
            slide.part.drop_rel(rid)
        except (KeyError, AttributeError):
            pass
    return saved


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("deck")
    ap.add_argument("spec", help="JSON: {'slides':[{index, layout, ...}]}")
    ap.add_argument("--out", required=True)
    ap.add_argument("--theme")
    ap.add_argument("--keep-media", help="dir to save replaced images into")
    ap.add_argument("--number", action="store_true", help="stamp slide numbers")
    a = ap.parse_args()

    t = TH.load(a.theme)
    with open(a.spec) as fh:
        spec = json.load(fh)
    if isinstance(spec, list):
        spec = {"slides": spec}
    if a.keep_media:
        os.makedirs(a.keep_media, exist_ok=True)

    prs = Presentation(a.deck)
    slides = list(prs.slides)
    done = []
    for s in spec["slides"]:
        i = int(s["index"])
        if not 1 <= i <= len(slides):
            print(f"!! slide {i} out of range (deck has {len(slides)}) — skipped")
            continue
        layout = s.get("layout", "bullets")
        if layout not in LAYOUTS:
            print(f"!! slide {i}: unknown layout '{layout}' — skipped")
            continue
        slide = slides[i - 1]
        clear_slide(slide, a.keep_media, i)
        c = Canvas(slide, prs, t)
        LAYOUTS[layout](c, s)
        if layout not in ("section", "quote"):
            c.footer(s, i if a.number else None)
        if s.get("notes"):
            set_notes(slide, s["notes"])
        done.append((i, layout))

    # --- new slides, inserted after a given original index ------------
    added = []
    for s in spec.get("insert", []):
        layout = s.get("layout", "bullets")
        if layout not in LAYOUTS:
            print(f"!! insert after {s.get('after')}: unknown layout "
                  f"'{layout}' — skipped")
            continue
        slide = prs.slides.add_slide(blank_layout(prs))
        for shp in list(slide.shapes):          # strip layout placeholders
            shp._element.getparent().remove(shp._element)
        c = Canvas(slide, prs, t)
        LAYOUTS[layout](c, s)
        if layout not in ("section", "quote"):
            c.footer(s, None)
        if s.get("notes"):
            set_notes(slide, s["notes"])
        added.append((slide, int(s["after"]), layout))

    # place them, lowest anchor first so earlier inserts shift later ones
    for n, (slide, after, layout) in enumerate(sorted(added, key=lambda x: x[1])):
        move_slide(prs, slide, after + n)
        print(f"  new slide after {after:>3}  ->  {layout}")

    # --- deletions, by ORIGINAL index ---------------------------------
    drop = [int(i) for i in spec.get("delete", [])]
    if drop:
        # original indices shift by the inserts placed before them
        adjusted = [i + sum(1 for _, a, _ in added if a < i) for i in drop]
        drop_slides(prs, adjusted)

    prs.save(a.out)
    for i, l in done:
        print(f"  slide {i:>3}  ->  {l}")
    if drop:
        print(f"  deleted slide(s): {', '.join(map(str, drop))}")
    print(f"rebuilt {len(done)}, added {len(added)}, deleted {len(drop)} "
          f"-> {a.out}")


if __name__ == "__main__":
    main()
