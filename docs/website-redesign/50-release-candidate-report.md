# Hamdam website redesign — release candidate report

Date: 2026-07-18. Model: Sonnet 5 (S7, release candidate closeout). This report consolidates
S0 through F2 into a single release-candidate statement. It does not re-derive evidence
already captured elsewhere — see `FINAL-COMPLETION-STATE.md` for the stage-by-stage history
and `phase-reports/phase-13-report.md` / `18-acceptance-results.md` for the authoritative
gate-by-gate ledger.

## 1. Branch and commit state

- Branch: `feature/hamdam-web-redesign` (28 commits ahead of `main`, merge base `ce98883`).
- HEAD at S7 start: `10869c0` ("docs: record final Fable website approval").
- Working tree: clean at S7 start, clean again after this stage's own commit.
- `main`: untouched throughout. No merge, no rebase, no push, at any point in this branch's
  history.

## 2. Final verification run (this session)

Re-run fresh, not carried forward:

- `npm run test`: **110/110 passed.**
- `npm run build`: **clean**, 7 static routes generated (`/`, `/fa/`, `/privacy/`, `/terms/`,
  `/fa/privacy/`, `/fa/terms/`, `/404`), zero build errors.
- `npm run check:persian`: **passed** — all Persian text within the allowed Unicode set.
- `npx astro check`: **not run.** It requires installing `@astrojs/check` + `typescript`,
  neither currently a project dependency. This is consistent with every prior stage
  (`nine-assets-checkpoint-report.md`, `technical-pre-acceptance-report.md`,
  `final-six-assets-report.md` all record the same decision) — Astro's own build already
  performs implicit type-checking, and the global safety rules forbid adding a dependency
  without a documented impossibility. No impossibility exists here; declining stands.
- `package.json` / `package-lock.json`: byte-identical to `main`. Zero new dependencies
  across all 28 commits.

## 3. Full branch diff review

`git diff main...feature/hamdam-web-redesign --stat`: 129 files changed, 64,754 insertions,
250 deletions. Reviewed the full file list for:

- Secrets, `.env` files, credentials: **none found.**
- Scratchpad screenshots, Playwright temp output, build output committed by design mistake:
  **none found.** `.gitignore` correctly excludes `dist/`, `.astro/`, `node_modules/`, `.env*`.
- Unrelated `hamdam-ios` changes: **none** — this repository has no path into that one; the
  Screenshot Orchestrator was only read, never invoked to write here.
- New dependencies: **none** (see above).

Commit history is 28 sequential, individually-scoped commits (`feat(web)` per phase, `fix(web)`
per correction, `docs`/`test` for evidence) — readable as a narrative, not squashed, per
existing repository convention.

## 4. Asset status — 15 of 15 integrated, 1 content-level exception

All fifteen asset IDs are integrated and wired into their consuming components:

| Asset ID(s) | Status |
|---|---|
| PT-01–05, CM-01–03, FC-01 (9 assets) | Integrated S1, Fable-approved F1. |
| HW-01, HW-02, HW-03, HW-04, CY-01 | Integrated S2 via deterministic local alpha matting (contact-sheet verified against 5 backgrounds), Fable-approved F1, re-verified regression-clean F2. |
| DV-01 | **Frame integrated and approved** (transparent screen cutout, exact 1290:2796 geometry, wired into 6 frame instances across `HeroCinematic`, `RootsMoments`, `ContextConstellation`, `PrivacyTrust`, `JourneyPair`×2). **Screen content is the one standing exception (F1-00).** |

F1-00 is external-evidence-gated: it requires real Hamdam app screenshots from the
hamdam-ios Screenshot Orchestrator, which this repository cannot produce for itself and which
F1/F2 both explicitly ruled is not S5-actionable. Per F2's verdict: **Visual Approval Granted,
with one standing exception: F1-00.** This is not a soft or implied gap — every device frame
currently shows its existing gradient fill through the transparent cutout, an honest pending
state, not a fabricated screen. The site must not be called visually accepted for production
until real captures land.

## 5. Copy and product truth

All seven Fable corrections (F1-01 through F1-07) implemented in S5 and independently
re-verified against direct evidence (built HTML, S6 screenshot set) in F2. `30-final-copy-ledger.md`
and `32-fable-approved-copy-ledger.md` are the source of truth for every public string. One
item stays explicitly open by design, not oversight: `verses.ts` translation em-dashes are
ruled a joint app+web decision, not a web-only fix — see manual checklist.

## 6. Analytics decision

Unchanged and deliberately unresolved — `26-analytics-plan.md` records this as Ealia's call,
never a unilateral implementation. No new analytics, advertising pixel, session replay, or
tracking dependency was added at any point on this branch. The website does not claim "No
analytics" anywhere in shipped copy; existing repository behaviour around measurement is
untouched.

## 7. Test, build, and quality gate results

- **Tests:** 110/110, re-run three times across this branch's life (post-S5, post-S6 footer
  fix, and again this session) — always clean.
- **Build:** clean every time it has been run on this branch, including this session.
- **English Lighthouse (local, `astro preview`):** Performance 89–94 (noisy across repeated
  runs on this machine, proven via A/B test against the pre-S5 commit not to be an S5/S6
  effect), Accessibility 97, Best Practices 100, SEO 100. CLS 0. LCP 3.2s. Page transfer
  361KB.
- **Farsi Lighthouse (local):** Performance 94 (single run), Accessibility 97, Best Practices
  100, SEO 100. CLS 0. LCP 2.9s. Page transfer 298KB.
- These numbers **supersede** the earlier S4-recorded "97/97/100/100" figure, which this
  branch's S6/S7 sessions could not reproduce locally. Full A/B methodology in
  `final-evidence/phase-13/lighthouse/lighthouse-summary.md`. Two gates are honestly recorded
  as not currently passing from local evidence:
  - **F3 (contrast):** Lighthouse's `color-contrast` audit fails reproducibly on the
    constellation/journey copper-surface text, both locales, both pre- and post-S5 builds.
    Not new, not S5/S6-caused. F1's direct pixel inspection judged it comfortable; the
    discrepancy needs a real-device/real-tool spot check, not a local script (a Playwright
    contrast probe was attempted and explicitly ruled untrustworthy — it cannot correctly
    sample a `linear-gradient` background's rendered colour).
  - **G4 (LCP):** 2.9–3.2s locally against a 2.5s target. Proven by A/B testing (isolated
    worktree of the pre-S5 commit, identical result) not to be caused by any correction on
    this branch. Not resolved. Needs a real Cloudflare Pages preview-deploy measurement —
    local `astro preview` cannot distinguish a genuine regression from a local-environment
    artefact (no HTTP/2, no CDN, no production TLS/compression profile).
- **Routes:** all 7 static routes build and were spot-checked this session; full route/nav/
  hreflang/OG/sitemap/JSON-LD integrity was verified fresh in S6 (`18-acceptance-results.md`
  H2).
- **CSP:** zero inline `style=`, zero inline `script=` in built output (one pre-existing
  `application/ld+json` block, unaffected, expected). One real CSP violation (inline style on
  ceremony petals) was found and fixed earlier in this branch's history (G6, Phase 12).
- **Placeholder audit:** `placeholder|temporary|temp|provisional|TODO|FIXME|mock|candidate`
  swept across `src/` in S2 and again in S6. Two legitimate stale TODOs remain (see §8),
  correctly not removed — they mark real open questions, not leftover scaffolding.

## 8. Two open, non-blocking findings carried into this closeout

Found during S6's regression sweep, neither fixed (both need a live scroll-through capture or
a product decision, not a mechanical code change):

1. `StickyDownloadAction.astro` — whether the sticky mobile CTA correctly hides across the
   ceremony-to-footer boundary specifically, not just while the ceremony section itself is in
   view, is unverified.
2. `BaseLayout.astro` — the scroll-progress calculation anchors to total page height rather
   than a ceremony-specific offset (a stale Phase-9 TODO the boundary now exists to resolve,
   but resolving it was out of scope for a mechanical fix).

## 9. Fable approval status

**Visual Approval Granted** (F2, `42-fable-correction-verification.md`), with the single
standing exception recorded in §4. All Blockers and Majors from F1 are Closed. One new Minor
was recorded by F2 (FA verse-card English translation line's terminal full stop rendering at
the visual left edge — pre-existing bidi behaviour, not S5-caused, candidate one-line fix at
Ealia's discretion).

## 10. Open Blocker / Major counts

- **Open Blockers: 1** — F1-00 (DV-01 screen content), external-evidence-gated.
- **Open Majors: 0** — all four of F1's Majors (F1-01–F1-04) verified Closed by F2.

Neither F3 (contrast) nor G4 (LCP) is classified as a Blocker or Major in Fable's audit
scope — both are pre-existing, proven not to be caused by any correction on this branch, and
both require external verification (real device, real deployed environment) this session
cannot produce. They are carried forward honestly as open technical items, not silently
passed and not inflated to Blocker status they were never assigned.

## 11. Push, merge, deployment status

- **Push: none.** `wrangler.jsonc` binds both `hamdam.com.au` and `www.hamdam.com.au` as
  production custom-domain routes. Whether pushing `feature/hamdam-web-redesign` would
  trigger only an isolated Cloudflare Pages preview deployment, or could interact with the
  production branch designation, depends on dashboard-only settings (production-branch
  designation, "Preview deployments" toggle, environment variable scoping) that are not
  verifiable from this repository — exactly as `27-release-and-rollback-plan.md` already
  documented before this session. Per the push policy, that ambiguity means: do not push.
- **Merge: none.** `main` has not been touched.
- **Deployment: none.** No production deployment has occurred at any point.

The branch is **locally release-candidate ready**. The exact dashboard setting Ealia needs to
verify before a push is safe: confirm in the Cloudflare Pages project settings that the
production branch is set to `main` (not `*` / not `feature/hamdam-web-redesign`) and that
"Preview deployments" is enabled for non-production branches, so that pushing
`feature/hamdam-web-redesign` is guaranteed to produce only a `*.pages.dev` preview URL, never
touching `hamdam.com.au` / `www.hamdam.com.au`.

## 12. What is genuinely ready vs. what is not

**Ready:** every piece of interaction logic, layout structure, RTL mirroring, accessibility
infrastructure, copy (English and Farsi, Fable-approved), and 14 of 15 real production assets.
Code-complete and regression-clean on `feature/hamdam-web-redesign`. Tests and build both pass
cleanly as of this session.

**Not ready:** the site cannot be called visually accepted for production while F1-00 (DV-01
screen content) remains open — six device frames render an honest gradient placeholder, not a
fabricated screenshot. F3 (contrast) and G4 (LCP) are open technical questions needing
real-device/real-deployment measurement this session cannot supply. A short list of real-device
manual checks (VoiceOver, Windows High Contrast, a live Cloudflare preview-deploy Lighthouse
run) remains, reproduced accurately in `51-manual-release-checklist.md`.

## 13. Owner release decision (2026-07-18, Ealia)

Ealia has explicitly authorised production release with the following accepted exceptions,
superseding the "not ready" framing in §12 above for release-gating purposes:

- F1-00 (DV-01 screen content) accepted for this release; DV-01 ships with its current
  temporary gradient screen; recorded as an **open post-launch visual replacement**, not
  closed.
- No fabricated app screenshot substituted; no new analytics added; no "No analytics" claim
  made; repository behaviour otherwise preserved.
- Real VoiceOver, real Windows High Contrast, and Cloudflare preview-dashboard confirmation
  are accepted as **post-launch** checks for this release, not pre-push blockers.
- These accepted items do not block production. **No other Blocker, Major, placeholder,
  failed test, security failure, or build failure is waived** — F3 (contrast, unresolved) and
  G4 (LCP, recorded FAIL) remain live release gates, evaluated fresh at final validation, not
  waived by this decision.

## 14. Exact next action for Ealia

1. Run the hamdam-ios Screenshot Orchestrator
   (`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`) for the approved marketing states, per
   locale, at 1290×2796, and deliver the outputs to this repository for compositing under the
   six DV-01 frame cutouts (`object-fit: contain`), followed by a short Fable spot check of
   the composited result.
2. Confirm the Cloudflare Pages dashboard setting described in §11 before authorising any push
   of this branch.
3. Work through `51-manual-release-checklist.md`.

**Hamdam website redesign release candidate is ready for final owner approval.**
