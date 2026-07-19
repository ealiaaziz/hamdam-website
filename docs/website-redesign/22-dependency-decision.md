# Hamdam Website Redesign: Dependency Decision

Binding record of every dependency considered for the redesign, per the architecture rule
"do not add a dependency if existing capability is sufficient" and "document the purpose,
runtime impact and alternatives for every proposed new dependency." Current dependency set
(commit `ce98883`, unchanged from baseline):

**Production:** `astro@^7.0.5`, `@astrojs/sitemap@^3.7.3`, `@fontsource/source-serif-pro@^5.2.5`,
`@fontsource/vazirmatn@^5.2.8`, `@tailwindcss/vite@^4.3.2`, `tailwindcss@^4.3.2`.
**Dev:** `sharp@^0.35.3`, `vitest@^4.1.10`.

## Decision: zero new runtime dependencies

The redesign, as specified across `10` through `17`, requires no new npm dependency of any
kind. This is not a constraint imposed on top of the design; the design was produced with
this constraint already binding (`17-sonnet-implementation-handoff.md` §1: "no new runtime
dependencies. New devDependencies require a stated reason and Ealia's approval"), and every
mechanism the specification calls for is achievable with the existing stack:

| Capability needed | Considered dependency | Why rejected | What is used instead |
|---|---|---|---|
| Scroll-driven sky arc, hero motion | GSAP, Lenis (smooth scroll) | Motion spec §1.5 states this as a hard technical-restraint decision, not a preference: "the repo's existing pattern (pure functions in `src/lib/` plus small vanilla modules writing CSS custom properties inside rAF) covers everything." Adding a scroll library also risks CSP friction (some libraries assume inline style mutation patterns that fight `assetsInlineLimit: 0`) | Evolve `src/lib/cinematic.js`'s existing rAF/`ticking` pattern, already unit tested |
| Hero 2.5D depth, ceremony bloom | three.js, any WebGL/Canvas library | Hero technology decision (page spec §2) explicitly rejects live 3D: "nothing in the emotional result requires geometry, the CSP forbids inline scripts and discourages heavyweight dependencies, and the guardrails forbid full-page WebGL dependence." D2 in the acceptance criteria makes this a blocking gate: no WebGL context anywhere, checked in DevTools | Layered CSS transforms and opacity on photographic plates, driven by the same `--sky-progress` custom property |
| Reveal-on-scroll for editorial sections | AOS, ScrollReveal, Framer Motion | The existing `[data-reveal]` + `src/lib/reveal.js` + IntersectionObserver system is already built, unit tested, and already reduced-motion-correct (motion spec §5: "retained as-is") | `src/lib/reveal.js`, extended only with two named additions (constellation arc draw, roots countdown pulse) as small functions in the same file/pattern |
| Mood slider interactivity | A form/slider component library | The mood demonstration needs one real `input[type=range]` (or equivalent ARIA slider) with a small state-mapping function; page spec §3 budgets the entire JS module at under 6KB, which a library would blow past on its own | Native `<input type="range">` plus a new pure module `src/lib/moodDemo.js` |
| Carousel behaviour (poets band, journey pair mobile) | Swiper, Embla | Both carousels are explicitly specified as native `scroll-snap-type: x mandatory` (`12-design-system.md` §17: "the two carousels use inline `scroll-snap-type: x mandatory` only"), which needs zero JavaScript for the scroll mechanism itself | CSS scroll-snap, native |
| Date maths for Roots countdowns | date-fns, dayjs, luxon | Three fixed annual dates (Yalda, Norooz, Chaharshanbe Suri) need next-occurrence maths with year rollover, computed in one fixed timezone (`Australia/Brisbane`); this is inside the reach of the native `Date`/`Intl` APIs and the existing repo pattern of small pure, unit-tested functions | New `src/lib/countdown.js`, native `Date` arithmetic, unit tested exactly like `appStore.js`'s existing pure functions |
| Analytics | Plausible, Umami, Fathom, GA (any npm-installed client) | Analytics is not a dependency question at all: Cloudflare Web Analytics (the only analytics surface the CSP already permits) is dashboard-toggled and edge-injected, never an npm package. See `26-analytics-plan.md` for the decision gate itself, which is a copy/policy question for Ealia, not a technical one | No dependency; Cloudflare dashboard toggle only, if and when approved |
| Image optimisation | Any additional image pipeline | `sharp` is already a devDependency and Astro's built-in `astro:assets` pipeline (already in use, confirmed in the baseline build output: "generating optimized images") covers every new photographic asset (`HW`, `PT`, `CM`, `CY`, `FC` series) | Existing `astro:assets` pipeline |
| Font loading | Any additional web font service | Both required faces (Source Serif Pro, Vazirmatn) are already self-hosted via `@fontsource`, already the design system's stated typography (§2: "the existing faces are retained deliberately") | Existing `@fontsource` packages, no new weights needed beyond what §3-4 of the design system specify (confirm exact weight files are already installed before Phase 1 lands; if a specific weight/style file is missing from the installed `@fontsource` package version, that is a version bump of an existing dependency, not a new one) |

## Considered and rejected: devDependency additions

| Candidate | Purpose | Decision | Reason |
|---|---|---|---|
| ESLint + config | Lint the new components/modules | Rejected for this redesign | No lint script exists in the current repo (`package.json` has no `lint` entry) and the audit's own baseline explicitly notes "per the audit's run only existing project commands constraint, no lint/typecheck command was invented." Introducing a linter mid-redesign is an unscoped tooling change; if Ealia wants one, it is a separate decision outside this plan's authority, not bundled into the redesign |
| Prettier | Format new files | Rejected, same reasoning | No existing format script or config; match the existing files' hand-formatted style instead |
| Playwright | Automated visual/E2E testing for the acceptance pass | Rejected as an installed dependency; the `webapp-testing` skill already provides ad hoc Playwright access without an npm install | The repo's own `.agents/skills/webapp-testing/` presence (confirmed) is a project-imported skill, not a package; using it for the Phase 13 acceptance screenshots requires no `package.json` change |
| A Lighthouse CI package | Automate the performance gate | Rejected for this redesign | No existing script; manual/ad hoc Lighthouse runs (as the prior 2026-07-14 audit did) are sufficient for a pre-launch site with no CI pipeline (no `.github/workflows` directory exists in this repo; deploy is Cloudflare Pages' own Git integration, not repository-hosted CI) |

## If an asset genuinely requires new tooling

None of the fifteen Canva-sourced assets (`HW-01` through `FC-01`; see the reconciled count
in `20-implementation-plan.md`'s "Canva asset inventory" section, correcting
`14-canva-asset-brief.md`'s own "14" summary line against its fifteen itemised IDs) require
a new dependency: they are produced externally in Canva per `14-canva-asset-brief.md` and
committed as static image files, processed through the existing `astro:assets`/`sharp`
pipeline. If, during implementation, a specific asset format requires a codec `sharp`
doesn't support out of the box (unlikely; AVIF/WebP are both standard `sharp` outputs), that
is flagged to Ealia as a scoped, single-purpose devDependency addition with the same
purpose/impact/alternative documentation as this file, not silently added.

## Summary for the final response

**Proposed dependencies:** none.
**Rejected dependencies:** GSAP, Lenis, three.js/WebGL libraries, AOS/ScrollReveal/Framer
Motion, Swiper/Embla, date-fns/dayjs/luxon, any analytics npm client, ESLint, Prettier,
Playwright (as an installed package), Lighthouse CI.

## 2026-07-20 override: three.js added for the hero starfield, at Ealia's explicit instruction

Ealia was shown the original rejection reasoning above (no geometry needed, CSP posture, and
critically that the hero's own LCP was already recorded failing its 2.5s target in
`FINAL-COMPLETION-STATE.md` §16/§27, an owner-accepted waiver, not a resolved pass) and chose
explicitly to override it in favour of a real 3D hero layer, understanding the tradeoff. This
entry records that decision rather than silently amending the table above.

**What was added:** `three@^0.185.1` (production dependency). Used in exactly one place,
`src/lib/heroScene3d.js`, which replaces the flat SVG star field in `HeroCinematic.astro` with
a real `THREE.Points` field carrying genuine per-star depth (size-attenuation) and a small,
damped pointer-parallax on the camera. Nothing else in the redesign's WebGL-free architecture
changed: the ceremony petals, the sky arc, the reveal system, and every other motion moment
listed in `13-motion-specification.md` are still pure CSS custom properties, no library.

**How the original risks were mitigated, not eliminated:**
- **Bundle weight:** `three` is dynamic-imported (`await import('three')`) only inside the
  same `!prefersReducedMotion()` branch `HeroCinematic.astro`'s script already gates its whole
  scroll-timeline logic behind, so reduced-motion visitors never fetch it at all, and it never
  appears in the page's initial script tags (confirmed in the built `dist/index.html`, only
  `HeroCinematic`'s own tiny script is referenced there, not the three.js chunk). Real cost for
  motion-OK visitors: 707.5 KB minified / **178.3 KB gzipped**, fetched asynchronously after
  the hero's own LCP content is already painted (checked directly against `dist/_astro/`
  output this session, not estimated), and cached immutably afterward per the existing
  `/_astro/*` cache-control rule in `public/_headers`.
- **LCP:** the hero's actual LCP candidate (the headline text / hero image) is unaffected;
  the WebGL canvas paints in on top afterward via a CSS opacity transition once three.js
  finishes initialising, never blocking. This is a mitigation, not a fix, for the pre-existing
  G4 LCP failure recorded in `FINAL-COMPLETION-STATE.md`; **a real production Lighthouse run
  against the deployed URL is still required to confirm LCP did not regress further**, exactly
  the same "cannot trust local `astro preview` measurements" caveat already on record for G4 in
  that file's §21. Not yet run this session, no browser available.
- **CSP:** no `public/_headers` change needed. Three.js ships as a plain ES module with no
  `eval`, bundled by Vite into a hashed same-origin chunk, so `script-src 'self'` already
  covers it. No new textures are fetched (vertex colours only), so `img-src`/`connect-src` are
  untouched too.
- **Failure mode:** if `WebGLRenderer` construction throws, or the browser has no WebGL context
  at all, `initHeroScene3d` returns `null` and the caller leaves the original flat SVG star
  field fully visible, exactly as before this change, no gap and no console error surfaced to
  the visitor.
- **What did NOT change:** the "no animation libraries" rule for every other motion moment
  (ceremony, sky arc, reveals, mood demo) stands untouched; this override is scoped to the
  hero's star layer only, not a blanket reversal of `13-motion-specification.md` principle 5.

**Still outstanding, not closed by this change:** a real deployed-environment Lighthouse
run (both locales) to confirm actual LCP/performance impact, and the pre-existing F3
(contrast) and G4 (LCP) waivers from `FINAL-COMPLETION-STATE.md` remain exactly as owner-
accepted-open as they were, this change does not resolve either.
