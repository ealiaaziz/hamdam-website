#!/usr/bin/env python3
"""Build the fal renderer from the committed reel renderer.

    python3 make_fal_render.py            # writes fal_render.py beside it
    python3 fal_render.py <verseId> <1..6> <outDir>

The fal is a different object from a verse reel: it asks the viewer to do
something before it shows them anything. Pages:

  1  Make your intention        نیت کن
  2  Hold one question          یک سؤال در دل نگه دار
  3  the held beat              nothing on screen - three seconds
  4  the verse                  under a small 'today's fal from Hamdam'
  5  the English
  6  the app                    غزل کامل را در همدم بخوان

Page 3 is the point of the format. Average watch is under 4 seconds, so a
three second pause is a real risk - but it is the only reel that asks the
viewer to DO something, and that is what might produce the profile visits
nothing else has.

The fal takes its verse straight from verse-queue.json by id; there is no
concept entry. Persian is byte-exact from the queue as always. The English
is passed in as EN_OVERRIDE because a fal wants written English, not a gloss.

Runtime is 17s, not 14: page starts 0.0, 2.2, 4.4, 7.4, 11.4, 14.4.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, 'hamdam_reel_render.py')
OUT  = os.path.join(HERE, 'fal_render.py')

# The written English for the fal verse. Keep one entry per fal verse used.
EN_OVERRIDE = {
    'hafez-032': "If you can hold Noah's patience through the grief of the flood, "
                 "the calamity passes - and a wish a thousand years old comes true.",
}

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
    pass  # the held beat - nothing but the field

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
s = s.replace(
    "V = next(v for v in json.load(open(f'{BASE}/verse-queue.json')) if v['id'] == C['verseId'])",
    "V = next(v for v in json.load(open(f'{BASE}/verse-queue.json')) if v['id'] == CONCEPT_ID)")
en = EN_OVERRIDE.get(sys.argv[1] if len(sys.argv) > 1 else 'hafez-032', '')
s = re.sub(r"EN = .*", 'EN = ' + repr(en), s, count=1)

open(OUT, 'w').write(s)
print(OUT)
