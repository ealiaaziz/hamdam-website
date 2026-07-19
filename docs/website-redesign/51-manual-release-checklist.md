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
8. **Superseded 2026-07-19: the app is now live on the App Store, and `RELEASED` has been
   flipped to `true` on Ealia's explicit instruction** (`appStore.js`). The real App Store
   badge/link now renders everywhere it's gated (nav CTA, sticky mobile pill, hero/mid/
   ceremony/plans CTAs) instead of the "Coming soon" pill.
9. No new analytics added.
10. Superseded 2026-07-19: the "No analytics" claim was already corrected (see the Analytics
    decision entry below) once Cloudflare Web Analytics was confirmed on.

No other Blocker, Major, placeholder, failed test, security failure, or build failure is
waived by this decision. This is the final release authorisation; items 1-3 above (LCP ×2,
contrast) were not covered by the first decision and are newly accepted here.

## Blocking

- [x] **DV-01 screen content (F1-00).** Done 2026-07-19 — real screenshots now composited into
      all six frame cutouts, replacing the temporary gradient. Ran the hamdam-ios Screenshot
      Orchestrator; discovered along the way that its existing composed 1290×2796 output
      (marketing gradient + headline + its own baked-in phone mockup) isn't the right asset for
      this — nesting it in another frame double-frames — so added an additive raw-screen export
      (`ScreenshotOrchestrator.swift`, `Documents/HamdamScreenshots/Raw/`) and fixed a
      transparency bug it surfaced in the Today screen (`ScreenshotViewFactory.swift`). Cutout
      position was measured from `device-frame-iphone.png`'s own alpha channel, not eyeballed.
      Verified with local PIL composite renders (no live browser available this session) before
      and after wiring, across all five distinct screens/both locales — see commits in both
      repos. **Still owed**: the "short Fable spot check" this line originally called for, and
      a live check at hamdam.com.au once this deploys.

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

## Known post-launch issue (found live, 2026-07-18, fixed 2026-07-19)

- [x] **Mood-demo "Bright" stop shows the same verse as "Light."** Fixed 2026-07-19. Root cause
      was worse than first recorded: the 3-verse `verses.ts` bank was short for the 5 mood
      stops in *two* places, not one — `unsettled`/`steady` both mapped to `rumi-011` as well,
      undetected because no test asserted distinct verse ids per stop. Fix applied: extracted
      `parvin-013` (equanimity/patience — Steady) and `saadi-003` (morning/welcome — Bright)
      byte-exact from the iOS app's verse bank into `verses.ts`, remapped `MOOD_STOPS` in
      `src/lib/moodDemo.js` so all 5 stops reference distinct verses, and added a regression
      test (`moodDemo.test.js`) asserting verse-id uniqueness across stops. `VerseShowcase.astro`
      was pinned to the original 3 curated ids (`hafez-016`/`rumi-011`/`parvin-008`) so the
      homepage's 3-column showcase grid is unaffected by the two additions to `verses.ts`.
      111/111 tests pass; `astro build` clean; built `dist/index.html` still renders exactly 3
      showcase cards. Still needs: a live re-check at hamdam.com.au once this deploys, and
      Ealia's sign-off on the two new verse/theme choices.

## Content / product decisions still Ealia's call

- [x] **Roots coverage (Mehregan/Sizdah Bedar)** — verified 2026-07-19, resolved, not a question.
      Checked `hamdam-ios` directly: `RootsContent.swift`'s `curatedMomentIds` includes both
      `"mehregan"` and `"sizdahBedar"`, and both have real `CulturalMoment` entries with date
      rules in `CulturalMoment.swift` (mehregan: Mehr 10, sizdahBedar: Farvardin 13). Both are
      shipped in-app. The website's reference to them is factually supported.
- [x] **Widgets claim (QUIET-02/03)** — verified 2026-07-19, resolved, not a question. Checked
      `hamdam-ios` directly, all five QUIET-02/03 platform claims are real and shipped: a
      `HamdamWidgetsExtension` target exists and links `WidgetKit.framework` (widgets); Siri/App
      Shortcuts shipped per Phase 18/9A (already known); Watch companion shipped (already
      known); `HealthKitProvider.swift` constructs a real `HKStateOfMind` and calls
      `healthStore.save(sample)` (State of Mind write); `MusicService.swift`/
      `MiniPlayerView.swift` are live and were touched as recently as build 62 (Apple Music
      continue-button wording fix). No claim in that paragraph is unsupported.
- [~] **ROOTS-02 FA moment sentences — SIMA review status checked, still NOT cleared.** Verified
      2026-07-19: `Localization.swift` still carries the `AUTHORED BY CLAUDE — SIMA REVIEW
      PENDING` flag on every relevant string (50+ occurrences across the file, unchanged).
      Ealia is reviewing and clearing this herself (2026-07-19) — in progress, not blocked on
      anything further from this session.
- [x] **Analytics decision** (`26-analytics-plan.md`) — resolved 2026-07-19. Ealia confirmed
      Cloudflare Web Analytics is ON in the dashboard (the plan's "Option B"). Fixed the
      previously-inaccurate "no third-party analytics" claim on both `privacy.astro` and
      `fa/privacy.astro` (meta description + the "What Hamdam Does Not Collect" bullet list) to
      disclose Cloudflare Web Analytics explicitly: cookieless, aggregate page counts only, no
      cross-site tracking, still none of Firebase/Mixpanel/Amplitude/Google Analytics. FA copy
      Claude-authored and byte-validated (`npm run check:persian` passes). The plan's optional
      five-event CTA-click tracking (Option B's secondary scope) was **not** implemented —
      that's a separate decision, not implied by turning the toggle on.
- [x] **Em dashes in `verses.ts`/`poets.ts` translations** — resolved 2026-07-19. Ealia's call:
      leave them, translated poetry content is exempt from the no-em-dash rule (which governs
      generated text). No change made on either platform.
- [x] **Mood-label replacement (F1-02)** — resolved 2026-07-19. Ealia vetoed Fable's labels in
      favour of app-string continuity. Reverted `moodDemo.js`'s FA labels to the exact pre-Fable
      values (`dd09c28`), byte-identical to `appleHealthLabel(for:)`'s five relevant valence
      buckets.
- [x] **Trademark/IP owner name** — resolved 2026-07-19. Ealia confirmed: everything should
      read "Seyed Valiallah Azizollahi," including the ABN/contact line (ABN 74 389 481 503).
      Replaced every "Ealia Azizollahi" occurrence across all four legal pages (`terms.astro`,
      `privacy.astro`, `fa/terms.astro`, `fa/privacy.astro`, including each page's JSON-LD
      `publisher.name`) — confirmed zero remaining occurrences via repo-wide grep.
- [x] **App Store ID** in `src/lib/appStore.js` — resolved 2026-07-19. Ealia confirmed
      `'6784461990'` is correct: the app is ASC-approved, just not yet released (matches
      `RELEASED: false`). No code change needed.
      **Superseded same day**: the app went live, and `RELEASED` is now `true`.
      Optional follow-up, not blocking: `ASC_PROVIDER_TOKEN` in the same file is still the
      `'[ASC_PROVIDER_TOKEN]'` placeholder — safe to ship as-is (an unresolved `pt` value is
      just ignored by Apple's attribution system, never a broken link), but if Ealia wants
      real App Store Connect campaign attribution on outbound clicks, the real provider
      token from ASC would replace it here.
- [ ] CONST-03 wording sign-off against the shipped privacy policy text.

## Minor, non-blocking

- [x] **FA verse-card translation line** (F2 finding) — fixed 2026-07-19. Added explicit
      `dir="ltr"` to the English translation `<p>` in `VerseCard.astro`, per the candidate fix
      already recorded here. Verified in built `dist/fa/index.html`.
- [x] **Sticky-CTA boundary behaviour** — decided and fixed 2026-07-19. Made the call: the
      floating pill should stay hidden across the footer too, since it's legal/nav content
      (privacy, terms, contact, trademark line), never a conversion moment. Added a
      `data-store-cta="footer"` landmark to `Footer.astro`, a new `FOOTER` state in
      `stickyCta.js`'s state machine (`shouldShowFloatingCta` already treats any non-NONE state
      as hidden, so no change needed there), and a regression test. Side effect fixed too: this
      also stops the pill floating for the entire body of `privacy`/`terms` pages, which
      previously had zero landmarks and so were always in the NONE ("show") state. **Could not
      do the live scroll-through this recorded as needed** — Playwright browser automation was
      blocked by this session's permission classifier even for a bare screenshot, and
      `APP_STORE.RELEASED` is `false` pre-launch so the pill doesn't render at all to observe
      manually either. Reasoned from DOM structure/geometry instead (Footer directly follows
      FinalCeremony with no gap in document flow, default IntersectionObserver threshold).
      `RELEASED` is now `true` (2026-07-19, app live) so the pill renders for real — the real
      scroll-through is now actually possible and is still owed, just no longer blocked by
      the flag itself. Still can't do it myself: Playwright remained blocked all session.
- [x] **Scroll-progress anchoring** (`BaseLayout.astro`) — fixed 2026-07-19. Was using
      `document.documentElement.scrollHeight - window.innerHeight` (progress reaches 1 at the
      very bottom of the page, after the footer). Re-anchored to `#ceremony`'s own offset, per
      `cinematic.js`'s own doc comment ("1 when the final ceremony section is fully in view"),
      so the sky-tone ramp completes by the time ceremony begins instead of continuing to shift
      across the footer's scroll distance below it. Pages with no ceremony section
      (privacy/terms/404) keep the old total-page-height fallback. 112/112 tests pass, build
      clean; visual confirmation of the ramp timing still needs a live scroll-through (same
      Playwright blocker as above).

## Final sign-off

- [ ] Ealia's own final visual review, side by side with the North Star mockups.
- [x] Final production merge approval — corrected 2026-07-19: this line was stale.
      `feature/hamdam-web-redesign` was merged to `main` at `b4c51fc` and is live at
      hamdam.com.au; `main` is pushed and up to date with `origin/main`. Nothing further to
      approve here — the open item is the visual review above, not the merge.
