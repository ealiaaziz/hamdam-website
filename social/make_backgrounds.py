#!/usr/bin/env python3
"""Hamdam reel backgrounds - four moods, abstract light only.

    python3 make_backgrounds.py [outDir]

Writes bg-happy.jpg, bg-grave.jpg, bg-love.jpg, bg-wry.jpg. Point
HAMDAM_BG_DIR at that folder and hamdam_reel_render.py will use them.

No representational objects - gradient, glow, atmosphere, and the eight-point
khatam star from the secondary logo. Drawn scenery (trees, ruins, gardens)
was tried repeatedly and always failed: polygons have none of the texture or
depth that makes a scene read as real. Abstract light does.

Composition: interest between 20% and 55% height, quiet and dark below,
because that is where the verse sits. Nothing important within 15% of the
top or bottom edge - the image is centre-cropped at two different aspects.

Deterministic: same output every run, so a palette change is a commit rather
than a re-upload.
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFilter

W, H = 1620, 2880
OUTDIR = sys.argv[1] if len(sys.argv) > 1 else '.'
os.makedirs(OUTDIR, exist_ok=True)

def hx(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lerp(a, b, t): return tuple(round(a[i] + (b[i]-a[i])*t) for i in range(3))
def ease(t): return t*t*t*(t*(t*6-15)+10)

def vgrad(w, h, stops):
    row = Image.new('RGB', (1, h)); r = row.load()
    for y in range(h):
        f = y/(h-1)
        for k in range(len(stops)-1):
            y0, c0 = stops[k]; y1, c1 = stops[k+1]
            if y0 <= f <= y1:
                r[0, y] = lerp(c0, c1, ease((f-y0)/(y1-y0)) if y1 > y0 else 0); break
    return row.resize((w, h))

def sun(im, cxf, cyf, rf, glow_col, disc_col, strength=1.0):
    w, h = im.size
    cx, cy, r = int(w*cxf), int(h*cyf), int(w*rf)
    g = Image.new('L', (w, h), 0); gd = ImageDraw.Draw(g)
    for i, m in enumerate((7.0, 4.8, 3.2, 2.0, 1.35)):
        gd.ellipse([cx-r*m, cy-r*m, cx+r*m, cy+r*m], fill=int((12+i*21)*strength))
    g = g.filter(ImageFilter.GaussianBlur(int(r*1.3)))
    im = Image.composite(Image.new('RGB', (w, h), glow_col), im, g)
    d0 = Image.new('L', (w, h), 0)
    ImageDraw.Draw(d0).ellipse([cx-r, cy-r, cx+r, cy+r], fill=int(255*min(1.0, strength)))
    d0 = d0.filter(ImageFilter.GaussianBlur(5))
    return Image.composite(Image.new('RGB', (w, h), disc_col), im, d0)

def band(im, yf, col, thick, alpha, blur):
    w, h = im.size
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).ellipse([-w*0.35, h*yf-h*thick, w*1.35, h*yf+h*thick*0.6], fill=alpha)
    m = m.filter(ImageFilter.GaussianBlur(blur))
    return Image.composite(Image.new('RGB', (w, h), col), im, m)

def star(im, cxf, cyf, rf, col, alpha, width):
    """Eight-point khatam mark - two stars interlaced, as in the logo."""
    w, h = im.size
    layer = Image.new('L', (w, h), 0); d = ImageDraw.Draw(layer)
    cx, cy, ro = w*cxf, h*cyf, w*rf
    ri = ro*0.42
    pts = []
    for k in range(16):
        ang = math.pi/2 + k*math.pi/8
        r = ro if k % 2 == 0 else ri
        pts.append((cx + r*math.cos(ang), cy - r*math.sin(ang)))
    d.polygon(pts, outline=alpha, width=width)
    pts2 = []
    for k in range(16):
        ang = math.pi/2 + k*math.pi/8 + math.pi/16
        r = ro*0.86 if k % 2 == 0 else ri*0.86
        pts2.append((cx + r*math.cos(ang), cy - r*math.sin(ang)))
    d.polygon(pts2, outline=int(alpha*0.7), width=width)
    layer = layer.filter(ImageFilter.GaussianBlur(2))
    return Image.composite(Image.new('RGB', (w, h), col), im, layer)

def finish(im, quiet_from, quiet_col):
    w, h = im.size
    q = Image.new('L', (w, h), 0); qd = ImageDraw.Draw(q)
    for i in range(h):
        f = i/h
        qd.line([(0, i), (w, i)], fill=int(212*ease(max(0.0, (f-quiet_from)/(1-quiet_from)))))
    im = Image.composite(Image.new('RGB', (w, h), quiet_col), im, q)
    vig = Image.new('L', (w, h), 0)
    ImageDraw.Draw(vig).ellipse([-w*0.42, -h*0.26, w*1.42, h*1.26], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(175))
    im = Image.composite(im, Image.new('RGB', (w, h), (0, 0, 0)), vig)
    n = Image.effect_noise((w, h), 11).convert('L')
    return Image.blend(im, Image.merge('RGB', (n, n, n)), 0.027)

def make_happy():
    """Morning well under way. Green and gold - the garden palette."""
    im = vgrad(W, H, [
        (0.00, hx('9FC0BE')), (0.15, hx('C4D3B2')), (0.26, hx('E7D6A2')),
        (0.34, hx('F5CD82')), (0.43, hx('D9A660')), (0.53, hx('7C8C55')),
        (0.66, hx('3B4E2E')), (0.80, hx('1A2513')), (1.00, hx('080D06')),
    ])
    im = sun(im, 0.60, 0.325, 0.050, hx('FFE3AC'), hx('FFF9EC'), 1.05)
    im = band(im, 0.455, hx('E0A85C'), 0.052, 92, 80)
    im = band(im, 0.300, hx('FFF0CC'), 0.030, 40, 70)
    im = star(im, 0.50, 0.185, 0.075, hx('FFF3D6'), 58, 3)
    return finish(im, 0.60, hx('080D06'))

def make_grave():
    """Before the sun clears. Cold, low, mostly shade."""
    im = vgrad(W, H, [
        (0.00, hx('5B6E7A')), (0.16, hx('6E7C80')), (0.30, hx('8A8879')),
        (0.40, hx('9C8B6F')), (0.48, hx('6B5F4E')), (0.60, hx('343531')),
        (0.74, hx('1B1E1D')), (1.00, hx('050707')),
    ])
    im = sun(im, 0.44, 0.415, 0.034, hx('D9C8A4'), hx('E8DCC2'), 0.62)
    im = band(im, 0.470, hx('9A8C74'), 0.040, 70, 90)
    im = star(im, 0.50, 0.200, 0.070, hx('CFD8DA'), 20, 3)
    return finish(im, 0.55, hx('05070A'))

def make_love():
    """Late warm light. Close, soft, rose into deep amber."""
    im = vgrad(W, H, [
        (0.00, hx('9E8FA0')), (0.14, hx('C29A8C')), (0.25, hx('DFA97F')),
        (0.34, hx('EFB275')), (0.44, hx('D08A56')), (0.55, hx('8A5238')),
        (0.68, hx('47271C')), (0.82, hx('1E1210')), (1.00, hx('0A0607')),
    ])
    im = sun(im, 0.52, 0.385, 0.058, hx('FFD4A0'), hx('FFF0DC'), 1.0)
    im = band(im, 0.440, hx('E79A62'), 0.058, 98, 85)
    im = star(im, 0.50, 0.190, 0.072, hx('FFE2C4'), 52, 3)
    return finish(im, 0.58, hx('0A0607'))

def make_wry():
    """Plain daylight. Even, unhurried, nothing dramatic."""
    im = vgrad(W, H, [
        (0.00, hx('AFC0C4')), (0.18, hx('C3CBC4')), (0.32, hx('D6D2BE')),
        (0.44, hx('BFB49A')), (0.56, hx('7E7666')), (0.70, hx('403C34')),
        (0.84, hx('1C1A17')), (1.00, hx('090807')),
    ])
    im = sun(im, 0.66, 0.300, 0.040, hx('F0E4C8'), hx('FBF4E4'), 0.70)
    im = band(im, 0.460, hx('C9BDA2'), 0.046, 72, 88)
    im = star(im, 0.50, 0.190, 0.070, hx('EFEADC'), 50, 3)
    return finish(im, 0.60, hx('090807'))

for name, fn in (('happy', make_happy), ('grave', make_grave),
                 ('love', make_love), ('wry', make_wry)):
    p = os.path.join(OUTDIR, f'bg-{name}.jpg')
    fn().save(p, 'JPEG', quality=94, optimize=True)
    print(p)
