# Phase 13 (S6) full acceptance report

Date: 2026-07-18. Model: Sonnet 5. Fresh evidence captured from the corrected build
(post-S5 commit `fb479ff`, plus one additional fix made during this stage, `c3f6b5f` --
see "New finding" below). Full detail lives in `docs/website-redesign/final-evidence/phase-13/`
and `docs/website-redesign/18-acceptance-results.md` (updated alongside this report). This
document is the narrative; the acceptance ledger is the authoritative gate-by-gate record.

## What was actually re-run this session (not carried forward)

- `npm run test`: 110/110, twice (once after S5, once after the footer fix below).
- `npm run build`: clean, twice.
- `npm run check:persian`: passed, twice.
- Em-dash sweep of built HTML (Python, exact Unicode count): only the three pre-existing,
  explicitly out-of-scope `verses.ts` translation instances, confirmed on the rebuilt output.
- CSP inline-style/script sweep of built HTML: zero inline `style=`, one pre-existing
  `application/ld+json` block (unaffected).
- Full viewport/experience screenshot matrix: 6 viewports x EN/FA homepage, plus
  privacy/terms/404 at two viewports, reduced-motion and forced-colors emulation at two
  viewports, a 12-stop keyboard focus trace (desktop), an ARIA accessibility-tree snapshot
  (EN + FA), and a Playwright-computed contrast pass (methodology caveat below). Full set in
  `final-evidence/phase-13/screens/` (curated subset) and the scratchpad capture manifest.
- Lighthouse: fresh runs against the corrected build, both locales, plus an A/B test against
  an isolated worktree of the pre-S5 commit to separate S5's effect from local measurement
  noise. Full detail: `final-evidence/phase-13/lighthouse/lighthouse-summary.md`.
- Route/regression grep checks: B3 (no reviews/counts), B4 (no Forough/فروغ), B5 (no dollar
  figures), C6 (Ganjoor/گنجور attribution, both locales), D2 (no canvas), D4 (no
  audio/video), E3 (no App Store links pre-release), H2 (hreflang/OG/sitemap/JSON-LD present).
- Placeholder audit (`placeholder|temporary|temp|provisional|TODO|FIXME|mock|candidate`)
  across `src/`.

## New finding: FA legal-page footer was rendering English text

Not part of Fable's F1-01 through F1-07 correction list, and not caused by S5 -- discovered
during this stage's own regression sweep. `src/components/Footer.astro` had no `lang` prop.
`fa/privacy.astro` and `fa/terms.astro` import it directly and were rendering "An app by the
Hamdam Team", "Verses sourced from Ganjoor.net", and English nav links on Farsi-locale pages.
`fa/index.astro` was unaffected -- it has always had its own separate, correctly localized
inline footer, never used the shared component.

This was fixed in-session (commit `c3f6b5f`): `Footer.astro` now takes a `lang` prop; the FA
branch is copied verbatim from `fa/index.astro`'s own already-shipped footer (no new Persian
authored, matching this stage's own "no invented Persian" rule). The trademark/copyright block
stays English/LTR on both locales, matching that same existing page's own precedent (it was
already deliberately untranslated there). Verified in built output: `dist/fa/privacy/index.html`
and `dist/fa/terms/index.html` now contain the Farsi footer strings and zero instances of the
English ones; `dist/index.html`, `dist/privacy/index.html`, `dist/terms/index.html` (English
routes) are unaffected. Full suite re-run clean after the fix (110/110, build, check:persian,
em-dash sweep, CSP sweep). Before/after: the bug is captured in grep evidence in this report's
history; an "after" screenshot is at `final-evidence/phase-13/screens/footer-fix-after-fa-privacy.png`.

This was judged in-scope to fix directly (not merely record) because it required zero design
or copy judgment -- the Farsi strings needed already existed verbatim, shipped, on
`fa/index.astro`; the fix is purely wiring a `lang` prop through, the same pattern already used
by every other component in this codebase (`PrivacyTrust`, `PlansAndFoundingCompanion`,
`FinalCeremony`, `HamdamLogotype`, etc.).

## Two stale-TODO findings (not fixed, recorded for a decision)

Found during the placeholder audit, both pre-date S5 and reference Phase 9 as not-yet-shipped
even though Phase 9 shipped weeks ago (commit `0ea0d73`):

1. `src/components/StickyDownloadAction.astro` (CSS comment): "TODO(Phase 9): once the
   footer/ceremony boundary exists, confirm the pill also hides across that gap, not just
   while ceremony itself is in view." The boundary now exists. Whether the sticky mobile CTA
   correctly hides across the ceremony-to-footer gap was not re-verified this session (would
   need a live scroll-through capture at the exact boundary, not a static screenshot).
2. `src/layouts/BaseLayout.astro` (scroll handler comment): "TODO(Phase 9): re-anchor
   progressDistance to the real ceremony section's offset once it exists, instead of total
   page height." Still using total page height. Practical effect is likely small (ceremony is
   the last section before a short footer, so the two distances are close), but this is
   unverified, not measured, this session.

Neither was fixed here: both require either a short live-scroll verification pass or a
product decision about acceptable precision, not a mechanical no-judgment fix like the footer
issue above. Recorded in the acceptance ledger under E1 and A5 respectively.

## Lighthouse / performance: not cleanly reproducing the S4 baseline (see full write-up)

Full analysis in `final-evidence/phase-13/lighthouse/lighthouse-summary.md`. Headline:
Performance scores are noisy on this local machine (89-94 across identical repeated runs,
proven via an A/B test against the untouched pre-S5 commit in an isolated worktree -- same
89/91 spread with zero code changes, so **F1-04 did not regress performance**). Accessibility
is a stable, reproducible 97 (not 100) on every run, both builds, both locales -- the single
failing audit is `color-contrast`, the same pre-existing, already-recorded discrepancy from
the F1 audit (constellation/journey copper-surface text), not new. **LCP measures 2.9-3.2s,
above the G4 gate's 2.5s target, identically on both the pre-S5 and post-S5 builds** -- not
an S5 regression, but not a currently-passing gate either, and this session's local
`astro preview` + local Lighthouse method cannot distinguish "real regression predating S5"
from "measurement environment doesn't match whatever conditions S4 was measured under."
Flagged honestly as needing a real Cloudflare Pages preview-deploy measurement, not resolved
here.

## What was NOT re-verified this session (carried forward from Phase 12 / S4 / F1)

Per the reentrant principle ("never repeat a completed stage unless validation proves
regression"), applied at the gate level: gates whose underlying code S5 did not touch, and
where this session found no evidence of regression, are carried forward from their last
concrete verification rather than re-measured from zero. This includes: RTL mirroring
measurements (C3), token-based verse-size dominance (C4), the full 20-stop keyboard trace and
nine contrast fixes from Phase 12 (F1/F3/F7 base), `prefers-contrast: more` (F5, distinct from
the forced-colors emulation this session did capture), motion-JS budget (G5), the `?dawn=N`
parameter (H3), and language-toggle query preservation (H4, though one fresh spot-check this
session confirmed the 404 page's FA toggle correctly links to `/fa/404/`). These are marked
"carried forward" in the ledger, not silently re-stamped "PASS" as if freshly tested.

## Real-device items still outstanding (unchanged, cannot be produced from this session)

VoiceOver/Safari, a genuine Windows High Contrast device capture (this session's "forced
colours emulation" is Playwright's `forcedColors: 'active'` context option -- an automated
proxy, explicitly not a substitute), and Ealia's own final visual review. DV-01's real
screenshot content (F1-00) remains the one open asset Blocker, unchanged, not S6-actionable.

## Gate summary

See `18-acceptance-results.md` for the full per-item table. Headline: A, B, C, D, E gates are
in a similar state to the F1 audit (mostly PASS, A1/A3/A4/B1/C5 still PENDING on DV-01 and
Ealia's own cultural sign-off, both unchanged). F and G gates surface two honest non-passes
this session that were previously recorded more optimistically: F3 (contrast, pre-existing,
unresolved) and G1/G4 (performance/LCP, proven not to be an S5 regression but not currently
verifiable as passing from this local environment either).
