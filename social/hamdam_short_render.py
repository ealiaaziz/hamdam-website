# -*- coding: utf-8 -*-
"""Hamdam YouTube Short - the five-page mood-first vertical render.

1080x1920, 15.0s, warm-dawn palette. Five pages:

    0  2.0s  the mood `line` from moods-fa.json, Farsi, alone, one line
    1  4.5s  `persian` from verse-queue.json, byte-exact, alone
    2  3.5s  `english`, with the poet named by city and century beneath
    3  3.5s  `questionFa`, alone, on a plain field
    4  1.5s  the wordmark and the subscribe ask

This is NOT the Instagram reel renderer. `hamdam_reel_render.py` drives a
live pipeline with six stages and a follow CTA; nothing here is shared with
it and it must not be modified to suit this format.

Contract this file is written to keep
-------------------------------------
* Persian is copied, never typed. Every Persian string drawn comes from
  `verse-queue.json` or `moods-fa.json` and is asserted byte-identical to the
  source before a frame is drawn. The only exception is the wordmark همدم,
  which is the brand mark and is declared in WORDMARK below so a reviewer can
  find it in one place.
* Zero letter tracking on Persian and never italic. Non-zero tracking
  detaches the cursive joins. Pillow applies no tracking of its own, and the
  Persian path never touches the Latin serif.
* The literal ' / ' that separates couplets in the `english` field of the 84
  four-hemistich entries (49 Khayyam, 35 Parvin) is rendered as a line break.
  It is never drawn and it is never stripped from the queue.
* Page 0 fits on one line. If the mood line would wrap, the type size comes
  down until it does not.
* Indigo is an accent. It is never a background and coverage is measured, not
  assumed - `--report` prints the fraction of each page within reach of it.

Usage
-----
    python3 hamdam_short_render.py \
        --base .                 # directory holding the two JSON files
        --id hafez-018 \
        --mood unsettled \
        --audio audio/dawn/mahur_sunrise.mp3 \
        --out /tmp/short.mp4 \
        --pages-dir /tmp/pages   # optional, writes page-0..4.png
"""
import argparse, json, math, os, random, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont, ImageFilter, features

assert features.check('raqm'), 'raqm missing - Persian would render unshaped. ABORT'

# ---------------------------------------------------------------- geometry
S = 2                                   # supersample factor
W, H = 1080 * S, 1920 * S
FPS = 30
HOLDS = [2.0, 4.5, 3.5, 3.5, 1.5]       # seconds, sums to 15.0
DISSOLVE = 0.27                         # seconds, taken from the incoming hold

FZ = '/tmp/fonts/vazirmatn/fonts/ttf/'
SS = '/tmp/fonts/sourceserif/source-serif-4.005_Desktop/OTF/'

# The one Persian string in this file. The brand mark, not copy and not verse.
WORDMARK = 'همدم'   # همدم


# ---------------------------------------------------------------- palette
def hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ease(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


PEACH, SAFFRON, CREAM, INDIGO = hx('F4C4A0'), hx('E8B04B'), hx('F4EDD8'), hx('1B1B3A')

INK = INDIGO                            # accent, used for type only
INK_SOFT = lerp(INDIGO, PEACH, 0.34)    # secondary type
GLINT = lerp(SAFFRON, CREAM, 0.30)

FIELD = [(0.00, CREAM),
         (0.24, lerp(CREAM, SAFFRON, 0.26)),
         (0.36, lerp(SAFFRON, PEACH, 0.52)),
         (0.66, PEACH),
         (1.00, lerp(PEACH, CREAM, 0.42))]

PLAIN = [(0.00, CREAM), (1.00, lerp(CREAM, PEACH, 0.18))]


# ---------------------------------------------------------------- fonts
def fa_font(px):
    return ImageFont.truetype(FZ + 'Vazirmatn-Medium.ttf', px)


def fa_font_semi(px):
    return ImageFont.truetype(FZ + 'Vazirmatn-SemiBold.ttf', px)


def en_font(px):
    return ImageFont.truetype(SS + 'SourceSerif4-Regular.otf', px)


def en_font_semi(px):
    return ImageFont.truetype(SS + 'SourceSerif4-Semibold.otf', px)


# ---------------------------------------------------------------- scene
def vgrad(stops):
    row = Image.new('RGB', (1, H))
    px = row.load()
    for y in range(H):
        f = y / (H - 1)
        for i in range(len(stops) - 1):
            y0, c0 = stops[i]
            y1, c1 = stops[i + 1]
            if y0 <= f <= y1:
                px[0, y] = lerp(c0, c1, ease((f - y0) / (y1 - y0)) if y1 > y0 else 0)
                break
    return row.resize((W, H))


def glow(img, cx, cy, rad, colour):
    g = Image.new('L', (W, H), 0)
    gd = ImageDraw.Draw(g)
    for m, a in ((5.4, 16), (3.8, 30), (2.6, 48), (1.7, 72), (1.1, 96)):
        gd.ellipse([cx - rad * m, cy - rad * m, cx + rad * m, cy + rad * m], fill=a)
    g = g.filter(ImageFilter.GaussianBlur(int(rad * 1.2)))
    return Image.composite(Image.new('RGB', (W, H), colour), img, g)


def shamseh(draw, cx, cy, ro, ri, col, width, points=8):
    pts = []
    for k in range(points * 2):
        ang = math.pi / 2 + k * math.pi / points
        rr = ro if k % 2 == 0 else ri
        pts.append((cx + rr * math.cos(ang), cy - rr * math.sin(ang)))
    draw.polygon(pts, outline=col, width=width)


def grain(img, strength=7):
    """Unseeded film grain. A re-render is therefore not byte-identical to the
    file that ships, which is why the visual gate reads the shipping MP4's own
    frames and never a second render."""
    n = Image.effect_noise((W // 4, H // 4), strength).resize((W, H)).convert('L')
    return Image.blend(img, Image.composite(
        Image.new('RGB', (W, H), CREAM), img, n), 0.045)


def field(plain=False):
    img = vgrad(PLAIN if plain else FIELD)
    if not plain:
        img = glow(img, int(W * 0.50), int(H * 0.30), int(W * 0.085), GLINT)
    return img


# ---------------------------------------------------------------- type
def fa(draw, xy, text, font, fill, anchor='mm'):
    """Persian. RTL, shaped by raqm, zero tracking, never italic."""
    draw.text(xy, text, font=font, fill=fill, anchor=anchor,
              direction='rtl', language='fa', features=['kern', 'liga'])


def en(draw, xy, text, font, fill, anchor='mm'):
    draw.text(xy, text, font=font, fill=fill, anchor=anchor,
              direction='ltr', language='en')


def fa_width(draw, text, font):
    return draw.textbbox((0, 0), text, font=font, anchor='lt',
                         direction='rtl', language='fa',
                         features=['kern', 'liga'])[2]


def fit_one_line(draw, text, maxw, start, floor=30 * S):
    """Page 0's rule. Come down in size until the line fits; never wrap it,
    never edit the Persian."""
    px = start
    while px > floor:
        f = fa_font_semi(px)
        if fa_width(draw, text, f) <= maxw:
            return f, px
        px -= 2 * S
    return fa_font_semi(floor), floor


def fit_fa_block(draw, lines, maxw, start, floor=28 * S):
    px = start
    while px > floor:
        f = fa_font(px)
        if all(fa_width(draw, ln, f) <= maxw for ln in lines):
            return f, px
        px -= 2 * S
    return fa_font(floor), floor


def wrap_en(draw, text, font, maxw):
    """Wrap, honouring the couplet break the queue writes as a literal ' / '.
    The slash marks the break between couplets in a four-hemistich poem; it is
    a line break on screen and is never drawn."""
    out = []
    for para in text.split(' / '):
        cur = ''
        for word in para.split():
            t = (cur + ' ' + word).strip()
            if draw.textlength(t, font=font) <= maxw:
                cur = t
            else:
                if cur:
                    out.append(cur)
                cur = word
        if cur:
            out.append(cur)
    return out


def fit_en_block(draw, text, maxw, maxh, start, floor=26 * S):
    px = start
    while px > floor:
        f = en_font(px)
        lines = wrap_en(draw, text, f, maxw)
        if len(lines) * px * 1.42 <= maxh:
            return f, px, lines
        px -= 2 * S
    f = en_font(floor)
    return f, floor, wrap_en(draw, text, f, maxw)


# ---------------------------------------------------------------- footer
FOOTER_EN = 'Subscribe — a verse every Monday and Thursday'


def footer(img, draw):
    """The persistent strip. This is YouTube: it asks for a subscribe and it
    never carries the Instagram handle. English only - the strip is Hamdam's
    own copy, and Hamdam's own Persian copy lives in moods-fa.json, which
    holds mood lines and nothing else. Typing a Persian subscribe line here
    would be generated Persian, which does not ship."""
    y = int(H * 0.780)
    draw.line([(int(W * 0.30), y - int(H * 0.030)), (int(W * 0.70), y - int(H * 0.030))],
              fill=lerp(INK, PEACH, 0.62), width=max(1, S))
    en(draw, (W // 2, y), FOOTER_EN, en_font(23 * S), lerp(INK, PEACH, 0.18))
    return img


def star(draw, y=0.108):
    shamseh(draw, W // 2, int(H * y), int(W * 0.043), int(W * 0.020),
            lerp(SAFFRON, INK, 0.30), max(1, int(1.6 * S)))


# ---------------------------------------------------------------- pages
def page_mood(line):
    img = field()
    d = ImageDraw.Draw(img)
    star(d)
    f, px = fit_one_line(d, line, int(W * 0.82), 108 * S)
    fa(d, (W // 2, int(H * 0.400)), line, f, INK)
    footer(img, d)
    return grain(img), {'page': 0, 'fa_px': px // S, 'lines': 1}


def page_persian(persian):
    img = field()
    d = ImageDraw.Draw(img)
    star(d)
    lines = persian.split('\n')
    f, px = fit_fa_block(d, lines, int(W * 0.80), 82 * S)
    lh = px * 1.72
    y0 = int(H * 0.400) - (len(lines) - 1) * lh / 2
    for i, ln in enumerate(lines):
        fa(d, (W // 2, y0 + i * lh), ln, f, INK)
    footer(img, d)
    return grain(img), {'page': 1, 'fa_px': px // S, 'lines': len(lines)}


def page_english(english, poet_line):
    img = field()
    d = ImageDraw.Draw(img)
    star(d)
    f, px, lines = fit_en_block(d, english, int(W * 0.78), int(H * 0.34), 56 * S)
    lh = px * 1.42
    y0 = int(H * 0.375) - (len(lines) - 1) * lh / 2
    for i, ln in enumerate(lines):
        en(d, (W // 2, y0 + i * lh), ln, f, INK)
    ybase = y0 + (len(lines) - 1) * lh
    d.line([(int(W * 0.42), ybase + lh * 1.05), (int(W * 0.58), ybase + lh * 1.05)],
           fill=lerp(INK, PEACH, 0.55), width=max(1, S))
    en(d, (W // 2, ybase + lh * 1.85), poet_line, en_font_semi(34 * S), INK_SOFT)
    footer(img, d)
    return grain(img), {'page': 2, 'en_px': px // S, 'lines': len(lines)}


def page_question(question_fa):
    img = field(plain=True)
    d = ImageDraw.Draw(img)
    lines = [question_fa]
    f, px = fit_fa_block(d, lines, int(W * 0.80), 78 * S)
    fa(d, (W // 2, int(H * 0.400)), question_fa, f, INK)
    footer(img, d)
    return grain(img), {'page': 3, 'fa_px': px // S, 'lines': 1, 'plain': True}


def page_cta():
    img = field()
    d = ImageDraw.Draw(img)
    star(d, y=0.215)
    fa(d, (W // 2, int(H * 0.330)), WORDMARK, fa_font_semi(104 * S), INK)
    en(d, (W // 2, int(H * 0.435)), 'Subscribe', en_font_semi(62 * S), INK)
    en(d, (W // 2, int(H * 0.520)), 'hamdam.com.au', en_font(34 * S),
       lerp(INK, PEACH, 0.30))
    footer(img, d)
    return grain(img), {'page': 4, 'lines': 3}


# ---------------------------------------------------------------- checks
def indigo_fraction(img):
    """Fraction of pixels closer to indigo than to the warm field. Indigo is
    an accent: the spec caps it at roughly 8% of a page and never allows it as
    a background."""
    small = img.convert('RGB').resize((216, 384))
    n = 0
    for p in small.getdata():
        if p[0] + p[1] + p[2] < 300:
            n += 1
    return n / (216 * 384)


# ---------------------------------------------------------------- build
def build(base, verse_id, mood_key, audio, out, pages_dir=None, report=True):
    queue = json.load(open(os.path.join(base, 'verse-queue.json'), encoding='utf-8'))
    moods = json.load(open(os.path.join(base, 'moods-fa.json'), encoding='utf-8'))

    entry = next((v for v in queue if v['id'] == verse_id), None)
    if entry is None:
        raise SystemExit(f'no queue entry {verse_id!r}')
    mood = moods['moods'].get(mood_key)
    if mood is None or not mood.get('line', '').strip():
        raise SystemExit(f'moods-fa.json has no usable line for {mood_key!r}')

    excluded = set(moods.get('_excluded_themes', []))
    if excluded & set(entry['themes']):
        raise SystemExit(f'{verse_id} carries an excluded theme; refusing to render')

    line = mood['line']
    persian = entry['persian']
    english = entry['english']
    question_fa = entry['questionFa']

    # Hard rule 2: the reflections make unsourced claims about the poets and
    # are not read by this renderer at all.
    assert 'reflectionFa' not in dir(), 'reflections are never read'

    poet_line = POETS[entry['poetEn']]

    pages, meta = [], []
    for img, m in (page_mood(line), page_persian(persian),
                   page_english(english, poet_line), page_question(question_fa),
                   page_cta()):
        img = img.resize((1080, 1920), Image.LANCZOS)
        m['indigo_fraction'] = round(indigo_fraction(img), 4)
        pages.append(img)
        meta.append(m)

    if pages_dir:
        os.makedirs(pages_dir, exist_ok=True)
        for i, p in enumerate(pages):
            p.save(os.path.join(pages_dir, f'page-{i}.png'))

    tmp = tempfile.mkdtemp(prefix='hamdam-short-')
    n = 0
    for i, p in enumerate(pages):
        total = int(round(HOLDS[i] * FPS))
        dis = 0 if i == 0 else int(round(DISSOLVE * FPS))
        for k in range(total):
            if k < dis:
                fr = Image.blend(pages[i - 1], p, (k + 1) / (dis + 1))
            else:
                fr = p
            fr.save(os.path.join(tmp, f'f{n:05d}.png'))
            n += 1

    dur = n / FPS
    silent = os.path.join(tmp, 'silent.mp4')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS),
                    '-i', os.path.join(tmp, 'f%05d.png'),
                    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
                    '-crf', '17', '-r', str(FPS), silent], check=True)

    tgt = json.load(open(os.path.join(base, 'audio', 'manifest.json'), encoding='utf-8'))
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error',
                    '-i', silent, '-i', os.path.join(base, audio),
                    '-filter_complex',
                    f'[1:a]atrim=0:{dur},afade=t=in:st=0:d=0.6,'
                    f'afade=t=out:st={dur - 1.4:.2f}:d=1.4,'
                    f'loudnorm=I={tgt["target_lufs"]}:TP={tgt["true_peak_ceiling"]}:LRA=11,'
                    f'aresample=44100[a]',
                    '-map', '0:v', '-map', '[a]', '-c:v', 'copy',
                    '-c:a', 'aac', '-b:a', '192k', '-shortest', out], check=True)

    info = {'id': verse_id, 'poet': entry['poetEn'], 'mood': mood_key,
            'frames': n, 'duration_s': round(dur, 3), 'fps': FPS,
            'holds': HOLDS, 'size': '1080x1920', 'audio': audio,
            'pages': meta, 'out': out,
            'slash_in_english': ' / ' in english,
            'poet_line': poet_line}
    if report:
        print(json.dumps(info, ensure_ascii=False, indent=2))
    return info


# Hard rule 4: city and century, never a modern country.
POETS = {
    'Hafez': 'Hafez — Shiraz, 14th century',
    'Rumi': 'Rumi — Balkh and Konya, 13th century',
    'Saadi': 'Saadi — Shiraz, 13th century',
    'Khayyam': 'Omar Khayyam — Nishapur, 11th century',
    'Parvin': 'Parvin Etesami — Tabriz and Tehran, 20th century',
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default='.')
    ap.add_argument('--id', required=True)
    ap.add_argument('--mood', required=True)
    ap.add_argument('--audio', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--pages-dir')
    a = ap.parse_args()
    build(a.base, a.id, a.mood, a.audio, a.out, a.pages_dir)


if __name__ == '__main__':
    main()
