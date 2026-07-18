# Fable correction list for S5 (Sonnet)

Date: 2026-07-18. Companion to `40-fable-final-visual-audit.md`. Implement every item below
exactly as specified; do not reinterpret, extend, or trade scope. After all items: run the
full validation suite (tests, production build, `check:persian`, em-dash sweep of built HTML,
CSP inline-code sweep), capture before/after evidence per finding, and record everything in
`phase-reports/fable-correction-implementation-report.md`.

Persian text below was authored under Fable's F1 copy authority and must be applied by
copy-paste from this file, never retyped by hand. Run `npm run check:persian` after applying.

---

## F1-00 (Blocker) DV-01 screen content: NOT an S5 item

Recorded here so the numbering stays aligned; S5 cannot close this from the website repo.
The exact action, for Ealia or a hamdam-ios session: run the Screenshot Orchestrator
(`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`) to export the approved deterministic
marketing states (Today, Roots, Privacy, and the two Reflections/Journey states) per locale
at 1290x2796, save the approved outputs into `src/assets/website-redesign/` in this repo,
then composite each under its frame cutout with `object-fit: contain` (never stretch-to-fill).
S5 must not fabricate screenshots, must not build HTML mock app UI, and must not treat the
current gradient fill as acceptable for release. Leave the honest pending state in place
until real captures exist.

## F1-01 (Major) Rumi's Farsi display name

- **Files:** `src/data/poets.ts` line 16; `src/data/verses.ts` line 28.
- **Correction:** `persianName: 'رومی'` becomes `persianName: 'مولانا'`;
  `poetFa: "رومی"` becomes `poetFa: "مولانا"`.
- **Why:** the shipped app names him مولانا on every surface (hamdam-ios
  `Core/Localization.swift`, Watch app, widgets, complications) and this site's own
  COMPANION-02 body copy already says مولانا. The card plate contradicting both is a real
  cultural-register defect for any Persian-literate visitor.
- **Must not change:** any other Persian byte in either file; the EN transliteration "Rumi";
  the portrait; the verse text.
- **Acceptance test:** built EN and FA pages show مولانا on the Rumi card plate and the
  rumi-011 verse attribution; `grep -rn "رومی" src/` returns nothing; `check:persian` passes;
  full test suite passes.

## F1-02 (Major) Mood slider Farsi labels

- **File:** `src/lib/moodDemo.js` (MOOD_STOPS `labelFa` values and the explanatory comment
  above them).
- **Correction:** replace the five `labelFa` values, in stop order:

| id | labelEn | new labelFa |
|---|---|---|
| heavy | Heavy | سنگین |
| unsettled | Unsettled | ناآرام |
| steady | Steady | آرام |
| light | Light | سبک |
| bright | Bright | روشن |

- Update the file's comment: the interim Apple Health valence strings are replaced by
  Fable-authored final labels (F1, 2026-07-18), warm register matched to the EN set; note
  Ealia may still veto in favour of app-string continuity at her review.
- **Why:** the runner's Mood Label Rule requires equivalent emotional range and forbids
  keeping an unexplained-in-product mismatch; a clinical HealthKit data-entry register does
  not belong in the marketing demo's Farsi while the English speaks warmly. The new scale is
  idiomatic heart language (دل سنگین، دل سبک، دل روشن).
- **Must not change:** `labelEn` values; `sky` and `verseId` mappings; debounce logic;
  slider behaviour; MOOD-04's aria-label.
- **Acceptance test:** FA page slider shows the five new labels and `aria-valuetext` follows
  them; `check:persian` passes; `moodDemo` tests pass (none pin FA labels, verified in F1).

## F1-03 (Major) Em dashes in Parvin's card copy

- **File:** `src/data/poets.ts` (Parvin entry only).
- **Correction:**
  - `description`: `'Small things speak. The needle, the ant, the mirror — all with lessons.'`
    becomes `'Small things speak. The needle, the ant, the mirror: all with lessons.'`
  - `descriptionFa`: `'چیزهای کوچک سخن می‌گویند. سوزن، مورچه، آینه — همه با درسی.'`
    becomes `'چیزهای کوچک سخن می‌گویند. سوزن، مورچه، آینه؛ همه با درسی.'`
- **Why:** rendered marketing copy on both locales; the no-em-dash rule is hard and these
  are website-original strings, not app-bundled content. (The three em dashes inside
  `verses.ts` English translations are byte-copies of the app's bundled translations and are
  explicitly NOT to be touched; that style question is already open with Ealia app-side.)
- **Acceptance test:** em-dash sweep of built HTML finds only the three `verses.ts`
  translation instances per page and nothing else; `check:persian` passes.

## F1-04 (Major) Ceremony density

- **File:** `src/components/FinalCeremony.astro` (CSS and petal markup only).
- **Corrections, all three parts required:**
  1. **Petal presence.** Increase fall positions from 6 to 10 (keep cycling the three CY-01
     files) and vary rendered sizes across the approved 24-48px range instead of uniform
     32px: use a repeating mix in roughly the 28 / 36 / 44px family via `:nth-child` rules.
     The pass runs once per page load exactly as now; petals stay `aria-hidden`; reduced
     motion still omits them entirely.
  2. **Warm glow reach.** Extend the section's warm first-light tone so it reaches at least
     the vertical midpoint of the section (strengthen the existing class-based background
     gradient; no inline styles, no new assets, no new dimensional moment).
  3. **Mobile empty run.** At widths below 768px, remove the near-viewport-height stretch of
     unbroken cream between the nav and the headline block: tighten the section's
     `min-height` and/or raise the rendered height of the HW-03 horizon so imagery or warm
     gradient occupies the space (acceptance criterion A6).
- **Must not change:** the single-pass/no-replay petal behaviour (D5); the count of
  dimensional moments (D1); the HW-03 asset file; headline copy (CEREMONY-01, approved); CTA
  prominence and contrast (E4); reduced-motion completeness (F4).
- **Acceptance test:** fresh captures at 430x932 and 1440x900 show no viewport-height run of
  unbroken cream anywhere inside the ceremony section; a mid-pass capture shows petals
  clearly present at varied sizes; D1/D5 re-verified; Lighthouse performance within 1 point
  of the S4 baseline on both locales.

## F1-05 (Moderate) Bilingual 404

- **File:** `src/pages/404.astro`.
- **Correction:** keep the single 404 document (static hosting serves exactly one custom 404,
  so a separate `fa/404.astro` would never be served for missing FA routes; record this
  constraint in a code comment). Beneath the existing English copy, add a Farsi block with
  `lang="fa" dir="rtl"`, using exactly:
  - `این صفحه راهش را گم کرده است.`
  - `به آغاز بازگرد.`
  - Link text to `/fa/`: `بازگشت به همدم`
  The FA link must point to `/fa/`, the EN link stays pointed at `/`.
- **Acceptance test:** built `404.html` contains both languages with correct `lang`/`dir`
  attributes and both links; `check:persian` passes; no em dash.

## F1-06 (Moderate) Privacy meta description

- **File:** `src/pages/privacy.astro` (meta description only).
- **Correction:** replace the description's closing clause "No accounts, no analytics, no
  data selling." with "No accounts, no third-party analytics, no data selling." The full
  approved string: "How Hamdam handles data: what it accesses, what it never collects, and
  how iCloud sync works. No accounts, no third-party analytics, no data selling."
- **Why:** the absolute "no analytics" is exactly the phrasing the runner forbids while
  Cloudflare edge measurement state is unverifiable from this repo; the page body's own §2
  already uses the precise framing.
- **Acceptance test:** built `privacy/index.html` meta description contains "no third-party
  analytics"; `fa/privacy.astro` needs no change (its description never used the absolute
  claim, per META-10).

## F1-07 (Moderate) MOOD-03 English line

- **File:** wherever the mood demo's closing line lives (`MoodDemo.astro`).
- **Correction:** "There is more waiting in the app" becomes
  "There is more waiting for you in the app". FA line unchanged.
- **Acceptance test:** EN page shows the new line; FA page byte-identical to before.

---

## Out of scope for S5, restated

No new features, no new assets, no new dependencies, no reinterpretation of accepted
differences (hero structure, Roots header, light-dominant site, CY-01 substitution, HW-02
derivation), no changes to `verses.ts` translations, no push, no merge, no deploy.
