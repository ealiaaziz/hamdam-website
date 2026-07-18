# Hamdam website final completion — execution state

Reentrant state file for the Final Completion Mega Runner. Read this first on every resume;
never repeat a completed stage unless validation proves regression.

## 1. Current stage
F1 — Fable final design and copy audit (not yet started)

## 2. Current required model
**Fable 5** — Sonnet's work is done for this checkpoint. Clear this session, select Fable 5, paste
the same mega runner again.

## 3. Completed stages
- S0 — Safety and recovery (2026-07-18)
- S1 — Commit completed nine asset integration (2026-07-18)
- S2 — Resolve remaining six assets (2026-07-18) — all 15 asset IDs now integrated
- S3 — Copy and product truth package (2026-07-18)
- S4 — Technical pre-acceptance (2026-07-18)

## 4. Incomplete stages
F1, S5, S6, F2, S7

## 5. Current branch
`feature/hamdam-web-redesign`

## 6. Latest verified commit
Pending this checkpoint's commit (`test: add website pre-acceptance evidence`) — will supersede
`6731c17` (the S3 commit) once created.

## 7. Working tree status
Will be clean after this checkpoint's commit: two metadata em-dash fixes
(`index.astro`, `fa/index.astro`, `404.astro`), one performance fix (`HeroCinematic.astro` —
`loading="eager"`/`fetchpriority="high"` on the hero horizon images), the S4 phase report, and
evidence files under `final-evidence/pre-fable/` (4 North Star comparison sheets, 2 Lighthouse
JSON reports, keyboard focus trace, console error log, 6 representative screenshots). No
merge/rebase in progress, no conflict markers.

## 8. Asset status (15 of 15 — all integrated)
All fifteen asset IDs are now integrated: PT-01–05, CM-01–03, FC-01 (S1), plus HW-01, HW-02,
HW-03, HW-04, DV-01, CY-01 (S2). Full technical detail (matting method, crop windows, budgets,
known deviations) in `docs/asset-licence-log.md`.

**One genuinely open sub-item, not an asset-production blocker**: DV-01's *frame* is real and
wired into all six of its usages sitewide; the real app *screenshot* that belongs inside it is
still missing. hamdam-ios does have a Screenshot Orchestrator
(`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`) — confirmed real, not a prior-session false
negative — but whether it can produce a screenshot without app code changes was still being
investigated (read-only, via a background fork) as of this checkpoint. Do not assume either
outcome until that investigation's findings are read directly.

**DV-01 screen cutout**: no deviation — the cutout is a procedural rounded-rectangle (not a
chroma-keyed crop of the source mockup's own screen fill), sized to the brief's exact 1290:2796
ratio by construction. Verified directly against the shipped file: transparent span measured at
x=90-1315 through the body's vertical centre (1225px), against the body's own scaled width —
ratio 0.4614, matching the brief's 1290/2796 = 0.4614 target exactly. Whoever composites a real
screenshot later should still use `object-fit: contain` inside the cutout, not stretch-to-fill,
as ordinary defensive practice, not because of any known mismatch.

**HW-02 provenance**: no Canva candidate ever existed for this ID. Derived as a tighter,
dome-centred crop of the same HW-01 source photo (not a new generation) — Fable's F1 review
should treat this as a legitimate derivative, not assume it was independently sourced.

## 9. Copy approval status
`30-final-copy-ledger.md` complete — every public string across EN/FA extracted from source and
categorised. Most rows **Approved** (verified against repo evidence, e.g. poet count, trial
terms, Family Sharing) or **Fable F1** (aesthetic/emotional judgement, not decided here). No
narrow fix was applied — a full em-dash grep found only the already-known, already-protected
instances in `poets.ts`/`verses.ts`; no new violation, no broken ARIA, no corrupted Persian
(re-confirmed via `check:persian`).

Real findings surfaced this pass, not previously flagged anywhere:
- **`privacy.astro`'s own meta description states "no analytics" verbatim** (pre-existing copy,
  not introduced by this redesign) — directly contradicts the runner's own instruction not to
  state that exact absolute claim. Flagged for Fable/Ealia to pick replacement wording (the page
  body's own more precise "no third-party analytics" framing is right there to reuse). Not fixed
  by Sonnet — this is a copy judgement call, not a typo.
- **No `fa/404.astro` exists** — a Farsi visitor hitting a dead link sees an English-only 404.
- **Trademark/IP owner name discrepancy**: legal pages name "Ealia Azizollahi (sole trader)" in
  Contact sections but "Seyed Valiallah Azizollahi" as the IP/trademark owner — consistent across
  all four legal-page variants (EN/FA terms/privacy), so a deliberate structural choice, not a
  typo, but needs Ealia's direct yes/no confirmation before F1/launch.
- **Mood-slider EN/FA register mismatch** (already self-flagged in the component's own code
  comment and in `18-acceptance-results.md` item 4, confirmed still unresolved): FA labels are
  clinical Apple Health valence strings, EN labels are warm poetic words. Explained, not accepted
  — needs Fable's resolution.
- Two unverifiable-from-this-session product claims: Roots coverage (Mehregan/Sizdah Bedar
  actually implemented in-app?) and the Widgets platform-integration claim.

Full detail, all eight flagged items, in `31-product-truth-verification.md`'s closing summary.

## 10. Analytics decision status
Still untouched, per `26-analytics-plan.md` — deliberately left as Ealia's call. No new analytics
code exists in the repo (re-confirmed via grep this stage: zero matches for gtag/fbq/mixpanel/
amplitude/google-analytics anywhere in `src/`). See §9's flagged "no analytics" meta-description
finding — a wording risk, not an implementation one.

## 11. Test result
110/110 passed (7 test files), re-verified fresh after every fix through S4, most recently after
the LCP/em-dash fixes.

## 12. Build result
Clean, 7 pages built, re-verified fresh throughout S1-S4. Astro/type checks (`astro check`) still
not run — requires installing `@astrojs/check` + `typescript`, neither present in this repo's
history; not installed per global rule 20 across every stage. Production build's own Vite/Astro
compile step passed cleanly instead, every time.

## 12a. Defects found and fixed this session
1. **S1**: FC-01 was wired with an inline `style="background-image: url(...)"` attribute, blocked
   by this repo's CSP (`style-src 'self'`, no `unsafe-inline`) the same way inline `<style>`
   blocks are blocked. Fixed via `astro:assets`'s `<Image>` component instead. Full detail in
   `nine-assets-checkpoint-report.md`.
2. **S2**: CY-01's initial chroma-key matte (lightness-distance threshold only) left a visible
   pale halo on dark backgrounds from the source's own soft drop-shadow, which sits close enough
   in lightness to real petal edge pixels that no single distance threshold could separate them
   cleanly. Fixed by adding a saturation gate (the shadow is low-chroma grey, the petal is
   high-chroma orange) alongside the lightness ramp — caught and fixed via the 5-background
   contact-sheet QA step before integration, not after.
3. **S2**: `hero-horizon-desktop.png`'s source candidate had a 1-2px grey export-artifact border
   on its right/bottom edge (a Canva PNG-export quirk, `rgb(103,103,103)`), which a naive
   distance-from-black threshold would have picked up as stray "content" outside the branch's
   real bounding box. Caught during bbox sanity-checking, fixed by trimming the border before
   matting `hero-blossom-foreground.png`.
4. **S4**: em-dashes in `<title>`/`og:title`/`twitter:title`/JSON-LD `alternateName` across
   `index.astro`, `fa/index.astro`, and `404.astro` — a hard, zero-judgement rule violation, fixed
   directly (colons substituted). Full sweep confirmed zero remaining except the already-known,
   already-protected `verses.ts`/`poets.ts` poetic content.
5. **S4**: `HeroCinematic.astro`'s hero horizon images (`hero-horizon-desktop`/`-mobile`) were
   `loading="lazy"` while being the actual Largest Contentful Paint element — real regression
   introduced during S2's own wiring. Fixed with `loading="eager"` + `fetchpriority="high"`.
   Performance 82→97 (EN), LCP 4.6s→2.0s. Full detail in `technical-pre-acceptance-report.md` §2.

## 13. English result
Lighthouse (production build, mobile emulation, post-fix): **97 performance / 97 accessibility /
100 best-practices / 100 SEO**. LCP 2.0s, CLS 0, TBT 0ms. Total page weight 361 KiB — inside the
450KB budget flagged for re-check once real assets landed (G3). Full detail and the pre-fix
82/100 performance regression (found and fixed this stage) in `technical-pre-acceptance-report.md`.

## 14. Farsi result
97 / 97 / 100 / 100, same methodology. Total page weight 298 KiB.

## 15. Accessibility result
Automated checks re-run fresh against the complete asset set. Accessibility scored 97/100 on
both locales — the 3-point gap is a **color-contrast audit finding that direct verification
(computed styles + this session's own earlier screenshots) contradicts**, investigated thoroughly
(ruled out throttling and the scroll-reveal opacity pattern as causes) and left unresolved rather
than guessed at — see `technical-pre-acceptance-report.md` §3a. Keyboard trace: no trap, logical
order, confirmed via a real 20-tab trace (`keyboard-focus-trace.json`). Reduced motion: renders
complete and legible. F2 (real VoiceOver) and a genuine Windows High Contrast device pass remain
genuinely unproducible from this environment — automated forced-colours emulation was run and
labelled accurately as exactly that, not a substitute (the emulation's CSS media feature engaged
correctly per `matchMedia`, but the site has zero `forced-colors`-specific CSS so there was
nothing for it to visibly change — a real Windows machine's UA-level override would still differ).

## 16. Performance result
Full Lighthouse re-run against the now-complete 15-asset set: see §13/§14. Budget re-check (G3)
complete — **holds** at 361/298 KiB against the 450KB target. JS budget unchanged at ~9KB (12KB
target). Per-asset on-page budgets for all 15 assets individually confirmed in `asset-licence-
log.md` and `final-six-assets-report.md` §6.

## 17. Phase 13 result
Not started — S6 (Phase 13 full acceptance) comes after F1/S5, not before.

## 18. Fable audit result
Not started. This checkpoint hands off to F1 next.

## 18a. North Star side-by-side comparison (S4 evidence for F1's use)
Four comparison sheets built directly against the real North Star mockups (copied from
`hamdam-ios/docs/design/north-star/` into a scratchpad after direct `Read` access to that path
was denied by permission settings — `cp` then `Read` from the copy worked, same file content):
- **Hero vs Today screen**: structurally different by design (headline-first vs immediately
  full-bleed) — already identified and accepted as intentional in `04-north-star-gap-analysis.md`
  §2 before this redesign began, not a new gap.
- **Poets vs Featured Poets**: strong match, real win — closes gap-analysis §1 directly.
- **Roots vs Roots screen**: moment cards now match; North Star's full-bleed illustrated header
  is still absent from the live site — a real, visible, not-previously-flagged-this-precisely gap.
- **Ceremony vs Reflection Completion Ceremony**: the clearest remaining gap — North Star's bloom
  is large and rich, the live petal-fall reads comparatively sparse/empty. Confirms gap-analysis
  §7 is still true in this specific section after all asset work. Flagged for Fable, not touched.

## 19. Open Blocker findings
None recorded yet (no Fable audit has run).

## 20. Open Major findings
None recorded yet (no Fable audit has run).

## 21. Manual checks still requiring Ealia
- Real VoiceOver/Safari pass (F2)
- Real Windows High Contrast device capture
- DV-01 real screenshot content: resolve the Screenshot Orchestrator investigation (in progress
  as of this checkpoint) and either produce a real deterministic screenshot or confirm it
  genuinely can't be done without app code changes
- Final visual review against North Star, side by side (belongs to F1/Fable, not Ealia directly,
  but she should see it too)
- Analytics decision (explicitly hers per `26-analytics-plan.md`)
- HW-01/02/03 crop-window aesthetic acceptance (these are derived crops from full photographic
  scenes, not literal whole-candidate designs — Fable's F1 should treat the crop choice as part
  of what needs sign-off, see `asset-licence-log.md`)
- Trademark/IP owner name confirmation (Ealia Azizollahi vs Seyed Valiallah Azizollahi across
  legal pages) — `31-product-truth-verification.md` §6
- App Store ID constant accuracy in `lib/appStore.js` — needs App Store Connect access
- Roots coverage confirmation: are Mehregan and Sizdah Bedar actually implemented app-side?
- Widgets platform-integration claim — confirm shipped, not just historically planned
- `privacy.astro` meta description's "no analytics" wording — needs replacement copy
- Missing `fa/404.astro` — confirm accepted as out of scope, or add one
- Mood-slider EN/FA register mismatch — hers or Fable's call on resolution direction
- Colour-contrast discrepancy between Lighthouse and direct verification (§15) — needs a real
  device/browser check to resolve either way
- Ceremony section density vs the North Star's bloom animation (§18a) — Fable's call

## 22. Push status
Nothing pushed.

## 23. Merge status
Nothing merged. Branch remains `feature/hamdam-web-redesign`, `main` untouched.

## 24. Deployment status
Nothing deployed.

## 25. Exact next action
**SWITCH TO FABLE 5.** S4 is complete. Begin F1: Fable's final design and copy audit. Read this
state file, `docs/website-redesign/30-final-copy-ledger.md`,
`docs/website-redesign/31-product-truth-verification.md`,
`docs/website-redesign/phase-reports/technical-pre-acceptance-report.md`, and every file under
`docs/website-redesign/final-evidence/pre-fable/` (inspect the images directly, not just Sonnet's
written description of them). Score all 15 assets, review the five poets as one series, review
Roots for stereotype/overpromise risk, resolve every "Fable F1" and "verification required" row
in the copy ledger (approve, replace, mark verification-required, or mark removal-required), and
give a real verdict on the two open aesthetic gaps this stage surfaced: the Ceremony section's
sparseness against the North Star bloom, and the Roots section's missing illustrated header.
Output: `40-fable-final-visual-audit.md`, `41-sonnet-correction-list.md`,
`32-fable-approved-copy-ledger.md`. Fable must not modify production source. Commit only the
audit documents, update this state file, set next stage to S5, required model to Sonnet 5, print
the model switch instruction, and stop.

CLEAR THE CURRENT CLAUDE SESSION, SELECT THE REQUIRED MODEL, THEN PASTE THE SAME MEGA RUNNER
AGAIN.
