# Hamdam Website — Pre-Implementation Baseline (Phase 0)

Fresh baseline captured before any Phase 1 website source change, per Runner 4's Phase 0
process. This supersedes `05-baseline-results.md` as the operative pre-redesign baseline for
this implementation effort; `05-baseline-results.md` is not modified or deleted (nothing is
removed without recording it), it remains the prior audit's own record.

## Environment

| Field | Value |
|---|---|
| Repository | `hamdam-website` |
| Branch | `feature/hamdam-web-redesign` |
| Baseline commit | `3519a12b7f78427f15df0d3f5b630398112719d6` (`docs: add website redesign implementation plan`) |
| Branch base commit | `ce988836d931968269fad0478b28fb9394cc26a3` (`main` at branch creation, unchanged since) |
| Node version | v26.3.1 |
| Package manager | npm 11.16.0 |
| Astro version (declared) | `^7.0.5` (`package.json` dependency range; not independently resolved to an exact installed version in this pass) |
| Operating environment | Darwin 25.5.0, arm64 (`MB-Air.local`) |
| Existing install state | `node_modules/` already present at session start; no `npm install` run, no dependency installed or modified in this pass |

This baseline was captured with only documentation changes applied (the Phase 0 planning
commit above touches only `docs/website-redesign/*`); no `src/`, `public/`, `astro.config.mjs`,
`wrangler.jsonc`, or `package.json` file differs from `main`'s `ce98883` at the time of this
capture.

## Build

Command: `npm run build`

Result: **PASS**, zero warnings, zero errors.

```
[types] Generated 168ms
[build] output: "static"
[build] mode: "static"
[build] Collecting build info... Completed in 184ms.
[build] Building static entrypoints...
[vite] built in 297ms
[vite] built in 35ms
[build] Rearranging server assets...
 generating static routes
  /404.html, /fa/privacy/index.html, /fa/terms/index.html, /fa/index.html,
  /privacy/index.html, /terms/index.html, /index.html — Completed in 61ms.
 generating optimized images (3 reused cache entries) — Completed in 2ms.
[build] Completed in 422ms.
[@astrojs/sitemap] sitemap-index.xml created at dist
[build] 7 page(s) built in 640ms
[build] Complete!
```

- Build duration (reported by the command): 640ms total (422ms build phase + earlier sub-steps).
- Pages generated (reported by the command): 7.
- Warnings: none observed in the command output.

## Tests

Command: `npm run test` (Vitest)

Result: **PASS**. 4 test files, 60/60 tests passing. Duration reported: 231ms.

## Persian byte validation

Command: `npm run check:persian`

Result: **PASS**. "Persian byte-check passed: all Persian words within the allowed Unicode
set."

## Lint

No `lint` script exists in `package.json` (`dev`, `build`, `preview`, `astro`, `test`,
`check:persian`, `prepare` are the complete script list). No ESLint or other lint
configuration file found at the repository root. **Not available — not run, not described as
passed.**

## Type check

No dedicated `typecheck` script exists. `astro build`'s implicit type generation step
(`[types] Generated 168ms` above) is the closest available signal and reported zero errors
during this pass, but this is not a substitute for a real `tsc --noEmit` or equivalent
dedicated check, and is not described as a passed "type check" in the strict sense — it is
reported here as what actually exists, no more.

## Accessibility measurement

No accessibility-scanning script or dependency (axe, pa11y, or similar) exists in this
repository. **Not available — not run, not described as passed.**

## Performance measurement (Lighthouse)

No `lighthouse` script exists in `package.json`. No `lighthouse` binary is present on the
system `PATH` (`command -v lighthouse` returns not found). No `lighthouse` package is
installed in this project (`npm ls lighthouse` returns empty). An `npx --no-install
lighthouse` style check was not attempted with an installing flag, consistent with the "do
not install" constraint; a non-installing dependency check confirmed it is not cached
locally. **Fresh Lighthouse execution is not available under the existing repository and
environment in this session. It was not installed. Stale measurements (the 2026-07-14
external Lighthouse run recorded in `docs/website-evolution-audit.md`) are explicitly not
substituted here. This remains a required Phase 12 measurement gap**, consistent with
`25-performance-budget.md`'s existing "Action required before Phase 12 can close" note.

## Screenshot capture

The prior baseline (`06-screenshot-index.md`, `baseline-screenshots/`) was captured using
"headless Chromium via Playwright, per the `webapp-testing` skill," in a session where that
browser-automation capability was available. **In this Phase 0 session, no browser
automation or screenshot tool is available**: no Playwright MCP or equivalent tool appears
in this session's available toolset, Playwright is not an installed dependency of this
repository (`npm ls playwright` returns empty), and an install-triggering command was not
run, consistent with "do not add a screenshot dependency." No new screenshots were captured.
No `pre-implementation-baseline` image files exist as a result of this session. This is
reported as a limitation, not worked around by installing a tool or by reusing the stale
2026-07-14 screenshot set as if it were a fresh capture. The existing
`baseline-screenshots/` directory from the prior audit is untouched and not overwritten.

## Route sanity (cross-check against the build output above)

| Expected route | Present in `dist/` | Notes |
|---|---|---|
| `/` | Yes (`dist/index.html`) | |
| `/fa/` | Yes (`dist/fa/index.html`) | |
| `/privacy` | Yes (`dist/privacy/index.html`) | |
| `/fa/privacy` | Yes (`dist/fa/privacy/index.html`) | |
| `/terms` | Yes (`dist/terms/index.html`) | |
| `/fa/terms` | Yes (`dist/fa/terms/index.html`) | |
| `/404` | Yes (`dist/404.html`) | |

Exactly seven routes generated, matching the seven-route verification in
`23-route-and-content-protection.md`. No `/fa/404` route exists (not created in this phase,
per instruction — see the Phase 0 report's "existing issues intentionally deferred" section).

## Cloudflare deployment facts (repository evidence only)

- `wrangler.jsonc` binds two custom domain routes (`hamdam.com.au`, `www.hamdam.com.au`) to
  this project's asset deployment, `workers_dev: false`, no environment-specific
  production/preview blocks present in the file.
- No `.github/workflows` directory exists; there is no repository-hosted CI gate, meaning
  Cloudflare Pages' own Git integration is the entire build/deploy pipeline (as previously
  documented in `27-release-and-rollback-plan.md`).
- Which branch Cloudflare Pages treats as its "production branch," whether "Preview
  deployments" is enabled, and whether either custom domain could be attached to a
  non-production environment are Cloudflare Pages **project dashboard** settings, not visible
  in any committed file. Not inferred from `wrangler.jsonc` in this pass; recorded as
  dashboard-only, externally verifiable, exactly as `27-release-and-rollback-plan.md` already
  states.
- No push occurred in this session (confirmed: `git for-each-ref` shows
  `feature/hamdam-web-redesign` has no upstream tracking branch). No Cloudflare
  configuration was read via any dashboard or API access, only the two repository files
  named above. No deployment occurred.
