"""Trace the K of Miranda's reference image into vector threads for the home page.

The reference K is string art: sheets of fine threads with glowing edges. This
measures the direction of those threads everywhere on the K (structure tensor),
lays evenly spaced lines along them (evenly-spaced streamlines) and samples the
reference's colour along each line. src/k-threads.js draws the result as crisp
lines at any screen size, so the K keeps the reference's exact shape and colour
without upscaling its pixels. The staircase and its letters are drawn by
src/hero.js instead.

    python tools/trace_k.py [reference image]

Defaults to source/reference_design.png (1672 x 941, or the same proportions).
Writes src/k-threads.json. Needs Pillow, numpy and scipy.
"""
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parent.parent
REF_W, REF_H = 1672, 941

# the K and its tail, in reference pixels (planets, labels and orbits stay out)
OUTLINE = [
    (566, 172), (906, 172), (908, 196), (862, 212), (828, 246), (810, 296), (806, 360), (806, 412),
    (1020, 206), (1084, 206), (1126, 236), (1132, 262), (1110, 276), (1080, 300),
    (990, 400), (960, 430), (1000, 470), (1062, 556), (1160, 632), (1300, 694), (1450, 768), (1560, 822), (1612, 858),
    (1600, 884), (1540, 884), (1440, 862), (1300, 812), (1160, 752), (1060, 716), (990, 712),
    (560, 712), (548, 686), (600, 668), (648, 630), (668, 560), (676, 470), (676, 330), (666, 262), (636, 214), (600, 196), (566, 190),
]
# the staircase, its letters and the arm are drawn shapes, not traced
STAIRS = [(796, 418), (800, 405), (1022, 200), (1140, 200), (1140, 266), (1112, 268), (840, 498), (798, 498)]

SPACING = 1.3      # distance between threads
MIN_GAP = 0.8      # threads stop when they come this close to another
STEP = 0.5         # integration step
TENSOR = 6.0       # smoothing of the direction field: higher gives straighter threads
SEED_MIN, DARK = 11, 7  # start threads where the K is at least this bright, stop after running dark
KEEP_EVERY = 6     # keep every 6th step (3 px) in the output


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'source' / 'reference_design.png'
    img = Image.open(src).convert('RGB')
    if img.size != (REF_W, REF_H):
        if abs(img.width / img.height - REF_W / REF_H) > 0.01:
            sys.exit(f'{src} is {img.width}x{img.height}; expected the reference at {REF_W}x{REF_H} proportions')
        img = img.resize((REF_W, REF_H), Image.LANCZOS)
    im = np.asarray(img).astype(np.float32)
    H, W, _ = im.shape

    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    d.polygon(OUTLINE, fill=255)
    d.polygon(STAIRS, fill=0)
    mask = np.asarray(m) > 0

    lum = im.max(axis=2)
    lumb = ndi.gaussian_filter(lum, 1.0)
    gx = ndi.gaussian_filter(lum, 1.0, order=(0, 1))
    gy = ndi.gaussian_filter(lum, 1.0, order=(1, 0))
    jxx, jyy, jxy = (ndi.gaussian_filter(a, TENSOR) for a in (gx * gx, gy * gy, gx * gy))
    theta = 0.5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2  # threads run across the strongest gradient
    c2, s2 = np.cos(2 * theta), np.sin(2 * theta)
    colour = np.stack([ndi.gaussian_filter(im[..., k], 1.1) for k in range(3)], axis=2)

    def bil(a, x, y):
        x0, y0 = int(x), int(y)
        if x0 < 0 or y0 < 0 or x0 >= W - 1 or y0 >= H - 1:
            return None
        fx, fy = x - x0, y - y0
        return a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy

    def direction(x, y):
        c, s = bil(c2, x, y), bil(s2, x, y)
        if c is None:
            return None
        a = 0.5 * math.atan2(s, c)
        return math.cos(a), math.sin(a)

    grid = {}

    def near(x, y, r):
        cx, cy, k = int(x), int(y), int(math.ceil(r))
        for i in range(cx - k, cx + k + 1):
            for j in range(cy - k, cy + k + 1):
                for px, py in grid.get((i, j), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < r * r:
                        return True
        return False

    def inside(x, y):
        return 0 <= x < W and 0 <= y < H and mask[int(y), int(x)]

    def trace(x, y, sign):
        pts, dark = [], 0
        dx, dy = direction(x, y)
        dx, dy = dx * sign, dy * sign
        for _ in range(4000):
            d1 = direction(x, y)
            if d1 is None:
                break
            if d1[0] * dx + d1[1] * dy < 0:
                d1 = (-d1[0], -d1[1])
            d2 = direction(x + d1[0] * STEP / 2, y + d1[1] * STEP / 2)
            if d2 is None:
                break
            if d2[0] * d1[0] + d2[1] * d1[1] < 0:
                d2 = (-d2[0], -d2[1])
            nx, ny = x + d2[0] * STEP, y + d2[1] * STEP
            if not inside(nx, ny) or near(nx, ny, MIN_GAP):
                break
            dark = dark + 1 if bil(lumb, nx, ny) < DARK else 0
            if dark > 8:
                break
            dx, dy, x, y = d2[0], d2[1], nx, ny
            pts.append((x, y))
        return pts

    ys, xs = np.nonzero(mask & (lumb > SEED_MIN))
    lines = []
    for i in np.argsort(-lumb[ys, xs]):  # brightest first, so the glowing edges get threads of their own
        x, y = xs[i] + 0.5, ys[i] + 0.5
        if near(x, y, SPACING):
            continue
        pts = list(reversed(trace(x, y, -1))) + [(x, y)] + trace(x, y, 1)
        if len(pts) * STEP < 5:
            continue
        for px, py in pts:
            grid.setdefault((int(px), int(py)), []).append((px, py))
        lines.append(pts)

    def smooth(pts, r=4):
        # a moving average irons out the small wobbles the direction field leaves
        if len(pts) <= 2 * r:
            return pts
        a = np.array(pts)
        k = np.ones(2 * r + 1) / (2 * r + 1)
        xs = np.convolve(np.pad(a[:, 0], r, mode='edge'), k, mode='valid')
        ys = np.convolve(np.pad(a[:, 1], r, mode='edge'), k, mode='valid')
        return list(zip(xs, ys))

    # compact: start point and deltas in quarter pixels, colour per kept point as 12-bit hex
    out = []
    for pts in lines:
        sm = smooth(pts)
        kept = sm[::KEEP_EVERY]
        if kept[-1] != sm[-1]:
            kept.append(sm[-1])
        q = [(round(x * 4), round(y * 4)) for x, y in kept]
        path = [q[0][0], q[0][1]] + [v for a, b in zip(q, q[1:]) for v in (b[0] - a[0], b[1] - a[1])]
        hexes = ''
        for x, y in kept:
            r, g, b = colour[min(H - 1, int(y)), min(W - 1, int(x))]
            hexes += ''.join('0123456789abcdef'[min(15, int(v) >> 4)] for v in (r, g, b))
        out.append([path, hexes])
    dest = ROOT / 'src' / 'k-threads.json'
    dest.write_text(json.dumps({'width': REF_W, 'height': REF_H, 'lines': out}, separators=(',', ':')) + '\n')
    print(f'{len(lines)} threads, {sum(len(p) for p in lines) * STEP:.0f} px of thread -> {dest.relative_to(ROOT)} ({dest.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
