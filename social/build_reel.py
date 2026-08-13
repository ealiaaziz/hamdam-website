#!/usr/bin/env python3
"""Assemble the six rendered pages plus a music bed into a publishable reel.

    python3 build_reel.py <conceptId> <pagesDir> <audioLibDir> <outMp4>

Transitions are composed in PIL frame by frame. ffmpeg 7.1.3 in the workbench
has a broken xfade filter - it emits zero frames - so this does not use it.

Frames are PIPED to ffmpeg's stdin as raw RGB and never written to disk. The
first version wrote 552 JPEGs into /tmp, which on the Composio workbench is a
493 MB tmpfs - RAM-backed - on a 985 MB single-core box. That crashed the
sandbox. Streaming keeps memory flat regardless of reel length.

Encoding is still three light passes: video-only, audio-only, stream-copy mux.
x264 runs at -preset veryfast because the workbench has one core.

Page timing is weighted, not uniform. The Persian verse and the English
translation carry the content and hold longest; the scene and the headline are
entries and go quickly.
"""
import sys, os, subprocess, hashlib
from PIL import Image

CONCEPT, PAGES, AUDIO_LIB, OUT = sys.argv[1:5]
FPS = 30
W, H = 1080, 1920

# seconds per page, index 0..5. Total 18.4s, inside the 12-22s window.
HOLD = [1.6, 2.4, 4.4, 4.4, 3.0, 2.6]
DISSOLVE = 0.45
ZOOM = 0.018
ZOOM_STEPS = 16          # quantised: 16 cached resizes per page, not ~130


def sh(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f'failed: {cmd}\n{r.stderr[-1500:]}')
    return r.stdout


def load_pages(tid):
    ps = []
    for i in range(6):
        p = os.path.join(PAGES, f'{CONCEPT}-{tid}-stage{i}.jpg')
        if not os.path.exists(p):
            raise SystemExit(f'build_reel: missing page {p}')
        im = Image.open(p).convert('RGB')
        if im.size != (W, H):
            raise SystemExit(f'build_reel: {p} is {im.size}, expected {(W, H)}')
        ps.append(im)
    return ps


class Zoom:
    """Cached zoom ladder. BILINEAR: at a 1.8% push the difference from
    LANCZOS is invisible and it is ~40% faster."""

    def __init__(self, im):
        self.levels = []
        for j in range(ZOOM_STEPS):
            s = 1.0 + ZOOM * (j / (ZOOM_STEPS - 1))
            nw, nh = int(W * s), int(H * s)
            big = im.resize((nw, nh), Image.BILINEAR)
            self.levels.append(big.crop(((nw - W) // 2, (nh - H) // 2,
                                         (nw - W) // 2 + W, (nh - H) // 2 + H)))
            del big

    def at(self, t):
        return self.levels[min(ZOOM_STEPS - 1, max(0, int(t * (ZOOM_STEPS - 1))))]


def main():
    tid = None
    for f in os.listdir(PAGES):
        if f.startswith(CONCEPT + '-') and f.endswith('-stage0.jpg'):
            tid = f[len(CONCEPT) + 1:-len('-stage0.jpg')]
    if not tid:
        raise SystemExit(f'build_reel: cannot infer template from pages in {PAGES}')

    pages = load_pages(tid)

    adir = os.path.join(AUDIO_LIB, tid)
    if not os.path.isdir(adir):
        raise SystemExit(f'build_reel: no audio folder for template {tid!r} at {adir}. '
                         f"Refusing to publish a silent reel or borrow another template's music.")
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
    print(f'  template={tid}  audio={pick} ({adur:.1f}s)  reel={total:.1f}s', flush=True)

    # --- pass 1: stream frames straight into ffmpeg ------------------------
    vid = '/tmp/reel_video.mp4'
    proc = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
         '-s', f'{W}x{H}', '-framerate', str(FPS), '-i', 'pipe:0',
         '-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'high',
         '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', vid],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

    n = 0
    zooms = [Zoom(p) for p in pages]
    for i in range(6):
        hold_f = int(HOLD[i] * FPS)
        diss_f = int(DISSOLVE * FPS) if i < 5 else 0
        for k in range(hold_f - diss_f):
            proc.stdin.write(zooms[i].at(k / max(1, hold_f)).tobytes())
            n += 1
        if diss_f:
            nxt_f = int(HOLD[i + 1] * FPS)
            for k in range(diss_f):
                a = zooms[i].at((hold_f - diss_f + k) / max(1, hold_f))
                b = zooms[i + 1].at(k / max(1, nxt_f))
                proc.stdin.write(Image.blend(a, b, k / diss_f).tobytes())
                n += 1
    proc.stdin.close()
    err = proc.stderr.read().decode()[-800:]
    if proc.wait():
        raise SystemExit(f'build_reel: ffmpeg video pass failed\n{err}')
    print(f'  {n} frames ({n/FPS:.1f}s) streamed', flush=True)

    # --- pass 2: audio only ------------------------------------------------
    sh(f'ffmpeg -v error -y -i "{apath}" -t {n/FPS:.3f} '
       f'-af "afade=t=out:st={max(0, n/FPS-1.2):.3f}:d=1.2" '
       f'-c:a aac -b:a 128k -ar 44100 -ac 2 /tmp/reel_audio.m4a')

    # --- pass 3: stream-copy mux -------------------------------------------
    sh(f'ffmpeg -v error -y -i {vid} -i /tmp/reel_audio.m4a -c copy -shortest "{OUT}"')
    print(f'  -> {OUT}', flush=True)


if __name__ == '__main__':
    main()
