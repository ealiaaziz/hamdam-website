# S5 - Fable correction implementation report

Date: 2026-07-18. Model: Sonnet 5. Implements `41-sonnet-correction-list.md` items F1-01
through F1-07 exactly as specified (F1-00 is explicitly not an S5 item; see below). Persian
text applied by copy-paste from the correction list, never retyped.

---

## F1-00 (Blocker) DV-01 screen content

Not actioned here per the correction list's own instruction: this is not S5-actionable from
the website repo. The pending gradient state is left in place. Exact action recorded in
`41-sonnet-correction-list.md` and carried into the manual checklist for Ealia.

## F1-01 (Major) Rumi's Farsi display name

**Files:** `src/data/poets.ts` line 16, `src/data/verses.ts` line 28.

- Before: `persianName: 'رومی'` / `poetFa: "رومی"`
- After: `persianName: 'مولانا'` / `poetFa: "مولانا"`

**Verification:**
- `grep -rn "رومی" src/` → no matches.
- Built `dist/fa/index.html` contains `مولانا` on the Rumi card plate and the rumi-011 verse
  attribution; `رومی` absent from the same file.
- `npm run check:persian` → passed.
- `npm run test` → 110/110 passed.

**Status: Fixed.**

## F1-02 (Major) Mood slider Farsi labels

**File:** `src/lib/moodDemo.js`.

- Before: `بسیار ناخوشایند`, `ناخوشایند`, `خنثی`, `خوشایند`, `بسیار خوشایند` (interim Apple
  Health valence strings), with a comment flagging the clinical-register mismatch.
- After: `سنگین`, `ناآرام`, `آرام`, `سبک`, `روشن` (Fable-authored warm labels), comment
  rewritten to record the F1-02 replacement and Ealia's standing veto option.
- `labelEn` values, `sky`/`verseId` mappings, debounce logic and MOOD-04's aria-label
  untouched.

**Verification:**
- Built `dist/fa/index.html` contains all five new labels (سنگین، ناآرام، آرام، سبک، روشن);
  they also appear in the `aria-valuetext` output for the default slider position.
- `npm run check:persian` → passed.
- `npm run test` → 110/110 passed (no test pins FA labels, matching the F1 note).

**Status: Fixed.**

## F1-03 (Major) Em dashes in Parvin's card copy

**File:** `src/data/poets.ts` (Parvin entry only).

- Before (EN): `'Small things speak. The needle, the ant, the mirror — all with lessons.'`
- After (EN): `'Small things speak. The needle, the ant, the mirror: all with lessons.'`
- Before (FA): `'چیزهای کوچک سخن می‌گویند. سوزن، مورچه، آینه — همه با درسی.'`
- After (FA): `'چیزهای کوچک سخن می‌گویند. سوزن، مورچه، آینه؛ همه با درسی.'`

**Verification:**
- Built `dist/index.html` and `dist/fa/index.html` contain the new punctuation.
- Em-dash sweep of built HTML (Python, exact U+2014/U+2013 count per file): `dist/index.html`
  and `dist/fa/index.html` each show 4 em dashes total, all four traced to the three
  `verses.ts` translation strings that are explicitly out of scope (hafez-016, rumi-011,
  parvin-008 -- rumi-011 renders twice per page, in the mood demo and the poet gallery,
  which is why the raw count is 4 rather than 3). No other em dash anywhere in built output.
  `dist/404.html`, `dist/privacy/index.html`, `dist/terms/index.html` and their `fa/`
  equivalents show zero.
- `npm run check:persian` → passed.

**Status: Fixed.**

## F1-04 (Major) Ceremony density

**File:** `src/components/FinalCeremony.astro` (CSS and petal markup only).

**1. Petal presence.** `PETAL_IMAGES` widened from 6 to 10 entries, still cycling the three
CY-01 files (`petal1, petal2, petal3` repeated, closing on a 4th `petal1`). Ten `nth-child`
position rules added (6%-94% spread), each carrying an explicit width/height from the
28/36/44px family (previously a uniform 32px) -- still within the approved 24-48px range.
Ten matching `animation-delay` rules added (0ms-2700ms, 300ms step, same cadence as before).
Single-pass IntersectionObserver trigger (D5) and the `prefers-reduced-motion` exclusion
(petals never render for reduced-motion) both untouched.

**2. Warm glow reach.** Added a class-based `background-image: radial-gradient(...)` on
`.ceremony`, layered under the existing `background-color: var(--surface-morning)` fallback,
using only existing tokens (`--hamdam-saffron`, `--surface-dawn`, `--surface-morning`) --
no new colour, no new asset, no inline style. The gradient's warm stops (saffron at 0%
fading through dawn to morning by 62%) reach well past the section's 50% vertical midpoint.

**3. Mobile empty run.** Added a `@media (max-width: 767px)` block: `.ceremony` `min-height`
tightened from 100vh to 85vh; `.ceremony__horizon-photo` given an explicit `height: 55vh`
with `object-fit: cover; object-position: bottom` (previously `height: auto`, which on
narrow viewports rendered short relative to the 100vh section and left a cream gap above it).

**Must-not-change items confirmed unchanged:** single-pass/no-replay petal behaviour (D5,
JS trigger logic untouched); dimensional-moment count (D1, no new moment added, only
existing horizon photo + new gradient layer); the HW-03 asset file itself (same import,
`ceremony-morning-horizon.png`); headline copy (`closingLine`, both languages, byte-identical
to before); CTA markup/contrast (`AppStoreBadge` block untouched); reduced-motion completeness
(the `@media (prefers-reduced-motion: no-preference)` wrapper around all petal animation is
unchanged, so reduced-motion visitors still see zero petals).

**Verification:**
- `npm run build` → clean, no errors.
- Built `dist/index.html` contains exactly 10 `ceremony__petal-img` instances (grep count).
- Built CSS (`dist/_astro/dawn-section.B4dkGoiC.css`) contains the `radial-gradient` rule
  referencing `hamdam-saffron`.
- `npm run test` → 110/110 passed (no test asserts petal count or gradient, confirmed no
  breakage).
- Fresh visual captures at 430x932 and 1440x900 were not run as a separate screenshot pass
  in this session (Playwright capture tooling not invoked); the acceptance test's visual
  confirmation (no unbroken-cream run, petals visible at varied sizes) is deferred to F2 review
  of this report against the corrected build, per the runner's stage design (S6/F2 own fresh
  screenshot evidence, not S5).

**Status: Fixed** (code-level; visual confirmation deferred to F2 per runner design).

## F1-05 (Moderate) Bilingual 404

**File:** `src/pages/404.astro`.

- Kept the single 404 document; added a code comment recording the static-hosting constraint
  (a separate `fa/404.astro` would never be served for missing FA routes).
- Added a `lang="fa" dir="rtl"` block beneath the existing English copy with the exact
  approved strings: `این صفحه راهش را گم کرده است.` / `به آغاز بازگرد.` / link text
  `بازگشت به همدم` pointing to `/fa/`. EN link unchanged, still points to `/`.

**Verification:**
- Built `dist/404.html` confirmed (Python string search) to contain: the `lang="fa"
  dir="rtl"` attribute pair, all three FA strings verbatim, an `href="/fa/"` link, and the
  original `href="/"` EN link.
- `npm run check:persian` → passed.
- Em-dash sweep: `dist/404.html` shows 0 em/en dashes.

**Status: Fixed.**

## F1-06 (Moderate) Privacy meta description

**File:** `src/pages/privacy.astro`.

- Before: `"...No accounts, no analytics, no data selling."`
- After: `"...No accounts, no third-party analytics, no data selling."`
- `fa/privacy.astro` needs no change per META-10 (its description never used the absolute
  claim) -- confirmed unchanged.

**Verification:**
- Built `dist/privacy/index.html` meta description contains "no third-party analytics"
  verbatim.

**Status: Fixed.**

## F1-07 (Moderate) MOOD-03 English line

**File:** `src/components/MoodDemo.astro`.

- Before: `'There is more waiting in the app'`
- After: `'There is more waiting for you in the app'`
- FA line (`'چیزهای بیشتری در اپلیکیشن منتظرت است.'`) confirmed byte-identical, untouched.

**Verification:**
- Built `dist/index.html` contains the new EN string.
- `dist/fa/index.html` FA string unchanged (diffed against pre-S5 build output).

**Status: Fixed.**

---

## Full validation suite (post-corrections)

| Check | Result |
|---|---|
| `npm run test` | 110/110 passed |
| `npm run build` (production) | Clean, 7 pages built, no errors |
| `npm run check:persian` | Passed |
| Em-dash sweep of built HTML | Only the 3 pre-existing, explicitly out-of-scope `verses.ts` translation instances (hafez-016, rumi-011 x2, parvin-008); zero elsewhere |
| CSP inline-code sweep | Zero inline `style="..."` attributes in built HTML; one pre-existing `application/ld+json` script block (not new, not affected by this stage) |

No push, no merge, no deploy performed at any point in this stage.

## Resolution summary

| Finding | Severity | Resolution |
|---|---|---|
| F1-00 | Blocker | Not S5-actionable; carried to manual checklist |
| F1-01 | Major | Fixed |
| F1-02 | Major | Fixed |
| F1-03 | Major | Fixed |
| F1-04 | Major | Fixed (code-level; visual confirmation deferred to F2) |
| F1-05 | Moderate | Fixed |
| F1-06 | Moderate | Fixed |
| F1-07 | Moderate | Fixed |

## Files changed

`src/components/FinalCeremony.astro`, `src/components/MoodDemo.astro`, `src/data/poets.ts`,
`src/data/verses.ts`, `src/lib/moodDemo.js`, `src/pages/404.astro`, `src/pages/privacy.astro`.

No new dependency added. No feature added beyond the seven specified corrections. No
accepted difference (hero structure, Roots header, light-dominant site, CY-01 substitution,
HW-02 derivation) reinterpreted. `verses.ts` translation em dashes left untouched as directed.
