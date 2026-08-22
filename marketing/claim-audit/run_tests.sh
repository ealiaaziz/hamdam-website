#!/usr/bin/env bash
# Layer 1 fixture tests.
#
# The expectations used to live in README.md as a sentence ("t1, t5, t8, t9,
# t10 PASS; t2, t3, t4, t6, t7, t11 FAIL"), which is a list a person has to
# read and compare by eye. It is a table here instead so a broken rule fails
# a command rather than a reader's attention. Run from anywhere:
#
#     bash marketing/claim-audit/run_tests.sh
#
# Exit 0 = every fixture behaved as expected.

set -uo pipefail
cd "$(dirname "$0")"

LINT="audit_lint.py"

# fixture                                expected  what it pins
EXPECTATIONS="
t1_clean.txt                             PASS
t2_emdash.txt                            FAIL
t3_hyphen.txt                            FAIL
t4_persian_unmarked.txt                  FAIL
t5_persian_marked.txt                    PASS
t6_contested.txt                         FAIL
t7_dollar.txt                            FAIL
t8_url.txt                               PASS
t9_american.txt                          PASS
t10_dash_in_fa.txt                       PASS
t11_unbalanced.txt                       FAIL
t12_translation_flatten_a.txt            FAIL
t13_translation_flatten_english.txt      FAIL
t14_translation_soften.txt               FAIL
t15_translation_doesnt_flatten.txt       FAIL
t16_translation_faithful.txt             FAIL
t17_translation_uncompromising.txt       FAIL
t18_translation_true_to_original.txt     FAIL
t19_translation_properly_translated.txt  FAIL
t20_privacy_no_tracking.txt              FAIL
t21_privacy_collect_nothing.txt          FAIL
t22_privacy_nothing_leaves.txt           FAIL
t23_privacy_no_data_collected.txt        FAIL
t24_bare_free.txt                        FAIL
t25_allowed_phrasing.txt                 PASS
t26_translation_curly_apostrophe.txt     FAIL
t27_presentation_alongside.txt           FAIL
t28_presentation_beside.txt              FAIL
t29_verse_alongside_ok.txt               PASS
t30_undiminished_blocked.txt             FAIL      translation-quality claim found live in the Instagram bio 2026-08-22
t31_diminish_in_verse_ok.txt             PASS      the same word inside real verse text must not trip it
t32_beside_careful_english.txt           FAIL      two claims in one line, live on the YouTube channel 2026-08-22
t33_alongside_no_language_ok.txt         PASS      alongside with no language word is ordinary prose
"

fails=0
checked=0

# Three fields, not two. The header above has always described a third "what it
# pins" column, but the parser read only two, so `expected` swallowed the note
# and every annotated row failed to match. Nothing used the column, so nothing
# noticed until 2026-08-22.
while read -r fixture expected _note; do
  [ -z "${fixture:-}" ] && continue
  if [ ! -f "tests/$fixture" ]; then
    echo "MISSING  tests/$fixture"
    fails=$((fails + 1))
    continue
  fi
  if python3 "$LINT" "tests/$fixture" >/dev/null 2>&1; then
    actual=PASS
  else
    actual=FAIL
  fi
  checked=$((checked + 1))
  if [ "$actual" = "$expected" ]; then
    printf 'ok       %-40s %s\n' "$fixture" "$actual"
  else
    printf 'NOT OK   %-40s expected %s, got %s\n' "$fixture" "$expected" "$actual"
    fails=$((fails + 1))
  fi
done <<< "$EXPECTATIONS"

# t5 carries [FA] markers, which are fine in a draft and not in final copy.
# The only fixture whose verdict depends on the mode, so it is checked apart
# from the table rather than given a second column nothing else would use.
if python3 "$LINT" "tests/t5_persian_marked.txt" --mode final >/dev/null 2>&1; then
  echo "NOT OK   t5_persian_marked.txt                   expected FAIL in final mode, got PASS"
  fails=$((fails + 1))
else
  printf 'ok       %-40s %s\n' "t5_persian_marked.txt (final)" "FAIL"
fi

echo
if [ "$fails" -eq 0 ]; then
  echo "layer 1: $checked fixtures plus the final-mode check, all as expected"
  exit 0
fi
echo "layer 1: $fails unexpected result(s)"
exit 1
