# Phase 13 Lighthouse summary

Production build (`npm run build` + `astro preview`), local machine, 2026-07-18. Method:
`npx lighthouse` (v13.4.0, no project dependency added), default mobile config unless noted.

## Headline scores (multiple runs, same build, same machine)

| Run | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| EN run 1 (`--preset=perf` + manual screenEmulation) | 89 | 97 | 100 | 100 |
| EN run 2 (default mobile config) | 94 | 97 | 100 | 100 |
| EN run 3 (default mobile config) | 91 | 97 | 100 | 100 |
| EN full audit (`en-full.json`, kept) | 91 | 97 | 100 | 100 |
| FA full audit (`fa-full.json`, kept) | 94 | 97 | 100 | 100 |
| **pre-S5 build, run 1** (`preS5-run1.json`) | 89 | 97 | 100 | 100 |
| **pre-S5 build, run 2** (`preS5-run2.json`) | 91 | 97 | 100 | 100 |
| **pre-S5 build, full audit** (`preS5-en-full.json`, kept) | 91 | 97 | 100 | 100 |

## What this shows

**Performance is noisy on this machine, not regressed by S5.** Three same-build EN runs spread
89-94 with zero code changes between them -- a wider spread than the "within 1 point" tolerance
F1-04's own acceptance test asked for. To isolate whether F1-04 (ten petals instead of six, a
new radial-gradient, a mobile min-height/horizon-height change) caused this, the pre-S5 commit
(`1b83de0`, before any Fable corrections) was checked out into an isolated git worktree,
rebuilt, and Lighthouse'd the same way: **89 and 91**, the identical noise band. F1-04 did not
regress performance; the local "simulate" throttling method's run-to-run variance on this
machine simply exceeds 1 point, which the S4 baseline's single-run "97" figure did not surface.

**Accessibility is a stable, reproducible 97, not 100** -- every run, both locales, both
builds (pre- and post-S5). The one failing audit is `color-contrast`, and it is the exact,
already-known finding recorded in `FINAL-COMPLETION-STATE.md` before this stage started: the
constellation/journey copper-surface text sections. This is not a new S6 finding and not
introduced by S5. A same-session attempt to independently re-verify these specific pairings
by computing contrast ratios via Playwright (`contrast-results.json` at the repo root of this
evidence folder) found a `.journey p` ratio of 5.13:1 against an approximated ancestor
background colour -- but that script walks up the DOM for a `background-color` CSS property
and cannot correctly sample a `linear-gradient` background's actual rendered pixel colour
under the text (`JourneyPair.astro`'s copper section uses a gradient, not a flat colour), so
its 5.13:1 figure is not trustworthy evidence against Lighthouse's real pixel-sampled
`color-contrast` audit. This stays an open, unresolved discrepancy for a real-device/real-tool
spot check, exactly as already recorded -- carried forward, not newly resolved, not newly
broken.

**LCP measures 2.9-3.2s locally (both locales), above the G4 gate's 2.5s target** -- and,
critically, this is **identical between the pre-S5 and post-S5 builds** (both 3.2s on EN in a
same-machine, same-method A/B test). The LCP element is the hero horizon photo, already
`loading="eager" fetchpriority="high"`; its own network request completes in roughly 100ms
per the `lcp-breakdown-insight` audit's subpart timings. The gap between that and the reported
3.2s headline number is not explained by asset weight (total page transfer is 361KB EN / 298KB
FA, both comfortably under the G3 budgets) and is not attributable to any S5 change. This
reads as either a genuine, pre-existing (pre-dating S5) LCP regression from the real-asset
integration in S1/S2 that S4's recorded "2.3s/2.0s" did not catch, or a characteristic of
measuring `astro preview` locally rather than a real deployed edge (no HTTP/2, no CDN, no
production TLS/compression profile) that the S4 session's own measurement conditions may have
differed from. Either way: **G4 is not verifiably passing in this session's evidence**, and
that is reported honestly rather than carried forward as a pass. Re-measuring against a real
Cloudflare Pages preview deploy of this branch is the only way to get a trustworthy number
here; this is out of scope for a local session.

## CLS and byte weight (both locales, both stable and passing)

| Locale | CLS | Total transfer |
|---|---|---|
| EN | 0 | 361 KB |
| FA | 0.0 | 298 KB |

Both comfortably under the G3 full-page budget (≤1.2MB) and the CLS=0 gate (G2).
