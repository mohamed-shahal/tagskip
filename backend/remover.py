#!/usr/bin/env python3
"""Remove a small, semi-transparent white logo (e.g. a bottom-right star) from a
JPEG/PNG/WebP image or an xxd hex dump of one.

How it works (default --method auto, "blind alpha recovery"):
  1. Robustly fit a smooth background surface to the clean pixels around the logo
     (IRLS polynomial; the logo and its JPEG ringing are excluded).
  2. Per pixel, estimate the logo opacity:  a = (observed - background) / (255 - background)
  3. Turn that noisy estimate into a clean alpha map: detect the logo shape, use a
     smooth plateau opacity inside, a soft anti-aliased edge outside.
  4. Invert the blend:  original = (observed - a * 255) / (1 - a)
     Because alpha is smooth, real scene texture under the logo is KEPT (a plain
     inpaint/fill throws it away).
  5. Polish: fit opacity gain/shift by minimising leftover edges, Wiener-remove the
     noise amplified by 1/(1-a), bounded low-frequency bias correction, and fill
     only the almost-opaque pixels (a > ~0.6) from the background + matched grain.

Other methods:  --method smooth   fill the logo SHAPE (not the whole box) with the fitted surface
                --method telea    OpenCV inpaint of the logo SHAPE
Known alpha map?  --mask alpha.png --box X1 Y1 X2 Y2   (exact inverse, plus alignment fit)

Install: python -m pip install opencv-python numpy pillow
Examples:
  python remove_star_from_hex_or_image.py image.jpg
  python remove_star_from_hex_or_image.py "Pasted text(4).txt" --hex-output
  python remove_star_from_hex_or_image.py image.jpg --box 1390 2607 1457 2671
  python remove_star_from_hex_or_image.py image.jpg --mask star_alpha.png --box 1399 2617 1448 2663
  python remove_star_from_hex_or_image.py --self-test

Limits: true pixels cannot be recovered where the logo is nearly opaque; this only
removes the visible logo. Re-encoding writes a new file: embedded provenance
manifests (e.g. C2PA) are not carried over, and invisible watermarks are not touched.
"""
from __future__ import annotations

import argparse
import io
import math
import re
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

# Reference position measured on the 1536 x 2752 demonstration image.
REFERENCE_SIZE = (1536, 2752)
REFERENCE_BOX = (1389, 2602, 1457, 2678)
LOGO = 255.0  # white overlay
EDGE_PX = 0.25  # assumed sub-pixel placement uncertainty of alpha edges (px)


# ----------------------------------------------------------------------------
# xxd / image I/O
# ----------------------------------------------------------------------------
def reconstruct_xxd(path: Path) -> bytes:
    output = bytearray()
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        match = re.match(r"^([0-9a-fA-F]{8}): ", line)
        if match is None:
            continue
        offset = int(match.group(1), 16)
        hex_data = "".join(line[10:49].split())
        if offset != len(output):
            raise ValueError(f"Missing or out-of-order bytes at line {line_number}")
        if len(hex_data) % 2:
            raise ValueError(f"Unexpected hex group at line {line_number}")
        output.extend(bytes.fromhex(hex_data))
    if not output:
        raise ValueError("No xxd-formatted hexadecimal lines found")
    return bytes(output)


def dump_xxd(data: bytes, path: Path) -> None:
    with path.open("w", encoding="ascii") as file:
        for offset in range(0, len(data), 16):
            chunk = data[offset:offset + 16]
            pairs = " ".join(chunk[i:i + 2].hex() for i in range(0, len(chunk), 2))
            printable = "".join(chr(b) if 32 <= b < 127 else "." for b in chunk)
            file.write(f"{offset:08x}: {pairs:<39}  {printable}\n")


class Loaded:
    def __init__(self, rgb, extra_alpha, exif, icc, fmt):
        self.rgb, self.extra_alpha, self.exif, self.icc, self.fmt = rgb, extra_alpha, exif, icc, fmt


def load_image(path: Path) -> Loaded:
    data = reconstruct_xxd(path) if path.suffix.lower() == ".txt" else path.read_bytes()
    try:
        im = Image.open(io.BytesIO(data))
        im.load()
    except Exception as exc:
        raise ValueError("The supplied file is not a valid image or complete xxd dump") from exc
    fmt, exif, icc = im.format, im.info.get("exif"), im.info.get("icc_profile")
    if im.mode.startswith("I;16") or im.mode in ("I", "F"):
        raise ValueError("Only 8-bit images are supported.")
    if im.mode in ("RGBA", "LA", "PA") or (im.mode == "P" and "transparency" in im.info):
        arr = np.array(im.convert("RGBA"))
        return Loaded(np.ascontiguousarray(arr[:, :, :3]), np.ascontiguousarray(arr[:, :, 3]), exif, icc, fmt)
    return Loaded(np.array(im.convert("RGB")), None, exif, icc, fmt)


def save_image(path: Path, rgb: np.ndarray, src: Loaded, quality: int) -> None:
    ext = path.suffix.lower()
    if src.extra_alpha is not None and ext not in (".jpg", ".jpeg"):
        im = Image.fromarray(np.dstack([rgb, src.extra_alpha]), "RGBA")
    else:
        im = Image.fromarray(rgb, "RGB")
    kw: dict = {}
    if src.exif:
        kw["exif"] = src.exif
    if src.icc:
        kw["icc_profile"] = src.icc
    if ext in (".jpg", ".jpeg"):
        kw.update(quality=quality, subsampling=0)
    im.save(path, **kw)


def load_mask(path: Path) -> np.ndarray:
    im = Image.open(path)
    if im.mode in ("RGBA", "LA", "PA"):
        a = np.array(im.convert("RGBA"))[:, :, 3]
        if a.min() != a.max():
            return a.astype(np.float32) / 255.0
    m = np.array(im.convert("L"), dtype=np.float32) / 255.0
    border = np.concatenate([m[0], m[-1], m[:, 0], m[:, -1]])
    if border.mean() > 0.5 and np.median(m) > 0.5:  # black logo on white -> invert
        print("NOTICE: mask looked inverted; inverting it automatically.")
        m = 1.0 - m
    return m


# ----------------------------------------------------------------------------
# Small helpers
# ----------------------------------------------------------------------------
def ellipse(k: int) -> np.ndarray:
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))


def smoothstep(x: np.ndarray) -> np.ndarray:
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def largest_component(binary: np.ndarray):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(binary.astype(np.uint8), connectivity=8)
    if n <= 1:
        return None
    return lab == 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))


def fill_holes(m: np.ndarray) -> np.ndarray:
    h, w = m.shape
    ff = (~m).astype(np.uint8) * 255
    cv2.floodFill(ff, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 0)
    return m | (ff > 0)


def reference_box(width: int, height: int) -> tuple[int, int, int, int]:
    sx, sy = width / REFERENCE_SIZE[0], height / REFERENCE_SIZE[1]
    return tuple(map(round, (REFERENCE_BOX[0] * sx, REFERENCE_BOX[1] * sy,
                             REFERENCE_BOX[2] * sx, REFERENCE_BOX[3] * sy)))


# ----------------------------------------------------------------------------
# Background + alpha estimation
# ----------------------------------------------------------------------------
def fit_background(win: np.ndarray, exclude: np.ndarray, degree: int = 2, iters: int = 4) -> np.ndarray:
    """Robust (Huber/IRLS) polynomial surface fitted per channel to pixels not in `exclude`."""
    h, w = exclude.shape
    yy, xx = np.mgrid[:h, :w].astype(np.float64)
    xn, yn = (xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2)
    A = np.stack([xn ** i * yn ** j for i in range(degree + 1) for j in range(degree + 1 - i)], -1)
    use = ~exclude
    Au = A[use]
    if use.sum() < 6 * Au.shape[1]:
        raise ValueError("Not enough clean background around the logo (try a smaller --box).")
    B = np.empty(win.shape, np.float32)
    for c in range(3):
        y = win[..., c][use].astype(np.float64)
        wt = np.ones_like(y)
        coef = None
        for _ in range(iters):
            sw = np.sqrt(wt)
            coef, *_ = np.linalg.lstsq(Au * sw[:, None], y * sw, rcond=None)
            r = y - Au @ coef
            s = 1.4826 * np.median(np.abs(r - np.median(r))) + 1e-6
            k = 1.345 * s
            wt = np.where(np.abs(r) <= k, 1.0, k / np.maximum(np.abs(r), 1e-9))
        B[..., c] = A @ coef
    return B


def raw_alpha(win: np.ndarray, B: np.ndarray) -> np.ndarray:
    """Least-squares per-pixel opacity of a white overlay given the background estimate."""
    d = LOGO - B
    num = ((win - B) * d).sum(-1)
    den = (d * d).sum(-1)
    a = np.where(den > 2700.0, num / np.maximum(den, 1e-6), 0.0)  # bright bg: logo invisible
    return np.clip(a, -0.3, 0.95).astype(np.float32)


def build_alpha_model(a_raw: np.ndarray, binary: np.ndarray) -> np.ndarray:
    """Noisy per-pixel estimate -> clean alpha: smooth plateau * soft anti-aliased edge."""
    k3 = ellipse(3)
    interior = cv2.erode(binary.astype(np.uint8), k3, iterations=2) > 0
    if interior.sum() < 10:
        interior = binary
    ys, xs = np.nonzero(interior)
    vals = np.clip(a_raw, 0, 0.95)[ys, xs].astype(np.float64)
    h, w = a_raw.shape
    xc, yc = xs.mean(), ys.mean()
    sc = max(np.ptp(xs), np.ptp(ys)) / 2.0 + 1.0

    def design(x, y):
        xn, yn = (x - xc) / sc, (y - yc) / sc
        return np.stack([np.ones_like(xn), xn, yn, xn * yn, xn * xn, yn * yn], -1)

    X = design(xs.astype(np.float64), ys.astype(np.float64))
    keep = np.ones(vals.shape, bool)
    coef = np.zeros(X.shape[1])
    for _ in range(3):                      # trimmed least squares: texture outliers are dropped
        if keep.sum() < 2 * X.shape[1]:
            break
        coef, *_ = np.linalg.lstsq(X[keep], vals[keep], rcond=None)
        r = vals - X @ coef
        sig = 1.4826 * np.median(np.abs(r[keep] - np.median(r[keep]))) + 1e-4
        keep = np.abs(r) < 2.5 * sig
    gy, gx = np.mgrid[:h, :w].astype(np.float64)
    med = float(np.median(vals[keep])) if keep.any() else float(np.median(vals))
    plateau = np.clip(design(gx, gy) @ coef, 0.6 * med, 1.4 * med)
    plateau = np.clip(plateau, 0, 0.92).astype(np.float32)
    a_s = cv2.GaussianBlur(np.clip(a_raw, 0, 1), (0, 0), 0.7)
    band = (cv2.dilate(binary.astype(np.uint8), k3, iterations=2) > 0) & ~interior
    rel = np.clip(a_s / np.maximum(plateau, 1e-3), 0, 1)
    far = (cv2.dilate(binary.astype(np.uint8), k3, iterations=4) > 0) & ~(cv2.dilate(binary.astype(np.uint8), k3, iterations=2) > 0)
    soft = np.where(interior, 1.0, np.where(band, rel, np.where(far & (rel > 0.35), rel, 0.0)))
    alpha = (plateau * soft).astype(np.float32)
    alpha[alpha < 0.01] = 0.0
    return alpha


def estimate_alpha_blind(win: np.ndarray, rough: tuple[int, int, int, int], degree: int, min_plateau: float = 0.08):
    """Returns (alpha, binary_mask, background) in window coordinates, or None if no logo found."""
    h, w = win.shape[:2]
    bx1, by1, bx2, by2 = rough
    box = np.zeros((h, w), bool)
    box[by1:by2, bx1:bx2] = True
    B = fit_background(win, box, degree)
    binary = None
    for _ in range(3):
        s = cv2.GaussianBlur(raw_alpha(win, B), (0, 0), 1.0)
        p = float(np.percentile(s[box], 97))
        if p < min_plateau:
            return None
        comp = largest_component((s > 0.45 * p) & box)
        if comp is None:
            return None
        binary = fill_holes(cv2.morphologyEx(comp.astype(np.uint8), cv2.MORPH_CLOSE, ellipse(3)) > 0)
        B = fit_background(win, cv2.dilate(binary.astype(np.uint8), ellipse(13)) > 0, degree)
    ys, xs = np.nonzero(binary)
    touches = xs.min() <= bx1 or xs.max() >= bx2 - 1 or ys.min() <= by1 or ys.max() >= by2 - 1
    bbox_area = (np.ptp(xs) + 1) * (np.ptp(ys) + 1)
    solidity = binary.sum() / max(bbox_area, 1)
    if touches or not 0.08 <= solidity <= 0.8 or binary.sum() < 80:   # cut off / not logo-like
        return None
    return build_alpha_model(raw_alpha(win, B), binary), binary, B


# ----------------------------------------------------------------------------
# Opacity gain / shift refinement (minimise leftover edges)
# ----------------------------------------------------------------------------
def shift2d(a: np.ndarray, dx: float, dy: float) -> np.ndarray:
    if dx == 0 and dy == 0:
        return a
    M = np.array([[1, 0, dx], [0, 1, dy]], np.float32)
    return cv2.warpAffine(a, M, (a.shape[1], a.shape[0]), flags=cv2.INTER_LINEAR,
                          borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def _invert(win: np.ndarray, a: np.ndarray) -> np.ndarray:
    a3 = a[:, :, None]
    return (win - a3 * LOGO) / (1.0 - a3)


def _tv(rec: np.ndarray, w: np.ndarray) -> float:
    gx = rec[:-1, 1:] - rec[:-1, :-1]
    gy = rec[1:, :-1] - rec[:-1, :-1]
    return float((w[:-1, :-1, None] * np.sqrt(gx * gx + gy * gy + 1e-4 * 255 * 255)).sum())


def fit_alignment(win: np.ndarray, alpha: np.ndarray, radius: float, gain_range, max_alpha=0.95):
    r = int(math.ceil(radius))
    ys, xs = np.nonzero(alpha > 1e-3)
    if ys.size == 0:
        return 0.0, 0.0, 1.0, 0.0, 0.0
    H, W = alpha.shape
    m = r + 6
    y1, y2, x1, x2 = max(ys.min() - m, 0), min(ys.max() + 1 + m, H), max(xs.min() - m, 0), min(xs.max() + 1 + m, W)
    a0, o = alpha[y1:y2, x1:x2].astype(np.float32), win[y1:y2, x1:x2]
    k = 2 * r + 5
    support = cv2.dilate((a0 > 1e-3).astype(np.uint8), ellipse(k)).astype(np.float32)
    cache: dict = {}

    def cost(dx, dy, g):
        key = (round(dx, 4), round(dy, 4), round(g, 4))
        if key not in cache:
            a = np.clip(shift2d(a0, dx, dy) * g, 0, max_alpha)
            rec = cv2.GaussianBlur(np.clip(_invert(o, a), 0, 255), (0, 0), 0.8)
            cache[key] = _tv(rec, support)
        return cache[key]

    base = cost(0, 0, 1.0)
    lo, hi = gain_range
    best = (base, 0.0, 0.0, 1.0)
    for g in sorted({1.0, *np.linspace(lo, hi, 5).round(3).tolist()}):
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                c = cost(float(dx), float(dy), g)
                if c < best[0]:
                    best = (c, float(dx), float(dy), g)
    c, dx, dy, g = best
    step, gstep = 0.5, 0.03
    while step >= 0.03:
        moved = True
        while moved:
            moved = False
            for n in ((dx + step, dy, g), (dx - step, dy, g), (dx, dy + step, g), (dx, dy - step, g),
                      (dx, dy, g + gstep), (dx, dy, g - gstep)):
                if lo * 0.95 <= n[2] <= hi * 1.05:
                    nc = cost(*n)
                    if nc < c - 1e-9:
                        c, (dx, dy, g), moved = nc, n, True
        step /= 2
        gstep /= 2
    return dx, dy, g, base, c


# ----------------------------------------------------------------------------
# Recovery
# ----------------------------------------------------------------------------
def shrink_to_background(rec, alpha, B, noise, alpha_unc, win=7, apply=None):
    """Wiener-style shrinkage of the recovered pixels toward the fitted background surface.

    Expected error of the inverse at opacity a:
        e^2 = (noise / (1-a))^2 + (alpha_unc * (255-B) / (1-a))^2
    (amplified JPEG noise + star-shaped bias from small alpha errors). Where the local
    deviation from the background is no larger than that error, the pixel is replaced
    by the background; where real texture exceeds it, the recovered detail is kept.
    Returns (shrunk, gain) with gain in 0..1.
    """
    inv = 1.0 / (1.0 - alpha)
    d = (LOGO - B).mean(-1)
    e2 = (noise * inv) ** 2 + (alpha_unc * d * inv) ** 2
    dev = rec - B
    s2 = cv2.boxFilter((dev * dev).mean(-1), -1, (win, win), borderType=cv2.BORDER_REFLECT)
    g = np.maximum(s2 - e2, 0.0) / np.maximum(s2, 1e-9)
    g = np.where((alpha > 0) if apply is None else apply, g, 1.0).astype(np.float32)
    return B + g[:, :, None] * dev, g


def grain_sigma(win: np.ndarray, exclude: np.ndarray) -> float:
    hp = win - cv2.GaussianBlur(win, (0, 0), 1.0)
    vals = hp[~exclude]
    return float(1.4826 * np.median(np.abs(vals - np.median(vals)))) if vals.size else 1.0


def recover_window(win, alpha, binary, B, noise, alpha_unc, lowfreq_clip, span, grain=1.0, seed=0):
    a = np.clip(alpha, 0, 0.95)
    near = cv2.dilate(binary.astype(np.uint8), ellipse(13)) > 0
    gs = grain_sigma(win, near)
    rng = np.random.default_rng(seed)
    noise_field = rng.normal(0.0, 1.0, win.shape).astype(np.float32)
    rec = _invert(win, a)
    if noise > 0 or alpha_unc > 0:
        # edges/thin tips: a sub-pixel position error gives an alpha error ~ EDGE_PX * |grad alpha|
        sa = cv2.GaussianBlur(a, (0, 0), 1.0)
        mag = np.sqrt(cv2.Sobel(sa, cv2.CV_32F, 1, 0) ** 2 + cv2.Sobel(sa, cv2.CV_32F, 0, 1) ** 2) / 8.0
        unc = np.sqrt(alpha_unc ** 2 + (EDGE_PX * cv2.dilate(mag, np.ones((3, 3), np.uint8))) ** 2)
        ring = cv2.dilate((a > 0).astype(np.uint8), ellipse(5)) > 0     # include 1-2 px of JPEG ringing
        rec, g = shrink_to_background(rec, a, B, noise, unc, apply=ring)
        # shrunk (smooth) areas get grain matching their surroundings
        rec = rec + grain * gs * np.sqrt(1.0 - g)[:, :, None] * noise_field * ring[:, :, None]
    # nearly opaque pixels carry almost no information: rebuild from background + matched grain
    u = smoothstep((a - 0.6) / 0.3)[:, :, None]
    if u.max() > 0:
        rec = (1 - u) * rec + u * (B + gs * noise_field)
    # optional bounded low-frequency bias correction toward the background surface
    wm = cv2.GaussianBlur(cv2.dilate(binary.astype(np.uint8), ellipse(5), iterations=2).astype(np.float32), (0, 0), 1.5)
    if lowfreq_clip > 0:
        lp = cv2.GaussianBlur(rec, (0, 0), max(2.0, 0.07 * span))
        rec = rec - wm[:, :, None] * np.clip(lp - B, -lowfreq_clip, lowfreq_clip)
    ww = np.clip(wm + (a > 0), 0, 1)[:, :, None]
    return win + ww * (rec - win), ww[:, :, 0]


def auto_locate(rgb: np.ndarray):
    """Find a bright, logo-sized blob in the bottom-right corner (multi-scale top-hat).
    Returns a rough (x1, y1, x2, y2) box or None."""
    H, W = rgb.shape[:2]
    y0, x0 = int(H * 0.68), int(W * 0.68)
    gray = cv2.GaussianBlur(cv2.cvtColor(rgb[y0:, x0:], cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 1.0)
    found = []
    for k in (31, 47, 71, 103, 151):
        if k >= min(gray.shape) - 2:
            continue
        th = cv2.GaussianBlur(cv2.morphologyEx(gray, cv2.MORPH_TOPHAT, ellipse(k)), (0, 0), k / 8)
        y, x = np.unravel_index(int(np.argmax(th)), th.shape)
        found.append((float(th[y, x]), k, x + x0, y + y0))
    if not found:
        return None
    vmax = max(f[0] for f in found)
    if vmax < 10:
        return None
    _, k, cx, cy = next(f for f in found if f[0] >= 0.85 * vmax)   # smallest adequate scale
    half = max(16, int(k / 1.5 / 2))
    return (int(max(0, cx - half)), int(max(0, cy - half)), int(min(W, cx + half)), int(min(H, cy + half)))


def remove_star(rgb: np.ndarray, box, method="auto", degree=2, fit=True, noise=1.8, lowfreq_clip=0.0,
                radius=5.0, alpha_full=None, search=3.0, fill_box=False, verbose=True,
                alpha_unc=None, grain=1.0, min_plateau=0.08):
    H, W = rgb.shape[:2]
    x1, y1, x2, y2 = max(0, box[0]), max(0, box[1]), min(W, box[2]), min(H, box[3])
    if x1 >= x2 or y1 >= y2:
        raise ValueError("Invalid bounding box")
    span = max(x2 - x1, y2 - y1)
    m = max(12, round(0.25 * span))                      # tolerance around the given box
    ex1, ey1, ex2, ey2 = max(0, x1 - m), max(0, y1 - m), min(W, x2 + m), min(H, y2 + m)
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    pad = max(25, round(1.25 * span)) + m
    wl, wt, wr, wb = max(0, int(cx - pad)), max(0, int(cy - pad)), min(W, int(cx + pad + 1)), min(H, int(cy + pad + 1))
    win = rgb[wt:wb, wl:wr].astype(np.float32)
    rough = (ex1 - wl, ey1 - wt, ex2 - wl, ey2 - wt)

    if alpha_full is not None:                           # known alpha map
        alpha = alpha_full[wt:wb, wl:wr].astype(np.float32)
        binary = alpha > 0.02
        if not binary.any():
            raise ValueError("The alpha mask is empty inside the window; check --box.")
        B = fit_background(win, cv2.dilate(binary.astype(np.uint8), ellipse(13)) > 0, degree)
        rad, grange = search, (0.8, 1.25)
    else:
        est = estimate_alpha_blind(win, rough, degree, min_plateau)
        if est is None:
            raise ValueError("No logo found near the box. Pass --box X1 Y1 X2 Y2 around the star.")
        alpha, binary, B = est
        rad, grange = 1.0, (0.9, 1.1)
    if fill_box:
        binary = np.zeros_like(binary)
        binary[rough[1]:rough[3], rough[0]:rough[2]] = True

    if method == "auto":
        if fit:
            dx, dy, g, c0, c1 = fit_alignment(win, alpha, rad, grange)
            if c1 < c0 * (0.995 if alpha_full is not None else 0.99) and (dx or dy or g != 1.0):
                alpha = np.clip(shift2d(alpha, dx, dy) * g, 0, 0.95)
                if verbose:
                    print(f"fit: dx={dx:+.2f} dy={dy:+.2f} gain={g:.3f} (edge cost {c0:.0f}->{c1:.0f})")
        unc = alpha_unc if alpha_unc is not None else (0.004 if alpha_full is not None else 0.02)
        out_w, ww = recover_window(win, alpha, binary, B, noise, unc, lowfreq_clip, span, grain)
    else:
        wm = cv2.GaussianBlur(cv2.dilate(binary.astype(np.uint8), ellipse(5), iterations=2).astype(np.float32), (0, 0), 1.5)
        ww = wm
        if method == "smooth":
            near = cv2.dilate(binary.astype(np.uint8), ellipse(13)) > 0
            fillv = B + grain * np.random.default_rng(0).normal(0, grain_sigma(win, near), win.shape).astype(np.float32)
            out_w = win * (1 - wm[:, :, None]) + fillv * wm[:, :, None]
        else:  # telea
            mask = (cv2.dilate(binary.astype(np.uint8), ellipse(5), iterations=2) * 255).astype(np.uint8)
            out_w = cv2.inpaint(rgb[wt:wb, wl:wr], mask, radius, cv2.INPAINT_TELEA).astype(np.float32)
    result = rgb.copy()
    roi = result[wt:wb, wl:wr]
    sel = ww > 0.005
    roi[sel] = np.clip(np.rint(out_w), 0, 255).astype(np.uint8)[sel]
    full_alpha = np.zeros((H, W), np.float32)
    full_alpha[wt:wb, wl:wr] = alpha
    return result, full_alpha


# ----------------------------------------------------------------------------
# Self-test
# ----------------------------------------------------------------------------
def _star(h, w, cx, cy, r, peak=0.5):
    ss = 4
    big = np.zeros((h * ss, w * ss), np.uint8)
    pts = []
    for i in range(8):
        rad, ang = (r if i % 2 == 0 else r * 0.2), i * math.pi / 4
        pts.append([int((cx + rad * math.cos(ang)) * ss), int((cy + rad * math.sin(ang)) * ss)])
    cv2.fillPoly(big, [np.array(pts, np.int32)], 255)
    s = cv2.resize(big, (w, h), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0
    return cv2.GaussianBlur(s, (0, 0), 0.8) * peak


def self_test() -> None:
    h, w = 500, 600
    yy, xx = np.mgrid[:h, :w].astype(np.float32)
    smooth = np.stack([150 + xx * 0.05 - yy * 0.04, 110 + xx * 0.03 - yy * 0.05, 70 + xx * 0.02 - yy * 0.04], -1)
    rng = np.random.default_rng(1)
    tex = smooth.copy()
    for s, a in ((1.0, 12), (3, 12), (9, 14)):
        n = cv2.GaussianBlur(rng.standard_normal((h, w, 3)).astype(np.float32), (0, 0), s)
        tex += n / n.std() * a
    box = (442, 362, 518, 438)
    for name, bg in (("smooth gradient", smooth), ("textured scene", tex)):
        clean = np.clip(bg, 0, 255).astype(np.uint8)
        a = _star(h, w, 480, 400, 34)
        marked = np.rint(clean * (1 - a[..., None]) + 255 * a[..., None]).clip(0, 255).astype(np.uint8)
        _, buf = cv2.imencode(".jpg", marked, [cv2.IMWRITE_JPEG_QUALITY, 95])
        jpg = cv2.imdecode(buf, 1)
        reg = cv2.dilate((a > 0.003).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        mae = lambda x: np.abs(x.astype(int) - clean.astype(int))[reg].mean()
        res = {k: mae(remove_star(jpg, box, k, verbose=False)[0]) for k in ("auto", "smooth", "telea")}
        print(f"{name:16s} marked {mae(jpg):5.2f} | auto {res['auto']:5.2f} | smooth-shape {res['smooth']:5.2f} | "
              f"telea-shape {res['telea']:5.2f}")
        assert res["auto"] < mae(jpg) * 0.3, "auto method must remove most of the logo"
        if name.startswith("textured"):
            assert res["auto"] < min(res["smooth"], res["telea"]), "auto should beat fills on texture"
    print("Self-test passed.")


# ----------------------------------------------------------------------------
# CLI
# ----------------------------------------------------------------------------
def main() -> None:
    p = argparse.ArgumentParser(description="Remove a small visible semi-transparent logo",
                                formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    p.add_argument("input", type=Path, nargs="?", help="Image file or xxd-format text dump")
    p.add_argument("--output", type=Path, default=None, help="Path for edited image (.png or .jpg)")
    p.add_argument("--method", choices=("auto", "smooth", "telea"), default="auto")
    p.add_argument("--box", nargs=4, type=int, metavar=("X1", "Y1", "X2", "Y2"),
                   help="Rough rectangle around the logo; default: scaled reference position")
    p.add_argument("--mask", type=Path, help="Known alpha map (grayscale, white = opaque) matching --box size")
    p.add_argument("--degree", type=int, default=2, choices=(1, 2, 3), help="Background polynomial degree")
    p.add_argument("--noise", type=float, default=None, help="Baseline noise std in levels (default 1.8 lossy / 0.6)")
    p.add_argument("--lowfreq-clip", type=float, default=0.0, help="Optional extra low-frequency bias correction (levels), 0 = off")
    p.add_argument("--alpha-uncertainty", type=float, default=None, help="Expected alpha error (default 0.02 blind, 0.004 with --mask)")
    p.add_argument("--grain", type=float, default=1.0, help="Matched grain added to smoothed areas (0 = none)")
    p.add_argument("--no-fit", action="store_true", help="Skip opacity gain/shift refinement")
    p.add_argument("--fill-box", action="store_true", help="smooth/telea: fill the whole box, not just the logo shape")
    p.add_argument("--search", type=float, default=3.0, help="With --mask: alignment search radius in px")
    p.add_argument("--radius", type=float, default=5.0, help="Inpaint radius for telea")
    p.add_argument("--quality", type=int, default=98, help="JPEG output quality")
    p.add_argument("--save-mask", type=Path, help="Save the estimated alpha map as PNG (for inspection/reuse)")
    p.add_argument("--hex-output", action="store_true", help="Also save full xxd hex dump of output")
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        self_test()
        return
    if args.input is None:
        p.error("Provide an input image.")

    src = load_image(args.input)
    height, width = src.rgb.shape[:2]
    explicit = bool(args.box)
    candidates = [tuple(args.box)] if explicit else [reference_box(width, height)]
    if not explicit:
        located = auto_locate(src.rgb)
        if located and located not in candidates:
            candidates.append(located)
    alpha_full = None
    if args.mask:
        if not explicit:
            p.error("--mask requires --box (the area the mask covers)")
        m = load_mask(args.mask)
        x1, y1, x2, y2 = candidates[0]
        if m.shape == (height, width):
            alpha_full = m
        elif m.shape == (y2 - y1, x2 - x1):
            alpha_full = np.zeros((height, width), np.float32)
            alpha_full[y1:y2, x1:x2] = m
        else:
            p.error(f"Mask is {m.shape[1]}x{m.shape[0]} but box is {x2 - x1}x{y2 - y1}")
    noise = args.noise if args.noise is not None else (1.8 if src.fmt in ("JPEG", "WEBP") else 0.6)

    cleaned = alpha = None
    for box in candidates:
        try:
            cleaned, alpha = remove_star(src.rgb, box, args.method, args.degree, not args.no_fit, noise,
                                         args.lowfreq_clip, args.radius, alpha_full, args.search, args.fill_box,
                                         True, args.alpha_uncertainty, args.grain,
                                         0.08 if explicit or alpha_full is not None else 0.12)
            break
        except ValueError as exc:
            if "No logo found" not in str(exc):
                raise
            print(f"No logo found near {box}.")
    if cleaned is None:
        raise ValueError("Could not find the logo. Pass --box X1 Y1 X2 Y2 around it "
                         "(a rough rectangle with some margin is fine).")
    output = args.output or args.input.with_name(args.input.stem.replace("Pasted text(4)", "image") + "_clean.png")
    if output.suffix.lower() not in {".png", ".jpg", ".jpeg"}:
        raise ValueError("Output must end in .png or .jpg")
    save_image(output, cleaned, src, args.quality)
    print(f"Saved: {output} ({width}x{height}, box={box}, method={args.method}, "
          f"max alpha={alpha.max():.2f}, logo pixels={int((alpha > 0).sum())})")
    if args.save_mask:
        Image.fromarray(np.rint(np.clip(alpha, 0, 1) * 255).astype(np.uint8), "L").save(args.save_mask)
    if args.hex_output:
        hex_path = output.with_suffix(".hex.txt")
        dump_xxd(output.read_bytes(), hex_path)
        if reconstruct_xxd(hex_path) != output.read_bytes():
            raise AssertionError("Hexadecimal round-trip failed")
        print(f"Saved hex: {hex_path}")
    print("Note: this writes a new file; embedded provenance manifests (e.g. C2PA) are not carried over.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as exc:
        sys.exit(f"error: {exc}")