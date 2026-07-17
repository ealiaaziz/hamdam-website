# Hamdam Website — Baseline Command Results

Every command below is one already defined in `package.json` — nothing new was installed or
configured for this audit. Run against commit `cca27ac867c1c3ad9b9a064dbffe2a62cb6867f5` on
`main`, working tree clean (aside from the pre-existing untracked prior audit doc).

## `npm run build` — **PASS**

```
> hamdam-website@0.0.1 build
> astro build

[types] Generated 439ms
[build] output: "static"
[build] mode: "static"
[build] directory: /Users/EA/Developer/hamdam-website/dist/
[build] Collecting build info...
[build] Completed in 471ms.
[build] Building static entrypoints...
[vite] built in 472ms
[vite] built in 34ms
[build] Rearranging server assets...

 generating static routes
  ├─ /404.html
  ├─ /fa/privacy/index.html
  ├─ /fa/terms/index.html
  ├─ /fa/index.html
  ├─ /privacy/index.html
  ├─ /terms/index.html
  ├─ /index.html
 Completed in 77ms.

 generating optimized images
  ▶ /_astro/norooz-morning-section.Ua2augdp_20SG9F.webp (reused cache entry) (1/3)
  ▶ /_astro/dawn-section.CkGpNXrt_Z1SPS5v.webp (reused cache entry) (2/3)
  ▶ /_astro/quiet-garden-section.BHkiItlB_1tYxCt.webp (reused cache entry) (3/3)
 Completed in 2ms.

[build] Completed in 613ms.
[@astrojs/sitemap] `sitemap-index.xml` created at `dist`
[build] 7 page(s) built in 1.11s
[build] Complete!
```

Zero warnings, zero errors. 7 pages emitted, matching the 7 routes in
`03-technical-inventory.md` §8.

## `npm run test` (Vitest) — **PASS**

```
> hamdam-website@0.0.1 test
> vitest run

 RUN  v4.1.10 /Users/EA/Developer/hamdam-website

 Test Files  4 passed (4)
      Tests  60 passed (60)
   Start at  08:26:26
   Duration  492ms (transform 96ms, setup 0ms, import 192ms, tests 16ms, environment 0ms)
```

60/60 passing across 4 test files (`locale`, `cinematic`, `reveal`, `appStore` — matching
`src/lib/__tests__/`). Matches the 60-case count recorded in `docs/progress.md` for the Phase
W1 relaunch — no drift since then.

## `npm run check:persian` — **PASS**

```
> hamdam-website@0.0.1 check:persian
> node scripts/check-persian.mjs

Persian byte-check passed: all Persian words within the allowed Unicode set.
```

Also wired as a `pre-commit` hook (`scripts/git-hooks/pre-commit`, activated via
`core.hooksPath` in the `prepare` npm script) — every Persian string added since the last
audit (including the two newly-translated Farsi legal pages) has passed this gate.

## Lint / typecheck — **not run, no script exists**

No `lint`, `typecheck`, or `format` script is defined in `package.json`, and no
ESLint/Prettier config was found at the repo root. Per the audit's "run only existing project
commands" constraint, no lint/typecheck command was invented or run. TypeScript's own
type-generation runs implicitly as part of `astro build` (`[types] Generated 439ms` above)
and surfaced zero errors, which is the closest available signal to a typecheck pass.

## Accessibility / performance tooling — **not run, no script exists**

No Lighthouse, axe, or similar tool is wired into this repo's `package.json`. The prior
2026-07-14 audit (`docs/website-evolution-audit.md`) recorded external Lighthouse runs
(production mobile: `/` 96/100/100/100, `/fa/` 98/100/100/100; local mobile: `/` 98/100/100/100,
`/fa/` 97/100/100/100; CLS 0 both locales) but that tooling isn't part of this repo's own
command set, so it wasn't reproduced here — flagged as an open item in
`00-current-state-audit.md` for anyone wanting current numbers.

## Dev server smoke test

`npm run dev` (via `astro dev`, backed by `with_server.py` in this audit) served the site on
`http://localhost:4321` without incident: all 38 screenshots in `06-screenshot-index.md` were
captured against this server across 6 viewports, 2 locales, and 7 routes with zero navigation
failures. The one deliberately-triggered 404 (`/this-page-does-not-exist`) returned HTTP 404
and rendered the site's own not-found page rather than a raw Cloudflare/Astro error — verified
correct, not a broken state.
