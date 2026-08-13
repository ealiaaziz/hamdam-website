#!/usr/bin/env python3
"""Hamdam claim-audit gate, layer 1: deterministic lint.

Usage:
    python3 audit_lint.py <draft_file> [--mode draft|final] [--json]

Checks (mechanical only; semantic claim checking is layer 2, see AUDIT_PROMPT.md):
  1. Dashes and hyphens: em dash, en dash, hyphen-minus, and lookalike dash
     characters are prohibited in outbound copy. URLs, email addresses, and
     Persian placeholder markers are exempt.
  2. Persian/Arabic-script text: must appear only inside [FA]...[/FA]
     placeholder markers (Ealia authors all Persian copy). In final mode,
     no markers may remain at all.
  3. Contested phrases: hard-blocked wording per FACTS.md (translation
     quality/provenance claims).
  4. Contested privacy phrases: hard-blocked whole-app privacy claims per
     FACTS.md "CONTESTED: privacy claims".
  5. Bare "Free" as a full-stop price claim: blocked per FACTS.md pricing rule,
     because it omits in-app purchases.
  6. Dollar amounts: prohibited in marketing copy per FACTS.md pricing rule.
  7. American spellings: warning only (Australian English required).

Exit code 0 = PASS (warnings allowed), 1 = FAIL, 2 = usage/input error.
"""

import argparse
import json
import re
import sys
import unicodedata

FA_OPEN = "[FA]"
FA_CLOSE = "[/FA]"

# Dash-type characters prohibited in outbound copy.
DASH_CHARS = {
    "-": "hyphen-minus",
    "\u2010": "hyphen",
    "\u2011": "non-breaking hyphen",
    "\u2012": "figure dash",
    "\u2013": "en dash",
    "\u2014": "em dash",
    "\u2015": "horizontal bar",
    "\u2212": "minus sign",
}

# Unicode ranges covering Arabic script (Persian uses Arabic script).
ARABIC_RANGES = (
    (0x0600, 0x06FF),
    (0x0750, 0x077F),
    (0x08A0, 0x08FF),
    (0xFB50, 0xFDFF),
    (0xFE70, 0xFEFF),
)

# Hard-blocked phrases per FACTS.md "CONTESTED: translation quality".
# Case-insensitive, and matched against apostrophe-normalised text so a curly
# U+2019 cannot walk a phrase past the gate (see _normalise_apostrophes).
#
# The second group was added 2026-08-13. The first group is category-shaped
# ("<adverb> translated") and caught nothing that actually shipped, because
# what shipped was not of that shape: "a translation that doesn't flatten it"
# names no translator and claims no method, it just asserts quality by
# comparison. Four published Instagram posts carry it. FACTS.md now lists the
# strings themselves and so does this file, because layer 2 is a model and a
# model is the wrong place for a rule that can be spelled out.
CONTESTED_PATTERNS = [
    r"careful(?:ly)?\s+(?:english\s+)?translat",   # careful translation / carefully translated
    r"expert(?:ly)?\s+translat",
    r"scholar(?:ly)?\s+translat",
    r"hand[\s\u2010-]?translated",
    r"human[\s\u2010-]?translated",
    r"professionally\s+translat",
    r"authoritative\s+translat",
    # Verbatim from FACTS.md, 2026-08-13. Each has a test in tests/.
    r"doesn'?t\s+flatten",          # covers both "a/an (English) translation that doesn't flatten it"
    r"most\s+translations\s+soften",
    r"\bfaithful(?:ness)?\b",
    r"\buncompromising\b",
    r"true\s+to\s+the\s+original",
    r"properly\s+translated",
]

# Hard-blocked phrases per FACTS.md "CONTESTED: privacy claims", added
# 2026-08-13. These are whole-app claims. The narrow ones FACTS.md marks
# ALLOWED ("no account required", "no sign up", "no ads") are deliberately not
# here and must keep passing; tests/t18_privacy_allowed.txt pins that.
PRIVACY_PATTERNS = [
    r"\bno\s+tracking\b",
    r"\bwe\s+collect\s+nothing\b",
    r"\bnothing\s+leaves\s+your\s+device\b",
    r"\bno\s+data\s+collected\b",
]

# "Free." as a complete claim omits in-app purchases, which the App Store
# listing shows and FACTS.md records. Matches the word only when a sentence
# ends on it: "free to download" and "free trial" are fine and must stay fine.
BARE_FREE_RE = re.compile(r"\bfree\s*[.!]", re.IGNORECASE)

# Unambiguous American spellings (warning level). Word-boundary matched,
# case-insensitive. Deliberately short: only entries with no legitimate
# Australian use in marketing copy.
AMERICAN_SPELLINGS = [
    "color", "colors", "colored", "favorite", "favorites", "center",
    "centers", "centered", "jewelry", "theater", "theaters", "catalog",
    "catalogs", "traveled", "traveling", "canceled", "canceling",
    "personalized", "personalize", "customized", "customize",
    "organized", "organize", "recognized", "recognize", "realized",
    "realize", "apologize", "memorize",
]

URL_RE = re.compile(r"https?://\S+|www\.\S+|\b[\w.+-]+@[\w-]+\.[\w.-]+\b|\b[\w-]+\.(?:com|net|org|au|io|app)(?:\.[a-z]{2})?\b")
DOLLAR_RE = re.compile(r"(?:\bAUD?\s?\$?|\$)\s?\d[\d,]*(?:\.\d+)?")
FA_BLOCK_RE = re.compile(re.escape(FA_OPEN) + r".*?" + re.escape(FA_CLOSE), re.DOTALL)


def _mask(text, pattern):
    """Replace pattern matches with spaces of equal length (keeps offsets)."""
    def repl(m):
        return " " * len(m.group(0))
    return pattern.sub(repl, text)


def _line_of(text, index):
    return text.count("\n", 0, index) + 1


def _normalise_apostrophes(text):
    """Fold typographic apostrophes to ASCII for phrase matching only.

    Kept separate from the text used for line numbers and dash checking: this
    is a matching aid, not a rewrite. Same length in, same length out, so
    offsets computed against the result still point at the right line.
    """
    return text.replace("’", "'").replace("ʼ", "'").replace("‘", "'")


def is_arabic_char(ch):
    cp = ord(ch)
    return any(lo <= cp <= hi for lo, hi in ARABIC_RANGES)


def lint(text, mode="draft"):
    violations = []
    warnings = []

    if mode == "final" and (FA_OPEN in text or FA_CLOSE in text):
        violations.append({
            "rule": "placeholder-in-final",
            "line": _line_of(text, text.find(FA_OPEN if FA_OPEN in text else FA_CLOSE)),
            "detail": "Final copy must not contain [FA] placeholder markers; Ealia's Persian text must replace them.",
        })

    # Unbalanced markers are an error in any mode.
    if text.count(FA_OPEN) != text.count(FA_CLOSE):
        violations.append({
            "rule": "unbalanced-fa-markers",
            "line": 1,
            "detail": f"{text.count(FA_OPEN)} opening vs {text.count(FA_CLOSE)} closing [FA] markers.",
        })

    # Build masked text for dash/dollar checks: URLs, emails, FA blocks exempt.
    masked = _mask(text, FA_BLOCK_RE)
    masked = _mask(masked, URL_RE)

    for i, ch in enumerate(masked):
        if ch in DASH_CHARS:
            violations.append({
                "rule": "dash",
                "line": _line_of(text, i),
                "detail": f"{DASH_CHARS[ch]} (U+{ord(ch):04X}) prohibited in outbound copy; reword.",
            })

    # Persian outside FA markers: check original text with FA blocks masked.
    fa_masked = _mask(text, FA_BLOCK_RE)
    for i, ch in enumerate(fa_masked):
        if is_arabic_char(ch):
            violations.append({
                "rule": "unmarked-persian",
                "line": _line_of(text, i),
                "detail": "Persian text outside [FA]...[/FA] markers. All Persian copy is authored by Ealia; generated drafts may only include marked placeholders.",
            })
            break  # one violation per draft is enough to fail; avoid noise

    # Phrase checks run on apostrophe-normalised text so "doesn’t flatten" and
    # "doesn't flatten" are the same string to the gate.
    phrase_text = _normalise_apostrophes(text)

    for pat in CONTESTED_PATTERNS:
        m = re.search(pat, phrase_text, re.IGNORECASE)
        if m:
            violations.append({
                "rule": "contested-phrase",
                "line": _line_of(phrase_text, m.start()),
                "detail": (
                    f"Hard-blocked wording per FACTS.md 'CONTESTED: translation quality': "
                    f"'{m.group(0)}'. Translation quality, fidelity and comparison claims are "
                    f"blocked until cited public domain translations ship. Descriptive presence "
                    f"is allowed, e.g. 'in Persian, with an English translation alongside'."
                ),
            })

    for pat in PRIVACY_PATTERNS:
        m = re.search(pat, phrase_text, re.IGNORECASE)
        if m:
            violations.append({
                "rule": "contested-privacy-phrase",
                "line": _line_of(phrase_text, m.start()),
                "detail": (
                    f"Hard-blocked wording per FACTS.md 'CONTESTED: privacy claims': "
                    f"'{m.group(0)}'. Whole-app privacy claims are blocked while the published "
                    f"privacy policy's outbound-host list is known to be incomplete. Narrow, "
                    f"checkable statements are allowed: 'no account required', 'no sign up', "
                    f"'no ads', and 'the journal is stored on device'."
                ),
            })

    m = BARE_FREE_RE.search(masked)
    if m:
        violations.append({
            "rule": "bare-free-claim",
            "line": _line_of(text, m.start()),
            "detail": (
                f"'{m.group(0).strip()}' states the price as a complete claim and omits in-app "
                f"purchases, which the App Store listing shows. Per FACTS.md pricing: use "
                f"'free to download, with optional extras'."
            ),
        })

    m = DOLLAR_RE.search(masked)
    if m:
        violations.append({
            "rule": "dollar-amount",
            "line": _line_of(text, m.start()),
            "detail": f"Dollar amount '{m.group(0).strip()}' prohibited in marketing copy per FACTS.md pricing rule; defer to App Store.",
        })

    for word in AMERICAN_SPELLINGS:
        m = re.search(r"\b" + word + r"\b", masked, re.IGNORECASE)
        if m:
            warnings.append({
                "rule": "american-spelling",
                "line": _line_of(text, m.start()),
                "detail": f"'{m.group(0)}' looks like American spelling; Australian English required.",
            })

    return {
        "mode": mode,
        "result": "FAIL" if violations else "PASS",
        "violations": violations,
        "warnings": warnings,
    }


def main():
    ap = argparse.ArgumentParser(description="Hamdam claim-audit deterministic lint (layer 1)")
    ap.add_argument("draft_file")
    ap.add_argument("--mode", choices=["draft", "final"], default="draft")
    ap.add_argument("--json", action="store_true", help="emit JSON verdict")
    args = ap.parse_args()

    try:
        with open(args.draft_file, encoding="utf-8") as f:
            text = f.read()
    except OSError as e:
        print(f"error: cannot read {args.draft_file}: {e}", file=sys.stderr)
        sys.exit(2)

    text = unicodedata.normalize("NFC", text)
    verdict = lint(text, mode=args.mode)

    if args.json:
        print(json.dumps(verdict, ensure_ascii=False, indent=2))
    else:
        print(f"RESULT: {verdict['result']} (mode={verdict['mode']})")
        for v in verdict["violations"]:
            print(f"  VIOLATION line {v['line']} [{v['rule']}]: {v['detail']}")
        for w in verdict["warnings"]:
            print(f"  warning   line {w['line']} [{w['rule']}]: {w['detail']}")

    sys.exit(0 if verdict["result"] == "PASS" else 1)


if __name__ == "__main__":
    main()
