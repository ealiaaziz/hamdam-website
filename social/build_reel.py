#!/usr/bin/env python3
"""Assemble the six rendered pages plus a music bed into a publishable reel.

    python3 build_reel.py <conceptId> <pagesDir> <audioLibDir> <outMp4>

Transitions are composed in PIL frame by frame. ffmpeg 7.1.3 in the workbench
has a broken xfade filter - it emits zero frames - so this does not use it.

Encoding is three light passes: video-only, audio-only, then a stream-copy
mux. Doing it in one pass gets OOM-killed in the workbench.

Page timing is weighted, not uniform. The Persian verse and the English
translation carry the content and hold longest; the scene and the headline are
entries and go quickly.
"""
import sys, os, json, subprocess, random, hashlib
from PIL import Image

CONCEPT, PAGES, AUDIO_LIB, OUT = sys.argv[1:5]
FPS = 30
W, H = 1080, 1920

# seconds per page, index 0..5. Total 18.4s, inside the 12-22s window.
HOLD = [1.6, 2.4, 4.4, 4.4, 3.0, 2.6]
DISSOLVE = 0.45          # overlap between consecutive pages
ZOOM = 0.018             # slow push per page, in fraction of frame


def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f'failed: {cmd}\n{r.stderr[-1500:]}')
    return r.stdout


def load_pages(template_id):
    ps = []
    for i in range(6):
        p = os.path.join(PAGES, f'{CONCEPT}-{template_id}-stage{i}.jpg')
        if not os.path.exists(p):
            raise SystemExit(f'build_reel: missing page {p}')
        im = Image.open(p).convert('RGB')
        if im.size != (W, H):
            raise SystemExit(f'build_reel: {p} is {im.size}, expected {(W, H)}')
        ps.append(im)
    return ps


def zoomed(im, t):
    """Slow push in. t runs 0..1 across the page's own hold."""
    s = 1.0 + ZOOM * t
    nw, nh = int(W * s), int(H * s)
    big = im.resize((nw, nh), Image.LANCZOS)
    return big.crop(((nw - W) // 2, (nh - H) // 2, (nw - W) // 2 + W, (nh - H) // 2 + H))


def main():
    # template id is embedded in the page filenames
    tid = None
    for f in os.listdir(PAGES):
        if f.startswith(CONCEPT + '-') and f.endswith('-stage0.jpg'):
            tid = f[len(CONCEPT) + 1:-len('-stage0.jpg')]
    if not tid:
        raise SystemExit(f'build_reel: cannot infer template from pages in {PAGES}')

    pages = load_pages(tid)

    # --- audio: pick deterministically from the template's folder ----------
    adir = os.path.join(AUDIO_LIB, tid)
    if not os.path.isdir(adir):
        raise SystemExit(f'build_reel: no audio folder for template {tid!r} at {adir}. '
                         f'Refusing to publish a silent reel or borrow another '
                         f"template's music.")
    tracks = sorted(f for f in os.listdir(adir) if f.endswith('.mp3'))
    if not tracks:
        raise SystemExit(f'build_reel: audio folder {adir} is empty. Aborting.')
    pick = tracks[int(hashlib.sha256(CONCEPT.encode()).hexdigest(), 16) % len(tracks)]
    apath = os.path.join(adir, pick)

    total = sum(HOLD) - DISSOLVE * 5
    adur = float(sh(f'ffprobe -v error -show_entries format=duration -of csv=p=0 "{apath}"'))
    if adur < total:
        raise SystemExit(f'build_reel: track {pick} is {adur:.1f}s but the reel is '
                         f'{total:.1f}s. Aborting rather than looping the music.')

    print(f'  template={tid}  audio={pick} ({adur:.1f}s)  reel={total:.1f}s')

    # --- pass 1: frames -> video only --------------------------------------
    tmp = '/tmp/reel_frames'
    os.makedirs(tmp, exist_ok=True)
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))

    n = 0
    for i, im in enumerate(pages):
        hold_f = int(HOLD[i] * FPS)
        diss_f = int(DISSOLVE * FPS) if i < 5 else 0
        for k in range(hold_f - diss_f):
            zoomed(im, k / max(1, hold_f)).save(f'{tmp}/f{n:05d}.jpg', quality=92)
            n += 1
        if diss_f:
            nxt = pages[i + 1]
            for k in range(diss_f):
                a = zoomed(im, (hold_f - diss_f + k) / max(1, hold_f))
                b = zoomed(nxt, k / max(1, int(HOLD[i + 1] * FPS)))
                Image.blend(a, b, k / diss_f).save(f'{tmp}/f{n:05d}.jpg', quality=92)
                n += 1

    print(f'  {n} frames ({n/FPS:.1f}s)')
    sh(f'ffmpeg -v error -y -framerate {FPS} -i {tmp}/f%05d.jpg '
       f'-c:v libx264 -profile:v high -pix_fmt yuv420p -crf 20 '
       f'-movflags +faststart /tmp/reel_video.mp4')

    # --- pass 2: audio only, trimmed and tailed off ------------------------
    sh(f'ffmpeg -v error -y -i "{apath}" -t {n/FPS:.3f} '
       f'-af "afade=t=out:st={max(0, n/FPS-1.2):.3f}:d=1.2" '
       f'-c:a aac -b:a 128k -ar 44100 -ac 2 /tmp/reel_audio.m4a')

    # --- pass 3: stream-copy mux -------------------------------------------
    sh(f'ffmpeg -v error -y -i /tmp/reel_video.mp4 -i /tmp/reel_audio.m4a '
       f'-c copy -shortest "{OUT}"')

    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    print(f'  -> {OUT}')


if __name__ == '__main__':
    main()
