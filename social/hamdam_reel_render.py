#!/usr/bin/env python3
"""Hamdam reel frame renderer.

    python3 hamdam_reel_render.py <conceptId> <stage 0|1|2> [outDir]

Reads verse-queue.json and reel-concepts.json (both in HAMDAM_BASE), renders one
1080x1920 frame. The three stages are identical except for text, so they
cross-dissolve without the frame appearing to move.

  stage 0 - scene only
  stage 1 - + headline + Persian
  stage 2 - + English translation + poet name

Environment:
  HAMDAM_BASE      folder holding verse-queue.json and reel-concepts.json
  HAMDAM_FONTS_FA  Vazirmatn ttf directory
  HAMDAM_FONTS_EN  Source Serif otf directory

Handles both 2-line and 4-line verses. Persian is read byte-exact from the
queue and never typed.
"""
import sys, os, json, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, features

CONCEPT_ID = sys.argv[1]
STAGE      = int(sys.argv[2])
OUTDIR     = sys.argv[3] if len(sys.argv) > 3 else '.'
BASE       = os.environ.get('HAMDAM_BASE', '.')
FZ = os.environ.get('HAMDAM_FONTS_FA', './fonts/vazirmatn/fonts/ttf/')
SS = os.environ.get('HAMDAM_FONTS_EN', './fonts/sourceserif/source-serif-4.005_Desktop/OTF/')

assert features.check('raqm'), 'raqm missing - refuse to render Persian unshaped'

concepts = json.load(open(f'{BASE}/reel-concepts.json'))['concepts']
C = next(c for c in concepts if c['id'] == CONCEPT_ID)
V = next(v for v in json.load(open(f'{BASE}/verse-queue.json')) if v['id'] == C['verseId'])
FA = [l.strip() for l in V['persian'].split('\n') if l.strip()]
EN = V['english']
assert len(FA) in (2, 4), f'unexpected line count {len(FA)} for {V["id"]}'

S = 2
W, H = 1080 * S, 1920 * S

def hx(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lerp(a, b, t): return tuple(round(a[i] + (b[i]-a[i])*t) for i in range(3))
def ease(t): return t*t*t*(t*(t*6-15)+10)

TEAL_D, TEAL_M, TEAL_L = hx('07090D'), hx('152227'), hx('2E4144')
HAZE, FRAME_BR, AMBER, CREAM = hx('86A6A4'), hx('3A2E22'), hx('E0A566'), hx('F4EDD8')

def vgrad(w, h, stops):
    row = Image.new('RGB', (1, h)); r = row.load()
    for y in range(h):
        f = y/(h-1)
        for k in range(len(stops)-1):
            y0, c0 = stops[k]; y1, c1 = stops[k+1]
            if y0 <= f <= y1:
                r[0, y] = lerp(c0, c1, ease((f-y0)/(y1-y0)) if y1 > y0 else 0); break
    return row.resize((w, h))

def mist(img, seed, bands=7, strength=0.30):
    w, h = img.size; rng = random.Random(seed)
    layer = Image.new('L', (w, h), 0); d = ImageDraw.Draw(layer)
    for _ in range(bands):
        y = rng.uniform(0.30, 0.92)*h; th = rng.uniform(0.02, 0.075)*h
        d.ellipse([-w*0.3, y-th, w*1.3, y+th], fill=int(rng.uniform(40, 120)))
    layer = layer.filter(ImageFilter.GaussianBlur(int(h*0.035)))
    return Image.composite(Image.new('RGB', (w, h), HAZE), img,
                           layer.point(lambda p: int(p*strength)))

def water(img, hf):
    w, h = img.size; hy = int(h*hf)
    refl = img.crop((0, 0, w, hy)).transpose(Image.FLIP_TOP_BOTTOM).resize((w, h-hy))
    refl = refl.filter(ImageFilter.GaussianBlur(int(h*0.012)))
    img.paste(Image.blend(refl, Image.new('RGB', refl.size, TEAL_D), 0.42), (0, hy))
    return img

def far_shore(img, hf, col, seed, amp=0.012):
    w, h = img.size; hy = int(h*hf); rng = random.Random(seed)
    d = ImageDraw.Draw(img); pts = []; x = 0
    while x <= w:
        y = hy - abs(math.sin(x/w*math.pi*rng.uniform(1.2, 2.0)+seed))*h*amp \
              - rng.uniform(0, h*amp*0.25)
        pts.append((x, y)); x += w//48
    pts += [(w, hy+4), (0, hy+4)]
    d.polygon(pts, fill=col); return img

def birds(img, n, cx, cy, spread, col, scale):
    d = ImageDraw.Draw(img); rng = random.Random(7)
    for i in range(n):
        t = i/max(1, n-1)
        x = cx + (t-0.5)*spread + rng.uniform(-spread*0.05, spread*0.05)
        y = cy - t*spread*0.22 + rng.uniform(-spread*0.03, spread*0.03)
        s = scale*rng.uniform(0.7, 1.15)
        d.line([(x-s, y), (x-s*0.35, y-s*0.5), (x, y-s*0.12)], fill=col, width=max(1, int(s*0.22)))
        d.line([(x, y-s*0.12), (x+s*0.35, y-s*0.5), (x+s, y)], fill=col, width=max(1, int(s*0.22)))
    return img

# exterior - cool, hazy, defocused
bg = vgrad(W, H, [(0, TEAL_L), (.22, hx('223438')), (.46, TEAL_M), (.72, hx('0F1A1E')), (1, TEAL_D)])
bg = far_shore(bg, 0.50, hx('0D171A'), 3, amp=0.016)
bg = water(bg, 0.50)
bg = mist(bg, 11, bands=8, strength=0.34)
bg = birds(bg, 9, int(W*0.30), int(H*0.30), W*0.30, hx('1C2C30'), S*7)
bg = bg.filter(ImageFilter.GaussianBlur(S*5))
bg = Image.blend(bg, Image.new('RGB', (W, H), TEAL_D), 0.10)

# inset print - warm, in focus. Taller for 4-line verses.
FOUR = len(FA) == 4
IX = int(W*0.115)
IY = int(H*(0.200 if FOUR else 0.225))
IW = W - IX*2
IH = int(H*(0.585 if FOUR else 0.545))
FB = int(W*0.028)

inner = vgrad(IW, IH, [(0, hx('C9CBBE')), (.20, hx('E6C79A')), (.38, AMBER),
                       (.50, hx('B98559')), (.62, hx('6B5340')), (1, hx('1A1712'))])
inner = far_shore(inner, 0.42 if FOUR else 0.46, hx('4A3A2C'), 5, amp=0.020)
inner = water(inner, 0.42 if FOUR else 0.46)
inner = mist(inner, 21, bands=6, strength=0.26)
inner = birds(inner, 7, int(IW*0.66), int(IH*0.22), IW*0.34, hx('5E4A38'), S*6)
inner = inner.filter(ImageFilter.GaussianBlur(S*1.2))

sh = Image.new('L', (IW, IH), 0); sd = ImageDraw.Draw(sh)
knee = 0.20 if FOUR else 0.24
for i in range(IH):
    f = i/IH
    sd.line([(0, i), (IW, i)], fill=int(215*ease(max(0.0, (f-knee)/(1-knee)))))
inner = Image.composite(Image.new('RGB', (IW, IH), hx('0B0B08')), inner, sh)
d = ImageDraw.Draw(inner)

def track(draw, xy, text, font, fill, sp):
    total = sum(draw.textlength(c, font=font) for c in text) + sp*(len(text)-1)
    x = xy[0] - total/2
    for c in text:
        draw.text((x, xy[1]), c, font=font, fill=fill, anchor='lm')
        x += draw.textlength(c, font=font) + sp

def rtl(draw, xy, t, f, fill):
    draw.text(xy, t, font=f, fill=fill, anchor='mm', direction='rtl',
              language='fa', features=['kern', 'liga'])

def wrap(draw, text, font, maxw):
    words, lines, cur = text.split(), [], ''
    for w_ in words:
        t = (cur+' '+w_).strip()
        if draw.textlength(t, font=font) <= maxw: cur = t
        else: lines.append(cur); cur = w_
    if cur: lines.append(cur)
    return lines

cx = IW//2
HEAD_Y = 0.455 if FOUR else 0.545
FA_TOP = 0.545 if FOUR else 0.655
FA_GAP = 0.062 if FOUR else 0.070

f_head = ImageFont.truetype(SS+'SourceSerif4-Bold.otf', S*(26 if FOUR else 30))
f_en   = ImageFont.truetype(SS+'SourceSerif4-LightIt.otf', S*(22 if FOUR else 25))
f_poet = ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*20)

if STAGE >= 1:
    hl = C['headline']
    hsz = 26 if FOUR else 30
    while hsz > 16:
        f_head = ImageFont.truetype(SS+'SourceSerif4-Bold.otf', S*hsz)
        if sum(d.textlength(ch, font=f_head) for ch in hl) + S*2.2*(len(hl)-1) <= IW*0.88:
            break
        hsz -= 1
    track(d, (cx, int(IH*HEAD_Y)), hl, f_head, CREAM, S*2.2)

    sz = 38 if FOUR else 44
    while sz > 20:
        f_fa = ImageFont.truetype(FZ+'Vazirmatn-Light.ttf', S*sz)
        if max(d.textlength(l, font=f_fa, direction='rtl', language='fa') for l in FA) <= IW*0.86:
            break
        sz -= 2
    for i, line in enumerate(FA):
        rtl(d, (cx, int(IH*(FA_TOP + i*FA_GAP))), line, f_fa, hx('F6EFE0'))

if STAGE >= 2:
    lines = wrap(d, EN, f_en, IW*0.84)[:3]
    # anchor from the bottom of the print so 4-line verses never push this off-frame
    POET_Y = 0.945
    en_gap = 0.038
    en_bottom = POET_Y - 0.048
    en_top = en_bottom - (len(lines)-1)*en_gap
    fa_bottom = FA_TOP + (len(FA)-1)*FA_GAP
    if en_top - fa_bottom < 0.055:            # crowding guard
        en_top = fa_bottom + 0.055
    for i, l in enumerate(lines):
        d.text((cx, int(IH*(en_top + i*en_gap))), l, font=f_en, fill=hx('E4DCCA'), anchor='mm')
    track(d, (cx, int(IH*POET_Y)), C['poet'].upper(), f_poet, hx('C8BCA4'), S*7)

# frame + footer
card_w = IW + FB*2
card_h = IH + FB*2 + int(H*0.055)
card = Image.new('RGB', (card_w, card_h), FRAME_BR)
card.paste(vgrad(card_w, card_h, [(0, hx('443526')), (1, hx('2C2118'))]), (0, 0))
card.paste(inner, (FB, FB))
cd = ImageDraw.Draw(card)
cd.rectangle([FB-S, FB-S, FB+IW+S-1, FB+IH+S-1], outline=hx('1A140E'), width=S)
cd.text((card_w//2, FB+IH+int(H*0.030)), 'hamdam  \u00b7  @hamdam_au',
        font=ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*24),
        fill=hx('CDBFA6'), anchor='mm')

shadow = Image.new('L', (W, H), 0)
ImageDraw.Draw(shadow).rectangle([IX-FB, IY-FB, IX-FB+card_w, IY-FB+card_h], fill=150)
shadow = shadow.filter(ImageFilter.GaussianBlur(S*22))
bg = Image.composite(Image.new('RGB', (W, H), (0, 0, 0)), bg, shadow)
bg.paste(card, (IX-FB, IY-FB))

n = Image.effect_noise((W, H), 13).convert('L')
bg = Image.blend(bg, Image.merge('RGB', (n, n, n)), 0.030)
bg = bg.resize((1080, 1920), Image.LANCZOS)

os.makedirs(OUTDIR, exist_ok=True)
out = f'{OUTDIR}/{CONCEPT_ID}-stage{STAGE}.jpg'
bg.save(out, 'JPEG', quality=93, optimize=True)
print(out)
