# Manual release checklist — Ealia only

Items Claude cannot truthfully complete from this environment. Everything automatable has
already been run and is recorded in `50-release-candidate-report.md`. This list is
intentionally short — it is not a new test programme.

## Blocking

- [ ] **DV-01 screen content (F1-00).** Run the hamdam-ios Screenshot Orchestrator
      (`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`) for the approved marketing states,
      per locale, at 1290×2796. Deliver outputs to `hamdam-website` for compositing under the
      six DV-01 frame cutouts. Follow with a short Fable spot check of the composited result.
      This is the only item standing between this branch and full visual acceptance.

## Before any push

- [ ] **Cloudflare Pages dashboard check.** Confirm the production branch is set to `main`
      (not `feature/hamdam-web-redesign`, not a wildcard) and "Preview deployments" is enabled,
      so pushing the feature branch is guaranteed to produce only a `*.pages.dev` preview URL —
      never `hamdam.com.au` / `www.hamdam.com.au`. Not verifiable from the repository; dashboard
      only.

## Real-device / real-tool checks (cannot be produced from this session)

- [ ] **VoiceOver / Safari pass**, both locales.
- [ ] **Windows High Contrast**, real device. This session's Playwright `forcedColors: 'active'`
      emulation is an automated proxy only — explicitly not a substitute.
- [ ] **Real-device colour-contrast spot check** on the constellation/journey copper-surface
      text (F3). Lighthouse fails this reproducibly; a local script attempt to independently
      verify was ruled untrustworthy (can't sample a gradient background's rendered pixel
      colour). Needs a real tool or device.
- [ ] **Real Cloudflare Pages preview-deploy Lighthouse run** for LCP (G4). Local `astro
      preview` measures 2.9–3.2s against a 2.5s target; proven not to be caused by any
      correction on this branch, but not resolved either. Local measurement cannot distinguish
      a genuine regression from a local-environment artefact.

## Content / product decisions still Ealia's call

- [ ] Analytics decision (`26-analytics-plan.md`) — nothing implemented yet, by design.
- [ ] Em dashes in `verses.ts` translations — ruled a joint app+web decision, not fixed here.
- [ ] Mood-label replacement (F1-02) — veto window if app-string continuity is preferred over
      Fable's replacement wording.
- [ ] Trademark/IP owner name confirmation (both names intentional?).
- [ ] App Store ID constant in `src/lib/appStore.js` — confirm before release.
- [ ] Roots coverage: confirm Mehregan and Sizdah Bedar have shipped in-app before the website
      references them.
- [ ] Widgets claim confirmation (QUIET-02/03).
- [ ] ROOTS-02 FA moment sentences — confirm app-side SIMA review has cleared this copy.
- [ ] CONST-03 wording sign-off against the shipped privacy policy text.

## Minor, non-blocking

- [ ] **FA verse-card translation line** (F2 finding) — the terminal full stop on the English
      translation line renders at the visual left edge inside the RTL container. Pre-existing,
      not caused by any correction on this branch. Candidate one-line fix (explicit LTR
      direction on the element) available at your discretion; not required for release.
- [ ] **Sticky-CTA boundary behaviour** — whether the mobile CTA pill correctly hides across
      the ceremony-to-footer gap specifically (not just while the ceremony section is in view)
      needs a live scroll-through; a stale Phase-9 TODO the code boundary now exists to
      resolve, but resolving it needs a decision, not just a mechanical fix.
- [ ] **Scroll-progress anchoring** (`BaseLayout.astro`) — currently uses total page height
      rather than a ceremony-anchored offset. Practical effect likely small; unmeasured.

## Final sign-off

- [ ] Ealia's own final visual review, side by side with the North Star mockups.
- [ ] Final production merge approval (nothing has been merged to `main`).
