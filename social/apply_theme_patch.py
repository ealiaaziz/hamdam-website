#!/usr/bin/env python3
"""Patch a fetched copy of hamdam_reel_render.py to read templates.

Same discipline the carousel task already uses on hamdam_render.py: patch the
fetched copy in place, and if any target string is not found, stop rather than
render something that was never reviewed. A missing target means the repo's
renderer has changed and the patch's assumptions no longer hold.

    python3 apply_theme_patch.py hamdam_reel_render.py hamdam_reel_render_themed.py

Rendering change only. No verse text, no wrapping, no font sizes are touched.
"""
import sys, re

SRC, DST = sys.argv[1], sys.argv[2]
s = open(SRC).read()
applied = []


def sub(tag, old, new):
    global s
    if old not in s:
        raise SystemExit(
            f'apply_theme_patch: target {tag!r} not found. The repo renderer '
            f'has changed. Refusing to patch.')
    if s.count(old) != 1:
        raise SystemExit(f'apply_theme_patch: target {tag!r} is not unique.')
    s = s.replace(old, new)
    applied.append(tag)


# 1. mist() gains a colour argument so a template can pick its own haze.
sub('mist-signature',
    "def mist(img, seed, bands=7, strength=0.30):",
    "def mist(img, seed, bands=7, strength=0.30, colour=None):")
sub('mist-body',
    "    return Image.composite(Image.new('RGB', (w, h), HAZE), img,\n"
    "                           layer.point(lambda p: int(p*strength)))",
    "    return Image.composite(Image.new('RGB', (w, h), colour or HAZE), img,\n"
    "                           layer.point(lambda p: int(p*strength)))")

# 2. Load the template right after the concept is resolved.
sub('theme-load',
    "S = 2\nW, H = 1080 * S, 1920 * S",
    "import hamdam_theme\nTHEME = hamdam_theme.load(C.get('mood', ''), BASE)\n"
    "sys.stderr.write(f\"theme: {THEME['id']} for mood {C.get('mood','')!r}\\n\")\n\n"
    "S = 2\nW, H = 1080 * S, 1920 * S")

# 3. Exterior backdrop from the template.
sub('exterior',
    """bg = vgrad(W, H, [(0, SKY_HI), (.26, SKY_MID), (.52, TEAL_M), (.78, hx('16282C')), (1, TEAL_D)])
bg = horizon_band(bg, 0.48, hx('16282C'), amp=0.012, seed=3)
bg = sun(bg, 0.68, 0.40, 0.075, GOLD, CREAM)
bg = lightpath(bg, 0.68, 0.48, hx('D8C79A'))
bg = mist(bg, 11, bands=8, strength=0.30)
bg = birds(bg, 9, 0.30, 0.30, 0.30, hx('20353A'), S*7)
bg = bg.filter(ImageFilter.GaussianBlur(S*5))
bg = Image.blend(bg, Image.new('RGB', (W, H), TEAL_D), 0.06)""",
    """OPS = dict(vgrad=vgrad, horizon_band=horizon_band, sun=sun,
           lightpath=lightpath, mist=mist, birds=birds,
           blur=lambda im, r: im.filter(ImageFilter.GaussianBlur(r)),
           blend=lambda im, c, a: Image.blend(im, Image.new('RGB', im.size, c), a))
bg = hamdam_theme.paint(THEME, 'exterior', W, H, OPS, S)""")

# 4. Interior print from the template.
sub('interior',
    """inner = vgrad(IW, IH, [(0, hx('CFDCD4')), (.16, hx('EBD4A8')), (.32, GOLD),
                       (.44, AMBER), (.56, hx('9A7048')), (.74, hx('4A3A2A')), (1, hx('17140F'))])
inner = horizon_band(inner, 0.40, hx('6B5334'), amp=0.014, seed=5)
inner = sun(inner, 0.62, 0.29, 0.105, hx('FFE0A8'), hx('FFF6E4'))
inner = lightpath(inner, 0.62, 0.40, hx('F0D9A6'), width_f=0.09)
inner = mist(inner, 21, bands=6, strength=0.22)
inner = birds(inner, 8, 0.30, 0.22, 0.34, hx('7A5F3E'), S*6)
inner = inner.filter(ImageFilter.GaussianBlur(S*1.2))""",
    "inner = hamdam_theme.paint(THEME, 'interior', IW, IH, OPS, S)")

# 5. Interior scrim.
sub('scrim',
    "    sd.line([(0, i), (IW, i)], fill=int(220*ease(max(0.0, (f-knee)/(1-knee)))))\n"
    "inner = Image.composite(Image.new('RGB', (IW, IH), hx('0A0A07')), inner, sh)",
    "    sd.line([(0, i), (IW, i)], fill=int(_SCRIM_PEAK*ease(max(0.0, (f-knee)/(1-knee)))))\n"
    "inner = Image.composite(Image.new('RGB', (IW, IH), _SCRIM_COL), inner, sh)")
sub('scrim-vars',
    "sh = Image.new('L', (IW, IH), 0); sd = ImageDraw.Draw(sh)",
    "_SCRIM_COL, _SCRIM_PEAK = hamdam_theme.scrim(THEME)\n"
    "sh = Image.new('L', (IW, IH), 0); sd = ImageDraw.Draw(sh)")

# 6. Ink colours. Each is a literal in exactly one place.
INK = [
    ('ink-headline', "track(d, (cx, int(IH*HEAD_Y)), hl, f_head, CREAM, S*2.2)",
     "track(d, (cx, int(IH*HEAD_Y)), hl, f_head, hamdam_theme.ink(THEME,'headline'), S*2.2)"),
    ('ink-persian', "rtl(d, (cx, int(IH*(y0 + i*gap))), line, f_fa, hx('F8F2E4'))",
     "rtl(d, (cx, int(IH*(y0 + i*gap))), line, f_fa, hamdam_theme.ink(THEME,'persian'))"),
    ('ink-english', "d.text((cx, int(IH*(y0 + i*gap))), line, font=f_en, fill=hx('F4EEDE'), anchor='mm')",
     "d.text((cx, int(IH*(y0 + i*gap))), line, font=f_en, fill=hamdam_theme.ink(THEME,'english'), anchor='mm')"),
    ('ink-poet', "track(d, (cx, int(IH*POET_Y)), C.get('poetLineEn', C['poet']), f_poet, hx('C8BCA4'), S*4)",
     "track(d, (cx, int(IH*POET_Y)), C.get('poetLineEn', C['poet']), f_poet, hamdam_theme.ink(THEME,'poet'), S*4)"),
    ('ink-insight-fa', "rtl(d, (cx, int(IH*(y + i*0.052))), l, f_if, hx('FBF6EA'))",
     "rtl(d, (cx, int(IH*(y + i*0.052))), l, f_if, hamdam_theme.ink(THEME,'insight_fa'))"),
    ('ink-rule-1', "d.line([cx-IW*0.07, int(IH*rule_y), cx+IW*0.07, int(IH*rule_y)], fill=hx('9C8C6E'), width=S)",
     "d.line([cx-IW*0.07, int(IH*rule_y), cx+IW*0.07, int(IH*rule_y)], fill=hamdam_theme.ink(THEME,'rule'), width=S)"),
    ('ink-insight-en', "d.text((cx, int(IH*(ey + i*0.040))), l, font=f_ie, fill=hx('F0E8D4'), anchor='mm')",
     "d.text((cx, int(IH*(ey + i*0.040))), l, font=f_ie, fill=hamdam_theme.ink(THEME,'insight_en'), anchor='mm')"),
    ('ink-lesson-fa', "rtl(d, (cx, int(IH*0.520)), lf, f_lf, hx('FBF6EA'))",
     "rtl(d, (cx, int(IH*0.520)), lf, f_lf, hamdam_theme.ink(THEME,'lesson_fa'))"),
    ('ink-send-fa', "rtl(d, (cx, int(IH*0.583)), sf, f_sf, hx('DCD0B8'))",
     "rtl(d, (cx, int(IH*0.583)), sf, f_sf, hamdam_theme.ink(THEME,'send'))"),
    ('ink-rule-2', "d.line([cx-IW*0.07, int(IH*0.635), cx+IW*0.07, int(IH*0.635)], fill=hx('9C8C6E'), width=S)",
     "d.line([cx-IW*0.07, int(IH*0.635), cx+IW*0.07, int(IH*0.635)], fill=hamdam_theme.ink(THEME,'rule'), width=S)"),
    ('ink-lesson-en', "d.text((cx, int(IH*(0.690 + i*0.042))), l, font=f_le, fill=hx('F4EEDE'), anchor='mm')",
     "d.text((cx, int(IH*(0.690 + i*0.042))), l, font=f_le, fill=hamdam_theme.ink(THEME,'lesson_en'), anchor='mm')"),
    ('ink-send-en', "d.text((cx, int(IH*(0.775 + i*0.036))), l, font=f_se, fill=hx('DCD0B8'), anchor='mm')",
     "d.text((cx, int(IH*(0.775 + i*0.036))), l, font=f_se, fill=hamdam_theme.ink(THEME,'send'), anchor='mm')"),
    ('ink-wordmark', "ImageFont.truetype(FZ+'Vazirmatn-SemiBold.ttf', S*34), hx('EFE6D2'))",
     "ImageFont.truetype(FZ+'Vazirmatn-SemiBold.ttf', S*34), hamdam_theme.ink(THEME,'wordmark'))"),
]
for tag, old, new in INK:
    sub(tag, old, new)

# 7. Frame and handle.
sub('frame',
    """card = Image.new('RGB', (card_w, card_h), FRAME_BR)
card.paste(vgrad(card_w, card_h, [(0, hx('4A3A28')), (1, hx('2C2118'))]), (0, 0))""",
    """_FG, _BEVEL, _HANDLE = hamdam_theme.frame_colours(THEME)
card = Image.new('RGB', (card_w, card_h), _FG[-1][1])
card.paste(vgrad(card_w, card_h, _FG), (0, 0))""")
sub('bevel',
    "cd.rectangle([FB-S, FB-S, FB+IW+S-1, FB+IH+S-1], outline=hx('1A140E'), width=S)",
    "cd.rectangle([FB-S, FB-S, FB+IW+S-1, FB+IH+S-1], outline=_BEVEL, width=S)")
sub('handle',
    "        fill=hx('D6C9B0'), anchor='mm')",
    "        fill=_HANDLE, anchor='mm')")

# 8. Output filename carries the template, so a proof sheet is self-describing.
sub('outname',
    "out = f'{OUTDIR}/{CONCEPT_ID}-stage{STAGE}.jpg'",
    "out = f'{OUTDIR}/{CONCEPT_ID}-{THEME[\"id\"]}-stage{STAGE}.jpg'")

open(DST, 'w').write(s)
sys.stderr.write(f'apply_theme_patch: {len(applied)} targets patched -> {DST}\n')
