# Hamdam website final completion - execution state

Reentrant state file for the Final Completion Mega Runner. Read this first on every resume;
never repeat a completed stage unless validation proves regression.

## 1. Current stage
F2 - Fable correction verification (not started)

## 2. Current required model
**Fable 5.** S6 is complete and committed. Clear this session, select Fable 5, paste the same
mega runner again.

## 3. Completed stages
- S0 - Safety and recovery (2026-07-18)
- S1 - Commit completed nine asset integration (2026-07-18)
- S2 - Resolve remaining six assets (2026-07-18) - all 15 asset IDs integrated
- S3 - Copy and product truth package (2026-07-18)
- S4 - Technical pre-acceptance (2026-07-18)
- F1 - Fable final design and copy audit (2026-07-18, Fable 5)
- S5 - Apply Fable corrections (2026-07-18) - F1-01 through F1-07 implemented and verified in
  built HTML; F1-00 (DV-01 screen content) correctly left for hamdam-ios/Ealia, not S5
  actionable. Commit `fb479ff`.
- S6 - Phase 13 full acceptance (2026-07-18) - fresh evidence captured from the corrected
  build; one new regression found and fixed (FA legal-page footer was rendering English,
  commit `c3f6b5f`); two honest non-carry-forward findings recorded (F3 contrast unresolved,
  G4 LCP not verifiably passing locally, proven not to be an S5 regression via A/B testing).
  Commit `<pending, see §6>`.

## 4. Incomplete stages
F2, S7

## 5. Current branch
`feature/hamdam-web-redesign`

## 6. Latest verified commit
This checkpoint's own commit (S6 evidence + reports, message `test: complete website phase 13
acceptance`) will supersede `c3f6b5f` (the in-session footer fix) once committed immediately
after this file is written. `c3f6b5f` itself supersedes `fb479ff` (the S5 commit).

## 7. Working tree status
Clean after the S6 commit: `18-acceptance-results.md` update, `phase-reports/phase-13-report.md`,
`final-evidence/phase-13/` (curated screenshots, Lighthouse JSON + summary, contrast/a11y/
keyboard-focus/console-error/broken-asset data), and this state file. `Footer.astro`,
`fa/privacy.astro`, `fa/terms.astro` were already committed separately in `c3f6b5f` before this
checkpoint. No merge/rebase in progress. Nothing pushed.

## 8. Asset status (15 of 15 integrated; 14 approved by Fable, 1 content blocker)
Unchanged since S5/F1. DV-01's *frame* passes; its *screen content* is the sole remaining
asset blocker (F1-00), not S6-actionable. See §21 for the exact hamdam-ios action needed.

## 9. Copy approval status
Unchanged since S5. All seven F1 corrections (F1-01 through F1-07) implemented and verified
in the S6-rebuilt output. `verses.ts` translations still untouched by design (their em-dash
question stays open, app-side and web-side together, per prior ruling).

## 10. Analytics decision status
Unchanged, still Ealia's call.

## 11. Test result
110/110, re-run twice this session (after S5's corrections, and again after S6's footer fix).
Both clean.

## 12. Build result
Clean, re-run twice this session for the same two reasons. Zero new dependencies in
`package.json`/`package-lock.json` (verified via `git status` immediately after every ad hoc
`npm install --no-save playwright` this session's own evidence tooling needed).

## 13. English result
Lighthouse: Performance 89-94 (noisy across repeated runs on this machine), Accessibility 97,
Best Practices 100, SEO 100. CLS 0. LCP 3.2s. Total page transfer 361KB. Full detail and the
pre-S5 A/B comparison (proving the performance/LCP numbers are unchanged by S5, not a
regression from F1-04) in `final-evidence/phase-13/lighthouse/lighthouse-summary.md`. This
supersedes the S4-recorded "97/97/100/100" figure, which this session could not reproduce
locally and cannot explain (see LCP note below) — flagged for a real-deployment re-measurement,
not silently trusted either way.

## 14. Farsi result
Lighthouse: Performance 94 (single run), Accessibility 97, Best Practices 100, SEO 100. CLS 0.
LCP 2.9s. Total page transfer 298KB. Same caveats as §13.

## 15. Accessibility result
F3 (contrast) is now recorded as **unresolved**, not carried forward as PASS: Lighthouse's
`color-contrast` audit fails reproducibly on the constellation/journey copper-surface text,
on every run, both locales, both the pre- and post-S5 builds (so not an S5 regression, but a
real open gap, unchanged from what F1 already flagged). A same-session attempt to
independently verify via computed contrast ratios is recorded but explicitly not trusted (the
script cannot correctly sample a `linear-gradient` background's rendered pixel colour). Needs
a real tool/device spot check. F1 (keyboard) partially re-verified (12 of ~20 stops, all
clean). F2 (VoiceOver) still PENDING, unchanged — not producible from this environment.

## 16. Performance result
G2 (CLS=0) and G3 (image transfer budget) freshly PASS against real assets for the first time
this session (previously only trivially true against placeholder gradients). **G4 (LCP) is
recorded as FAIL** — 2.9-3.2s against a 2.5s target, locally measured, proven via A/B testing
not to be caused by S5, but not resolved either. G1 is caveated rather than a clean pass (see
§13/14). G5 (motion JS budget) carried forward from S4 (9.18KB), unaffected by S5/S6 (no JS
changed). G6 (build/CSP/deps) freshly PASS.

## 17. Phase 13 result
**Complete.** `phase-reports/phase-13-report.md`, `18-acceptance-results.md`'s new "Phase 13
(S6) update" section, and `final-evidence/phase-13/`. One new regression found and fixed
in-session (FA footer). Two stale Phase-9 TODOs found and recorded, not fixed (need a live
scroll-through check or a product decision, not a mechanical fix). Full gate-by-gate delta
from Phase 12/S4/F1 is in the ledger; not repeated here.

## 18. Fable audit result
Unchanged since F1 (`40-fable-final-visual-audit.md`). F2 (this stage's next step) is where
Fable verifies whether S5's corrections actually close F1's findings against the S6-refreshed
evidence.

## 19. Open Blocker findings
Still 1 — F1-00 DV-01 screen content. Unchanged, not S5/S6-actionable from this repo.

## 20. Open Major findings
F1's original 4 Majors (F1-01 through F1-04) were all implemented in S5 and verified in the
S6-rebuilt output; whether Fable considers them **closed** is F2's call, not self-graded here.
Two new items surfaced this session, neither at F1's original Major/Blocker severity: F3
contrast (unresolved, pre-existing) and G4 LCP (not verifiably passing locally, proven not to
be an S5 cause).

## 21. Manual checks still requiring Ealia
Unchanged list from F1, plus one addition:
- Real VoiceOver/Safari pass (F2 checklist)
- Real Windows High Contrast device capture (this session's forced-colours emulation is an
  automated proxy only, explicitly not a substitute)
- DV-01 real screenshots: run the hamdam-ios Screenshot Orchestrator
  (`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`) for the approved marketing states per
  locale at 1290x2796, hand outputs to the website repo (F1-00)
- Veto window on Fable's mood-label replacement (F1-02) if app-string continuity is preferred
- Trademark/IP owner name confirmation (both names intentional?)
- App Store ID constant in `lib/appStore.js`
- Roots coverage: Mehregan and Sizdah Bedar shipped in-app?
- Widgets claim confirmation (QUIET-02/03)
- ROOTS-02 FA moment sentences: has the app-side SIMA review cleared?
- CONST-03 wording sign-off against the shipped policy text
- Em dashes in `verses.ts` translations: rule once for app and web together
- Real-device colour-contrast spot check (Lighthouse vs computed-ratio discrepancy, still
  unresolved after this session's own inconclusive attempt)
- Analytics decision (hers per `26-analytics-plan.md`)
- **New:** a real Cloudflare Pages preview-deploy Lighthouse run for LCP (G4) — this
  session's local `astro preview` + local Lighthouse measurement cannot be trusted to
  distinguish a real regression from a local-environment artefact
- **New:** live scroll-through check of the sticky-CTA pill across the ceremony-to-footer
  boundary, and a decision on whether `BaseLayout.astro`'s scroll-progress calculation needs
  re-anchoring to the real ceremony offset (both are stale Phase-9 TODOs found this session,
  neither fixed)

## 22. Push status
Nothing pushed.

## 23. Merge status
Nothing merged. `main` untouched.

## 24. Deployment status
Nothing deployed.

## 25. Exact next action
**SWITCH TO FABLE 5.** Begin F2: verify S5's corrections against the S6-refreshed evidence.
Read (in order): the original F1 audit (`40-fable-final-visual-audit.md`), the original
correction list (`41-sonnet-correction-list.md`), this stage's implementation report
(`phase-reports/fable-correction-implementation-report.md`), the Phase 13 report
(`phase-reports/phase-13-report.md`), the updated acceptance ledger (`18-acceptance-results.md`,
specifically the new "Phase 13 (S6) update" section), and the fresh screenshots under
`final-evidence/phase-13/screens/` (inspect directly, not just this report's prose). For every
prior Blocker/Major (F1-00 through F1-04), mark Closed/Partially Closed/Open against the fresh
evidence — F1-00 should stay Open (not S5/S6-actionable, no new evidence exists for it beyond
the honest pending state). Also review the two new S6 findings not part of F1's original list:
the FA-footer regression (found and fixed in-session — verify it, don't just trust the report)
and the F3/G4 honest non-passes (contrast and LCP — these are open gaps this session
surfaced, not corrections to verify, so they don't block F2's Blocker/Major closure question,
but should be acknowledged). If any prior Blocker/Major remains open, per the runner: set next
stage to S5 with a narrow updated correction list. If all are closed and no new material
regression exists, set next stage to S7 and record Visual Approval Granted, listing remaining
manual checks accurately (§21 above, now longer than before this stage).

CLEAR THE CURRENT CLAUDE SESSION, SELECT THE REQUIRED MODEL, THEN PASTE THE SAME MEGA RUNNER
AGAIN.
