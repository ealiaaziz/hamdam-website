#!/usr/bin/env python3
"""Build the fal renderer from the committed reel renderer.

    python3 make_fal_render.py <verseId>   # writes fal_render.py beside it
    python3 fal_render.py <verseId> <1..6> <outDir>

The fal is a different object from a verse reel: it asks the viewer to do
something before it shows them anything. Pages:

  1  Make your intention        \u0646\u06cc\u062a \u06a9\u0646
  2  Hold one question          \u06cc\u06a9 \u0633\u0624\u0627\u0644 \u062f\u0631 \u062f\u0644 \u0646\u06af\u0647 \u062f\u0627\u0631
  3  the held beat              nothing on screen - three seconds
  4  the verse                  under a small 'today's fal from Hamdam'
  5  the English
  6  the app                    \u063a\u0632\u0644 \u06a9\u0627\u0645\u0644 \u0631\u0627 \u062f\u0631 \u0647\u0645\u062f\u0645 \u0628\u062e\u0648\u0627\u0646

Page 3 is the point of the format. Average watch is under 4 seconds, so a
three second pause is a real risk - but it is the only reel that asks the
viewer to DO something, and that is what might produce the profile visits
nothing else has. Verification must NOT fail stage 3 for having no text.

WHERE THE VERSE COMES FROM. A fal verse lives in fal-pool.json, keyed by its
own id. verse-queue.json is only a fallback, for legacy ids such as hafez-032.
On 10 September 2026 this script generated a queue-only lookup, none of the
twelve pooled verses existed in the queue, and the Thursday prep run died with
StopIteration - no fal was prepared and Friday had nothing to publish. Fixed by
replacing the whole EXTERNAL if/else block rather than pattern-matching one
line inside it.

Runtime is 17s, not 14: page starts 0.0, 2.2, 4.4, 7.4, 11.4, 14.4.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'hamdam_reel_render.py')
OUT  = os.path.join(HERE, 'fal_render.py')

# The written English for the fal verse. Keep one entry per fal verse used.
EN_OVERRIDE = {
    # Every fal verse needs its written English here before it can render - page 5
    # would otherwise come out empty, and the check below stops the run. One entry
    # per verse in fal-pool.json, written as English rather than glossed.
    'hafez-032': "If you can hold Noah's patience through the grief of the flood, "
                 "the calamity passes - and a wish a thousand years old comes true.",

    # Ghazal 255 - the gham makhor ghazal, the one families draw when someone is worried.
    'hafez-sh255-b2': "Grieving heart, this will get better. Don't lose heart. "
                      "This restless head will find its order again. Don't grieve.",
    'hafez-sh255-b4': "If the world turned against us for a day or two - it is never "
                      "permanently one way. Don't grieve.",
    'hafez-sh255-b5': "Don't lose hope. You aren't told what is hidden. There may be "
                      "games being played behind the curtain. Don't grieve.",
    'hafez-sh255-b8': "The road is dangerous and the destination far. But there is no "
                      "road that has no end. Don't grieve.",

    'hafez-sh164-b1': "The morning wind is about to carry musk. The old world is about "
                      "to be young again.",
    'hafez-sh174-b1': "Good news, heart - the morning wind is back, and the hoopoe has "
                      "returned from Sheba with word.",
    'hafez-sh232-b1': "I have it in mind that if it is in my power at all, I will set my "
                      "hand to something that ends the sorrow.",
    'hafez-sh231-b1': "I said: I carry sorrow for you. It said: your sorrow will end. "
                      "I said: be my moon. It said: if it comes to pass.",
    'hafez-sh235-b1': "What a blessed hour, when the friend comes back - when the one who "
                      "eases sorrow returns to the people carrying it.",
    'hafez-sh236-b2': "On these tears like rain I keep one hope: that the lightning of "
                      "fortune, which went out of my sight, comes back.",
    'hafez-sh407-b2': "I said: fortune, you slept, and the sun is already up. It said: "
                      "for all that, don't despair of what came before.",
    'hafez-sh439-b2': "The reading came out - the one who travelled is on the way. "
                      "If only they would come through the door sooner.",
}

LOOKUP = """# A fal verse lives in fal-pool.json, keyed by its own id. Fall back to
# verse-queue.json only for legacy ids such as hafez-032. Persian is copied
# byte-exact from whichever file holds it, and is never typed.
_pool = []
_pp = f'{BASE}/fal-pool.json'
if os.path.exists(_pp):
    _pool = json.load(open(_pp)).get('verses', [])
_hit = next((v for v in _pool if v['id'] == CONCEPT_ID), None)
if _hit is not None:
    V = {'persian': _hit['persian'], 'english': ''}
else:
    V = next(v for v in json.load(open(f'{BASE}/verse-queue.json')) if v['id'] == CONCEPT_ID)"""

src  = open(SRC).read()
head = src[:src.index('cx = IW//2')]
tail = src[src.index('card_w = IW + FB*2'):]

pages = '''cx = IW//2

FA_INTENT = '\\u0646\\u06cc\\u062a \\u06a9\\u0646'
FA_HOLD   = '\\u06cc\\u06a9 \\u0633\\u0624\\u0627\\u0644 \\u062f\\u0631 \\u062f\\u0644 \\u0646\\u06af\\u0647 \\u062f\\u0627\\u0631'
FA_TODAY  = '\\u0641\\u0627\\u0644 \\u0627\\u0645\\u0631\\u0648\\u0632\\u0650 \\u0647\\u0645\\u062f\\u0645'
FA_WHOLE  = '\\u063a\\u0632\\u0644 \\u06a9\\u0627\\u0645\\u0644 \\u0631\\u0627 \\u062f\\u0631 \\u0647\\u0645\\u062f\\u0645 \\u0628\\u062e\\u0648\\u0627\\u0646'

if STAGE == 1:
    rtl(d, (cx, int(IH*0.560)), FA_INTENT,
        ImageFont.truetype(FZ+'Vazirmatn-SemiBold.ttf', S*76), hx('FBF6EA'))
    d.text((cx, int(IH*0.652)), 'Make your intention',
           font=ImageFont.truetype(SS+'SourceSerif4-Regular.otf', S*30),
           fill=hx('EFE6D2'), anchor='mm')

if STAGE == 2:
    rtl(d, (cx, int(IH*0.545)), FA_HOLD,
        ImageFont.truetype(FZ+'Vazirmatn-Medium.ttf', S*46), hx('FBF6EA'))
    d.text((cx, int(IH*0.637)), 'Hold one question in your heart',
           font=ImageFont.truetype(SS+'SourceSerif4-Regular.otf', S*28),
           fill=hx('EFE6D2'), anchor='mm')

if STAGE == 3:
    pass  # the held beat - nothing but the field. Do not fail verification on this.

if STAGE == 4:
    rtl(d, (cx, int(IH*0.395)), FA_TODAY,
        ImageFont.truetype(FZ+'Vazirmatn-Regular.ttf', S*24), hx('D8C8A8'))
    sz = 42
    while sz > 20:
        f_fa = ImageFont.truetype(FZ+'Vazirmatn-Light.ttf', S*sz)
        if max(d.textlength(l, font=f_fa, direction='rtl', language='fa') for l in FA) <= IW*0.88:
            break
        sz -= 2
    gap = (sz*1.85)/(IH/S)
    y0 = 0.640 - (len(FA)-1)*gap/2
    for i, line in enumerate(FA):
        rtl(d, (cx, int(IH*(y0 + i*gap))), line, f_fa, hx('F8F2E4'))

if STAGE == 5:
    f_en = ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*36)
    lines = wrap(d, EN, f_en, IW*0.86)
    gap = (36*1.55)/(IH/S)
    y0 = 0.620 - (len(lines)-1)*gap/2
    for i, l in enumerate(lines):
        d.text((cx, int(IH*(y0 + i*gap))), l, font=f_en, fill=hx('FDFAF2'), anchor='mm')
    track(d, (cx, int(IH*0.950)), 'Hafez \\u2014 Shiraz, 14th century',
          ImageFont.truetype(SS+'SourceSerif4-Light.otf', S*20), hx('E4DAC4'), S*4)

if STAGE == 6:
    rtl(d, (cx, int(IH*0.505)), FA_TODAY,
        ImageFont.truetype(FZ+'Vazirmatn-SemiBold.ttf', S*44), hx('FFF6E4'))
    d.text((cx, int(IH*0.577)), "Today's fal from Hamdam",
           font=ImageFont.truetype(SS+'SourceSerif4-Regular.otf', S*26),
           fill=hx('EFE6D2'), anchor='mm')
    d.line([cx-IW*0.08, int(IH*0.637), cx+IW*0.08, int(IH*0.637)], fill=hx('9C8C6E'), width=S)
    rtl(d, (cx, int(IH*0.702)), FA_WHOLE,
        ImageFont.truetype(FZ+'Vazirmatn-Medium.ttf', S*34), hx('FBF4E4'))
    d.text((cx, int(IH*0.767)), 'Read the whole ghazal in the app',
           font=ImageFont.truetype(SS+'SourceSerif4-Regular.otf', S*25),
           fill=hx('E8DCC4'), anchor='mm')

'''

s = head + pages + tail
s = s.replace("NSTAGES = 6", "NSTAGES = 7")
s = s.replace(
    "concepts = json.load(open(f'{BASE}/reel-concepts.json'))['concepts']\n"
    "C = next(c for c in concepts if c['id'] == CONCEPT_ID)",
    "C = {'mood': 'grave'}")
# Replace the WHOLE EXTERNAL if/else block from the source renderer with the fal
# lookup. Matching only the inner line leaves the replacement indented under
# `else:` and the generated script will not parse - that was the 10 Sep failure.
_a = s.index("# Concepts sourced from Ganjoor")
_b = s.index("FA = [l.strip()")
s = s[:_a] + LOOKUP + "\n" + s[_b:]

en = EN_OVERRIDE.get(sys.argv[1] if len(sys.argv) > 1 else 'hafez-032', '')
if not en:
    raise SystemExit(f"no EN_OVERRIDE for {sys.argv[1] if len(sys.argv) > 1 else '?'} - "
                     "page 5 would render empty. Write the English first.")
s = re.sub(r"EN = .*", 'EN = ' + repr(en), s, count=1)

open(OUT, 'w').write(s)
print(OUT)
