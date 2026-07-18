# Hamdam Website Redesign: Implementation Plan

Bounded, phase-by-phase build plan for the approved redesign. This document is the operative
phase structure for implementation sessions from this point forward. It does not replace
`17-sonnet-implementation-handoff.md`; it expands it. Doc 17's W-A through W-F work packages,
reuse table, and "things you will be tempted to do; do not" list stay binding — the mapping
between the two structures is given per phase below so nothing is duplicated or contradicted.

Read first, in this order, before starting any phase: `.claude/skills/hamdam-web-director/SKILL.md`,
`10-creative-direction.md`, `11-page-design-specification.md`, `12-design-system.md`,
`13-motion-specification.md`, `15-conversion-specification.md`, `16-visual-acceptance-criteria.md`,
`17-sonnet-implementation-handoff.md`, then the two North Star PNGs directly.

## Design authority order (restated, binding for every phase)

1. Real shipped Hamdam behaviour and approved product facts
2. `hamdam-ios/docs/design/north-star/` (the two mockup PNGs, inspected directly)
3. `16-visual-acceptance-criteria.md`
4. `11-page-design-specification.md`
5. `12-design-system.md`
6. `13-motion-specification.md`
7. Existing website implementation
8. Implementer's own preference

### North Star conflict rule (narrow, binding)

The North Star mockups (`hamdam-ios/docs/design/north-star/Designer (2).png`,
`Designer (3).png`) remain the pass/fail authority for **layout, visual hierarchy,
typography, spacing, card composition, content prominence, and default presentation.**
This is the general rule, and it is not overridden by shipped behaviour except in the one
scoped exception below.

**One currently approved exception exists, and it is scoped to colour only:** the static
colours shown in the North Star PNG files may be superseded by the shipped app's dynamic
scene-driven palette system, where that behaviour can be demonstrated from the current app
implementation. This exception applies only to palette behaviour. It does not permit
reinterpretation of layout, tab structure, component count, hierarchy, typography, spacing,
or default view. Any further conflict between a North Star mockup and shipped behaviour must
be documented explicitly, citing both sources, and must not be resolved through a general
statement that shipped behaviour always wins.

Two cases are documented under this rule; do not re-litigate them, but do not extend their
reasoning to any other section without the same explicit documentation:

- **Palette-assignment mechanism (the approved exception, applied).** The North Star PNGs
  depict a fixed per-tab light/dark split (predates the app's 2026-07-09 unified
  weather-driven palette, bug T-17, `HamdamPaletteResolver`, `docs/decisions.md` lines
  122-133 in `hamdam-ios`). This is demonstrable from the current shipped app implementation,
  so the palette exception applies: the website's sky arc and the mood demonstration echo the
  shipped dynamic per-scene mechanism (one scene resolves both background and text treatment
  together), not the mockup's older fixed-tab colour assignment. The mockups remain
  authoritative for everything else about these same screens: per-screen *mood, composition,
  layout, and hierarchy* (what Today, Discover, Roots look like structurally) are unaffected
  by this exception and still govern.
- **Poets in Discover (not the palette exception; a separate, explicitly documented case).**
  The North Star Discover mockup depicts a Featured Poets carousel. This is not resolved by
  "shipped behaviour supersedes the mockup" reasoning at all: it is resolved by the design
  authority order's own ranking, given at the top of this document, where "real shipped
  Hamdam behaviour and approved product facts" (priority 1) sit above the North Star mockups
  (priority 2). A locked product decision (poets live in Roots only, Discover never gets a
  poet carousel, `hamdam-ios/docs/decisions.md`, Decision 2) is an approved product fact,
  citable at priority 1. The website's poet wisdom section (Phase 6) draws its editorial
  register from the Discover mockup's portrait treatment (layout/typography/hierarchy, which
  the mockup still governs) but its content placement follows the locked decision, not the
  mockup's own composition on this one specific point. This case is closed by citation to a
  specific locked decision document, not by any general rule, and is not precedent for
  resolving unrelated conflicts the same way.

If implementation work in Phases 1 through 13 surfaces any further North Star-vs-shipped
conflict beyond these two documented cases, it is recorded explicitly (which mockup, which
shipped behaviour, which specific element) in that phase's commit notes or in
`18-acceptance-results.md`, and escalated to Ealia rather than resolved by extending either
of the two reasonings above.

## Hard constraints (all pre-verified against the current repo, restated for phase planning)

- Stack stays: Astro 7.0.5 static output, Tailwind v4 via `@tailwindcss/vite`, npm, Cloudflare
  Pages deploy on push to `main`. No framework migration, no hosting change, no CMS, no
  routing rewrite, no state management library, no animation library, no WebGL.
- CSP is enforcing (`public/_headers`): `script-src 'self' https://static.cloudflareinsights.com`,
  `style-src 'self'` (no `unsafe-inline` anywhere), `assetsInlineLimit: 0`,
  `inlineStylesheets: 'never'`. Every dynamic value is a CSS custom property set via
  `element.style.setProperty` in an external module script, following the existing
  `HeroCinematic.astro` / `cinematic.js` pattern.
- No environment variables exist or are needed (`.gitignore` reserves `.env`/`.env.production`
  for future use, but the repo has zero `import.meta.env`/`process.env` references today and
  this plan introduces none). The only launch-day switch is the source constant
  `APP_STORE.RELEASED` in `src/lib/appStore.js`; never touch it except on explicit
  instruction.
- No em dash or en dash in any authored copy, comment, or doc, either language, ever.
- Persian text is never hand-typed or hand-edited; it flows through `src/data/verses.ts` and
  the approved `siteCopy.ts` pipeline only; `npm run check:persian` (pre-commit-hooked) must
  pass at every commit.
- Never push, merge, publish, deploy, or flip `APP_STORE.RELEASED` without explicit
  instruction. Never touch DNS or Cloudflare dashboard settings.

## Phase-to-work-package mapping

| This plan | Doc 17 work package | Relationship |
|---|---|---|
| Phase 0 | (pre-W, new) | Planning and safety, not in doc 17's scope |
| Phase 1 | W-A Design system foundation | Same scope, same acceptance bar |
| Phase 2 | Boundary of W-A / W-B | Doc 17 does not name nav as its own package; made explicit here because the sticky mobile CTA (conversion spec §2) and nav bar CTA (page spec §1) must exist and be stable before the sky arc lands, so later phases can build on a fixed conversion shell |
| Phase 3 | First half of W-C | Static hero composition only, no scroll wiring |
| Phase 4 | W-B + second half of W-C | Sky arc module plus hero's scroll-linked behaviour, gated on Phase 3 passing visual review |
| Phase 5 | Part of W-D | Page spec §3 |
| Phase 6 | Part of W-D | Page spec §4 |
| Phase 7 | Part of W-D | Page spec §5 and §6 |
| Phase 8 | Part of W-D | Page spec §7 |
| Phase 9 | Rest of W-D + all of W-E | Page spec §8, §9, §10; conversion system finalisation |
| Phase 10 | Correction pass ahead of W-F | Dedicated RTL gate, not a new build |
| Phase 11 | Correction pass ahead of W-F | Dedicated accessibility/reduced-motion gate |
| Phase 12 | Correction pass ahead of W-F | Performance, SEO, metadata, analytics decision gate |
| Phase 13 | W-F Acceptance pass | Identical to doc 17 §3.6, produces `18-acceptance-results.md` |

All fourteen phases are implemented and committed on the dedicated implementation branch
`feature/hamdam-web-redesign`, never directly on `main`. `main` is the production branch and
stays untouched by redesign work until an explicit, Ealia-approved merge after Phase 13.
Every phase is its own commit (or small commit group) on that branch, keeps `npm run build`,
`npm run test`, and `npm run check:persian` green, and leaves the branch shippable at HEAD.
No phase ships to production; deployment happens only when Ealia says so, per
`27-release-and-rollback-plan.md`, which is also the authority for the branch's relationship
to Cloudflare preview/production deployments.

---

## Canva asset inventory (reconciled)

`14-canva-asset-brief.md` lists fifteen distinct asset IDs (HW-01, HW-02, HW-03, HW-04,
PT-01, PT-02, PT-03, PT-04, PT-05, CM-01, CM-02, CM-03, DV-01, CY-01, FC-01) but its own
"Asset count" summary line states "14." That summary line undercounts by one against its own
itemised list; this table is the reconciled count (**15 assets**) and is the authority for
implementation planning purposes. `14-canva-asset-brief.md` itself is not modified by this
correction; the discrepancy is recorded here, not fixed at the source.

One additional asset exists in the same page spec but is explicitly outside this fifteen:
optional texture plate `SC-04`, referenced in page spec §3 (mood demonstration) as "reused
from the scene library if contrast-proven." It draws from the three existing scene JPGs
already committed at `src/assets/scenes/*.jpg` (already in the repo, already used elsewhere),
not a new Canva-produced asset, and the brief's own scope note explicitly excludes
"assets already covered by other pipelines." It is optional and non-blocking; every other
row below is required and blocking for its section's final visual acceptance.

| ID | Filename | Required phase | Required/optional | Desktop/mobile/shared | Fallback requirement | Cultural approval | Licence log | Blocking/non-blocking |
|---|---|---|---|---|---|---|---|---|
| HW-01 | `hero-horizon-desktop.png` | 3 | Required | Desktop/tablet (≥768px) | Labelled solid-tone placeholder block behind `SHOW_REDESIGN_SECTION_HERO` if late; never a stock image | No | Required | Non-blocking for initial Phase 3 build; blocking for Phase 3 final visual acceptance |
| HW-02 | `hero-horizon-mobile.png` | 3 | Required | Mobile (<768px) | Same placeholder rule | No | Required | Same as HW-01 |
| HW-03 | `ceremony-morning-horizon.png` | 4 (sky-ramp terminal reference), 9 (first visual placement, ceremony) | Required | Shared (art-directed crop for mobile) | Placeholder in Phase 9 if late; Phase 4's ramp function can be built and unit-tested against the token value alone without the image | No | Required | Non-blocking for Phase 4 (logic only); blocking for Phase 9 final visual acceptance |
| HW-04 | `hero-blossom-foreground.png` | 3 | Required | Desktop only (dropped on mobile) | Same placeholder rule as HW-01; section still passes on mobile without it (mobile never shows this layer) | No | Required | Non-blocking for initial Phase 3 build; blocking for Phase 3 desktop final visual acceptance only |
| PT-01 | `poet-hafez.png` | 6 | Required | Shared | Labelled placeholder block behind `SHOW_REDESIGN_SECTION_POETS`; all five PT assets ship together as one approved series, never partially | Yes (all five approved together) | Required | Non-blocking for initial Phase 6 build; blocking for Phase 6 final visual acceptance |
| PT-02 | `poet-rumi.png` | 6 | Required | Shared | Same | Yes (all five approved together) | Required | Same as PT-01 |
| PT-03 | `poet-saadi.png` | 6 | Required | Shared | Same | Yes (all five approved together) | Required | Same as PT-01 |
| PT-04 | `poet-khayyam.png` | 6 | Required | Shared | Same | Yes (all five approved together) | Required | Same as PT-01 |
| PT-05 | `poet-parvin.png` | 6 | Required | Shared | Same | Yes (all five approved together) | Required | Same as PT-01 |
| CM-01 | `moment-yalda.png` | 8 | Required | Shared | Labelled placeholder block behind `SHOW_REDESIGN_SECTION_ROOTS` | Yes | Required | Non-blocking for initial Phase 8 build; blocking for Phase 8 final visual acceptance |
| CM-02 | `moment-norooz.png` | 8 | Required | Shared | Same | Yes | Required | Same as CM-01 |
| CM-03 | `moment-chaharshanbe-suri.png` | 8 | Required | Shared | Same | Yes | Required | Same as CM-01 |
| DV-01 | `device-frame-iphone.png` | 3 (first use), reused in 7, 8, 9 | Required | Shared | Highest-priority placeholder: per the brief's own production-order note, DV-01 "unblocks every screenshot section," so its absence is placeholder-gated in four phases at once (3, 7, 8, 9), not just one | No | Required | Non-blocking for initial builds; blocking for final visual acceptance of every phase that frames a real screenshot (3, 7, 8, 9) |
| CY-01 | `ceremony-petals.png` | 9 | Required | Shared | Ceremony ships without the petal pass if late (motion spec's own reduced-motion state already omits petals entirely, so a missing-asset fallback is the same rendering path as the reduced-motion path, not a new one) | No | Required | Non-blocking for initial Phase 9 build; blocking for Phase 9's motion-enabled final visual acceptance only (the reduced-motion acceptance path is unaffected) |
| FC-01 | `founding-companion-band.png` | 9 | Required | Shared (mobile uses centre crop) | Labelled placeholder block behind `SHOW_REDESIGN_SECTION_PLANS` | Yes (per the brief's global rule: "any asset depicting cultural material, PT, CM, FC series, requires Ealia's explicit approval before entering the repo," which covers FC-01's shamseh relief motif) | Required | Non-blocking for initial Phase 9 build; blocking for Phase 9 final visual acceptance |

**Finding beyond the literal correction request, flagged rather than silently applied:** the
asset brief's own global cultural-review rule names three series requiring Ealia's approval:
"PT, CM, FC series." The phase-gating instruction in this correction names cultural approval
gates for Phase 6 (PT) and Phase 8 (CM) but not Phase 9's FC-01. The table above applies the
brief's own stated rule to FC-01 as well, consistent with the source document rather than
narrowing it to only the two phases named in the correction request. This is called out
explicitly in the final response rather than applied silently.

### Phase gating on asset availability (explicit statement)

1. **Phases 1 and 2 may begin without final Canva assets.** Neither phase consumes any asset
   from the table above (Phase 1 is tokens/type/grid, Phase 2 is nav/language/sticky-CTA
   shell); both are fully buildable and fully acceptance-testable on their own terms without
   waiting on Canva production.
2. **Phase 3 (hero) cannot receive final visual acceptance without its approved final
   assets** (HW-01, HW-02, HW-04, and DV-01's first use). The phase's static composition can
   and should be built against labelled placeholders to validate layout and code structure,
   but Gate A (North Star fidelity, specifically A1) cannot pass, and Phase 3's own
   visual-review gate (required before Phase 4 begins) cannot close, until the real assets
   are in place.
3. **Phase 6 (poet wisdom experience) cannot receive final visual acceptance without
   approved PT assets and cultural approval.** All five PT assets ship as one
   Ealia-approved series or not at all (per the brief's own acceptance criteria for that
   asset group); a partial set (for example three of five approved) does not unblock
   Phase 6's acceptance gate (B4 and C5 both require the complete, correct five).
4. **Phase 8 (Roots experience) cannot receive final visual acceptance without approved CM
   assets and cultural approval.** Same principle: CM-01, CM-02, CM-03 and Ealia's cultural
   sign-off are required together before Gate A4 and C5 close for this section.
5. **Phase 9 (privacy, plans, Founding Companion, ceremony) cannot receive final visual
   acceptance without FC-01 (cultural approval required, per the finding above) and, for the
   ceremony's motion-enabled state specifically, CY-01.** The reduced-motion rendering of the
   ceremony does not depend on CY-01 (petals are absent from that rendering regardless) and
   can pass acceptance independently.
6. **Temporary development assets must be explicitly marked and must never be treated as
   production-approved.** Every placeholder block carries a visible marker in code (a
   comment and, where feasible, a visible development-only label rendered only in non-
   production builds, never shipped) and is gated behind its section's `SHOW_REDESIGN_
   SECTION_X` flag exactly as `17-sonnet-implementation-handoff.md` §4 already specifies.
   A placeholder never substitutes for an asset in `18-acceptance-results.md`'s sign-off
   table; a section behind a placeholder is recorded as incomplete, not as a passed gate
   with a temporary image.

---

## Phase 0: Repository safety, evidence verification and final implementation planning

1. **Scope.** This document set (`20` through `27`). Confirm branch/commit state, re-verify
   the existing baseline commands still pass at current HEAD, resolve the phase-numbering and
   authority conflicts above, produce the bounded plan.
2. **Files expected to change.** `docs/website-redesign/20-implementation-plan.md` through
   `27-release-and-rollback-plan.md` (new).
3. **Files protected from change.** Everything else in the repository. No source, config, or
   content file changes in this phase.
4. **Dependencies.** None.
5. **Required assets.** None.
6. **Product facts used.** Current repo state only (branch `main`, commit `ce98883`, working
   tree clean; baseline commands last verified at `cca27ac`, and `cca27ac..ce98883` touched
   only `docs/` and screenshot assets, zero `src/` changes, so that baseline is still valid at
   HEAD).
7. **Desktop acceptance criteria.** Not applicable, no UI changes in this phase.
8. **Mobile acceptance criteria.** Not applicable.
9. **Farsi RTL acceptance criteria.** Not applicable.
10. **Reduced motion acceptance criteria.** Not applicable.
11. **Accessibility checks.** Not applicable.
12. **Performance checks.** Re-run `npm run build`, `npm run test`, `npm run check:persian`
    and confirm they still match the recorded baseline (7 pages, 60/60 tests, zero Persian
    violations).
13. **Tests.** The three commands above.
14. **Screenshots.** None new; the existing 38-shot baseline set in
    `docs/website-redesign/baseline-screenshots/` remains the reference.
15. **Rollback point.** Trivial: this phase only adds new files, `git checkout -- .` or file
    deletion fully reverts it.
16. **Definition of done.** All eight planning documents exist, the baseline is reconfirmed
    valid at current HEAD, and the two authority conflicts above are documented (not
    silently resolved). No implementation has begun.

---

## Phase 1: Design tokens, typography, semantic shell, responsive grid, existing route protection

1. **Scope.** Land the new surface tokens (`12-design-system.md` §1), fluid type scale (§5),
   spacing/grid (§6-7), radius system (§8, including the pill-radius migration), and the
   two-token focus system (§18) into `global.css`/`tokens.css`. No section redesign yet; the
   current page must render correctly on the new token layer (visual parity check, not a
   visual change).
2. **Files expected to change.** `src/styles/tokens.css`, `src/styles/global.css`.
3. **Files protected from change.** `src/pages/*`, all components, `src/lib/*`, `src/data/*`,
   `public/*`, `astro.config.mjs`, `wrangler.jsonc`.
4. **Dependencies.** None new.
5. **Required assets.** None.
6. **Product facts used.** Existing brand tokens (cream `#F4EDD8`, indigo `#1B1B3A`, saffron
   `#E8B04B`, saffron-ink `#7F6029`, ember `#D07B3F`, peach `#F4C6A8`, night-gold `#F0C878`,
   mist-amber-grey `#C98F45`) stay unchanged; new tokens are additive only.
7. **Desktop acceptance criteria.** Existing homepage renders pixel-equivalent to baseline
   screenshots at 1440x900 and 1728x1117 (token additions are inert until consumed).
8. **Mobile acceptance criteria.** Same parity check at 390x844 and 430x932.
9. **Farsi RTL acceptance criteria.** `/fa/` renders at parity; Vazirmatn 6% size multiplier
   and 1.9 line height (`12-design-system.md` §4) verified as tokens, not yet applied beyond
   current usage.
10. **Reduced motion acceptance criteria.** No motion introduced in this phase; not
    applicable beyond confirming no regression.
11. **Accessibility checks.** New focus tokens (`--color-saffron-ink` on light,
    `--color-night-gold` on dark) defined but not yet the only focus style in use; contrast
    values recorded, not yet spot-checked in browser (that happens per-section as each
    surface ships).
12. **Performance checks.** `npm run build` clean, zero new bytes of JS, CSS delta
    negligible (token additions only).
13. **Tests.** `npm run test` (60/60 unchanged, no logic touched), `npm run build`,
    `npm run check:persian`.
14. **Screenshots.** Re-capture the six-viewport, two-locale set for `/` and `/fa/` only
    (not privacy/terms, which do not consume new tokens yet); diff against baseline, expect
    zero visual difference.
15. **Rollback point.** Revert the two CSS files; no other file touched.
16. **Definition of done.** New tokens exist, documented inline with a one-line comment
    referencing `12-design-system.md` §N, existing pages are visually identical to baseline,
    all three baseline commands pass.

---

## Phase 2: Navigation, language control and persistent conversion actions

1. **Scope.** Build the redesigned nav bar (page spec §1) on top of Phase 1's tokens:
   transparent-over-night to solid-backing-on-scroll behaviour, language toggle in its new
   position, compact CTA pill gated to appear only once the hero CTA scrolls out of view. Add
   the mobile sticky download action shell (conversion spec §2) as a state machine, wired to
   existing `appStore.js`, but with no other sections built yet to react to (safe to land
   before the sky arc exists because it observes viewport CTA visibility, not scroll
   percentage).
2. **Files expected to change.** New: `src/components/NavBar.astro` (or extend the existing
   nav markup inside `BaseLayout.astro` if a dedicated component is not already present),
   `src/components/StickyDownloadAction.astro`, `src/lib/stickyCta.js` (pure state-machine
   function, unit tested). Modified: `src/layouts/BaseLayout.astro`,
   `src/components/LanguageToggle.astro` (position only, logic untouched),
   `src/components/HamdamLogotype.astro` (usage site only).
3. **Files protected from change.** `src/lib/appStore.js`, `src/lib/locale.js`,
   `src/lib/cinematic.js`, `src/lib/reveal.js`, all page files, `public/*`.
4. **Dependencies.** None new.
5. **Required assets.** None new.
6. **Product facts used.** `appStoreUrl(lang)` builder and `APP_STORE.RELEASED` flag
   (unchanged, read-only consumption); pre-release nav carries no CTA per page spec §1 item
   10.
7. **Desktop acceptance criteria.** Bar never exceeds 64px height; exactly one App Store
   action visible in any viewport state (page spec §1 item 14); nav gains solid backing after
   24px scroll with a 200ms fade.
8. **Mobile acceptance criteria.** Nav CTA suppressed in favour of the sticky action; sticky
   pill meets 44px minimum height and appears only after the hero CTA leaves the viewport,
   hides whenever another App Store action is in view.
9. **Farsi RTL acceptance criteria.** Logotype at inline-start (visual right in RTL), toggle
   and CTA at inline-end; wordmark shows "همدم" primary with Latin secondary; toggle
   `aria-label` names the target language in its own script.
10. **Reduced motion acceptance criteria.** Nav backing appears without the 200ms fade
    (instant); sticky pill has no entrance animation regardless of motion preference (it is
    a state, not a decorative element).
11. **Accessibility checks.** Fixed bar does not trap focus; skip-to-content link remains the
    first focusable element; toggle and CTA both meet 44px touch targets; bar contrast
    against both night and morning sky states (simulated via Phase 1 tokens even though the
    arc itself lands in Phase 4) passes 4.5:1.
12. **Performance checks.** One scroll listener shared with the future sky choreography (do
    not add a second listener in Phase 4, extend this one); sticky CTA logic under 2KB
    minified.
13. **Tests.** New Vitest file for the sticky-CTA state machine (hero visible / mid visible /
    ceremony visible / none visible, as a pure function per `17-sonnet-implementation-handoff.md`
    §5); existing 60 tests unchanged; `npm run build`; `npm run check:persian`.
14. **Screenshots.** Nav at rest, nav after scroll, sticky CTA visible/hidden states, all six
    viewports, both locales.
15. **Rollback point.** Revert the new component/lib files and the `BaseLayout.astro` diff;
    Phase 1 tokens are unaffected and stay landed.
16. **Definition of done.** Nav and sticky CTA behave per page spec §1 and conversion spec
    §2 with only the hero and ceremony CTAs (from the current, pre-redesign homepage) as
    trigger points; new unit tests pass; no other section has changed.

---

## Phase 3: Hero static composition and complete non-WebGL fallback

1. **Scope.** Build the hero's full visual composition (page spec §2) as static markup and
   CSS: shamseh mark, headline, support line, CTA pill, device frame with the real
   orchestrator screenshot, horizon plate, foreground blossom plate (desktop only), star
   field. No scroll wiring, no settle-in animation. This phase's deliverable *is* the
   reduced-motion / no-JS composition described in page spec §2 item 8 (loads at first-light
   state, fully legible, fully complete) — because the redesign never uses WebGL at any layer
   (design decision, not a fallback path: D2 in `16-visual-acceptance-criteria.md`), the
   "complete non-WebGL fallback" requirement is satisfied by this phase's output directly,
   not by a separate degraded rendering path.
2. **Files expected to change.** `src/components/HeroCinematic.astro` (major revision),
   `src/pages/index.astro`, `src/pages/fa/index.astro` (hero section only).
3. **Files protected from change.** `src/lib/cinematic.js` (untouched until Phase 4),
   everything below the hero on both pages, all other pages.
4. **Dependencies.** None new.
5. **Required assets.** `HW-01`, `HW-02`, `HW-04` (blossom foreground), device frame `DV-01`,
   orchestrator shots `01-hero-en.png` / `01-hero-fa.png` (blocking; see
   `22-dependency-decision.md` and `25-performance-budget.md` for the asset-gate rule: build
   with a labelled placeholder if late, never a stock substitute or invented screen).
6. **Product facts used.** Locked tagline "Hamdam reflects your heart and your sky"; approved
   support-line copy from the pipeline; real Today-screen orchestrator capture only.
7. **Desktop acceptance criteria.** At 1440x900 and 1728x1117, both locales: headline,
   support line and CTA visible without scrolling; visual mood matches the North Star Today
   scene side by side; no text overlaps a photographic plate.
8. **Mobile acceptance criteria.** At 390x844 and 430x932: same visibility requirement,
   foreground blossom plate omitted, device frame at approximately 260px logical width.
9. **Farsi RTL acceptance criteria.** Horizon light source and foreground plate mirrored
   horizontally; headline is the approved FA tagline; device frame shows `01-hero-fa.png`.
10. **Reduced motion acceptance criteria.** This phase's static output is itself the
    reduced-motion target state; verify it matches page spec §2 item 8 exactly (no
    settle-in, first-light state, fully legible).
11. **Accessibility checks.** Headline sits only over the sky gradient, never over a
    photographic plate (contrast-verified zone); device screenshot alt text: "Hamdam Today
    screen showing a morning verse by [poet] in Persian and English"; star field
    `aria-hidden`.
12. **Performance checks.** Horizon plate budget 180KB desktop / 90KB mobile variant
    (`25-performance-budget.md`); explicit width/height on every image (zero CLS); no JS
    added yet so no JS budget consumed in this phase.
13. **Tests.** `npm run build`, `npm run check:persian`; no new unit tests yet (nothing pure
    to test until Phase 4's scroll-linked functions land).
14. **Screenshots.** Hero only, all six viewports, both locales, alongside the North Star
    Today mockup for side-by-side review (`16-visual-acceptance-criteria.md` A1).
15. **Rollback point.** Revert `HeroCinematic.astro` and the two page files' hero markup;
    Phases 1-2 remain landed and functional.
16. **Definition of done.** Static hero passes visual review against the North Star mockup
    (A1) before Phase 4 begins, per the required phase order's explicit gate ("Phase 4:
    Approved hero enhancement, only after the static composition passes visual review").

---

## Phase 4: Approved hero enhancement (scroll-linked sky arc and hero motion)

1. **Scope.** Gated on Phase 3's visual review passing. Build the page-level `--sky-progress`
   module (evolving `cinematic.js`), the fixed sky surface consuming it, the night-to-morning
   colour ramp, the two named text-token thresholds (0.45, 0.8), and the hero's scroll-linked
   behaviour: settle-in stagger on load, plate drift capped at 12% of scroll delta, star
   field fade-out. This is doc 17's W-B plus the second half of W-C.
2. **Files expected to change.** `src/lib/cinematic.js` (evolved, keep the `?dawn=N`
   parameter and existing unit-tested functions intact, extend rather than replace),
   `src/components/HeroCinematic.astro` (motion wiring only, composition from Phase 3
   unchanged), new `src/styles/sky.css` or equivalent for the gradient stop table, `main`
   element data-attribute wiring in `BaseLayout.astro` for the threshold flips.
3. **Files protected from change.** Hero's static composition and copy (Phase 3, do not
   re-litigate); every section below the hero (they do not exist yet as redesigned sections,
   current content stays as-is on top of the new sky per the "ship behind visual parity"
   note in doc 17 §3.2).
4. **Dependencies.** None new.
5. **Required assets.** None beyond Phase 3's (reused).
6. **Product facts used.** None beyond Phase 3.
7. **Desktop acceptance criteria.** Hero passes the `?dawn=N` deterministic review states
   (night, first light, morning); scrolling up reverses the arc naturally (pure function of
   position); sections below the hero still render correctly on the new sky surface.
8. **Mobile acceptance criteria.** Same `?dawn=N` states verified at 390x844; plate drift
   holds 60fps at 4x CPU throttle in DevTools, or the drift becomes static per the motion
   spec's explicit fallback rule (§8).
9. **Farsi RTL acceptance criteria.** Arc and threshold flips are locale-agnostic (colour,
   not direction); hero's RTL mirroring from Phase 3 unaffected.
10. **Reduced motion acceptance criteria.** Sky arc state changes are instant (no CSS
    transition between stops); no settle-in; no plate drift; matches
    `12-design-system.md` §20 substitution table exactly.
11. **Accessibility checks.** Threshold-driven text-token flips maintain 4.5:1 contrast at
    every point along the ramp, spot-checked at 0.45 and 0.8 specifically (the two flip
    points, per `16-visual-acceptance-criteria.md` F3).
12. **Performance checks.** Motion JS budget check begins here (12KB total ceiling across
    the whole page, `13-motion-specification.md` §8); this phase's contribution measured
    and recorded.
13. **Tests.** New unit tests for the sky ramp pure function (progress-to-colour-stop
    mapping, threshold flips at 0.45/0.8, clamping) in `src/lib/__tests__/`, following the
    existing `cinematic.test.js` pattern; full 60+N suite green.
14. **Screenshots.** `?dawn=0`, `?dawn=0.35`, `?dawn=0.6`, `?dawn=1` hero states (matching
    the existing baseline capture pattern), all six viewports, both locales, plus one
    reduced-motion full-page capture.
15. **Rollback point.** Revert `cinematic.js` evolution and the sky CSS; Phase 3's static
    hero remains functional and shippable on its own (this is why Phase 3 and 4 are
    separate phases with separate rollback points, per the required phase order).
16. **Definition of done.** Sky arc drives the hero exactly as `13-motion-specification.md`
    §2-3 specify, `16-visual-acceptance-criteria.md` D2 (no WebGL context, confirmed in
    DevTools) and D3 (nothing idles after settle) both pass, motion JS budget on track.

---

## Phase 5: Emotional weather demonstration

1. **Scope.** Page spec §3: the interactive mood-slider panel with its own miniature sky,
   verse card response, and accessibility-first implementation (real `input[type=range]`,
   `aria-live="polite"` verse announcement).
2. **Files expected to change.** New `src/components/MoodDemo.astro`,
   `src/lib/moodDemo.js` (pure feeling-to-scene and feeling-to-verse mapping, settle-debounce
   logic), insertion point in `src/pages/index.astro` and `src/pages/fa/index.astro`.
3. **Files protected from change.** `src/data/verses.ts` (consumed read-only, never edited
   by hand for this feature; if new verse stops are needed, that is a separate
   `ganjoor-fetch`-sourced content change, not part of this phase), hero and nav from prior
   phases.
4. **Dependencies.** None new.
5. **Required assets.** None imagery-critical (CSS gradients per panel state); optional
   texture plate `SC-04` only if contrast-proven in browser.
6. **Product facts used.** Byte-exact verse bank from `src/data/verses.ts` (Hafez, Rumi,
   Parvin today); slider visual language checked against orchestrator shot `02-reflect`
   before build (page spec §3 item 4).
7. **Desktop acceptance criteria.** Panel 720px max width, centred; slider beneath; verse
   card animates in within the panel; keyboard-only operation works end to end.
8. **Mobile acceptance criteria.** Full-column panel; slider thumb minimum 44px; verse text
   scales on the fluid scale, Persian remains dominant.
9. **Farsi RTL acceptance criteria.** Slider direction follows RTL (increase toward visual
   left); stop labels in Farsi from approved copy; panel light source mirrored.
10. **Reduced motion acceptance criteria.** Instant state swap, no crossfade, no rise; the
    feature remains fully functional (state change, not decoration, per motion spec §4).
11. **Accessibility checks.** Slider is a real range input or equivalent ARIA slider, fully
    keyboard operable, `aria-valuetext` announces the feeling label, responding verse in an
    `aria-live="polite"` region, screen reader announces feeling then verse in that order;
    verse legibility over the panel sky passes 4.5:1 in every state.
12. **Performance checks.** Panel sky states are CSS gradients (zero image cost); JS module
    budget under 6KB (page spec §3 item 12).
13. **Tests.** New unit tests for feeling-to-scene and feeling-to-verse mapping and the
    settle-debounce logic as pure functions.
14. **Screenshots.** Each slider stop's sky and verse state, both locales, desktop and
    mobile, plus one reduced-motion capture (instant-swap states).
15. **Rollback point.** Revert `MoodDemo.astro` and `moodDemo.js`; the section's insertion
    point in both page files reverts cleanly since it does not touch surrounding markup.
16. **Definition of done.** Every slider stop maps to a distinct sky state and verse; Persian
    renders from repo bytes (checksum against `verses.ts`, page spec §3 item 14); no layout
    shift when the verse card appears; motion JS running total still tracked against the
    12KB ceiling.

---

## Phase 6: Five poet wisdom experience

1. **Scope.** Page spec §4: the editorial poet gallery band, five portrait cards, desktop
   single row / mobile scroll-snap carousel.
2. **Files expected to change.** `src/components/PoetCard.astro` (evolved from its current
   form into the portrait-card treatment), new `src/components/PoetsBand.astro`, insertion
   point in both homepage files.
3. **Files protected from change.** `src/data/poets.ts` (consumed read-only, names and
   descriptions unchanged).
4. **Dependencies.** None new.
5. **Required assets.** `PT-01` through `PT-05` (blocking; per `14-canva-asset-brief.md`,
   Ealia's cultural approval required before these ship, see `22-dependency-decision.md` and
   `27-release-and-rollback-plan.md` for the placeholder rule if late).
6. **Product facts used.** Exactly five poets, exactly the locked names (Hafez, Rumi, Saadi,
   Khayyam, Parvin Etesami), spelled per `poets.ts`; Discover-mockup portrait register
   reused for style only, not for placement (poets stay off Discover entirely; this is a
   website-only section, the app itself never gets a Discover poet carousel per the locked
   product decision).
7. **Desktop acceptance criteria.** Single row of five, no autoplay, no rotation; hover lifts
   a card 4px with warm edge glow.
8. **Mobile acceptance criteria.** Horizontal scroll-snap carousel, one-and-a-fraction cards
   visible, dot indicators, no auto-advance.
9. **Farsi RTL acceptance criteria.** Card order right to left (Hafez first from the right);
   carousel swipes RTL-correctly.
10. **Reduced motion acceptance criteria.** Reveal renders instantly (existing `[data-reveal]`
    behaviour); hover lift replaced by border emphasis, no scale/translate motion.
11. **Accessibility checks.** Carousel keyboard-reachable (cards focusable, arrow key or
    native scroll); portrait alt text names the poet and states "artistic interpretation";
    Persian names as live text pass contrast on the caption plate (never baked into the
    image, per design system §13 and acceptance criteria C2).
12. **Performance checks.** Five portraits at 60KB budget each, lazy-loaded, explicit aspect
    boxes.
13. **Tests.** No new pure-function logic in this section (static content, existing reveal
    system); confirm `npm run test` still green, `npm run check:persian` covers the
    Persian names.
14. **Screenshots.** Poets band, desktop row and mobile carousel, both locales; one grep-
    verified check that "Forough" appears nowhere in rendered output.
15. **Rollback point.** Revert `PoetsBand.astro` and the `PoetCard.astro` diff; `poets.ts`
    untouched throughout.
16. **Definition of done.** Exactly five poets, locked names, no Forough Farrokhzad anywhere,
    portraits share one consistent style family, no Persian text embedded in any image,
    Ganjoor.net provenance line present in both locales (page spec §4 item 3, item 14).

---

## Phase 7: Context constellation and Your Journey / reflections sections

1. **Scope.** Page spec §5 (context constellation) and §6 (journey and reflections record),
   built together because the mega-prompt's required phase order bundles them and they share
   the device-frame-plus-real-screenshot pattern.
2. **Files expected to change.** New `src/components/ContextConstellation.astro`,
   `src/components/JourneyPair.astro`, insertion points in both homepage files.
3. **Files protected from change.** Everything from Phases 1-6.
4. **Dependencies.** None new.
5. **Required assets.** Device frame `DV-01` (reused); orchestrator Today shot (constellation
   centre); orchestrator `02-reflect-en/fa` and `05-journey-en/fa` (journey pair); icon set
   `IC-01` (constellation node icons).
6. **Product facts used.** Constellation's six signal families must match Privacy Policy §1.1
   to §1.7 exactly (mood, weather, season, time of day, calendar, Health, each with its own
   supporting clause); journey copy covers private journal, favourites, the streak that
   forgives a missed day, and journey insights in the approved App Store description's
   register; the insights chart shown is the app's real seeded render, never an HTML
   reconstruction.
7. **Desktop acceptance criteria.** Constellation: ring around the device, three nodes per
   side. Journey: copy column 40%, device pair 60%, frontmost frame swaps on hover (150ms,
   z and scale nudge).
8. **Mobile acceptance criteria.** Constellation: device frame first, then six nodes as a
   two-column list, arcs dropped (deliberate simplification, not a bug). Journey: copy
   first, then the two frames as a horizontal scroll-snap pair.
9. **Farsi RTL acceptance criteria.** Constellation node order and arcs mirror, list variant
   reads right to left. Journey: copy inline-start (visual right), FA screenshots, frame
   offset direction mirrored.
10. **Reduced motion acceptance criteria.** Constellation arcs and nodes render complete
    immediately (no 600ms draw-in). Journey: instant reveal, hover swap replaced by a tap
    toggle with no scale animation.
11. **Accessibility checks.** Constellation is a real `ul` of six items with the diagram as
    presentation, arcs `aria-hidden`, meaning never encoded in arc geometry alone. Journey
    screenshots carry descriptive alt text including that the chart shows a mood trend;
    hover/tap swap never hides content required for understanding.
12. **Performance checks.** Constellation: one screenshot image plus inline SVG arcs
    (external file per CSP), negligible cost. Journey: two screenshots, lazy-loaded, 120KB
    budget each framed.
13. **Tests.** No new pure-function logic required for the constellation (static diagram);
    journey hover/tap swap is presentation-only, not a candidate for unit testing per the
    existing pattern (DOM interaction, not pure logic).
14. **Screenshots.** Both sections, desktop ring and mobile list (constellation), desktop
    pair and mobile stack (journey), both locales.
15. **Rollback point.** Revert both new components independently; they do not share state.
16. **Definition of done.** Constellation shows exactly the six real signal families, each
    traceable to a Privacy Policy section, no invented signal. Journey screenshots are
    byte-derived from orchestrator output with no retouching beyond framing, streak copy
    uses the approved "forgives a missed day" framing, no invented metrics anywhere.

---

## Phase 8: Roots and region experience

1. **Scope.** Page spec §7: three cultural-moment cards with live countdowns, plus one Roots
   screenshot in a device frame.
2. **Files expected to change.** New `src/components/RootsMoments.astro`,
   `src/lib/countdown.js` (pure next-occurrence date maths, unit tested), insertion point in
   both homepage files.
3. **Files protected from change.** Everything from Phases 1-7.
4. **Dependencies.** None new.
5. **Required assets.** `CM-01` (Yalda), `CM-02` (Norooz), `CM-03` (Chaharshanbe Suri),
   device frame (reused), orchestrator `04-roots-en/fa`.
6. **Product facts used.** Countdown logic must match the app's real dates for Yalda, Norooz,
   and Chaharshanbe Suri; Mehregan and Sizdah Bedar named in a closing line (not full cards);
   Fal e Hafez gets one respectful sentence, no gimmick treatment; moment names spelled as
   the app spells them.
7. **Desktop acceptance criteria.** Three cards in a row plus the device frame anchoring the
   inline-end, cards equal height.
8. **Mobile acceptance criteria.** Cards stack full-width in calendar order of next arrival,
   device frame follows.
9. **Farsi RTL acceptance criteria.** Card order mirrors; countdown phrasing from approved FA
   copy; Persian moment names dominant on the cards in both locales.
10. **Reduced motion acceptance criteria.** No pulse animation on the nearest upcoming
    moment's countdown; static emphasis via the card's border tone instead.
11. **Accessibility checks.** Countdown is text, never baked into an image; imagery contrast
    for caption plates verified per card; Chaharshanbe Suri fire imagery kept warm, not
    alarming; decorative parts `aria-hidden`.
12. **Performance checks.** Three images at 80KB budget each, lazy-loaded; countdown JS is a
    pure date function, computed in `Australia/Brisbane`, documented as such.
13. **Tests.** New unit tests for the countdown pure function: next-occurrence date maths for
    all three moments, including year rollover.
14. **Screenshots.** Roots section, desktop row and mobile stack, both locales, captured on a
    date where at least one countdown is a small number (verifies the pulse/emphasis state
    renders, not just the steady-state card).
15. **Rollback point.** Revert `RootsMoments.astro` and `countdown.js` independently.
16. **Definition of done.** Each of the three moments has distinct imagery and its own
    countdown; all five moments named in the section; countdown values match the app's for
    the same date (cross-checked, page spec §7 item 14); no cultural stereotype imagery.

---

## Phase 9: Privacy, value presentation, Lifetime Founding Companion and final ceremony

1. **Scope.** Page spec §8 (privacy), §9 (plans and Founding Companion), §10 (final dawn
   ceremony), plus the conversion system's remaining pieces (mid-page and ceremony CTA
   wiring into the sticky-CTA state machine from Phase 2). This is the largest phase; it
   corresponds to the rest of doc 17's W-D plus all of W-E.
2. **Files expected to change.** New `src/components/PrivacyTrust.astro`,
   `src/components/PlansAndFoundingCompanion.astro`, `src/components/FinalCeremony.astro`;
   `src/lib/stickyCta.js` extended (not replaced) with the mid-page and ceremony visibility
   states; insertion points in both homepage files.
3. **Files protected from change.** Everything from Phases 1-8; `src/pages/privacy.astro`,
   `src/pages/terms.astro` and their `/fa/` mirrors (the homepage sections reference these
   pages, never duplicate their legal content).
4. **Dependencies.** None new.
5. **Required assets.** Icon set `IC-01` (privacy trust row); orchestrator `06-privacy-en/fa`;
   `FC-01` (Founding Companion band texture); `CY-01` (petal set); official Apple badge
   files; `HW-03` (morning sky, already in play from Phase 4).
6. **Product facts used.** Every privacy claim traceable to the live Privacy Policy §1-§8;
   plans copy verbatim register from the approved App Store description ("fifteen
   reflections every month," free forever, Plus opens unlimited reflections, full wisdom
   library, reflection archive, 7-day free trial per Terms §3.2); Founding Companion named
   exactly per the app's `L.paywallFoundingCompanion` localisation, up to six Family Sharing
   members per Terms §3.3; zero dollar figures anywhere (locked decision 2026-07-02);
   pre-release badge suppression rule (Apple's marketing guidelines).
7. **Desktop acceptance criteria.** Privacy: statement centred at 60ch max, trust row
   beneath. Plans: two panels side by side, Founding band full content-width below. Ceremony:
   full-viewport-height closing scene, CTA dead centre.
8. **Mobile acceptance criteria.** Privacy: statement, trust row, screenshot stacked. Plans:
   Free panel, Plus panel, band stacked. Ceremony: same scene, sticky mobile CTA hides here
   (no doubled actions, conversion spec §2).
9. **Farsi RTL acceptance criteria.** Privacy: FA statement from the native-translated
   privacy page's register, columns mirror. Plans: panels mirror, FA naming follows the
   app's own localisation. Ceremony: FA closing line from approved copy, badge in Apple's
   FA localisation if one exists or the English badge with a Farsi `aria-label` (never a
   fabricated translated badge), composition mirrors.
10. **Reduced motion acceptance criteria.** Privacy and Plans: identical minus reveal fade.
    Ceremony: renders in its completed morning state, no petals, no bloom animation; this
    static composition is the acceptance bar for the whole ceremony design
    (`13-motion-specification.md` §7).
11. **Accessibility checks.** Privacy: policy links distinguishable from plain text without
    colour alone. Plans: comparison is two real lists with headings, not a table abused for
    layout; trial terms in body text, not footnote-sized. Ceremony: petals `aria-hidden` and
    non-interactive, CTA contrast on the brightest surface verified, focus lands naturally
    on the CTA.
12. **Performance checks.** Privacy: negligible. Plans: one decorative band texture, 60KB
    budget. Ceremony: petal sprites 30KB total budget, loaded lazily only when the section
    approaches.
13. **Tests.** Extend `stickyCta.js` tests to cover mid-page and ceremony visibility states;
    campaign-parameter pure function (inbound query to App Store URL mapping, `ct`/`pt`
    handling, fallback default `website`) gets its own new unit tests beside `appStore.js`.
14. **Screenshots.** All three sections, desktop and mobile, both locales, plus one
    pre-release capture confirming zero App Store badge or store link anywhere (E3).
15. **Rollback point.** Revert the three new components and the `stickyCta.js` extension
    independently; Phase 2's original sticky-CTA shell (hero-only trigger) remains
    functional if this phase is rolled back alone.
16. **Definition of done.** Zero dollar figures anywhere in rendered output (grep-verified);
    trial and Family Sharing wording matches Terms exactly; the dawn arc measurably
    completes at the ceremony; exactly one visible download action in the ceremony
    viewport; petals run once and never loop; pre-release build shows no badge anywhere;
    post-release flip requires only the existing `APP_STORE.RELEASED` flag (never touched
    in this phase).

---

## Phase 10: Farsi and RTL correction

1. **Scope.** Dedicated correction pass across everything built in Phases 1-9. Not a new
   build: every section's FA/RTL behaviour was specified per-section already: this phase is
   the end-to-end verification and fix pass on the live `/fa/` route, because per-section
   specs can each individually look correct while the composed page has a mirroring or
   ordering bug only visible in the assembled route.
2. **Files expected to change.** Whatever files fail the checks below; expected to be small,
   targeted fixes, not new sections.
3. **Files protected from change.** `src/data/verses.ts`, `src/data/siteCopy.ts` (content is
   never hand-edited to "fix" Farsi; if the FA copy itself is wrong, that is flagged to
   Ealia for a pipeline regeneration, not patched inline).
4. **Dependencies.** None new.
5. **Required assets.** None new.
6. **Product facts used.** None new; this phase re-verifies facts already used in Phases
   1-9.
7. **Desktop acceptance criteria.** Side-by-side EN vs FA comparison at 1440x900 for every
   section: hero light source, constellation direction, poet card order, journey frame
   offset, roots card order all flip (C3).
8. **Mobile acceptance criteria.** Same comparison at 390x844.
9. **Farsi RTL acceptance criteria.** This phase's entire scope. Additionally: `npm run
   check:persian` passes with zero exceptions; every Persian string byte-matches its
   approved repo source (C1); Persian verse text visually dominant over English translation
   in both locales (C4); Ganjoor.net attribution present in the footer, both locales (C6);
   language toggle round-trips every route, preserving path and query (H4).
10. **Reduced motion acceptance criteria.** FA reduced-motion captures pass the same
    completeness bar as EN (F4 applies per locale, not just EN).
11. **Accessibility checks.** Farsi screen reader order and RTL focus order verified with
    VoiceOver in Safari, FA locale (not assumed from the EN pass).
12. **Performance checks.** FA-locale Lighthouse run (separate from EN, fonts and copy
    length differ) to confirm no locale-specific regression.
13. **Tests.** `npm run check:persian` (already pre-commit-hooked, re-run explicitly here as
    the phase gate); no new unit tests expected unless a bug requires one.
14. **Screenshots.** Full EN vs FA side-by-side set, every section, both required viewports
    (1440x900, 390x844) per `16-visual-acceptance-criteria.md` C3.
15. **Rollback point.** Each fix in this phase is independently revertible; no structural
    change, only mirroring/ordering corrections.
16. **Definition of done.** All of gate C in `16-visual-acceptance-criteria.md` (C1-C7)
    passes with screenshot evidence.

---

## Phase 11: Accessibility and reduced motion correction

1. **Scope.** Dedicated correction pass, same rationale as Phase 10: per-section
   accessibility and reduced-motion behaviour was specified already, this phase verifies
   the assembled page end to end and fixes what only shows up composed (focus order across
   section boundaries, landmark structure, cumulative reduced-motion completeness).
2. **Files expected to change.** Whatever files fail the checks below.
3. **Files protected from change.** None specifically protected beyond the general rule
   (content files never hand-edited).
4. **Dependencies.** None new.
5. **Required assets.** None new.
6. **Product facts used.** None new.
7. **Desktop acceptance criteria.** Keyboard-only pass end to end: skip link first, every
   interactive element reachable in a logical order, visible focus per the two-token focus
   system, mood slider fully operable, carousels traversable, no trap (F1).
8. **Mobile acceptance criteria.** Touch targets 44px throughout the assembled page: toggle,
   slider, carousel controls, footer links, sticky CTA (F7).
9. **Farsi RTL acceptance criteria.** Keyboard and screen reader pass repeated on `/fa/`
   specifically (overlaps Phase 10's scope; run together if convenient, tracked separately
   here because the mega-prompt's required order lists them as distinct phases).
10. **Reduced motion acceptance criteria.** Full-page `prefers-reduced-motion: reduce`
    screenshot pass across every section shows the page complete and legible, with the only
    visible differences from the motion-enabled final states being the absence of petals
    and transitional effects (F4, motion spec §9 item 1).
11. **Accessibility checks.** This phase's entire scope: screen reader pass (VoiceOver,
    Safari) confirming landmarks correct, mood demo announces feeling then verse via
    `aria-live="polite"`, constellation reads as a six-item list, decorative layers silent
    (F2); contrast spot-checked at both sky thresholds (F3); `prefers-contrast: more`
    renders opaque plates and hardened tokens (F5); all meaningful images have localised
    alt text, decorative images have empty alt (F6).
12. **Performance checks.** None new in this phase; covered in Phase 12.
13. **Tests.** No new unit tests expected; this is a manual/browser verification phase.
    Confirm `npm run test` still green as a regression check.
14. **Screenshots.** Full-page reduced-motion captures for every section, both locales;
    forced-colours (Windows High Contrast) capture per `12-design-system.md` §19.
15. **Rollback point.** Each fix independently revertible.
16. **Definition of done.** All of gate F in `16-visual-acceptance-criteria.md` (F1-F7)
    passes with recorded evidence (keyboard pass notes, VoiceOver pass notes, contrast
    measurements, screenshot set).

---

## Phase 12: Performance, SEO, metadata and analytics

1. **Scope.** Full-page performance budget verification (`25-performance-budget.md`), SEO
   and metadata regression check (sitemap, OG images, hreflang, structured data), and
   resolution of the analytics decision gate (`26-analytics-plan.md`) — this last item is a
   decision point for Ealia, not an implementation the phase can complete unilaterally if
   the "No analytics" copy question is still open at this point.
2. **Files expected to change.** Whatever files fail the performance/SEO checks below; if
   and only if Ealia resolves the analytics question, the specific change described in
   `26-analytics-plan.md`.
3. **Files protected from change.** `public/_headers` (CSP), unless the analytics decision
   explicitly requires a scoped, reviewed change to already-present Cloudflare Insights
   allowances (no new third-party domains without explicit approval).
4. **Dependencies.** None new, unless the analytics decision requires one (none anticipated:
   Cloudflare Web Analytics is dashboard-toggled, not an npm dependency).
5. **Required assets.** None new.
6. **Product facts used.** Prior Lighthouse baseline (production `/` 96/100/100/100, `/fa/`
   98/100/100/100, recorded 2026-07-14, pre-dates this redesign and needs re-capture, not
   reuse, per `25-performance-budget.md`).
7. **Desktop acceptance criteria.** Lighthouse desktop equivalent budgets met (see
   `25-performance-budget.md` for exact figures); `?dawn=N` still reproduces any sky state
   deterministically (H3).
8. **Mobile acceptance criteria.** Lighthouse mobile ≥90/100/100/100 both locales (G1); CLS
   = 0 both locales (G2); total image transfer ≤450KB first load, ≤1.2MB full page per
   locale (G3); LCP ≤2.5s simulated 4G mid-tier (G4).
9. **Farsi RTL acceptance criteria.** FA-locale performance run distinct from EN (fonts and
   copy length differ; already partially covered in Phase 10, confirmed here as a budget
   check specifically).
10. **Reduced motion acceptance criteria.** Motion JS ≤12KB minified total (G5); confirm
    the reduced-motion path also meets the performance budget (fewer, not more, resources
    on that path).
11. **Accessibility checks.** Lighthouse Accessibility = 100 (G1, overlaps Phase 11's manual
    pass as an automated cross-check).
12. **Performance checks.** This phase's entire scope: Lighthouse both locales, image
    transfer audit, LCP element verification (headline or hero plate, never below-fold),
    long-task recording during a full scroll (no task >50ms attributable to motion code,
    G5), third-party request count.
13. **Tests.** `npm run build` (zero new framework dependencies, CSP passes with no
    `unsafe-inline` additions, G6); `npm run test`; `npm run check:persian`.
14. **Screenshots.** Lighthouse report exports, both locales, mobile and desktop.
15. **Rollback point.** Performance fixes are typically asset or code-splitting changes,
    independently revertible; the analytics decision, if taken, is isolated to one file
    (`26-analytics-plan.md` specifies exactly which) and independently revertible.
16. **Definition of done.** All of gate G in `16-visual-acceptance-criteria.md` (G1-G6)
    passes; H1 (SEO regression: sitemap, hreflang, OG, security headers, Smart App Banner
    meta all survive unchanged, diffed against baseline) confirmed; analytics decision
    either resolved with Ealia's explicit sign-off or explicitly deferred (never silently
    implemented).

---

## Phase 13: Full visual acceptance review

1. **Scope.** Identical to doc 17 §3.6 (W-F). Run `16-visual-acceptance-criteria.md` in
   full: viewport matrix screenshots, keyboard and VoiceOver pass, Lighthouse both locales,
   reduced motion captures, greps (dashes, Forough, prices), `npm test`, `npm run build`,
   `npm run check:persian`. Fix, re-run, record results.
2. **Files expected to change.** New `docs/website-redesign/18-acceptance-results.md`; fixes
   to any file, as needed, for any FAIL found.
3. **Files protected from change.** None specifically; this phase's job is finding and
   fixing regressions across the whole tree built in Phases 1-12.
4. **Dependencies.** None new.
5. **Required assets.** None new; confirms all fifteen assets from the reconciled inventory
   (`14-canva-asset-brief.md`, reconciled count per this document's "Canva asset inventory"
   section) are present and logged in `docs/asset-licence-log.md`.
6. **Product facts used.** The full verification table from `15-conversion-specification.md`
   §13 (all eleven items) re-checked as final gate before this phase can close.
7. **Desktop acceptance criteria.** Gate A (North Star fidelity, A1-A6) in full.
8. **Mobile acceptance criteria.** Gate E (conversion visibility, E1-E4) in full.
9. **Farsi RTL acceptance criteria.** Gate C (C1-C7) re-confirmed as a final pass (not a
   repeat of Phase 10's work, a confirmation it still holds after Phases 11-12's fixes).
10. **Reduced motion acceptance criteria.** Gate D (dimensional restraint, D1-D5) and the
    F4 reduced-motion completeness check, final pass.
11. **Accessibility checks.** Gate F (F1-F7) final pass.
12. **Performance checks.** Gate G (G1-G6) final pass.
13. **Tests.** Gate H (regression protection, H1-H4) final pass; full `npm test`,
    `npm run build`, `npm run check:persian`.
14. **Screenshots.** The complete evidence set required by every gate, organised into
    `18-acceptance-results.md` per the existing screenshot-index pattern
    (`06-screenshot-index.md`).
15. **Rollback point.** This phase does not introduce new features, only fixes; each fix
    independently revertible; if a fix reveals a deeper problem, the affected phase's own
    rollback point is used instead.
16. **Definition of done.** Every gate in `16-visual-acceptance-criteria.md` recorded as
    PASS (or waived in writing by Ealia) in `18-acceptance-results.md`, all tests green,
    build clean, Persian check green, Lighthouse floors met, and a side-by-side screenshot
    set (page vs North Star mockups) attached for Ealia's final visual approval. The
    redesign does not deploy until Ealia says so (`27-release-and-rollback-plan.md`).
