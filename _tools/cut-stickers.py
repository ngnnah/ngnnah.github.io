#!/usr/bin/env python3 -I
"""Cut a sheet of die-cut stickers on a flat mint ground into transparent WebPs.

  python3 -I _tools/cut-stickers.py SHEET.png COLSxROWS PREFIX [--size 360] [--out DIR]
  e.g. cut-stickers.py now-sheet.png 4x2 now     -> images/stickers/now-01.webp ...

Steps per panel: find the panels by the sheet's white gutters; sample the mint
from the panel's border; flood the mint that touches the panel edge (so mint
inside a sticker stays); in a thin band around the sticker, turn the blend of
mint+white into a soft alpha on white (no mint fringe) and the faint grey shadow
into a soft dark alpha; trim; scale the longer side to --size; save WebP.
"""
import argparse, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

INSET = 6  # px shaved off each panel: the sheet's gutters leave a faint edge line
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.join(HERE, "..", "images", "stickers")


def runs(is_gutter):
    """Return (start, end) spans of the non-gutter stretches of a 1-D bool array."""
    spans, start = [], None
    for i, g in enumerate(is_gutter):
        if not g and start is None:
            start = i
        elif g and start is not None:
            spans.append((start, i)); start = None
    if start is not None:
        spans.append((start, len(is_gutter)))
    return [s for s in spans if s[1] - s[0] > 40]  # drop slivers


def find_panels(arr, cols, rows):
    white = (arr.min(axis=2) > 243)
    xs = runs(white.mean(axis=0) > 0.97)
    ys = runs(white.mean(axis=1) > 0.97)
    if len(xs) != cols or len(ys) != rows:  # fall back to an even split
        h, w = arr.shape[:2]
        xs = [(round(c * w / cols) + 4, round((c + 1) * w / cols) - 4) for c in range(cols)]
        ys = [(round(r * h / rows) + 4, round((r + 1) * h / rows) - 4) for r in range(rows)]
        print("  gutters not found, even split", file=sys.stderr)
    return [(x0, y0, x1, y1) for (y0, y1) in ys for (x0, x1) in xs]


def mint_of(p):
    """Mint = the most common colour on the panel's outer 6 px ring that is clearly green-ish."""
    ring = np.concatenate([p[:6].reshape(-1, 3), p[-6:].reshape(-1, 3),
                           p[:, :6].reshape(-1, 3), p[:, -6:].reshape(-1, 3)]).astype(int)
    ring = ring[(ring[:, 1] - ring[:, 0]) > 15]
    q = (ring // 4)
    keys, counts = np.unique(q, axis=0, return_counts=True)
    top = keys[counts.argmax()]
    near = ring[(np.abs(q - top).sum(axis=1) <= 2)]
    return near.mean(axis=0)


def flood_from_edge(mask):
    """True where mask is True and connected (4-way) to the array's border."""
    from collections import deque
    h, w = mask.shape
    seen = np.zeros_like(mask)
    q = deque()
    frame = np.zeros_like(mask)  # seeds: any mint-like pixel within 6 px of the edge
    frame[:6] = frame[-6:] = True; frame[:, :6] = frame[:, -6:] = True
    for y, x in zip(*np.nonzero(mask & frame)):
        seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True; q.append((yy, xx))
    return seen


def big_holes(mask, min_px=500):
    """Connected blobs of mask at least min_px big; smaller specks (mint-coloured paint) stay."""
    from collections import deque
    h, w = mask.shape
    seen = np.zeros_like(mask); out = np.zeros_like(mask)
    for y0, x0 in zip(*np.nonzero(mask)):
        if seen[y0, x0]: continue
        comp, q = [], deque([(y0, x0)]); seen[y0, x0] = True
        while q:
            y, x = q.popleft(); comp.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True; q.append((yy, xx))
        if len(comp) >= min_px:
            for y, x in comp: out[y, x] = True
    return out


def smooth(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def cut_panel(p):
    p = p.astype(np.float32)
    h, w = p.shape[:2]
    mint = mint_of(p.astype(np.uint8))
    white = np.array([255, 255, 255], np.float32)
    d = np.sqrt(((p - mint) ** 2).sum(axis=2))
    like_mint = (d < 22)
    # flood from every border pixel that is mint-like -> the background
    bg = flood_from_edge(like_mint)
    bg |= big_holes(like_mint & ~bg)  # mint showing through a gap in the sticker (bike frame, arm)
    # the zone where mint, white border and shadow blend: background plus a thin band around it
    band = np.array(Image.fromarray((bg * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    # alpha from white: how far along mint -> white the pixel sits
    axis = white - mint
    a_w = np.clip(((p - mint) @ axis) / (axis @ axis), 0, 1)
    # the part of the pixel off that axis is shadow or noise: only a darkening counts as shadow
    lum = p.mean(axis=2); lum_m = mint.mean()
    a_s = np.clip((lum_m - lum) / lum_m * 2.2 - 0.08, 0, 0.38)  # deadzone: JPEG noise in the mint
    a_s = np.where(d < 60, a_s, 0)
    a_w = smooth(a_w, 0.18, 0.72)  # kills the faint mint tint, keeps a clean edge
    alpha = np.where(band, np.maximum(a_w, a_s), 1.0)
    # colour: white-ish where white dominates, grey for shadow, original inside
    unmix = np.clip((p - mint * (1 - a_w[..., None])) / np.maximum(a_w[..., None], 0.05), 0, 255)
    shadow = np.broadcast_to(np.array([40, 48, 48], np.float32), p.shape)
    use_white = (a_w >= a_s)[..., None]
    zone_rgb = np.where(use_white, np.where(a_w[..., None] > 0.05, unmix, white), shadow)
    # blend near the border of the sticker toward pure white so no green survives in partial pixels
    zone_rgb = np.where(use_white, zone_rgb * 0.0 + np.maximum(zone_rgb, 235), zone_rgb)
    rgb = np.where(band[..., None], zone_rgb, p)
    alpha = np.where(alpha < 0.07, 0.0, alpha)  # no faint haze: a glow filter on the page would turn it into a box
    out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet"); ap.add_argument("grid"); ap.add_argument("prefix")
    ap.add_argument("--size", type=int, default=360)
    ap.add_argument("--out", default=DEFAULT_OUT)
    ap.add_argument("--quality", type=int, default=85)
    a = ap.parse_args()
    cols, rows = map(int, a.grid.lower().split("x"))
    arr = np.array(Image.open(a.sheet).convert("RGB"))
    os.makedirs(a.out, exist_ok=True)
    for i, (x0, y0, x1, y1) in enumerate(find_panels(arr, cols, rows), 1):
        im = cut_panel(arr[y0 + INSET:y1 - INSET, x0 + INSET:x1 - INSET])
        box = im.getchannel("A").point(lambda v: 255 if v > 60 else 0).getbbox()
        im = im.crop(box)
        s = a.size / max(im.size)
        im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
        path = os.path.join(a.out, f"{a.prefix}-{i:02d}.webp")
        im.save(path, "WEBP", quality=a.quality, method=6)
        print(path, im.size)


if __name__ == "__main__":
    main()
