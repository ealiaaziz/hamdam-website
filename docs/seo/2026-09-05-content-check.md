# Content check: word counts + dash sweep (2026-09-05)

Scope: local source only (`src/data/`, `src/components/`, `src/pages/`), built with
`astro build` and measured from the resulting `dist/` HTML. No live-site crawl performed.
No source files were modified for this check.

## 1. Word count per page type

Counted from the rendered `dist/*/index.html` output, stripping `<script>`, `<style>`,
`<svg>`, `<noscript>`. Two figures given per page: whole `<body>` (includes nav + footer
chrome) and `<main id="main-content">` only (page-specific content, excludes the shared
nav/footer).

| Page | File | Whole-body words | `<main>`-only words |
|---|---|---|---|
| EN homepage | `dist/index.html` (from `src/pages/index.astro`) | 1,726 | 1,716 |
| Poet page — Hafez | `dist/poets/hafez/index.html` (from `src/pages/poets/[poet].astro` + `src/components/PoetArticle.astro`) | 250 | 240 |
| Moment page — Yalda | `dist/moments/yalda/index.html` (from `src/pages/moments/[moment].astro` + `src/components/MomentArticle.astro`) | 143 | 133 |
| Fal-e-Hafez | `dist/fal-e-hafez/index.html` (from `src/pages/fal-e-hafez.astro` + `src/components/FalHafezArticle.astro`) | 306 | 296 |

### Verdict against ranking/citation-relevant minimums

- **EN homepage — not thin.** ~1,700 words of main content clears the homepage floor
  (500) by more than 3x. No concern here.
- **Poet page (Hafez) — thin.** ~240-250 words is well under even the lowest reasonable
  bar for a dedicated content page (service-page floor is 800; even a lenient "profile
  page" reading would want several hundred words of substantive, non-boilerplate text).
  At this length the page is mostly template chrome around a small amount of unique copy
  and is a weak candidate to rank or be cited as an authority on Hafez specifically —
  there isn't enough distinct text for a crawler or an LLM to extract much beyond a name
  and a one-line description.
- **Moment page (Yalda) — thinnest of the four, and thin against its own stated
  floor.** ~133-143 words is roughly a quarter of the 500-600 word location/moment-page
  minimum. This is the weakest page of the set by a wide margin and is the one most
  likely to be treated as thin/low-value content or skipped for citation, since there's
  barely a paragraph of unique material once nav/footer is excluded.
- **Fal-e-Hafez — thin relative to typical service/tool-page expectations.** ~296-306
  words. There's no single locked floor for a "tool" page in the minimums table, but by
  comparison to a service page (800) or blog post (1,500) it is well short. It is longer
  than the poet and moment pages, so it is the least concerning of the three thin pages,
  but on its own it is unlikely to carry much topical authority for "fal-e-hafez" as a
  search/citation target.

**Summary ranking, thinnest to thickest:** Yalda (133-143) < Hafez poet (240-250) <
Fal-e-Hafez (296-306) << EN homepage (1,716-1,726). Three of the four pages checked
(poet, moment, fal-e-hafez) sit far enough below any comparable minimum in the table to
flag as thin content risks; only the homepage clears its floor.

## 2. Em dash (U+2014) and en dash (U+2013) sweep

Searched `src/data/`, `src/components/`, `src/pages/` for both characters with
`grep -rnP '[\x{2014}\x{2013}]'`.

**Result: 6 occurrences found, all em dashes (U+2014). Zero en dashes (U+2013)
anywhere in the three directories.**

All 6 are in one file, `src/data/verses.ts`:

| Line | Context |
|---|---|
| 2 | Code comment, not rendered copy: `// bundled verse bank (Hamdam/Content/Verses/*.json) — Ganjoor-sourced and` |
| 34 | `english` translation field: `"Since none can guarantee tomorrow, keep this restless heart content today / Drink wine by moonlight — the moon will shine long after we are gone."` |
| 42 | `english` translation field: `"Tell the bud: do not be small-hearted at what remains closed — for from the morning's breath you will find help, and from the breeze's sigh."` |
| 50 | `english` translation field: `"Though autumn committed many cruelties — see what faithfulness spring brings."` |
| 58 | `english` translation field: `"A small sparrow said at dawn to a pigeon: won't you too lift your head from this nest? / The horizons are bright — why do you sleep in darkness? Fly a day, go see the meadow, the stream, the brook."` |
| 74 | `english` translation field: `"O joyful breath of the morning wind — you have come from the beloved; welcome!"` |

Note on interpretation: the project rule against em/en dashes targets *generated* copy.
Line 2 is a developer comment (not rendered to the site). Lines 34, 42, 50, 58, and 74
are English translations of Persian verse text, not Claude-authored marketing/UI copy —
worth a human call on whether the rule is meant to extend to poetry translations, but
flagged here regardless since the raw character is present in the content source.
