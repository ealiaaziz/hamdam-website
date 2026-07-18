# Hamdam website final completion - execution state

Reentrant state file for the Final Completion Mega Runner. Read this first on every resume;
never repeat a completed stage unless validation proves regression.

## 1. Current stage
S5 - Apply Fable corrections (not yet started)

## 2. Current required model
**Sonnet 5** - Fable's F1 audit is complete and committed. Clear this session, select
Sonnet 5, paste the same mega runner again.

## 3. Completed stages
- S0 - Safety and recovery (2026-07-18)
- S1 - Commit completed nine asset integration (2026-07-18)
- S2 - Resolve remaining six assets (2026-07-18) - all 15 asset IDs integrated
- S3 - Copy and product truth package (2026-07-18)
- S4 - Technical pre-acceptance (2026-07-18)
- F1 - Fable final design and copy audit (2026-07-18, Fable 5)

## 4. Incomplete stages
S5, S6, F2, S7

## 5. Current branch
`feature/hamdam-web-redesign`

## 6. Latest verified commit
This checkpoint's commit (`docs: add Fable website visual and copy audit`) supersedes
`20df3a4` (the S4 commit).

## 7. Working tree status
Clean after this checkpoint's commit: the three F1 audit documents
(`40-fable-final-visual-audit.md`, `41-sonnet-correction-list.md`,
`32-fable-approved-copy-ledger.md`), four fresh live-page captures under
`final-evidence/f1-fable/`, and this state update. No production source touched by F1.
No merge/rebase in progress.

## 8. Asset status (15 of 15 integrated; 14 approved by Fable, 1 content blocker)
All fifteen asset IDs reviewed by Fable at full resolution with fresh 4-background alpha
contact sheets. Fourteen pass (several with recorded notes; see the audit §1). DV-01's
*frame* passes; its *screen content* is the sole remaining asset blocker (F1-00): six frame
instances sitewide show an empty gradient until real Screenshot Orchestrator captures land
from hamdam-ios. CY-01's one-petal-three-ways substitution and HW-02's derivation from
HW-01's source are now explicitly accepted differences, no longer open questions.

## 9. Copy approval status
Every row of `30-final-copy-ledger.md` resolved in `32-fable-approved-copy-ledger.md`.
Replacements ordered (exact text in `41-sonnet-correction-list.md`): Rumi's Farsi name
رومی → مولانا (poets.ts, verses.ts attribution; app-parity verified directly in hamdam-ios
source), warm FA mood labels (سنگین/ناآرام/آرام/سبک/روشن) replacing the clinical valence
strings, Parvin description em-dash removal (EN and FA), MOOD-03 EN line, bilingual 404 with
Fable-authored FA copy, privacy meta description "no analytics" → "no third-party
analytics". All previously "Fable F1" rows otherwise approved as written. Verification-
required rows unchanged and still with Ealia (trademark names, App Store ID, Roots coverage,
widgets, SIMA review, CONST-03). `verses.ts` translations untouched by ruling: their em-dash
question is already open app-side and must be settled once for both platforms.

## 10. Analytics decision status
Unchanged, still Ealia's call. F1-06 fixes only the meta-description overclaim wording.

## 11. Test result
110/110 as of S4; S5 must re-run after applying corrections.

## 12. Build result
Clean as of S4 (re-verified fresh during F1 for the live captures); S5 must re-run.

## 13. English result
Lighthouse 97/97/100/100 (S4). F1-04's acceptance test requires staying within 1 point.

## 14. Farsi result
97/97/100/100 (S4), same requirement.

## 15. Accessibility result
As S4 recorded. F1 adds: the Lighthouse colour-contrast complaint remains contradicted by
direct visual inspection at real scale (constellation/journey copper sections carry dark text,
comfortably legible in fresh live captures); stays on the manual real-device checklist, no
code change ordered.

## 16. Performance result
As S4. No F1 correction adds page weight beyond four extra petal `<span>`s (F1-04).

## 17. Phase 13 result
Not started - S6 runs after S5.

## 18. Fable audit result
**Complete.** `40-fable-final-visual-audit.md`. Production visual approval NOT granted this
round, solely because of F1-00 (DV-01 screen content). Poet series: pass, emphatically
(Parvin equal dignity confirmed; no stereotype; no generated text in any portrait). Roots:
pass, with the North Star's illustrated header recorded as an accepted difference. Two
capture-artefact suspicions (poets band "empty" at desktop widths; countdown values)
investigated against a fresh live build and cleared as non-defects.

## 19. Open Blocker findings
1 - F1-00 DV-01 screen content (six empty device frames sitewide). Not S5-actionable from
this repo; exact capture action recorded in the correction list and §21.

## 20. Open Major findings
4 - F1-01 Rumi Farsi name; F1-02 mood FA labels; F1-03 Parvin em dashes; F1-04 ceremony
density. All fully specified for S5 with acceptance tests. Plus 3 Moderates (F1-05 bilingual
404, F1-06 privacy meta wording, F1-07 MOOD-03 EN line).

## 21. Manual checks still requiring Ealia
- Real VoiceOver/Safari pass (F2 checklist)
- Real Windows High Contrast device capture
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
- Real-device colour-contrast spot check (Lighthouse vs direct verification discrepancy)
- Analytics decision (hers per `26-analytics-plan.md`)

## 22. Push status
Nothing pushed.

## 23. Merge status
Nothing merged. `main` untouched.

## 24. Deployment status
Nothing deployed.

## 25. Exact next action
**SWITCH TO SONNET 5.** Begin S5: apply Fable's corrections. Read
`41-sonnet-correction-list.md` (implement F1-01 through F1-07 exactly as specified; F1-00 is
not yours), `32-fable-approved-copy-ledger.md`, and `40-fable-final-visual-audit.md`. Apply
Persian strings by copy-paste from the correction list, never retyped. Run the full
validation suite, capture before/after evidence per finding, write
`phase-reports/fable-correction-implementation-report.md`, commit with
`fix: apply final Fable website corrections`, update this state file, then proceed to S6.

CLEAR THE CURRENT CLAUDE SESSION, SELECT THE REQUIRED MODEL, THEN PASTE THE SAME MEGA RUNNER
AGAIN.
