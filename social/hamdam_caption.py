#!/usr/bin/env python3
"""Build a reel caption, rotating caption language by publishing day.

    Monday     Farsi caption
    Wednesday  English caption
    Friday     both, Farsi first

The reel itself is unchanged: every reel stays bilingual and Persian-first.
Only the caption language rotates. Instagram reads caption language as an
audience signal, so this is the reach experiment without touching the product
or the brand guardrail.

    python3 hamdam_caption.py <conceptId> [--day mon|wed|fri] [--base DIR]

Prints the caption to stdout and a SHA-256 of it to stderr, so a caller can
cross-check an independently built copy before publishing - the check that
caught the wrong dash separator on 13 August.

Persian is copied byte-exact from reel-concepts.json. Nothing here composes,
normalises or reflows Persian text.
"""
import sys, os, json, hashlib, argparse

SEP = '\u2e3b'          # three-em dash, matches every published caption
ORDER = ('fa', 'en')

DAY_LANG = {
    'mon': ('fa',),
    'wed': ('en',),
    'fri': ('fa', 'en'),
}

# The sign-off. One URL, never two: on a bilingual day the old version printed
# hamdam.com.au twice and made the same promise in both languages.
# No product claims, no urgency, no download push - the account is a daily
# companion, and the sign-off should read like one.
CTA_FA = '\u0647\u0645\u062f\u0645 \u00b7 \u06cc\u06a9 \u0628\u06cc\u062a \u062f\u0631 \u0631\u0648\u0632'
CTA_EN = 'Hamdam \u00b7 a verse a day'
URL = 'hamdam.com.au'


def cta(langs):
    if langs == ('fa',):
        return f'{CTA_FA} \u2014 {URL}'
    if langs == ('en',):
        return f'{CTA_EN} \u2014 {URL}'
    return f'{CTA_FA}\n{CTA_EN} \u2014 {URL}'


def _req(C, key):
    v = (C.get(key) or '').strip()
    if not v:
        raise SystemExit(f'hamdam_caption: concept {C["id"]!r} is missing {key}. '
                         f'Refusing to build a caption with a hole in it.')
    return v


def block(C, lang):
    """One language's caption body. Field order mirrors the reel's page order."""
    if lang == 'fa':
        parts = [_req(C, 'insightFa'),
                 '',
                 _req(C, 'lessonFa'),
                 _req(C, 'sendFa'),
                 '',
                 _req(C, 'poetLineFa')]
    else:
        parts = [_req(C, 'insightEn'),
                 '',
                 _req(C, 'lessonEn'),
                 _req(C, 'sendEn'),
                 '',
                 _req(C, 'poetLineEn')]
    return '\n'.join(parts)


def tags(C, langs):
    """Hashtags for the languages in play, deduped, order preserved.

    Validated on the way out: a tag containing a space silently splits into a
    tag plus loose text on Instagram, which is how a hashtag quietly stops
    working.
    """
    out = []
    for lang in langs:
        for h in C.get('hashtagsFa' if lang == 'fa' else 'hashtagsEn', []):
            h = h.strip()
            if ' ' in h:
                raise SystemExit(f'hamdam_caption: hashtag {h!r} contains a space. '
                                 f'Instagram will break it. Fix the concept file.')
            if not h.startswith('#'):
                raise SystemExit(f'hamdam_caption: hashtag {h!r} has no leading #.')
            if h not in out:
                out.append(h)
    return ' '.join(out)


def build(C, day):
    langs = DAY_LANG[day]
    body = f'\n\n{SEP}\n\n'.join(block(C, l) for l in langs)
    return f'{body}\n\n{cta(langs)}\n\n{tags(C, langs)}'


def main():
    p = argparse.ArgumentParser()
    p.add_argument('conceptId')
    p.add_argument('--day', choices=sorted(DAY_LANG), required=True)
    p.add_argument('--base', default=os.environ.get('HAMDAM_BASE', '.'))
    a = p.parse_args()

    concepts = json.load(open(f'{a.base}/reel-concepts.json'))['concepts']
    try:
        C = next(c for c in concepts if c['id'] == a.conceptId)
    except StopIteration:
        raise SystemExit(f'hamdam_caption: no concept {a.conceptId!r}')

    cap = build(C, a.day)
    if len(cap) > 2200:
        raise SystemExit(f'hamdam_caption: caption is {len(cap)} chars, over '
                         f"Instagram's 2200 limit.")
    sys.stdout.write(cap)
    sys.stderr.write(f'\nsha256={hashlib.sha256(cap.encode()).hexdigest()} '
                     f'chars={len(cap)} day={a.day} langs={",".join(DAY_LANG[a.day])}\n')


if __name__ == '__main__':
    main()
