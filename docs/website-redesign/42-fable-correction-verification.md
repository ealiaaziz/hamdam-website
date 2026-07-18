# Fable correction verification (F2)

Date: 2026-07-18. Model: Fable 5. Stage F2 of the Final Completion Mega Runner. Companion to
`40-fable-final-visual-audit.md` (F1) and `41-sonnet-correction-list.md`.

## 1. Evidence basis

Every verdict below was made from direct inspection, not from Sonnet's reports alone:

1. Built HTML under `dist/` (produced by the S6 build at commit `e92c145`), re-verified this
   session with fresh independent greps and Unicode counts, not by re-reading S5's numbers.
2. The full S6 screenshot set under `final-evidence/phase-13/screens/`, inspected image by
   image: the FA desktop full page sliced into six bands and read at full width, the EN and FA
   mobile full pages sliced and read, both ceremony mid-pass captures, the 404 capture, the
   keyboard-focus capture, and the FA privacy footer capture.
3. The reduced-motion captures, which turned out to be the key instrument this round: the
   documented scroll-reveal capture artefact (F1 audit section 0, `06-screenshot-index.md`)
   blanks the poets band in every standard full-page capture, but the reduced-motion captures
   disable the reveal and show the poet cards rendered, in both locales.
4. The pre-fable evidence (`final-evidence/pre-fable/`), used as the genuine "before" for
   side-by-side comparison, in particular `compare_ceremony.png`.
5. `keyboard-focus-trace-en.json` for the MOOD-03 stop.

One limitation, recorded honestly: a fresh live-browser capture pass was declined by the
owner this session, so no new screenshots were generated in F2. Where the archived evidence
carries the known capture artefact, the verdict below states exactly which evidence chain
substitutes for a live pixel check, and what residual risk remains.

## 2. Blocker and Major verification

### F1-00 (Blocker) DV-01 screen content: OPEN, unchanged, external

Six device frames still show the honest pending gradient (directly visible in the S6
captures: hero, constellation, journey pair, roots, privacy). This is by design: the
correction list itself ruled F1-00 not S5-actionable, forbade fabricated screenshots, and
specified the only valid close: Ealia (or a hamdam-ios session) runs the Screenshot
Orchestrator (`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`), exports the approved
marketing states per locale at 1290x2796, saves them into `src/assets/website-redesign/`,
and each is composited under its frame cutout with `object-fit: contain`. No new evidence
for it exists and none was expected. **Open.**

### F1-01 (Major) Rumi's Farsi display name: CLOSED

- Built HTML: `رومی` count is 0 in every built page; `مولانا` present 5 times in
  `dist/fa/index.html` and once in `dist/index.html` (the poet card plate), matching the two
  corrected sites (`poets.ts` plate, `verses.ts` attribution).
- Direct visual: the reduced-motion captures show the Rumi card plate reading مولانا with the
  RUMI transliteration beneath it, on both the EN and FA pages; the FA mood-demo verse card
  shows the rumi-011 attribution reading مولانا (zoomed and confirmed).
- Before: F1's own inspection recorded the plate reading رومی, proving the same element
  renders this same field. **Closed.**

### F1-02 (Major) Mood slider Farsi labels: CLOSED

- Direct visual: the FA desktop capture shows all five new labels rendered under the slider
  in stop order: سنگین، ناآرام، آرام، سبک، روشن. (A suspected duplicate label row in the
  band-sliced capture was zoomed and cleared: it is the showcase line "شعری برای هر صبح. پنج
  شاعر. دو زبان. قرن‌ها خرد.", not a duplicate.)
- Built HTML: all five present, the five interim clinical valence strings entirely absent,
  `aria-valuetext` follows the new labels, single DOM instance of each label word.
- `labelEn`, `sky`/`verseId` mappings and slider behaviour untouched per the S5 diff and the
  ledger's D5 re-verification. Ealia's veto window on this replacement stays open on the
  manual list. **Closed.**

### F1-03 (Major) Em dashes in Parvin's card copy: CLOSED

- Built HTML: the exact approved replacements are present in both locales ("the mirror: all
  with lessons" and "آینه؛ همه با درسی"). An independent Unicode sweep this session counts
  em dashes at exactly 4 per homepage (the three out-of-scope `verses.ts` translations,
  rumi-011 rendering twice) and 0 on every other page, matching the correction's acceptance
  test precisely.
- Visual: the Parvin card sits deep in the horizontal poet scroller and no archived capture
  shows that specific card rendered (same reveal artefact; live capture declined). The
  rendering chain is confirmed by direct sight of sibling cards rendering their description
  fields (Hafez's description visible in the reduced-motion EN capture), and the corrected
  bytes are proven in the DOM the renderer consumes. Residual risk of a rendering difference
  for one text node in an already-verified component is negligible; Ealia's final visual
  review covers it as a matter of course. **Closed.**

### F1-04 (Major) Ceremony density: CLOSED

The genuine before/after this correction was ordered for:

- Before (`final-evidence/pre-fable/compare_ceremony.png`, 430x932): a single petal, a
  near-full-viewport run of unbroken cream between nav and headline, all warmth pooled in a
  thin bottom sliver. This is what F1 called the page under-delivering its own emotional
  architecture.
- After (`final-evidence/phase-13/screens/ceremony-midpass-mobile.png` and
  `ceremony-midpass-desktop.png`): ten petals at visibly varied sizes distributed through
  the whole section on both viewports, the warm gradient reaching well past the vertical
  midpoint, the sun-over-dome horizon carrying real compositional weight, the CTA sitting
  cleanly on the brightest surface, and no viewport-height run of unbroken cream anywhere in
  the section.
- Measured: A6 re-verified in the ledger with a computed `.ceremony` height of 717px (85vh)
  at 390x844. D1/D5 re-verified (petal trigger logic untouched, still three dimensional
  moments, single pass, reduced-motion omits petals entirely; the reduced-motion captures
  this session show zero petals, confirming F4 completeness).
- The acceptance test's "Lighthouse within 1 point of the S4 baseline" could not be evaluated
  literally because the S4 baseline itself does not reproduce on this machine; the S6 A/B
  test against the untouched pre-S5 commit showed an identical score spread and identical
  LCP, proving F1-04 cost nothing. The intent of that clause (the correction must not buy
  beauty with performance) is satisfied; the absolute LCP question is G4, tracked separately
  below. **Closed.**

The section now earns its place as the page's emotional resolution. This was the weakest
section on the page at F1 and it is no longer.

## 3. Moderate verification

- **F1-05 bilingual 404: CLOSED.** Directly visible in `404-390x844.png`: English block,
  then the Farsi block rendered RTL with the three exact approved strings and its own
  بازگشت به همدم button. Built HTML confirms `lang="fa" dir="rtl"` and the `/fa/` link
  target; zero dashes on the page.
- **F1-06 privacy meta description: CLOSED.** The built `privacy/index.html` meta description
  is byte-exact to the approved string, closing with "No accounts, no third-party analytics,
  no data selling." (A meta tag has no visual rendering; the DOM is the medium of record.)
- **F1-07 MOOD-03 English line: CLOSED.** Built HTML contains "There is more waiting for you
  in the app" and the old clipped line is absent; the FA line is untouched; the S6 keyboard
  trace shows the corrected link text as a focus stop with visible outline and a 44px-class
  target.

## 4. The S6 footer fix, independently verified

Not one of F1's findings, but F2 was instructed to verify rather than trust it. Verified both
ways: fresh greps show `dist/fa/privacy/index.html` and `dist/fa/terms/index.html` contain
گنجور and none of the English footer strings, and the capture
`footer-fix-after-fa-privacy.png` shows the Farsi footer rendered correctly (nav links,
Ganjoor attribution, and the deliberately English trademark block matching `fa/index.astro`'s
own shipped precedent). English routes unaffected. No regression introduced by the fix.
**Verified closed.**

## 5. Regression review

The full FA desktop page (six bands), the EN and FA mobile pages through the poets, roots,
plans, Founding Companion, ceremony and footer sections, the 404, and both ceremony mid-pass
captures were read directly for anything the corrections might have broken. Findings:

1. **No regression caused by any S5 correction was found.** Hierarchy, spacing, RTL
   mirroring, Persian dominance on verse cards, the plans and Founding Companion bands, and
   the footer all present as at F1 or better.
2. **One new minor observation, pre-existing, not correction-caused:** on the FA page, the
   English translation line inside verse cards renders its terminal full stop at the visual
   left edge of the line (a neutral character resolving against the RTL paragraph direction),
   so the English italic reads ".Though autumn committed many cruelties" with a leading dot.
   S5 touched none of this markup; the same rendering is implied in all prior FA evidence.
   Recorded as Minor: a candidate one-line fix (an explicit LTR direction on the translation
   element) for a future round, at Ealia's discretion. Not blocking.
3. The empty-looking poets band and unloaded poet portraits in the standard full-page
   captures were re-confirmed as the documented capture artefact (reveal animation plus lazy
   loading), not a site defect: the reduced-motion captures show the band rendered, and F1's
   live captures already confirmed the portraits paint in both locales.

## 6. Open items acknowledged, not blocking this verification

These are not corrections F2 was verifying, and none is a new visual defect:

- **F3 contrast:** Lighthouse's `color-contrast` audit still fails on the
  constellation/journey copper-surface text; F1's direct inspection of the rendered pixels
  judged the contrast comfortable. The discrepancy stays a real-device manual check, as F1
  ruled. Unchanged by S5.
- **G4 LCP:** 2.9 to 3.2s locally against a 2.5s target, proven by A/B not to be an S5
  effect; needs a real deployed-environment measurement before it is honestly pass or fail.
- Two stale Phase-9 TODOs (sticky-CTA boundary behaviour, scroll-progress anchoring) found by
  S6, needing a live scroll-through or a product decision.

## 7. Verdict

Every S5-actionable Blocker and Major is **Closed**: F1-01, F1-02, F1-03, F1-04, and all
three Moderates (F1-05, F1-06, F1-07), plus the independently verified S6 footer fix. No
material North Star regression, no materially weak Farsi or mobile layout, no unapproved
final asset beyond the standing exception, no unresolved false product claim, no unapproved
public copy.

**F1-00 remains the sole open Blocker.** It is external-evidence-gated: the correction list
itself declared it not S5-actionable and forbade every in-repo route to closing it. Returning
to S5 would therefore create an empty correction round, which the runner's own reentrancy
rule forbids. Accordingly:

**Visual Approval Granted, with one standing exception: F1-00 (DV-01 screen content).**
Approval covers all design, copy, asset, and correction work reviewable from this repository.
It does not cover, and cannot cover, the six empty device screens; the site must not be
called visually accepted for production until real app captures land. S7 must carry F1-00 as
the explicitly recorded exception (its own reporting format anticipates exactly this: "15 of
15 or exact exception", "Open Blocker count"), must not soften it, and must hand Ealia the
one exact action: run the hamdam-ios Screenshot Orchestrator for the approved marketing
states per locale at 1290x2796 and deliver the outputs to this repo for compositing under
the frame cutouts, followed by a short Fable spot check of the six composited frames.

## 8. Remaining manual checks

Unchanged from `FINAL-COMPLETION-STATE.md` section 21, with the section 5 minor observation
(FA-page English translation full stop) added at Minor severity. The list stays with the
state file as the single source; S7 must reproduce it accurately in the release-candidate
checklist.

Next stage: S7, Sonnet 5.
