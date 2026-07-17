# Hamdam Website Redesign: Performance Budget

Observed measurements and proposed targets are kept in separate tables throughout this
document, per the instruction not to invent passing results. Where no current measurement
exists (several categories below: the current site has no video, no 3D, one animation
system), that is stated as "not applicable to the current site" rather than filled with an
invented number.

## Observed baseline: current, re-confirmed (the only figures usable as "the baseline")

Source: `docs/website-redesign/05-baseline-results.md`, commands re-run at commit `cca27ac`,
confirmed still valid at current HEAD `ce98883` since the intervening commits touched only
`docs/`.

| Metric | Observed value | Source / date | Freshness |
|---|---|---|---|
| Build time | 1.11s, 7 pages, zero warnings | `05-baseline-results.md`, re-confirmed at HEAD | Current |
| Unit tests | 60/60 passing, 4 test files | `05-baseline-results.md`, re-confirmed at HEAD | Current |
| Persian byte check | Pass, zero violations | `05-baseline-results.md`, re-confirmed at HEAD | Current |
| Initial JavaScript | Not separately measured in any existing audit document | — | No observed figure exists; the current site's only JS is `cinematic.js` and `reveal.js`, both small vanilla modules, exact byte count not recorded anywhere read for this plan |
| Initial CSS | Not separately measured | — | No observed figure exists |
| Initial image weight | Not separately measured (three scene JPGs exist per `03-technical-inventory.md` but no aggregate byte count recorded) | — | No observed figure exists |
| Video weight | Not applicable | — | No video exists on the current site |
| 3D asset weight | Not applicable | — | No 3D exists or is planned (D2 forbids it) |
| Animation loops | 0 continuously running (existing `[data-reveal]` fires once per element, `cinematic.js` is scroll-driven not time-driven) | Inferred from code review (`13-motion-specification.md`'s own framing of the existing pattern), not a measured figure | Qualitative, not numeric |
| Third-party requests | 1 potential (`static.cloudflareinsights.com`, CSP-permitted but unconfirmed as actually firing) | `public/_headers` CSP allowance; live beacon presence unverified (`26-analytics-plan.md`) | Uncertain, flagged not asserted |

## Prior external record: not a current baseline, not to be reused as one

The following figures exist in `docs/website-evolution-audit.md`, an external Lighthouse run
dated 2026-07-14. They predate the current commit (`ce98883`) and predate any redesign work,
were not produced by this repository's own command set (no Lighthouse script exists in
`package.json`), and are recorded here **only as historical context, explicitly not as the
current baseline and not to be cited as "before" evidence for any redesign comparison:**

| Metric | Recorded value (2026-07-14, stale) |
|---|---|
| Lighthouse, production, `/` mobile | Performance 96, Accessibility 100, Best Practices 100, SEO 100 |
| Lighthouse, production, `/fa/` mobile | Performance 98, Accessibility 100, Best Practices 100, SEO 100 |
| Lighthouse, local, `/` mobile | Performance 98, Accessibility 100, Best Practices 100, SEO 100 |
| Lighthouse, local, `/fa/` mobile | Performance 97, Accessibility 100, Best Practices 100, SEO 100 |
| CLS | 0, both locales (also independently asserted as a current-state fact in `03-technical-inventory.md`, which gives it slightly more standing than the Lighthouse figures above, but it is still not a Phase 12-quality re-measurement) |

**Action required before Phase 12 can close:** re-run Lighthouse against current HEAD
(pre-redesign, on the `feature/hamdam-web-redesign` branch before Phase 1 lands) to establish
a true current baseline. The table above must not be quoted as "the redesign's before/after"
under any circumstance; a fresh pre-redesign capture is a precondition for Phase 12's
before/after comparison, not an optional nicety.

## Proposed targets (this redesign, from `16-visual-acceptance-criteria.md` gate G, restated
here as the operative budget document with added categories the acceptance criteria don't
enumerate separately)

Lighthouse targets, by category, mobile, both locales: **Performance ≥90. Accessibility
target 100. Best Practices target 100. SEO target 100.** These are synthetic-tool scores;
see the device-validation note below the table, which is binding alongside these numbers,
not a soft caveat under them.

| Metric | Proposed target | Source | Notes |
|---|---|---|---|
| Lighthouse Performance, mobile, both locales | ≥90 | G1 | "The current site achieves 96 to 98; the redesign may spend at most a few points, never below 90" |
| Lighthouse Accessibility, mobile, both locales | 100 | G1 | No regression tolerated |
| Lighthouse Best Practices, mobile, both locales | 100 | G1 | No regression tolerated |
| Lighthouse SEO, mobile, both locales | 100 | G1 | No regression tolerated |
| CLS, design goal | 0, both locales | G2 | The design target: every image has reserved dimensions, explicit width/height throughout, per design system §13. This is what the implementation aims for, not the release gate figure below |
| CLS, measurable release ceiling | ≤0.05, both locales | This correction, replacing a bare "0" gate with a measurable ceiling | The gate that actually blocks release: 0 is the design intent, 0.05 is the number a real Lighthouse/CrUX-style measurement is checked against, since a strict-zero gate is not a realistic synthetic-tool pass/fail bar even when the design achieves visually zero shift |
| Total image transfer, homepage first load (mobile) | ≤450KB | G3 | Hero plates plus eager assets |
| Total image transfer, full page (per locale) | ≤1.2MB | G3 | |
| LCP | ≤2.5s on simulated 4G mid-tier mobile | G4 | LCP element must be the headline or hero plate, never a below-fold asset |
| Motion JS (minified, total) | ≤12KB | G5 / motion spec §8 | Across all new modules: sky ramp, mood demo, countdown, campaign params, sticky CTA |
| Long tasks during full scroll | 0 tasks >50ms attributable to motion code | G5 | Verified via DevTools performance recording |
| New framework dependencies | 0 | G6 | Confirmed in `22-dependency-decision.md` |
| CSP `unsafe-inline` additions | 0 | G6 | Every dynamic style goes through custom properties set via `style.setProperty`, never inline `style=""` |
| Initial JavaScript (page-wide, all phases combined) | ≤12KB (same figure as the motion JS budget, since motion code is effectively the only new JS this redesign adds; no new non-motion JS is planned) | Derived from motion spec §8, not separately stated in doc 13 | If a non-motion JS need emerges during implementation, it needs its own budget line and Ealia's awareness, not silent inclusion under the motion figure |
| Initial CSS | No numeric target set in any binding doc | — | Not specified; token additions are additive to the existing Tailwind v4 build, monitor CSS output size at each phase's build step as a qualitative check (growing, not target-bound) rather than invent a number no binding document states |
| Per-section image budgets (itemised) | Hero horizon plate 180KB desktop / 90KB mobile; poet portraits 60KB each (5 = 300KB); Roots moment cards 80KB each (3 = 240KB); journey screenshots 120KB each framed (2 = 240KB); Founding Companion band texture 60KB; ceremony petal sprites 30KB total | Page spec §2, §4, §6, §7, §9, §10 respectively | These sum to well over the 450KB first-load budget if all loaded eagerly, which is exactly why the lazy-loading rule (only the hero plates are eager; everything else is below-fold and lazy) is load-bearing, not optional |
| 3D asset weight | 0 (not used) | D2 | No WebGL context anywhere, checked in DevTools |
| Video weight | 0 (not used) | Hero technology decision, page spec §2 | Pre-rendered video loop explicitly rejected as primary |
| Animation loops (general rule) | No uncontrolled permanent animation loop | This correction, replacing an unexplained blanket "zero" figure | See "Motion loop rule" below for the full, conditioned statement and how it interacts with this specific redesign's stricter D3 requirement |
| Mobile memory risk | No numeric target set in any binding doc | — | Not specified; qualitatively bounded by the "zero WebGL, zero video, zero continuous loops, capped image budgets" combination above, which is a strong proxy but not a measured memory ceiling. If a specific device shows memory pressure during Phase 12/13 testing, record the observation and the fix, do not retroactively invent a target this document didn't set |
| Initial third-party requests | Cloudflare Insights only, if and only if analytics is approved per `26-analytics-plan.md`; 0 otherwise | Derived from the observed baseline's uncertainty plus the analytics decision gate | This is the one budget line whose target literally depends on a pending decision, stated as such rather than picked in advance |

## Synthetic scores do not replace device validation (binding)

Lighthouse, CrUX-style CLS figures, and any other synthetic/automated score in this document
are necessary but not sufficient. They do not replace an actual pass on Safari on a real
iPhone: font rendering, momentum scroll behaviour, Dynamic Type interaction, Smart App
Banner presentation, and touch-target feel all differ between a synthetic headless-Chrome
run and real Safari/iOS. Phase 12 and Phase 13 both require a real-device Safari/iPhone pass
(not a simulator, not a responsive-mode desktop-browser emulation) as a condition of
closing, independent of and in addition to every numeric target in the tables above. A
Lighthouse 90+ score with no device pass recorded is not a completed performance gate.

## Motion loop rule

The general rule for any ambient or looping motion considered anywhere in this redesign is:
**no uncontrolled permanent animation loop.** Any approved ambient loop must:

1. Be visually meaningful (communicates reflection, transition, context, or discovery — the
   same purpose test `13-motion-specification.md` §0 already applies to all motion).
2. Pause outside the viewport (IntersectionObserver-gated, matching the existing
   `reveal.js` pattern rather than a new mechanism).
3. Pause when the document is hidden (`document.visibilityState` check, releasing the
   animation frame loop rather than running it unseen).
4. Stop or become static under reduced motion.
5. Have a low-power-mobile fallback (a static or simplified rendering when the device
   signals reduced performance headroom, or as a manual budget fallback if no such signal is
   read).
6. Stay within the approved JavaScript and asset budgets stated elsewhere in this document.

**This redesign's approved design explicitly requires stricter than the general rule, and
that stricter decision is preserved as-is, not loosened by the general rule above.**
`16-visual-acceptance-criteria.md` D3 states: "Nothing on the page loops, bounces, floats
idly, or follows the pointer; after settle and outside interaction, a static viewport stays
static," verified by a 10s idle-video recording at three scroll positions. This is a
section-level decision already baked into `13-motion-specification.md` §1 ("three
dimensional moments only... motion responds; it never performs... nothing loops, nothing
idles"). Every animation in this redesign is scroll-driven, input-driven, or a one-time
arrival event; none is an ambient loop in the first place, so the six-condition framework
above does not currently license anything D3 forbids. The general rule exists for
completeness (and for any future work outside this specific redesign that might propose an
ambient loop); within Phases 1 through 13 of this plan, D3's zero-loop bar is what actually
governs, and nothing in this correction weakens it.

## Measurement method (for reproducibility, matching how the observed baseline was captured)

- Build/test/Persian check: `npm run build`, `npm run test`, `npm run check:persian` — exact
  commands already in `package.json`, no new tooling.
- Lighthouse: ad hoc run against `npm run preview` (production-equivalent static build)
  locally, and separately against the live production URL once deployed to a preview branch
  if Cloudflare Pages preview deploys are available (confirm this capability exists before
  relying on it; if not, local-only Lighthouse runs are the fallback, same as the prior
  2026-07-14 audit's "production" vs "local" split suggests both were reachable then).
- Image transfer: sum of `Content-Length` for all image requests on first paint (DevTools
  Network tab, filtered to `img`/`image` type, mobile viewport, cache disabled).
- LCP: Chrome DevTools Performance panel or Lighthouse's own LCP element callout, simulated
  4G mid-tier throttle profile.
- Long tasks: Chrome DevTools Performance panel, full scroll recording, filter to tasks
  attributable to the new motion modules specifically (not third-party or browser-internal
  tasks).
- Motion JS size: `du -h` or bundler output on the built, minified files under
  `dist/_astro/` matching the new `src/lib/*.js` modules, summed.

## Progressive loading requirement (restated, binding)

Per the mega-prompt's explicit instruction: the navigation, headline, and primary App Store
action must render independently of any imagery layer, and non-critical animation/imagery
must load progressively. This is already the shape of Phase 3 (static hero composition
ships before Phase 4's scroll-linked enhancement) and the per-section lazy-load rules
throughout `11-page-design-specification.md`; this document's budgets assume that ordering
holds, they do not additionally enforce it (that is `20-implementation-plan.md`'s job, Phase
3 item 16 specifically).
