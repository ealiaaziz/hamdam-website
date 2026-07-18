# Hamdam Website Redesign: Visual Acceptance Criteria

Pass or fail checklist for the implemented redesign. The visual authority is the pair of
North Star mockups (`hamdam-ios/docs/design/north-star/Designer (2).png` and
`Designer (3).png`), inspected directly, side by side with the built page. A criterion
marked FAIL blocks ship until fixed or explicitly waived by Ealia in writing. Screenshot
evidence for every check is captured with the same viewport matrix as the baseline audit
(390x844, 430x932, 768x1024, 1024x768, 1440x900, 1728x1117; EN and FA; reduced-motion
full-page captures plus motion-enabled hero states via `?dawn=N`).

## A. North Star fidelity

- A1. Placed beside the North Star Today screen, the hero reads as the same world: warm
  horizon light under a dark sky, blossom framing (desktop), serif display type, capsule
  CTA. Not a clone of the app screen; the same place.
- A2. Every CTA pill on the page is a full capsule (`--radius-pill`), matching the North
  Star "Take a moment to reflect" (closes audit gap §6).
- A3. The poets band's portrait treatment reads as the same editorial register as the
  North Star Discover "Featured Poets" card (large dignified portrait, name-led caption).
- A4. Roots moment cards match the North Star Roots pattern: distinct image per moment,
  Persian-led naming, day countdown present (closes audit gap §3).
- A5. The page's dark-to-dawn arc keeps "warm dawn" as the dominant memory: at least half
  of total scroll height renders on warm (firstlight-to-morning) surfaces; night opens,
  dawn wins (North Star principle: lift and bloom, never sad, never clinical).
- A6. Empty space reads as calm, not absent: no viewport-height stretch of surface without
  either imagery, a device frame, or display typography (closes audit gaps §2, §7, §10).

## B. Product truth

- B1. Every app screen shown on the page is a byte-derived orchestrator screenshot
  (6 shots per locale available; no compositing beyond the DV-01 frame). Zero invented
  screens, zero HTML mock "app UI."
- B2. Every capability claim on the page traces to the approved App Store description,
  the Privacy Policy, or the Terms. Spot-check list: mood slider, verse in Persian and
  English, five poets, streak forgiveness, journal search, journey insights, Iranian
  calendar moments, Fal e Hafez, Siri, widgets, Watch, Health State of Mind (opt-in
  phrasing), Apple Music, on-device AI.
- B3. No reviews, ratings, user counts, awards, press mentions, or download figures
  appear anywhere.
- B4. Exactly five poets, exactly the locked names. A page-source grep for "Forough"
  returns nothing.
- B5. No dollar figure appears anywhere in page source (grep for "$", "AUD", digit-dot
  price patterns).

## C. Persian and cultural integrity

- C1. `npm run check:persian` passes; every Persian string on the page byte-matches its
  approved repo source (verses from `verses.ts`, UI copy from the approved copy pipeline).
- C2. No image on the page contains rendered Persian or English text (inspect all fourteen
  Canva assets individually).
- C3. FA pages mirror composition, not just alignment: hero light source, constellation
  direction, poet card order, journey frame offset, roots card order all flip; verified
  side by side EN vs FA at 1440x900 and 390x844.
- C4. Persian verse text is visually dominant over English translation in both locales.
- C5. Portraits and cultural imagery carry no stereotype or exoticised ornament
  (reviewed against the asset brief's acceptance criteria, and by Ealia for the PT and CM
  series).
- C6. Ganjoor.net attribution present in the footer, both locales.
- C7. No em dash or en dash anywhere in rendered copy, either language (automated grep
  for U+2013 and U+2014 in built HTML, excluding third-party legal boilerplate none of
  which should exist anyway).

## D. Dimensional restraint

- D1. Exactly three dimensional moments exist: hero, mood demonstration, ceremony.
- D2. No WebGL context is created anywhere (DevTools check).
- D3. Nothing on the page loops, bounces, floats idly, or follows the pointer; after
  settle and outside interaction, a static viewport stays static (record 10s of idle
  video at three scroll positions to verify).
- D4. No autoplay audio; no `<audio>`/`<video>` with autoplay attribute in source.
- D5. The petal pass runs at most once per page load; re-scrolling the ceremony does not
  replay it.

## E. Conversion visibility

- E1. At every scroll position on mobile, at most one App Store action is visible, and
  from the hero onward one is always at most one interaction away (visible or one
  anchor-scroll away).
- E2. Hero headline, support line and CTA visible above the fold at 390x844 and 1440x900,
  both locales, without any animation having to play.
- E3. Pre-release builds render no Apple badge and no store link anywhere; post-release
  flip requires only `APP_STORE.RELEASED = true`.
- E4. The ceremony CTA sits on the brightest surface with badge contrast per Apple's
  guidelines; nothing overlaps or occludes it at any viewport.

## F. Accessibility (blocking)

- F1. Keyboard-only pass: skip link first, every interactive element reachable in a
  logical order, visible focus per the two-token focus system, mood slider fully
  operable, carousels traversable, no trap.
- F2. Screen reader pass (VoiceOver, Safari): landmarks correct; mood demo announces
  feeling then verse via `aria-live="polite"`; constellation reads as a six-item list;
  decorative layers (plates, petals, arcs, star field) silent.
- F3. Contrast: every text token on every surface stage passes WCAG AA 4.5:1 (3:1 for
  large display text); spot-check the graded sky at thresholds 0.45 and 0.8 where text
  tokens flip; caption plates over imagery measured, not assumed.
- F4. `prefers-reduced-motion: reduce` full-page captures show every section complete and
  legible with the §20 substitutions applied; the ceremony's static composition stands on
  its own.
- F5. `prefers-contrast: more` renders opaque plates and hardened tokens per the design
  system.
- F6. All meaningful images have localised alt text per the asset brief; decorative
  images have empty alt.
- F7. Touch targets ≥44px throughout (toggle, slider, carousel controls, footer links,
  sticky CTA).

## G. Performance (blocking budgets)

- G1. Lighthouse mobile, both locales, production build: Performance ≥90, Accessibility
  = 100, Best Practices = 100, SEO = 100 (the current site achieves 96 to 98; the
  redesign may spend at most a few points, never below 90).
- G2. CLS = 0 on both locales (current site achieves this; every image has reserved
  dimensions).
- G3. Total image transfer for the homepage first load ≤450KB on mobile (hero plates plus
  eager assets); full-page total image transfer ≤1.2MB per locale.
- G4. LCP ≤2.5s on simulated 4G mid-tier mobile; the LCP element is the headline or the
  hero plate, never a below-fold asset.
- G5. Motion JS ≤12KB minified total; no long task >50ms during a full scroll recording.
- G6. The site builds with the existing toolchain (`npm run build`) with zero new
  framework dependencies; CSP passes with no `unsafe-inline` additions.

## H. Regression protection

- H1. All existing unit tests pass; new pure functions (sky ramp, campaign parameters,
  countdown, mood mapping) have unit tests in the existing `src/lib/__tests__/` pattern.
- H2. Legal pages, 404, hreflang, sitemap, OG images, Smart App Banner meta and security
  headers all survive unchanged (diff `dist/` head output against baseline for
  non-homepage routes).
- H3. The `?dawn=N` deterministic review parameter still works and now drives the
  page-wide arc.
- H4. Language toggle round-trips every route, preserving path and query.

## Sign-off record

Claude's detailed self-assessment against every lettered item above is recorded in
`18-acceptance-results.md`, generated at the end of Phase 12 (2026-07-18). This table is
Ealia's own sign-off record, separate from that self-assessment.

| Gate | Checked by | Date | Result |
|---|---|---|---|
| A. North Star fidelity | | | |
| B. Product truth | | | |
| C. Persian and cultural integrity | | | |
| D. Dimensional restraint | | | |
| E. Conversion visibility | | | |
| F. Accessibility | | | |
| G. Performance | | | |
| H. Regression | | | |
| Ealia cultural approval (PT, CM, FC assets) | | | |
| Ealia final visual approval | | | |
