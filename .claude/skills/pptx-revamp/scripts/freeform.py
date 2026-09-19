"""Absolute-positioned slide reconstruction.

The card/timeline layouts re-template a slide. This does the opposite: it
rebuilds a slide's own design as native shapes, positioned where they were.
Coordinates are given in the pixel space of the reference render (`px`), so
you can measure straight off a screenshot and the engine converts to EMU.

Element types: rect, ellipse, chevron, triangle, line, text, bullets, img.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import theme as TH
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Emu, Pt

IN = 914400
ALIGN = {"l": PP_ALIGN.LEFT, "c": PP_ALIGN.CENTER, "r": PP_ALIGN.RIGHT,
         "j": PP_ALIGN.JUSTIFY}
ANCHOR = {"t": MSO_ANCHOR.TOP, "m": MSO_ANCHOR.MIDDLE, "b": MSO_ANCHOR.BOTTOM}
SHAPES = {"rect": MSO_SHAPE.RECTANGLE, "round": MSO_SHAPE.ROUNDED_RECTANGLE,
          "ellipse": MSO_SHAPE.OVAL, "chevron": MSO_SHAPE.CHEVRON,
          "triangle": MSO_SHAPE.ISOSCELES_TRIANGLE,
          "down": MSO_SHAPE.DOWN_ARROW, "right": MSO_SHAPE.RIGHT_ARROW,
          "pentagon": MSO_SHAPE.PENTAGON}


def _rgb(v, default="000000"):
    return RGBColor.from_string(str(v or default).lstrip("#").upper()[:6])


class Frame:
    """Maps the reference pixel grid onto the slide."""

    def __init__(self, slide, prs, px):
        self.s, self.prs = slide, prs
        self.sx = prs.slide_width / px[0]
        self.sy = prs.slide_height / px[1]

    def box(self, b):
        x, y, w, h = b
        return (Emu(int(x * self.sx)), Emu(int(y * self.sy)),
                Emu(int(w * self.sx)), Emu(int(h * self.sy)))

    # -- shapes ---------------------------------------------------------
    def shape(self, e):
        kind = e.get("shape", "rect")
        if kind == "rect" and e.get("radius"):
            kind = "round"
        shp = self.s.shapes.add_shape(SHAPES.get(kind, MSO_SHAPE.RECTANGLE),
                                      *self.box(e["box"]))
        if e.get("radius") is not None and kind == "round":
            try:
                shp.adjustments[0] = e["radius"]
            except (IndexError, ValueError):
                pass
        if e.get("adj") is not None:
            try:
                shp.adjustments[0] = e["adj"]
            except (IndexError, ValueError):
                pass
        if e.get("fill"):
            shp.fill.solid()
            shp.fill.fore_color.rgb = _rgb(e["fill"])
            if e.get("alpha") is not None:
                _set_alpha(shp, e["alpha"])
        else:
            shp.fill.background()
        if e.get("line"):
            shp.line.color.rgb = _rgb(e["line"])
            shp.line.width = Pt(e.get("lw", 1))
        else:
            shp.line.fill.background()
        shp.shadow.inherit = False
        _no_shadow(shp)
        if e.get("rot"):
            shp.rotation = e["rot"]
        if e.get("s"):
            self._fill_text(shp.text_frame, e, pad=0.04)
        else:
            shp.text_frame.word_wrap = True
        return shp

    # -- text -----------------------------------------------------------
    def w_in(self, box):
        return box[2] * self.sx / IN

    def h_in(self, box):
        return box[3] * self.sy / IN

    def autofit(self, e):
        """Shrink type until it fits its box.

        The reference deck was set in a narrower face than the fallback most
        machines substitute, so boxes measured off it are tight. Shrinking
        keeps the composition intact instead of letting text spill over the
        artwork next to it.
        """
        if e.get("fit") is False:
            return e
        lines = e["s"] if isinstance(e["s"], list) else [e["s"]]
        if any(not isinstance(x, str) for x in lines):
            return e
        size = e.get("size", 14)
        bold = e.get("bold", False)
        line = e.get("line", 1.15)
        w, h = self.w_in(e["box"]), self.h_in(e["box"])
        if e.get("one"):
            longest = max(lines, key=len) if lines else ""
            size = min(size, TH.fit_one_line(longest, w * 0.97, size, 6,
                                             bold=bold))
        else:
            while size > 6:
                need = sum(TH.text_h(x, w, size, line=line, pad=0, bold=bold)
                           for x in lines)
                if need <= h:
                    break
                size -= 0.5
        e = dict(e)
        e["size"] = size
        return e

    def text(self, e):
        e = self.autofit(e)
        tb = self.s.shapes.add_textbox(*self.box(e["box"]))
        self._fill_text(tb.text_frame, e)
        if e.get("vert"):
            # stand the text on its side, as a narrow column label does
            from pptx.oxml.ns import qn
            tb.text_frame._txBody.bodyPr.set("vert", e["vert"])
        elif e.get("rot"):
            tb.rotation = e["rot"]
        return tb

    def _fill_text(self, tf, e, pad=0.0):
        tf.word_wrap = e.get("wrap", True)
        tf.margin_left = tf.margin_right = Emu(int(pad * IN))
        tf.margin_top = tf.margin_bottom = Emu(0)
        tf.vertical_anchor = ANCHOR.get(e.get("anchor", "t"), MSO_ANCHOR.TOP)
        lines = e["s"] if isinstance(e["s"], list) else [e["s"]]
        for i, line in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = ALIGN.get(e.get("align", "l"), PP_ALIGN.LEFT)
            p.line_spacing = e.get("line", 1.15)
            p.space_after = Pt(e.get("after", 0))
            # a line may be a list of runs: ["plain", {"s":"bold bit","bold":1}]
            runs = line if isinstance(line, list) else [line]
            for r in runs:
                spec = r if isinstance(r, dict) else {"s": r}
                run = p.add_run()
                run.text = str(spec.get("s", ""))
                f = run.font
                f.size = Pt(spec.get("size", e.get("size", 14)))
                f.bold = bool(spec.get("bold", e.get("bold", False)))
                f.italic = bool(spec.get("italic", e.get("italic", False)))
                f.name = spec.get("font", e.get("font", "Calibri"))
                f.color.rgb = _rgb(spec.get("color", e.get("color", "1F2937")))

    # -- bullets ---------------------------------------------------------
    def bullets(self, e):
        x, y, w, h = e["box"]
        size = e.get("size", 12)
        gap = e.get("gap", 26)              # minimum pitch, in reference px
        dot_d = e.get("dot_size", 7)
        dot_x = e.get("dot_x", x)
        text_x = e.get("text_x", x + 22)
        line = e.get("line", 1.1)
        # 0.9 is headroom: at small sizes the renderer wraps a word earlier
        # than a character-width estimate predicts, and a row that spills
        # lands on top of the next bullet
        tw = self.w_in([0, 0, x + w - text_x, 0]) * 0.9
        px_per_in = IN / self.sy

        def rows(sz):
            return [max(gap, TH.text_h(str(it), tw, sz, line=line, pad=0)
                        * px_per_in + 3) for it in e["items"]]

        while size > 6 and sum(rows(size)) > h:
            size -= 0.5
        if sum(rows(size)) > h:      # still tight: close the leading as well
            line = 1.02
        heights = rows(size)

        iy = y
        for i, item in enumerate(e["items"]):
            row = heights[i]
            if e.get("dot"):
                d = self.s.shapes.add_shape(
                    MSO_SHAPE.OVAL,
                    *self.box([dot_x, iy + e.get("dot_dy", 6),
                               dot_d, dot_d]))
                d.fill.solid()
                d.fill.fore_color.rgb = _rgb(e["dot"])
                d.line.fill.background()
                d.shadow.inherit = False
                _no_shadow(d)
            self.text({"box": [text_x, iy, x + w - text_x, row],
                       "s": item, "size": size, "fit": False,
                       "color": e.get("color", "374151"),
                       "font": e.get("font", "Calibri"),
                       "line": line,
                       "bold": e.get("bold", False)})
            iy += row

    # -- images -----------------------------------------------------------
    def img(self, e):
        src = e["src"]
        if not os.path.exists(src):
            print(f"!! image missing: {src}")
            return None
        pic = self.s.shapes.add_picture(src, *self.box(e["box"]))
        if e.get("crop", "fill") == "fill":
            try:
                from PIL import Image
                iw, ih = Image.open(src).size
                bw, bh = e["box"][2] * self.sx, e["box"][3] * self.sy
                want, have = bw / bh, iw / ih
                if have > want:
                    f = (1 - want / have) / 2
                    pic.crop_left = pic.crop_right = f
                elif have < want:
                    f = (1 - have / want) / 2
                    pic.crop_top = pic.crop_bottom = f
            except Exception:
                pass
        return pic


def _set_alpha(shape, alpha):
    """Make a solid fill translucent. alpha 1.0 = opaque, 0.0 = invisible.

    Lets a panel sit over a photograph as a scrim, which is how a caption
    stays legible over artwork without covering it with a flat block.
    """
    from pptx.oxml.ns import qn
    clr = shape.fill.fore_color._xFill.find(qn("a:srgbClr"))
    if clr is None:
        return
    for old in clr.findall(qn("a:alpha")):
        clr.remove(old)
    node = clr.makeelement(qn("a:alpha"), {})
    node.set("val", str(int(max(0.0, min(1.0, alpha)) * 100000)))
    clr.append(node)


def _no_shadow(shape):
    from pptx.oxml.ns import qn
    el = shape._element
    spPr = el.spPr
    for tag in ("a:effectLst", "a:effectRef"):
        for node in spPr.findall(qn(tag)):
            spPr.remove(node)
    spPr.append(spPr.makeelement(qn("a:effectLst"), {}))
    style = el.find(qn("p:style"))
    if style is not None:
        ref = style.find(qn("a:effectRef"))
        if ref is not None:
            ref.set("idx", "0")


def render(slide, prs, spec):
    """Draw a freeform slide. Elements paint in order, so later covers earlier."""
    f = Frame(slide, prs, spec.get("px", [1672, 941]))
    for e in spec.get("elements", []):
        t = e.get("t", "rect")
        if t == "text":
            f.text(e)
        elif t == "bullets":
            f.bullets(e)
        elif t == "img":
            f.img(e)
        else:
            e = dict(e)
            e.setdefault("shape", t)
            f.shape(e)
    return slide
