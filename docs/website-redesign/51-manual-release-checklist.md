# Manual release checklist — Ealia only

Items Claude cannot truthfully complete from this environment. Everything automatable has
already been run and is recorded in `50-release-candidate-report.md`. This list is
intentionally short — it is not a new test programme.

## Owner release decision (2026-07-18)

Ealia explicitly accepted the following items as **post-launch** checks for this release, not
pre-push blockers: DV-01 screen content (F1-00, ships with the temporary gradient, recorded as
an open post-launch visual replacement), real VoiceOver/Safari pass, real Windows High Contrast
device capture, and Cloudflare preview-dashboard confirmation. These are marked accepted below,
not removed from the list — they remain open post-launch work. No other item on this checklist
is waived by that decision.

## Final owner release waivers (2026-07-18, second decision)

Ealia explicitly accepted the following as **OPEN, OWNER ACCEPTED FOR PRODUCTION RELEASE** —
none of these are passed or resolved, all remain open post-launch items:

1. EN LCP 3.2s (target ≤2.5s) — open, accepted.
2. FA LCP 2.9s (target ≤2.5s) — open, accepted.
3. Lighthouse `color-contrast` audit score 0 (F3), both locales — open, accepted.
4. F1-00 / temporary DV-01 gradient screen — open, accepted (unchanged from the first decision).
5. Real VoiceOver pass — deferred, accepted (unchanged from the first decision).
6. Real Windows High Contrast pass — deferred, accepted (unchanged from the first decision).
7. Cloudflare preview-dashboard confirmation — deferred, accepted (unchanged from the first
   decision).
8. `RELEASED` remains `false` — "Coming soon" is the intended, correct CTA state, not a bug.
9. No new analytics added.
10. No "No analytics" claim made anywhere in shipped copy.

No other Blocker, Major, placeholder, failed test, security failure, or build failure is
waived by this decision. This is the final release authorisation; items 1-3 above (LCP ×2,
contrast) were not covered by the first decision and are newly accepted here.

## Blocking

- [x] **DV-01 screen content (F1-00).** Owner-accepted for this release (2026-07-18) — ships
      with the current temporary gradient screen. Recorded as an **open post-launch visual
      replacement**: run the hamdam-ios Screenshot Orchestrator
      (`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`) for the approved marketing states,
      per locale, at 1290×2796, deliver outputs to `hamdam-website` for compositing under the
      six DV-01 frame cutouts, followed by a short Fable spot check — after launch, not before.

## Before any push

- [x] **Cloudflare Pages dashboard check.** Owner-accepted as a **post-launch** confirmation
      for this release (2026-07-18) — not verified pre-push. Still needs doing: confirm the
      production branch is set to `main` (not `feature/hamdam-web-redesign`, not a wildcard)
      and "Preview deployments" is enabled, so pushing the feature branch is guaranteed to
      produce only a `*.pages.dev` preview URL — never `hamdam.com.au` / `www.hamdam.com.au`.
      Not verifiable from the repository; dashboard only.

## Real-device / real-tool checks (cannot be produced from this session; VoiceOver and Windows
## High Contrast owner-accepted as post-launch per the 2026-07-18 decision above)

- [x] **VoiceOver / Safari pass**, both locales. Owner-accepted as post-launch (2026-07-18) —
      still genuinely pending, not performed.
- [x] **Windows High Contrast**, real device. Owner-accepted as post-launch (2026-07-18) — this
      session's Playwright `forcedColors: 'active'` emulation is an automated proxy only,
      explicitly not a substitute, and remains unperformed on a real device.
- [ ] **Real-device colour-contrast spot check** on the constellation/journey copper-surface
      text (F3). Lighthouse fails this reproducibly; a local script attempt to independently
      verify was ruled untrustworthy (can't sample a gradient background's rendered pixel
      colour). Needs a real tool or device.
- [ ] **Real Cloudflare Pages preview-deploy Lighthouse run** for LCP (G4). Local `astro
      preview` measures 2.9–3.2s against a 2.5s target; proven not to be caused by any
      correction on this branch, but not resolved either. Local measurement cannot distinguish
      a genuine regression from a local-environment artefact.

## Known post-launch issue (found live, 2026-07-18, recorded for post correction)

- [ ] **Mood-demo "Bright" stop shows the same verse as "Light."** `src/lib/moodDemo.js`
      `MOOD_STOPS` maps both `light` and `bright` to `verseId: 'parvin-008'` (the 3-verse
      `verses.ts` bank is one verse short of the 5 mood stops, and this is the pair that sits
      at the slider's most-scrubbed edge). Confirmed live at hamdam.com.au via Playwright:
      moving the slider to Bright correctly updates the sky background (dawn → morning) and
      `aria-valuetext` ("Bright"), but the verse text and poet credit are byte-identical to
      Light, reading as "nothing happens." No JS error, no CSP block — a content-mapping gap,
      not a crash. Fix options recorded, not applied: remap `bright` to reuse `hafez-016` or
      `rumi-011` instead (one-line change), or add a genuinely distinct 4th verse via Ganjoor.
      Not fixed this session per Ealia's instruction to record only.

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
