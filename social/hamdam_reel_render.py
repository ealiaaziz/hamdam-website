#!/usr/bin/env python3
"""Hamdam reel frame renderer, v8 - six pages, argument early, CTA with a reason.

    python3 hamdam_reel_render.py <conceptId> <stage 0..5> [outDir]

  0  scene only  (NOT USED - the task renders 1..5; see Step 5 of the task)
  1  headline
  2  the philological point - insightFa then insightEn
  3  Persian verse, alone
  4  English translation, alone, same type size, poet line beneath
  5  the lesson, who to send it to, and the posting schedule

WHY THIS SHAPE. Attention ends early: average watch is 5.6 s on a 14 s reel,
and slides 4-5 of every carousel this account published received zero views.
So the argument - the one page no other account can produce - is second,
landing at 2 s. And the follow ask is NOT on the last page; it sits in the
footer strip on every page, with the REASON attached. See CTA.md.

Pages 3 and 4 share one computed type size so the two languages carry equal
weight. Every page shares one frame and one layout, so consecutive pages
cross-dissolve without the image seeming to move.

If HAMDAM_BG_DIR contains bg-<mood>.jpg for the concept's mood, that photo is
used: blurred and dimmed as the full-bleed exterior, sharp inside the framed
print. Otherwise the procedural sunrise scene is drawn. See BACKGROUNDS.md.

Persian is read byte-exact from the queue and never typed.
"""
import sys, os, json, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, features

CONCEPT_ID = sys.argv[1]
STAGE      = int(sys.argv[2])
OUTDIR     = sys.argv[3] if len(sys.argv) > 3 else '.'
BASE       = os.environ.get('HAMDAM_BASE', '.')
FZ = os.environ.get('HAMDAM_FONTS_FA', './fonts/vazirmatn/fonts/ttf/')
SS = os.environ.get('HAMDAM_FONTS_EN', './fonts/sourceserif/source-serif-4.005_Desktop/OTF/')
NSTAGES = 6

assert features.check('raqm'), 'raqm missing - refuse to render Persian unshaped'
assert 0 <= STAGE < NSTAGES

concepts = json.load(open(f'{BASE}/reel-concepts.json'))['concepts']
C = next(c for c in concepts if c['id'] == CONCEPT_ID)
V = next(v for v in json.load(open(f'{BASE}/verse-queue.json')) if v['id'] == C['verseId'])
FA = [l.strip() for l in V['persian'].split('\n') if l.strip()]
EN = V['english']
assert len(FA) in (2, 4)

S = 2
W, H = 1080 * S, 1920 * S

def hx(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lerp(a, b, t): return tuple(round(a[i] + (b[i]-a[i])*t) for i in range(3))
def ease(t): return t*t*t*(t*(t*6-15)+10)

SKY_HI   = hx('9FB8BC')
SKY_MID  = hx('6E8E92')
TEAL_M   = hx('2C4448')
TEAL_D   = hx('101E22')
HAZE     = hx('BBD2CE')
FRAME_BR = hx('3A2E22')
GOLD     = hx('F2C572')
AMBER    = hx('E8A85C')
CREAM    = hx('F7F1E1')

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
        y = rng.uniform(0.30, 0.92)*h; th = rng.uniform(0.012, 0.048)*h
        d.ellipse([-w*0.35, y-th, w*1.35, y+th], fill=int(rng.uniform(60, 150)))
    layer = layer.filter(ImageFilter.GaussianBlur(int(h*0.030)))
    return Image.composite(Image.new('RGB', (w, h), HAZE), img,
                           layer.point(lambda p: int(p*strength)))

def sun(img, cxf, cyf, rf, glow_col, disc_col, glow=(6.0, 4.2, 2.9, 1.9, 1.35)):
    w, h = img.size
    cx, cy, r = int(w*cxf), int(h*cyf), int(w*rf)
    g = Image.new('L', (w, h), 0); gd = ImageDraw.Draw(g)
    for i, m in enumerate(glow):
        gd.ellipse([cx-r*m, cy-r*m, cx+r*m, cy+r*m], fill=int(18+i*24))
    g = g.filter(ImageFilter.GaussianBlur(int(r*1.15)))
    img = Image.composite(Image.new('RGB', (w, h), glow_col), img, g)
    d0 = Image.new('L', (w, h), 0)
    ImageDraw.Draw(d0).ellipse([cx-r, cy-r, cx+r, cy+r], fill=255)
    d0 = d0.filter(ImageFilter.GaussianBlur(S*3))
    return Image.composite(Image.new('RGB', (w, h), disc_col), img, d0)

def lightpath(img, cxf, hf, col, width_f=0.10):
    w, h = img.size
    hy = int(h*hf); cx = int(w*cxf)
    layer = Image.new('L', (w, h), 0); d = ImageDraw.Draw(layer)
    rng = random.Random(4)
    y = hy
    while y < h:
        spread = width_f*w*(1 + 2.6*(y-hy)/max(1, h-hy))
        th = rng.uniform(h*0.004, h*0.011)
        a = int(120*(1 - (y-hy)/(h-hy))**1.2)
        d.ellipse([cx-spread/2, y-th, cx+spread/2, y+th], fill=max(0, a))
        y += int(h*0.016)
    layer = layer.filter(ImageFilter.GaussianBlur(int(h*0.006)))
    return Image.composite(Image.new('RGB', (w, h), col), img, layer)

def horizon_band(img, hf, col, amp=0.010, seed=3):
    w, h = img.size; hy = int(h*hf); rng = random.Random(seed)
    d = ImageDraw.Draw(img); pts = []; x = 0
    while x <= w:
        y = hy - abs(math.sin(x/w*math.pi*rng.uniform(1.1, 1.8)+seed))*h*amp
        pts.append((x, y)); x += w//48
    pts += [(w, hy+4), (0, hy+4)]
    d.polygon(pts, fill=col); return img

def birds(img, n, cxf, cyf, spread_f, col, scale):
    w, h = img.size
    d = ImageDraw.Draw(img); rng = random.Random(11)
    cx, cy, spread = w*cxf, h*cyf, w*spread_f
    for i in range(n):
        t = i/max(1, n-1)
        x = cx + (t-0.5)*spread + rng.uniform(-spread*0.04, spread*0.04)
        y = cy - t*spread*0.42 + rng.uniform(-spread*0.03, spread*0.03)
        s = scale*rng.uniform(0.65, 1.2)
        d.line([(x-s, y), (x-s*0.35, y-s*0.55), (x, y-s*0.10)], fill=col, width=max(1, int(s*0.20)))
        d.line([(x, y-s*0.10), (x+s*0.35, y-s*0.55), (x+s, y)], fill=col, width=max(1, int(s*0.20)))
    return img

# ---- optional photographic background -------------------------------------
BG_DIR = os.environ.get('HAMDAM_BG_DIR', '')
MOOD   = C.get('mood', '')
PHOTO  = None
if BG_DIR and MOOD:
    for ext in ('jpg', 'jpeg', 'png'):
        cand = os.path.join(BG_DIR, f'bg-{MOOD}.{ext}')
        if os.path.exists(cand):
            try:
                PHOTO = Image.open(cand).convert('RGB')
            except Exception:
                PHOTO = None
            break

def cover(img, tw, th):
    """Scale-and-crop to fill tw x th without distorting."""
    iw, ih = img.size
    sc = max(tw/iw, th/ih)
    nw, nh = int(iw*sc+0.5), int(ih*sc+0.5)
    im = img.resize((nw, nh), Image.LANCZOS)
    return im.crop(((nw-tw)//2, (nh-th)//2, (nw-tw)//2+tw, (nh-th)//2+th))

bg = vgrad(W, H, [(0, SKY_HI), (.26, SKY_MID), (.52, TEAL_M), (.78, hx('16282C')), (1, TEAL_D)])
bg = horizon_band(bg, 0.48, hx('16282C'), amp=0.012, seed=3)
bg = sun(bg, 0.68, 0.40, 0.075, GOLD, CREAM)
bg = lightpath(bg, 0.68, 0.48, hx('D8C79A'))
bg = mist(bg, 11, bands=8, strength=0.30)
bg = birds(bg, 9, 0.30, 0.30, 0.30, hx('20353A'), S*7)
bg = bg.filter(ImageFilter.GaussianBlur(S*5))
bg = Image.blend(bg, Image.new('RGB', (W, H), TEAL_D), 0.06)

if PHOTO is not None:
    bg = cover(PHOTO, W, H).filter(ImageFilter.GaussianBlur(S*14))
    bg = Image.blend(bg, Image.new('RGB', (W, H), (0, 0, 0)), 0.34)

FOUR = len(FA) == 4
IX = int(W*0.115)
IY = int(H*(0.185 if FOUR else 0.215))
IW = W - IX*2
IH = int(H*(0.610 if FOUR else 0.565))
FB = int(W*0.028)

inner = vgrad(IW, IH, [(0, hx('CFDCD4')), (.16, hx('EBD4A8')), (.32, GOLD),
                       (.44, AMBER), (.56, hx('9A7048')), (.74, hx('4A3A2A')), (1, hx('17140F'))])
inner = horizon_band(inner, 0.40, hx('6B5334'), amp=0.014, seed=5)
inner = sun(inner, 0.62, 0.29, 0.105, hx('FFE0A8'), hx('FFF6E4'))
inner = lightpath(inner, 0.62, 0.40, hx('F0D9A6'), width_f=0.09)
inner = mist(inner, 21, bands=6, strength=0.22)
inner = birds(inner, 8, 0.30, 0.22, 0.34, hx('7A5F3E'), S*6)
inner = inner.filter(ImageFilter.GaussianBlur(S*1.2))

if PHOTO is not None:
    inner = cover(PHOTO, IW, IH)
    inner = Image.blend(inner, Image.new('RGB', (IW, IH), (0, 0, 0)), 0.10)

sh = Image.new('L', (IW, IH), 0); sd = ImageDraw.Draw(sh)
knee = 0.30 if FOUR else 0.34
for i in range(IH):
    f = i/IH
    sd.line([(0, i), (IW, i)], fill=int(220*ease(max(0.0, (f-knee)/(1-knee)))))
inner = Image.composite(Image.new('RGB', (IW, IH), hx('0A0A07')), inner, sh)
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

def wrap_fa(draw, text, font, maxw):
    words, lines, cur = text.split(), [], ''
    for w_ in words:
        t = (cur+' '+w_).strip()
        if draw.textlength(t, font=font, direction='rtl', language='fa') <= maxw: cur = t
        else: lines.append(cur); cur = w_
    if cur: lines.append(cur)
    return lines

def wrap(draw, text, font, maxw):
    words, lines, cur = text.split(), [], ''
    for w_ in words:
        t = (cur+' '+w_).strip()
        if draw.textlength(t, font=font) <= maxw: cur = t
        else: lines.append(cur); cur = w_
    if cur: lines.append(cur)
    return lines

cx = IW//2
HEAD_Y = 0.470 if FOUR else 0.520
POET_Y = 0.950

if STAGE == 1 or 3 <= STAGE <= 4:
    hl = C['headline']
    hsz = 26 if FOUR else 30
    while hsz > 15:
        f_head = ImageFont.truetype(SS+'SourceSerif4-Bold.otf', S*hsz)
        if sum(d.textlength(ch, font=f_head) for ch in hl) + S*2.2*(len(hl)-1) <= IW*0.88:
            break
        hsz -= 1
    track(d, (cx, int(IH*HEAD_Y)), hl, f_head, CREAM, S*2.2)

def common_size():
    """One size shared by the Persian page and the English page."""
    sz = 40 if FOUR else 46
    while sz > 18:
        f_fa = ImageFont.truetype(FZ+'Vazirmatn-Light.ttf', S*sz)
        f_en = ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*sz)
        fa_ok = max(d.textlength(l, font=f_fa, direction='rtl', language='fa') for l in FA) <= IW*0.86
        en_lines = wrap(d, EN, f_en, IW*0.86)
        if fa_ok and len(en_lines) <= 6:
            return sz, f_fa, f_en, en_lines
        sz -= 2
    f_fa = ImageFont.truetype(FZ+'Vazirmatn-Light.ttf', S*18)
    f_en = ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*18)
    return 18, f_fa, f_en, wrap(d, EN, f_en, IW*0.86)

BLOCK_MID = 0.660 if FOUR else 0.700

if STAGE == 2:
    # The philological point. Second page, ~2 seconds in, because that is
    # the only part of the runtime most viewers actually see.
    inf, ine = C.get('insightFa',''), C.get('insightEn','')
    szf = 34
    while szf > 20:
        f_if = ImageFont.truetype(FZ+'Vazirmatn-Medium.ttf', S*szf)
        if len(wrap_fa(d, inf, f_if, IW*0.86)) <= 2: break
        szf -= 2
    fa_lines = wrap_fa(d, inf, f_if, IW*0.86)
    y = 0.500
    for i, l in enumerate(fa_lines[:2]):
        rtl(d, (cx, int(IH*(y + i*0.052))), l, f_if, hx('FBF6EA'))
    rule_y = y + len(fa_lines[:2])*0.052 + 0.018
    d.line([cx-IW*0.07, int(IH*rule_y), cx+IW*0.07, int(IH*rule_y)], fill=hx('9C8C6E'), width=S)
    sze = 27
    while sze > 18:
        f_ie = ImageFont.truetype(SS+'SourceSerif4-It.otf', S*sze)
        if len(wrap(d, ine, f_ie, IW*0.86)) <= 3: break
        sze -= 2
    en_lines = wrap(d, ine, f_ie, IW*0.86)[:3]
    ey = rule_y + 0.055
    for i, l in enumerate(en_lines):
        d.text((cx, int(IH*(ey + i*0.040))), l, font=f_ie, fill=hx('F0E8D4'), anchor='mm')

if STAGE == 3:
    sz, f_fa, _, _ = common_size()
    gap = (sz*1.75)/(IH/S)
    y0 = BLOCK_MID - (len(FA)-1)*gap/2
    for i, line in enumerate(FA):
        rtl(d, (cx, int(IH*(y0 + i*gap))), line, f_fa, hx('F8F2E4'))

if STAGE == 4:
    sz, _, f_en, en_lines = common_size()
    gap = (sz*1.60)/(IH/S)
    y0 = BLOCK_MID - (len(en_lines)-1)*gap/2
    for i, line in enumerate(en_lines):
        d.text((cx, int(IH*(y0 + i*gap))), line, font=f_en, fill=hx('F4EEDE'), anchor='mm')
    f_poet = ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*20)
    track(d, (cx, int(IH*POET_Y)), C.get('poetLineEn', C['poet']), f_poet, hx('C8BCA4'), S*4)

if STAGE == 5:
    lf, le = C.get('lessonFa',''), C.get('lessonEn','')
    sf, se = C.get('sendFa',''),   C.get('sendEn','')
    szl = 34
    while szl > 20:
        f_lf = ImageFont.truetype(FZ+'Vazirmatn-Medium.ttf', S*szl)
        if len(wrap_fa(d, lf, f_lf, IW*0.86)) <= 2: break
        szl -= 2
    for i, l in enumerate(wrap_fa(d, lf, f_lf, IW*0.86)[:2]):
        rtl(d, (cx, int(IH*(0.430 + i*0.050))), l, f_lf, hx('FBF6EA'))
    f_le = ImageFont.truetype(SS+'SourceSerif4-It.otf', S*26)
    for i, l in enumerate(wrap(d, le, f_le, IW*0.86)[:2]):
        d.text((cx, int(IH*(0.535 + i*0.038))), l, font=f_le, fill=hx('F0E8D4'), anchor='mm')
    d.line([cx-IW*0.07, int(IH*0.605), cx+IW*0.07, int(IH*0.605)], fill=hx('9C8C6E'), width=S)
    f_sf = ImageFont.truetype(FZ+'Vazirmatn-Regular.ttf', S*25)
    f_se = ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*22)
    rtl(d, (cx, int(IH*0.655)), sf, f_sf, hx('DCD0B8'))
    for i, l in enumerate(wrap(d, se, f_se, IW*0.86)[:1]):
        d.text((cx, int(IH*0.700)), l, font=f_se, fill=hx('CFC3AA'), anchor='mm')
    # The ask itself is in the persistent strip. This page carries the
    # schedule - the concrete reason to expect something tomorrow. Never
    # name the next poet: rotation and the Rumi tripwire can change it.
    rtl(d, (cx, int(IH*0.790)), '\u062f\u0648\u0634\u0646\u0628\u0647 \u00b7 \u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647 \u00b7 \u062c\u0645\u0639\u0647',
        ImageFont.truetype(FZ+'Vazirmatn-SemiBold.ttf', S*30), hx('FFF6E4'))
    d.text((cx, int(IH*0.840)), 'A new verse every Monday, Wednesday, Friday',
           font=ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*23),
           fill=hx('EFE4CC'), anchor='mm')

card_w = IW + FB*2
card_h = IH + FB*2 + int(H*0.070)
card = Image.new('RGB', (card_w, card_h), FRAME_BR)
card.paste(vgrad(card_w, card_h, [(0, hx('4A3A28')), (1, hx('2C2118'))]), (0, 0))
card.paste(inner, (FB, FB))
cd = ImageDraw.Draw(card)
cd.rectangle([FB-S, FB-S, FB+IW+S-1, FB+IH+S-1], outline=hx('1A140E'), width=S)

# Persistent follow strip, present on every page. Average watch is 5.6s of a
# 14s reel, so page 5 is never reached by most viewers - the ask AND the
# reason to act on it both have to live here, visible from second one.
# Instagram already shows the handle above the reel, so repeating it wastes
# the space that the reason needs.
f_ff = ImageFont.truetype(FZ+'Vazirmatn-Medium.ttf', S*23)
_line = '\u062f\u0646\u0628\u0627\u0644 \u06a9\u0646\u06cc\u062f  \u00b7  \u0647\u0631 \u0631\u0648\u0632 \u06cc\u06a9 \u0628\u06cc\u062a'
_fy = FB + IH + int(H*0.024)
cd.text((card_w//2, _fy), _line, font=f_ff, fill=hx('F2E8D2'), anchor='mm',
        direction='rtl', language='fa', features=['kern', 'liga'])
cd.text((card_w//2, _fy + int(H*0.026)), 'Follow for a verse a day',
        font=ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*20),
        fill=hx('C9BCA2'), anchor='mm')

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
