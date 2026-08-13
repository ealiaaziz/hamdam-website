#!/usr/bin/env python3
"""Template layer for the Hamdam reel renderer.

The renderer as committed hardcodes one palette: a golden sunrise. `mood` is
read only to look up an optional background photo. So a Khayyam verse about
the grave renders in exactly the same warm gold as a Rumi love poem.

This module moves the palette into JSON templates under social/templates/ and
resolves one per concept mood. It changes appearance only. It never touches
verse text, never re-wraps, never alters a font size, and never reads or
writes Persian.

Contract:
    load(mood, base) -> dict          resolve a template for a mood
    paint(T, section, W, H, ops)      build a scene from the template
    ink(T, key, fallback)             look up a text colour

`ops` is the dict of drawing primitives already defined in the renderer
(vgrad, horizon_band, sun, lightpath, mist, birds), passed in so this module
does not duplicate them and cannot drift from them.
"""
import os, json, glob

DEFAULT = 'dawn'


def _hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def available(base='.'):
    """Every template id present on disk."""
    d = os.path.join(base, 'templates')
    return sorted(os.path.splitext(os.path.basename(p))[0]
                  for p in glob.glob(os.path.join(d, '*.json')))


def load(mood, base='.'):
    """Resolve the template covering `mood`, falling back to DEFAULT.

    Raises if the fallback itself is missing - a missing default means the
    templates directory was not fetched, and rendering with a silently
    different look is worse than stopping.
    """
    d = os.path.join(base, 'templates')
    chosen = None
    for tid in available(base):
        T = json.load(open(os.path.join(d, f'{tid}.json')))
        if mood and mood in T.get('moods', []):
            chosen = T
            break
    if chosen is None:
        p = os.path.join(d, f'{DEFAULT}.json')
        if not os.path.exists(p):
            raise SystemExit(
                f'hamdam_theme: no template matches mood {mood!r} and the '
                f'{DEFAULT} fallback is missing at {p}. Refusing to render.')
        chosen = json.load(open(p))
    _validate(chosen)
    return chosen


REQUIRED_INK = ('headline', 'persian', 'english', 'poet', 'insight_fa',
                'insight_en', 'lesson_fa', 'lesson_en', 'send', 'rule',
                'wordmark')


def _validate(T):
    for sec in ('exterior', 'interior', 'frame', 'ink'):
        if sec not in T:
            raise SystemExit(f'hamdam_theme: template {T.get("id")!r} missing {sec}')
    missing = [k for k in REQUIRED_INK if k not in T['ink']]
    if missing:
        raise SystemExit(
            f'hamdam_theme: template {T.get("id")!r} missing ink keys {missing}')
    for sec in ('exterior', 'interior'):
        if not T[sec].get('gradient'):
            raise SystemExit(f'hamdam_theme: template {T.get("id")!r} {sec} has no gradient')


def ink(T, key, fallback='FFFFFF'):
    return _hx(T['ink'].get(key, fallback))


def frame_colours(T):
    g = [(float(s), _hx(c)) for s, c in T['frame']['gradient']]
    return g, _hx(T['frame']['bevel']), _hx(T['frame']['handle'])


def scrim(T):
    s = T['interior'].get('scrim', {'colour': '0A0A07', 'peak': 220})
    return _hx(s['colour']), int(s['peak'])


def paint(T, section, w, h, ops, S=2):
    """Build one scene - exterior backdrop or interior print - from a template.

    ops must supply: vgrad, horizon_band, sun, lightpath, mist, birds, blend,
    blur. Any template section may be null to skip that step, which is how
    dusk drops the birds.
    """
    C = T[section]
    img = ops['vgrad'](w, h, [(float(s), _hx(c)) for s, c in C['gradient']])

    if C.get('horizon'):
        z = C['horizon']
        img = ops['horizon_band'](img, z['at'], _hx(z['colour']),
                                  amp=z.get('amp', 0.012), seed=z.get('seed', 3))

    if C.get('sun'):
        z = C['sun']
        kw = {}
        if z.get('falloff'):
            kw['glow'] = tuple(z['falloff'])
        img = ops['sun'](img, z['x'], z['y'], z['r'],
                         _hx(z['glow']), _hx(z['disc']), **kw)

    if C.get('lightpath'):
        z = C['lightpath']
        img = ops['lightpath'](img, z['x'], z['at'], _hx(z['colour']),
                               width_f=z.get('width', 0.10))

    if C.get('mist'):
        z = C['mist']
        img = ops['mist'](img, z.get('seed', 11), bands=z.get('bands', 7),
                          strength=z.get('strength', 0.30),
                          colour=_hx(z.get('colour', 'BBD2CE')))

    if C.get('birds'):
        z = C['birds']
        img = ops['birds'](img, z['n'], z['x'], z['y'], z['spread'],
                           _hx(z['colour']), S * z.get('scale', 7))

    if C.get('blur'):
        img = ops['blur'](img, S * C['blur'])

    if C.get('settle'):
        z = C['settle']
        img = ops['blend'](img, _hx(z['colour']), z['amount'])

    return img
