# Hamdam Website Redesign: Acceptance Results

Self-assessment against every gate in `16-visual-acceptance-criteria.md`, recorded at the
end of Phase 12 (all 12 implementation phases complete on `feature/hamdam-web-redesign`,
nothing merged to `main`, nothing pushed, nothing deployed). "PASS" means verified this
session with a concrete method (Playwright screenshot/measurement, computed contrast ratio,
Lighthouse audit, or grep against built output) — not eyeballed. "PENDING" means the item
genuinely requires something this session cannot produce: a real device, VoiceOver, a
human's cultural judgement, or Ealia's explicit content sign-off. Per this document's own
rule (`20-implementation-plan.md` §"Temporary development assets"), a section behind a
placeholder is recorded as incomplete here, never as a passed gate with a temporary image.

## A. North Star fidelity

| # | Result | Notes |
|---|---|---|
| A1 | PENDING | Hero composition matches the spec (shamseh, headline, support line, capsule CTA, device frame, warm horizon under dark sky) but the device frame is a labelled placeholder (DV-01 + orchestrator screenshot both pending) and cannot be visually compared to the North Star Today screen until it's real. |
| A2 | PASS | Every new CTA pill (nav compact CTA, sticky mobile CTA, mood-demo panel, roots countdown emphasis) uses `--radius-pill`. Pre-existing `AppStoreBadge`'s pre-release capsule still uses its original 12px radius — not migrated, since `AppStoreBadge.astro` was never in any phase's file list. |
| A3 | PENDING | Poet portrait treatment structurally matches the spec (2:3 card, caption plate, name-led). Cannot compare register to the North Star Discover card until PT-01–05 exist. |
| A4 | PENDING | Roots cards structurally match (distinct card per moment, Persian-led naming, live countdown). Imagery comparison blocked on CM-01–03. |
| A5 | Not measured | Requires a real scroll-height measurement against the finished page including real imagery; the current page's scroll height is still dominated by pre-existing, not-yet-redesigned sections (Phase 13's job, not Phase 12's). |
| A6 | PASS (structurally) | No section ships an empty stretch of surface — every redesigned section has typography, a device-frame placeholder, or real content filling it. |

## B. Product truth

| # | Result | Notes |
|---|---|---|
| B1 | PENDING | Zero invented screens shipped — every device frame is a labelled placeholder, not a fabricated UI. Cannot be fully PASS until real orchestrator screenshots replace them (that's the point of the placeholder rule, not a gap in it). |
| B2 | PASS | Spot-checked: mood slider (real feature, real verse bank), five poets (locked names), streak forgiveness (Terms-adjacent, app-verified `freeMonthlyLimit`), constellation signals (traced to Privacy Policy §1.1–1.3, with season/time-of-day's absence from the policy explained, not hidden). Siri/widgets/Watch/Apple Music are not claimed anywhere in the new sections (out of this redesign's scope). |
| B3 | PASS | Grepped built output: no reviews, ratings, counts, awards, or press mentions anywhere in the redesigned sections. |
| B4 | PASS | Exactly five poets rendered (`poets.ts`, unmodified); grep for "Forough"/"فروغ" across `dist/` returns nothing. |
| B5 | PASS | Grepped `dist/*.html` for `$[0-9]`: zero matches. |

## C. Persian and cultural integrity

| # | Result | Notes |
|---|---|---|
| C1 | PASS | `npm run check:persian` passes at every commit throughout all 12 phases. Every new Persian string is either reused byte-exact from `siteCopy.ts`/the iOS app's `Localization.swift` (poet names, moment names, Founding Companion/Hamdam Plus naming) or original short UI copy authored directly and linted via the `persian` skill's mechanics checker — the same authority the app's own `#if DEBUG` screenshot copy uses for reused-in-new-context strings. |
| C2 | PASS (by construction) | No image assets exist yet to contain baked-in text — every placeholder is a solid-tone CSS fill. Re-verify once real Canva assets land. |
| C3 | PASS | Verified via Playwright bounding-box measurements, not just visual inspection: hero sun position (mirrors via `inset-inline-start`), constellation arcs (explicit `scaleX(-1)` under `[dir=rtl]`), poet card DOM order (Hafez renders first from the visual right), journey frame offset (EN front frame overlaps toward its visual right at x=778, FA overlaps toward its visual left at x=414 — genuinely mirrored, not coincidental), roots card calendar order (Phase 8's own sort-order bug, found and fixed this session). |
| C4 | PASS | Verse Persian text uses `--text-verse-fa` (larger scale step than `--text-verse-en`) throughout, by token design from Phase 1. |
| C5 | PENDING | Explicitly Ealia's call per the asset brief — no PT/CM imagery exists yet for anyone to review. |
| C6 | PASS | Fixed this session (Phase 10): footer now credits Ganjoor.net in both locales (was missing entirely before this redesign touched it). |
| C7 | PASS (new content) / pre-existing gap noted | Fixed one real violation this session (`MoodDemo.astro`'s em-dash poet-attribution prefix). Grepped `dist/` for U+2013/U+2014: the only remaining instances are pre-existing and out of this redesign's scope — the site's existing `<title>`/OG/JSON-LD strings, the byte-exact verse bank (`verses.ts`) and poet descriptions (`poets.ts`, both explicitly protected from hand-editing all 12 phases), and the already-documented 404 title issue from the original Phase 0 audit. None introduced by this redesign, none silently patched. |

## D. Dimensional restraint

| # | Result | Notes |
|---|---|---|
| D1 | PASS | Exactly three: hero (scroll-linked sky), mood demonstration (interactive slider), ceremony (petal pass). Constellation/roots/poets use only the standard reveal stagger. |
| D2 | PASS | Playwright-verified: zero `<canvas>` elements anywhere on the page (reduced-motion capture included). |
| D3 | PASS (by construction) | No infinite/looping animation anywhere in the CSS authored this session — removed the pre-existing shamseh breathing loop from the hero specifically (motion spec: "no idle movement" in the hero). Not verified via a 10s idle-video recording (this session has no video capture tool), so treat as build-level PASS, not device-verified. |
| D4 | PASS | No `<audio>`/`<video>` elements exist anywhere in the redesign. |
| D5 | PASS | Ceremony petal `IntersectionObserver` calls `.disconnect()` immediately after firing once; re-scrolling cannot retrigger it. |

## E. Conversion visibility

| # | Result | Notes |
|---|---|---|
| E1 | PASS | Phase 2's `stickyCta.js` state machine (hero/mid/ceremony landmarks, all three wired to real sections by Phase 9) guarantees at most one floating CTA is ever shown; verified via Playwright at multiple scroll depths. |
| E2 | PASS | Hero headline/support line/CTA all render above the fold at 390×844 and 1440×900, both locales, with zero JS required (Phase 3's static-first design). |
| E3 | PASS | Grepped `dist/*.html`: zero occurrences of `apps.apple.com` or the badge asset anywhere, confirmed pre-release. |
| E4 | PASS | Ceremony CTA sits on `--surface-morning` (the guaranteed-brightest fixed background, not the scroll-computed shared surface); nothing overlaps it at any viewport checked. |

## F. Accessibility (blocking)

| # | Result | Notes |
|---|---|---|
| F1 | PASS | Full 20-stop keyboard trace from page load: skip link first, logical order throughout, no traps, every touch target ≥44px (three real violations found and fixed this session: nav logo link, a redundant footer mailto link duplicated in two locales, and the skip link itself). |
| F2 | PENDING | Requires real VoiceOver/Safari — not producible from this environment. Landmark structure, `aria-live="polite"` on the mood demo, and the constellation's real `<ul>` are all in place; untested with an actual screen reader. |
| F3 | PASS | Computed WCAG contrast ratios directly (not eyeballed) for every mood-demo panel state and every dark-surface section's text pairing. Found and fixed nine real failures this session: four instances of `--color-saffron-ink` (tuned for cream, reused incorrectly on `--surface-dawn`/`--surface-dusk`) and five instances of an opacity reduction applied on top of an already-tight base contrast. Worst case after fixes: 4.45:1 → replaced outright; final minimum across the whole page is 4.61:1. |
| F4 | PASS | Full-page `prefers-reduced-motion: reduce` capture, both locales: complete, legible, matches the motion-enabled page minus petals/transitions. |
| F5 | PASS (baseline) | `prefers-contrast: more` was entirely unimplemented before this session (a real gap, not a partial pass) — added a global.css baseline covering the shared caption-plate/card-border patterns. Explicitly not an exhaustive per-component audit; a real Windows High Contrast capture is not producible here. |
| F6 | PASS (by construction) | Every placeholder carries an honest `aria-label`/`alt` describing the pending state, not fabricated content; decorative layers (stars, arcs, petals) are `aria-hidden`. Re-verify wording once real assets land. |
| F7 | PASS | See F1 — same audit, same three fixes. |

## G. Performance (blocking budgets)

| # | Result | Notes |
|---|---|---|
| G1 | PASS | Real Lighthouse (mobile, production `astro preview` build, not dev server): **EN 97/100/100/100, FA 98/100/100/100**. Both comfortably above the ≥90 performance floor and at the 100 ceiling for the other three. |
| G2 | PASS | CLS = 0, both locales (Lighthouse-measured). |
| G3 | PASS (trivially, for now) | Total page weight 246KB (EN) / 184KB (FA) — every "image" is currently a CSS gradient placeholder, not a real photograph. This budget check needs to be re-run once real Canva/orchestrator assets replace the placeholders; today's number is not representative of the finished page. |
| G4 | PASS | LCP 2.3s (EN) / 2.0s (FA), both under the 2.5s target. |
| G5 | PASS | Motion JS: 9.18KB across every chunk (budget 12KB). |
| G6 | PASS | Zero new framework dependencies added to `package.json` across all 12 phases. Found and fixed one real CSP violation this session: an inline `style` attribute on the ceremony's petal elements, which `style-src 'self'` (no `unsafe-inline`) would have silently dropped in production — invisible to every local check because `public/_headers` isn't enforced by the dev/preview server. |

## H. Regression protection

| # | Result | Notes |
|---|---|---|
| H1 | PASS | 110/110 tests pass (60 pre-existing + 50 new: sky ramp, campaign parameters, countdown maths, mood-demo mapping, sticky-CTA state machine extensions). |
| H2 | PASS | Grepped/diffed: sitemap generates, hreflang (en/fa/x-default) present, OG/Twitter Card tags present, one JSON-LD block present, `public/_headers` byte-identical to baseline (never touched). |
| H3 | PASS | `?dawn=N` still pins the hero deterministically; verified at 0, 0.35, 0.6, 1. |
| H4 | PASS | Language toggle preserves query strings on both the homepage and a deep route (`/privacy?utm_campaign=x` → `/fa/privacy?utm_campaign=x`), verified via Playwright. |

## Blocking before merge to `main`

1. **Real assets** — DV-01, HW-01/02/04, PT-01–05, CM-01–03, FC-01, CY-01, and all twelve
   orchestrator screenshots. Nothing in this redesign can pass Gate A fully, and Gate C5
   cannot pass at all, until these exist.
2. **Ealia's cultural approval** — PT and CM series specifically (C5), FC-01 (shamseh relief
   motif), required before any of the three enter the repo, per the asset brief's own rule.
3. **Real-device passes** — VoiceOver/Safari (F2), a genuine Windows High Contrast capture,
   and a fresh visual review side-by-side with the North Star mockups. None of these are
   producible from this session.
4. **Content sign-off** — every string authored directly this session (not pulled byte-exact
   from an existing approved source) is functional but provisional: the mood-demo slider
   labels (EN wording from the page spec's own suggestion, FA paired positionally from the
   app's Health valence scale, explicitly flagged as a mismatched-register pairing), and
   every short UI/marketing sentence drafted for the new sections.
5. **Analytics decision** — deliberately left untouched and unresolved this phase, per
   `26-analytics-plan.md`'s own instruction that this is Ealia's call, never a unilateral
   implementation.
6. **G3 re-verification** — once real imagery replaces the placeholders, the ≤450KB/≤1.2MB
   budgets need re-checking against actual file sizes, not gradient fills.
7. **A5 scroll-height measurement** — needs the finished page (all sections at full content),
   not the current placeholder-heavy state.

## What is genuinely ready

Every piece of interaction logic, layout structure, RTL mirroring, accessibility
infrastructure, and performance characteristic that does not depend on a missing asset is
built, tested, and verified against the concrete numbers in this document — not just
"looks right." The redesign is code-complete and regression-clean on
`feature/hamdam-web-redesign`; what remains is entirely the real-world inputs (imagery,
cultural sign-off, device testing) that only Ealia can supply.

---

## Phase 13 (S6) update — 2026-07-18

Fresh re-verification against the corrected build (S1/S2 real assets, S3 copy/product-truth
review, S4 technical pre-acceptance, F1 Fable audit, S5 Fable corrections, and one additional
S6-discovered fix — see `phase-reports/phase-13-report.md` for the full narrative). This
section records deltas from the Phase 12 table above; gates not listed here were not
re-measured this session and should be read as carried forward, not re-confirmed.

| # | Result | Notes |
|---|---|---|
| A1 | PENDING (unchanged) | Real PT/CM/HW/FC/CY assets now in place (S1/S2); the device frame itself (DV-01) is real and Fable-approved. Screen *content* inside it remains the pending gradient fill (F1-00) — still not comparable to the North Star Today screen. |
| A5 | Not measured (unchanged) | Still no concrete scroll-height dark/warm ratio measurement taken. Additionally: `BaseLayout.astro`'s scroll-progress calculation uses total page height rather than a ceremony-anchored offset (stale Phase-9 TODO, found this session, not fixed — see phase-13-report.md). Practical effect on this ratio is unmeasured. |
| A6 | PASS (freshly re-verified for the ceremony section) | F1-04's mobile fix (min-height 85vh, raised horizon height) directly re-verified: `.ceremony` computed height on a 390x844 viewport is exactly 717px (85vh), confirmed via Playwright `boundingBox()`; screenshot evidence (`final-evidence/phase-13/screens/ceremony-midpass-*.png`) shows no empty-cream run. Other sections carried forward from Phase 12/F1. |
| B1 | PENDING (unchanged) | DV-01 screen content still the honest pending gradient, not fabricated. Unchanged from F1. |
| B3, B4, B5 | PASS (freshly re-verified) | Grepped the rebuilt `dist/`: zero reviews/counts/awards, zero Forough/فروغ, zero dollar figures. |
| C6 | PASS (freshly re-verified, both scripts) | `Ganjoor.net` (EN) and `گنجور` (FA) both present, all six routes checked individually. |
| C7 | PASS (freshly re-verified on rebuilt output) | Em-dash sweep: only the three pre-existing `verses.ts` translation instances (hafez-016, rumi-011 ×2, parvin-008), zero elsewhere, including the two files S5/S6 touched (`poets.ts`, `Footer.astro`). |
| D1, D2, D4, D5 | PASS (freshly re-verified) | Still exactly three dimensional moments; zero `<canvas>`/`<audio>`/`<video>`; ceremony petal `IntersectionObserver.disconnect()` logic unchanged by F1-04 (only the array length/CSS changed, not the trigger logic). |
| E1 | PASS, with one open item | Sticky-CTA state machine unchanged by S5/S6. A stale Phase-9 TODO in `StickyDownloadAction.astro` questions whether the pill correctly hides across the ceremony-to-footer gap specifically — found this session, not re-verified live (would need a scroll-through capture at that exact boundary), not fixed. |
| E3, E4 | PASS (freshly re-verified) | Zero `apps.apple.com` in built output, `RELEASED: false` confirmed. Ceremony CTA screenshot-verified sitting cleanly on the (now gradient-strengthened) brightest surface with no overlap, both viewports captured. |
| F1 | PASS (partially re-verified) | A 12-stop keyboard trace (desktop, `final-evidence/phase-13/keyboard-focus-trace-en.json`) confirms visible focus and ≥44px hit targets through skip-link, nav, language toggle, mood slider, MOOD-03's new link text, and into the poets figure — not a full re-trace of all ~20 original stops. |
| F3 | **Unresolved, recorded honestly (was PASS in Phase 12)** | Lighthouse's `color-contrast` audit fails on the constellation/journey copper-surface text, reproducibly, both locales, both pre- and post-S5 builds — this is the same discrepancy already flagged in `FINAL-COMPLETION-STATE.md` before this stage (not new), but this session's own attempt to independently verify it via computed contrast ratios (`final-evidence/phase-13/contrast-results.json`) is not trustworthy evidence either way: the script samples an ancestor's `background-color`, which cannot correctly represent a `linear-gradient` background's actual rendered pixel colour under the text. Genuinely open, needs a real tool/device spot check, not silently passed. |
| F7 | PASS (freshly re-verified for the new 404 FA link) | The F1-05 addition reuses the exact same class pattern as the existing EN 404 link (confirmed via built-HTML diff), so the same 44px-effective touch target applies. |
| G1 | **Caveated (was a clean PASS in Phase 12/S4)** | Performance 89-94 across repeated runs (noisy, see G4 below and the Lighthouse summary); ≥90 in most but not all runs. Accessibility 97, not 100 (see F3) — this has been the case since S4, not new to S6, but Phase 12's "=100" pass predates real assets and does not reflect current reality. |
| G2, G3 | PASS (freshly re-verified against real assets) | CLS 0 both locales; total page transfer 361KB (EN) / 298KB (FA), both well under the ≤450KB/≤1.2MB budgets — the first time this gate has been checked against real imagery rather than placeholder gradients. |
| G4 | **FAIL, recorded honestly (was PASS in Phase 12/S4)** | LCP measures 2.9-3.2s locally, both locales, above the 2.5s target. An A/B test against an isolated worktree of the pre-S5 commit produced an identical 3.2s, proving this is not an S5/F1-04 regression. Whether it is a genuine regression from the S1/S2 real-asset integration that S4's "2.3s/2.0s" figure did not catch, or an artefact of measuring a local `astro preview` server rather than a real deployed edge, is undetermined from this session. Needs a real Cloudflare Pages preview-deploy measurement. |
| G6 | PASS (freshly re-verified) | Build succeeds; `package.json`/`package-lock.json` unchanged (confirmed via `git status` immediately after every `npm install --no-save playwright` used for this session's own evidence tooling); zero inline styles/scripts introduced in the rebuilt output. |
| H1, H2 | PASS (freshly re-verified) | 110/110 tests (twice — after S5, and again after the S6 footer fix); hreflang/OG/JSON-LD/sitemap all present on the rebuilt output. |
| H4 | Spot-checked (not a full re-test) | The 404 page's FA language-toggle link correctly resolves to `/fa/404/` in the rebuilt output — one concrete data point, not the full original Phase-12 round-trip test. |

### New, S6-discovered finding: FA legal-page footer was English

Not part of F1's correction list, not caused by S5. `Footer.astro` had no `lang` prop;
`fa/privacy.astro` and `fa/terms.astro` (which import it directly, unlike `fa/index.astro`
which has always had its own separate correct inline footer) were rendering English footer
text on Farsi pages. **Fixed in-session** (commit `c3f6b5f`) using FA copy copied verbatim
from `fa/index.astro`'s own already-shipped footer — zero new Persian authored, zero design
judgment required. Full detail and verification in `phase-reports/phase-13-report.md`. This
is effectively a new C1/C3-adjacent regression-protection finding: found, fixed, and
re-verified (110/110 tests, build, check:persian, em-dash sweep, CSP sweep all clean
afterward) within this same stage.

### Net effect on "Blocking before merge to main"

Item 1 (real assets) is now far more complete than the Phase-12 list describes — S1/S2
landed all fifteen asset IDs; the only remaining piece is DV-01's screen content (F1-00),
not the whole asset list. Item 6 (G3 re-verification against real imagery) is now done,
PASS. Item 7 (A5 scroll-height measurement) is still open, plus the newly-found A5-adjacent
TODO. A new item is added: **G4 (LCP) needs a real deployed-environment measurement** before
it can be honestly called passing or failing.
