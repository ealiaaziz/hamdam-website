# Hamdam website final completion - execution state

Reentrant state file for the Final Completion Mega Runner. Read this first on every resume;
never repeat a completed stage unless validation proves regression.

## 1. Current stage
S7 - Release candidate closeout (complete). Owner release decision recorded below; see §26.

## 26. Owner release decision (2026-07-18, Ealia)

Ealia explicitly authorised production release under the following accepted exceptions,
recorded here verbatim per her instruction, ahead of any push/merge:

1. F1-00 (DV-01 screen content) is explicitly accepted for this release — the site ships
   with the gradient fill showing through the six device-frame cutouts, not real app
   screenshots.
2. DV-01 may ship with its current temporary gradient screen.
3. DV-01 stays recorded as an open post-launch visual replacement (not closed, not silently
   dropped from the record).
4. No fabricated Hamdam app screenshot is to be composited in as a substitute — confirmed:
   none was created.
5. No new analytics added for this release — confirmed: none was added; `26-analytics-plan.md`
   remains Ealia's unresolved call.
6. Current repository behaviour is preserved — confirmed: no unrelated behavioural change
   made as part of this release action.
7. The site must not claim "No analytics" anywhere — confirmed: no such claim exists in
   shipped copy; none was added.
8. Real VoiceOver testing, real Windows High Contrast testing, and Cloudflare preview-
   dashboard confirmation are owner-accepted **post-launch** checks for this release — not
   completed checks, and not blockers to this production push.
9. These nine accepted exceptions do not block production release.
10. No other Blocker, Major, placeholder, failed test, security failure, or build failure is
    waived by this decision. Specifically: F3 (contrast, recorded unresolved) and G4 (LCP,
    recorded FAIL in `18-acceptance-results.md` Phase 13 update) are **not** covered by this
    exception list and remain subject to the normal release-gate pass/fail rule.

## 27. Final owner release waivers (2026-07-18, second decision)

A fresh validation pass reproduced G4 (LCP: EN 3.2s, FA 2.9s, target ≤2.5s) and F3
(Lighthouse `color-contrast` score 0, both locales) as live failures, matching the repo's
existing recorded evidence. Ealia explicitly accepted both as **OPEN, OWNER ACCEPTED FOR
PRODUCTION RELEASE** — not passed, not resolved. This supersedes §26 item 10's "not covered"
status for these two items specifically. Full final waiver list (§26 items 1-9 plus these
two) is recorded in `50-release-candidate-report.md` §13b and
`51-manual-release-checklist.md`. No other gate is waived. This is the final release
authorisation.

## 2. Current required model
**None - the mega runner has reached its final stage.** All stages S0 through S7 are
complete. `50-release-candidate-report.md` and `51-manual-release-checklist.md` are the
terminal artefacts. Nothing further to execute without new input (real DV-01 screenshots,
Ealia's manual checks, or a push/merge decision).

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
  Commit `e92c145`.
- F2 - Fable correction verification (2026-07-18, Fable 5) - all S5-actionable Blockers and
  Majors verified Closed against direct evidence (built HTML plus the S6 screenshot set; the
  reduced-motion captures defeat the poets-band reveal artefact and show the مولانا plate in
  both locales); S6 footer fix independently re-verified; no correction-caused regression
  found; one new Minor recorded (FA-page English translation line renders its terminal full
  stop at the visual left edge, pre-existing bidi behaviour, not S5-caused). **Visual
  Approval Granted with one standing exception: F1-00**, which is external-evidence-gated
  and explicitly not S5-actionable, so the runner's "Blocker remains means return to S5"
  branch would create an empty correction round; routed to S7 with the exception recorded
  instead. Full reasoning: `42-fable-correction-verification.md`.
- S7 - Release candidate closeout (2026-07-18, Sonnet 5) - full diff/secrets/dependency review
  across all 28 commits (clean); tests (110/110) and build re-run clean a third time; `astro
  check` declined again, consistent with every prior stage (requires an undocumented new
  dependency, build already type-checks implicitly); Cloudflare push-policy risk confirmed via
  `wrangler.jsonc` (both production custom domains bound as routes, preview-vs-production
  branch designation is dashboard-only and unverified from this repo, so **not pushed**).
  Produced `50-release-candidate-report.md` and `51-manual-release-checklist.md`. 1 open
  Blocker (F1-00), 0 open Majors. Nothing pushed, merged, or deployed.

## 4. Incomplete stages
None. All stages S0 through S7 complete. Remaining work is external to this repo/session:
real DV-01 screenshots from hamdam-ios, Ealia's manual checklist items, and the eventual
push/merge decision once the Cloudflare dashboard setting is confirmed.

## 5. Current branch
`feature/hamdam-web-redesign`

## 6. Latest verified commit
`10869c0` ("docs: record final Fable website approval", the F2 checkpoint) was HEAD at S7's
start. This S7 checkpoint's own commit (release-candidate report, manual checklist, and this
state update) supersedes it once committed immediately after this file is written.

## 7. Working tree status
Clean at S7's start (verified via `git status`), and clean again after this checkpoint's own
commit. No merge/rebase in progress at any point. Nothing pushed.

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
110/110, re-run three times across this branch's life: after S5's corrections, after S6's
footer fix, and again fresh at S7. All clean.

## 12. Build result
Clean, re-run three times for the same reasons, including fresh at S7. Zero new dependencies
in `package.json`/`package-lock.json` (verified via `git diff` at S7 against `main`, byte-
identical). `astro check` declined again at S7, consistent with every prior stage (requires
an undocumented new dependency).

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
F2 complete (`42-fable-correction-verification.md`): F1-01 through F1-07 all **Closed** on
direct evidence, S6 footer fix independently verified, no correction-caused regression.
**Visual Approval Granted with one standing exception (F1-00).** The site must not be called
visually accepted for production until real app captures fill the six device frames.

## 19. Open Blocker findings
Still 1 — F1-00 DV-01 screen content. External-evidence-gated (hamdam-ios Screenshot
Orchestrator run by Ealia), not closable from this repo. S7 must carry it as the explicitly
recorded exception, not soften it.

## 20. Open Major findings
0. F1's four Majors (F1-01 through F1-04) are verified Closed by F2. The two S6-surfaced
honest non-passes remain open below Major-blocking status for F2's purposes: F3 contrast
(pre-existing, needs a real-device spot check) and G4 LCP (needs a real deployed-environment
measurement).

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
- **New (F2, Minor):** on the FA page, verse-card English translation lines render their
  terminal full stop at the visual left edge (bidi placement inside the RTL container);
  pre-existing, not S5-caused; candidate one-line LTR-direction fix at Ealia's discretion

## 22. Push status
Nothing pushed. `wrangler.jsonc` binds both `hamdam.com.au` and `www.hamdam.com.au` as
production custom-domain routes; whether pushing the feature branch would create only an
isolated preview depends on Cloudflare dashboard settings not verifiable from this repo (see
`27-release-and-rollback-plan.md` and `50-release-candidate-report.md` §11). Per the push
policy, this ambiguity means: do not push.

## 23. Merge status
Nothing merged. `main` untouched.

## 24. Deployment status
Nothing deployed.

## 25. Exact next action
**The mega runner has reached its terminal stage.** No further model switch is needed unless
new input arrives (real DV-01 screenshots, a resolved Cloudflare dashboard confirmation, or
Ealia's own manual-checklist findings reopening a specific item). The three concrete next
actions, in order:

1. Run the hamdam-ios Screenshot Orchestrator
   (`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`) for the approved marketing states per
   locale at 1290x2796, deliver outputs to this repo for compositing under the six DV-01 frame
   cutouts (`object-fit: contain`), then a short Fable spot check of the composited result
   (closes F1-00, the sole open Blocker).
2. Confirm the Cloudflare Pages dashboard production-branch/preview-deployments setting
   described in §22 before authorising any push.
3. Work through `51-manual-release-checklist.md`.

If any of those actions surfaces a regression or a new Blocker/Major, re-enter this runner at
S5 (Sonnet 5) for the correction and F2 (Fable 5) for re-verification, per the reentrancy
rule — do not silently re-run S0 through S4.
