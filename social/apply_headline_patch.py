#!/usr/bin/env python3
"""Make the reel headline language-match the page it sits on.

The concept schema pairs every editorial field across both languages -
insightFa/insightEn, lessonFa/lessonEn, sendFa/sendEn, poetLineFa/poetLineEn -
with exactly one exception: `headline`, which is English only. Because the
renderer persists the headline across stages 1 to 3, an English hook sits
above the Persian verse on stage 2.

This patch:
  stage 1  headlineFa if present, else the English headline
  stage 2  headlineFa if present, else no headline at all
  stage 3  the English headline, above the English translation

The fallback is deliberately asymmetric. On the Persian page, showing nothing
is better than showing English: a missing headline reads as a design choice,
an English one reads as an account that does not think in Persian.

    python3 apply_headline_patch.py in.py out.py

Rendering and layout only. Persian is read from the concept file byte-exact
and never composed here.
"""
import sys

SRC, DST = sys.argv[1], sys.argv[2]
s = open(SRC).read()


def sub(tag, old, new):
    global s
    if old not in s:
        raise SystemExit(f'apply_headline_patch: target {tag!r} not found. Refusing to patch.')
    if s.count(old) != 1:
        raise SystemExit(f'apply_headline_patch: target {tag!r} is not unique.')
    s = s.replace(old, new)


OLD = """if 1 <= STAGE <= 3:
    hl = C['headline']
    hsz = 26 if FOUR else 30
    while hsz > 15:
        f_head = ImageFont.truetype(SS+'SourceSerif4-Bold.otf', S*hsz)
        if sum(d.textlength(ch, font=f_head) for ch in hl) + S*2.2*(len(hl)-1) <= IW*0.88:
            break
        hsz -= 1
    track(d, (cx, int(IH*HEAD_Y)), hl, f_head, hamdam_theme.ink(THEME,'headline'), S*2.2)"""

NEW = """HL_EN = C['headline']

# headlineFa lives in its own file, not in reel-concepts.json. That file holds
# 12 KB of validated Persian; rewriting it to add one field per concept means
# rewriting all of it, and the one rule with no exceptions is that validated
# Persian is never rewritten. Merging at read time touches nothing.
HL_FA = (C.get('headlineFa') or '').strip()
if not HL_FA:
    try:
        HL_FA = json.load(open(f'{BASE}/headlines-fa.json'))['headlines'].get(
            CONCEPT_ID, '').strip()
    except (OSError, KeyError, ValueError):
        HL_FA = ''

def _draw_headline_en(hl):
    hsz = 26 if FOUR else 30
    while hsz > 15:
        f_head = ImageFont.truetype(SS+'SourceSerif4-Bold.otf', S*hsz)
        if sum(d.textlength(ch, font=f_head) for ch in hl) + S*2.2*(len(hl)-1) <= IW*0.88:
            break
        hsz -= 1
    track(d, (cx, int(IH*HEAD_Y)), hl, f_head, hamdam_theme.ink(THEME,'headline'), S*2.2)

def _draw_headline_fa(hl):
    # No letter-tracking: Persian is cursive and tracking breaks the joins.
    hsz = 30 if FOUR else 34
    while hsz > 17:
        f_head = ImageFont.truetype(FZ+'Vazirmatn-SemiBold.ttf', S*hsz)
        if d.textlength(hl, font=f_head, direction='rtl', language='fa') <= IW*0.88:
            break
        hsz -= 1
    rtl(d, (cx, int(IH*HEAD_Y)), hl, f_head, hamdam_theme.ink(THEME,'headline'))

if STAGE == 1:
    if HL_FA:
        _draw_headline_fa(HL_FA)
    else:
        sys.stderr.write('headline: no headlineFa, stage 1 falls back to English\\n')
        _draw_headline_en(HL_EN)
elif STAGE == 2:
    if HL_FA:
        _draw_headline_fa(HL_FA)
    else:
        sys.stderr.write('headline: no headlineFa, stage 2 omits the headline\\n')
elif STAGE == 3:
    _draw_headline_en(HL_EN)"""

sub('headline-block', OLD, NEW)
open(DST, 'w').write(s)
sys.stderr.write('apply_headline_patch: 1 target patched -> %s\n' % DST)
