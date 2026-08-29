# -*- coding: utf-8 -*-
"""Hamdam argument format — a claim, evidence, and a source, in about 40 seconds.

Different job from hamdam_short_render.py. That one shows a verse. This one makes
an argument, so it is voice-led: every page holds exactly as long as its own
voiceover clip takes to say, plus a breath either side. Nothing is timed by hand.

1080x1920, warm-dawn palette, footer asks for a subscribe. English throughout —
any Persian would have to be copied byte-exact from a validated file, and this
format's script is not in one.

A page may also be a 'shot': a rectangle cropped out of a real screenshot of
the shipped app, laid on the field as a card. The crop is given in fractions of the
source image so it is checkable against the file, and nothing is drawn over the
screenshot itself - what the video shows is what the app shows. A page may name
its own 'src'; otherwise the spec-level 'shot' is used.
"""
import argparse, json, os, subprocess, tempfile, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 2
W, H = 1080 * S, 1920 * S
FPS = 30
LEAD, TAIL = 0.45, 0.55          # breath before and after each clip
DISSOLVE = 0.30
SS = '/tmp/fonts/sourceserif/source-serif-4.005_Desktop/OTF/'
FZ = '/tmp/fonts/vazirmatn/fonts/ttf/'
WORDMARK = 'همدم'

def hx(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
def lerp(a, b, t):
    return tuple(round(a[i] + (b[i]-a[i]) * t) for i in range(3))
def ease(t): return t*t*t*(t*(t*6-15)+10)

PEACH, SAFFRON, CREAM, INDIGO = hx('F4C4A0'), hx('E8B04B'), hx('F4EDD8'), hx('1B1B3A')
INK, SOFT = INDIGO, lerp(INDIGO, PEACH, 0.34)
FIELD = [(0,CREAM), (.24, lerp(CREAM,SAFFRON,.26)), (.36, lerp(SAFFRON,PEACH,.52)),
         (.66,PEACH), (1, lerp(PEACH,CREAM,.42))]
PLAIN = [(0,CREAM), (1, lerp(CREAM,PEACH,.18))]

def serif(px, bold=False):
    return ImageFont.truetype(SS + ('SourceSerif4-Semibold.otf' if bold else 'SourceSerif4-Regular.otf'), px)
def fa_font(px):
    return ImageFont.truetype(FZ + 'Vazirmatn-SemiBold.ttf', px)

def vgrad(stops):
    row = Image.new('RGB', (1, H)); px = row.load()
    for y in range(H):
        f = y/(H-1)
        for i in range(len(stops)-1):
            y0,c0 = stops[i]; y1,c1 = stops[i+1]
            if y0 <= f <= y1:
                px[0,y] = lerp(c0, c1, ease((f-y0)/(y1-y0)) if y1>y0 else 0); break
    return row.resize((W, H))

def glow(img, cx, cy, rad, colour, div=6):
    w,h = W//div, H//div
    g = Image.new('L',(w,h),0); gd = ImageDraw.Draw(g)
    cx,cy,rad = cx/div, cy/div, rad/div
    for m,a in ((5.4,16),(3.8,30),(2.6,48),(1.7,72),(1.1,96)):
        gd.ellipse([cx-rad*m, cy-rad*m, cx+rad*m, cy+rad*m], fill=a)
    g = g.filter(ImageFilter.GaussianBlur(rad*1.2)).resize((W,H), Image.BILINEAR)
    return Image.composite(Image.new('RGB',(W,H),colour), img, g)

def shamseh(d, cx, cy, ro, ri, col, wdt, pts=8):
    p=[]
    for k in range(pts*2):
        a = math.pi/2 + k*math.pi/pts
        r = ro if k%2==0 else ri
        p.append((cx+r*math.cos(a), cy-r*math.sin(a)))
    d.polygon(p, outline=col, width=wdt)

def grain(img, strength=7):
    w,h = img.size
    n = Image.effect_noise((max(1,w//4), max(1,h//4)), strength).resize((w,h)).convert('L')
    return Image.blend(img, Image.composite(Image.new('RGB',(w,h),CREAM), img, n), .045)

def card(img, src, crop, cy, maxw=.90, maxh=.42):
    """Lay a cropped region of a real screenshot on the field as a raised card."""
    im = Image.open(src).convert('RGB')
    sw, sh = im.size
    x0, y0, x1, y1 = crop
    im = im.crop((round(x0*sw), round(y0*sh), round(x1*sw), round(y1*sh)))
    cw = int(W*maxw); ch = round(im.height * cw / im.width)
    if ch > int(H*maxh):
        ch = int(H*maxh); cw = round(im.width * ch / im.height)
    im = im.resize((cw, ch), Image.LANCZOS)
    rad = int(26*S)
    px, py = W//2 - cw//2, int(H*cy) - ch//2

    sh_ = Image.new('L', (W, H), 0)
    ImageDraw.Draw(sh_).rounded_rectangle(
        [px, py + int(14*S), px+cw, py+ch + int(14*S)], radius=rad, fill=110)
    sh_ = sh_.filter(ImageFilter.GaussianBlur(20*S))
    img = Image.composite(Image.new('RGB', (W, H), lerp(INDIGO, PEACH, .30)), img, sh_)

    m = Image.new('L', (cw, ch), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, cw-1, ch-1], radius=rad, fill=255)
    img.paste(im, (px, py), m)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([px, py, px+cw-1, py+ch-1], radius=rad,
                        outline=lerp(INK, PEACH, .70), width=max(1, S))
    return img, py + ch

def field(plain=False):
    img = vgrad(PLAIN if plain else FIELD)
    if not plain:
        img = glow(img, int(W*.5), int(H*.30), int(W*.085), lerp(SAFFRON,CREAM,.30))
    return img

FOOTER = 'Subscribe to Hamdam for more Persian poetry'
def footer(d):
    y = int(H*.780)
    d.line([(int(W*.30), y-int(H*.030)), (int(W*.70), y-int(H*.030))],
           fill=lerp(INK,PEACH,.62), width=max(1,S))
    d.text((W//2, y), FOOTER, font=serif(23*S), fill=lerp(INK,PEACH,.18), anchor='mm')

def star(d, y=.115):
    shamseh(d, W//2, int(H*y), int(W*.043), int(W*.020), lerp(SAFFRON,INK,.30), max(1,int(1.6*S)))

def wrap_words(d, words, font, maxw):
    lines, cur = [], []
    for w_ in words:
        t = cur + [w_]
        if d.textlength(' '.join(x[0] for x in t), font=font) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur); cur = [w_]
    if cur: lines.append(cur)
    return lines

def draw_marked(d, text, mark, font, maxw, cy, base, hi):
    """Wrap and draw word by word so the marked phrase can carry its own colour."""
    toks = text.split()
    mset = set()
    if mark:
        mw = mark.split()
        for i in range(len(toks)-len(mw)+1):
            if [t.strip('.,:;') for t in toks[i:i+len(mw)]] == [t.strip('.,:;') for t in mw]:
                mset |= set(range(i, i+len(mw))); break
    words = [(t, i in mset) for i, t in enumerate(toks)]
    lines = wrap_words(d, words, font, maxw)
    lh = font.size * 1.30
    y = cy - (len(lines)-1)*lh/2
    sp = d.textlength(' ', font=font)
    for ln in lines:
        wdt = d.textlength(' '.join(x[0] for x in ln), font=font)
        x = W//2 - wdt/2
        for tok, marked in ln:
            d.text((x, y), tok, font=font, fill=(hi if marked else base), anchor='lm')
            x += d.textlength(tok, font=font) + sp
        y += lh
    return len(lines)

def fit(d, text, maxw, maxh, start, floor=30*S, bold=False):
    px = start
    while px > floor:
        f = serif(px, bold)
        lines = wrap_words(d, [(t, False) for t in text.split()], f, maxw)
        if len(lines)*px*1.30 <= maxh: return f
        px -= 2*S
    return serif(floor, bold)

def page(p, src=None):
    kind = p['kind']
    img = field(plain=(kind == 'turn'))
    d = ImageDraw.Draw(img)
    if kind not in ('turn', 'cta'): star(d)

    if kind == 'shot':
        img, bot = card(img, p.get('src', src), p['crop'], .395)
        d = ImageDraw.Draw(img)
        if p.get('caption'):
            d.text((W//2, bot + 54*S), p['caption'], font=serif(30*S), fill=SOFT, anchor='mm')
    elif kind == 'quote':
        f = fit(d, p['text'], int(W*.80), int(H*.34), 74*S)
        n = draw_marked(d, p['text'], p.get('mark'), f, int(W*.80), int(H*.40), INK, hx('9A6608'))
        if p.get('caption'):
            yb = int(H*.40) + n*f.size*1.30/2 + 46*S
            d.line([(int(W*.44), yb-22*S), (int(W*.56), yb-22*S)], fill=lerp(INK,PEACH,.55), width=max(1,S))
            d.text((W//2, yb+16*S), p['caption'], font=serif(30*S), fill=SOFT, anchor='mm')
    elif kind == 'cta':
        star(d, .215)
        d.text((W//2, int(H*.330)), WORDMARK, font=fa_font(104*S), fill=INK, anchor='mm',
               direction='rtl', language='fa', features=['kern','liga'])
        f = fit(d, p['text'], int(W*.78), int(H*.16), 52*S)
        draw_marked(d, p['text'], None, f, int(W*.78), int(H*.455), INK, INK)
        d.text((W//2, int(H*.545)), 'hamdam.com.au', font=serif(34*S), fill=lerp(INK,PEACH,.30), anchor='mm')
    else:
        blocks = [p['text']] + ([p['text2']] if p.get('text2') else [])
        f = fit(d, max(blocks, key=len), int(W*.80), int(H*.16), 60*S)
        ys = [.40] if len(blocks) == 1 else [.365, .455]
        for txt, yy in zip(blocks, ys):
            emph = (kind == 'turn' and txt is blocks[-1] and len(blocks) > 1)
            draw_marked(d, txt, None, serif(f.size, emph), int(W*.80), int(H*yy),
                        INK if emph else SOFT, INK)
    footer(d)
    return grain(img.resize((1080,1920), Image.LANCZOS))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--script', required=True); ap.add_argument('--audio-dir', required=True)
    ap.add_argument('--out', required=True); ap.add_argument('--pages-dir')
    a = ap.parse_args()
    spec = json.load(open(a.script, encoding='utf-8'))
    tmp = tempfile.mkdtemp(prefix='hamdam-arg-')

    holds, clips = [], []
    for i, p in enumerate(spec['pages']):
        c = os.path.join(a.audio_dir, f'vo-{i:02d}.mp3')
        dur = float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
                                    '-of','csv=p=0', c], capture_output=True, text=True).stdout.strip())
        holds.append(round(LEAD + dur + TAIL, 3)); clips.append((c, dur))

    paths = []
    for i, p in enumerate(spec['pages']):
        im = page(p, spec.get('shot')); q = os.path.join(tmp, f'p{i}.png'); im.save(q); paths.append(q)
        if a.pages_dir:
            os.makedirs(a.pages_dir, exist_ok=True); im.save(os.path.join(a.pages_dir, f'page-{i}.png'))

    fdir = os.path.join(tmp, 'f'); os.makedirs(fdir); n = 0
    for i, q in enumerate(paths):
        total = int(round(holds[i]*FPS)); dis = 0 if i == 0 else int(round(DISSOLVE*FPS))
        if dis:
            A = Image.open(paths[i-1]).convert('RGB'); B = Image.open(q).convert('RGB')
            for k in range(dis):
                dd = os.path.join(tmp, f'd{i}-{k:02d}.png')
                Image.blend(A, B, (k+1)/(dis+1)).save(dd)
                os.symlink(dd, os.path.join(fdir, f'f{n:05d}.png')); n += 1
            del A, B
        for _ in range(total-dis):
            os.symlink(q, os.path.join(fdir, f'f{n:05d}.png')); n += 1

    silent = os.path.join(tmp, 'v.mp4')
    subprocess.run(['ffmpeg','-y','-loglevel','error','-framerate',str(FPS),
                    '-i', os.path.join(fdir,'f%05d.png'),'-c:v','libx264','-profile:v','high',
                    '-pix_fmt','yuv420p','-preset','veryfast','-tune','stillimage','-crf','17',
                    '-threads','1','-x264-params','rc-lookahead=4:sync-lookahead=0:ref=1:bframes=0',
                    '-r',str(FPS), silent], check=True)

    # each clip placed LEAD seconds into its own page
    ins, filt, mix = [], [], []
    t = 0.0
    for i, (c, dur) in enumerate(clips):
        ins += ['-i', c]
        # the mix pass takes only the clips, so they are inputs 0..N-1
        filt.append(f'[{i}:a]adelay={int((t+LEAD)*1000)}|{int((t+LEAD)*1000)},apad[a{i}]')
        mix.append(f'[a{i}]'); t += holds[i]
    total = round(t, 3)
    filt.append(''.join(mix) + f'amix=inputs={len(clips)}:normalize=0,'
                f'atrim=0:{total},aresample=48000[a]')
    raw = os.path.join(tmp, 'mix.wav')
    subprocess.run(['ffmpeg','-y','-loglevel','error'] + ins +
                   ['-filter_complex', ';'.join(filt[:-1] + [filt[-1]]),
                    '-map','[a]','-t', f'{total:.3f}', raw], check=True)

    # Two-pass loudnorm. One pass is a dynamic normaliser and on sparse speech
    # with long gaps it lands well off target - measured -17.6 LUFS against -16,
    # and 0.1dB over the true-peak ceiling. Measuring first and feeding the
    # numbers back makes it a linear gain and it hits.
    probe = subprocess.run(['ffmpeg','-hide_banner','-nostats','-i', raw,
                            '-af','loudnorm=I=-16.0:TP=-2.0:LRA=11:print_format=json',
                            '-f','null','-'], capture_output=True, text=True).stderr
    m = json.loads(probe[probe.rindex('{'):probe.rindex('}')+1])
    ln = (f"loudnorm=I=-16.0:TP=-2.0:LRA=11:measured_I={m['input_i']}:"
          f"measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
          f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i', silent,'-i', raw,
                    '-filter_complex', f'[1:a]{ln},aresample=44100[a]',
                    '-map','0:v','-map','[a]','-c:v','copy','-c:a','aac','-b:a','192k',
                    '-t', f'{total:.3f}', a.out], check=True)
    print(json.dumps({'pages': len(paths), 'holds': holds, 'duration_s': total,
                      'frames': n, 'out': a.out}, indent=2))

if __name__ == '__main__':
    main()
