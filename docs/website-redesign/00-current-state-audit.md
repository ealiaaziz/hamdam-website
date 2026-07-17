# Hamdam Website — Current State Audit (Top-Level Summary)

Read-only evidence-collection pass. No code, copy, or assets were changed. This is one of
six audit documents; see the index at the bottom for where each fact is elaborated.

## Repository safety record

- **Root:** `/Users/EA/Developer/hamdam-website`
- **Branch:** `main`
- **HEAD commit:** `cca27ac867c1c3ad9b9a064dbffe2a62cb6867f5` — "feat(web): translate Farsi
  privacy policy and terms of service"
- **Working tree at audit start:** clean, tracked files unmodified. One pre-existing
  **untracked** file: `docs/website-evolution-audit.md` (164 lines, dated 2026-07-14 — an
  earlier read-only audit by a prior session, not produced by this pass). Left untouched.
  Its findings are cross-referenced throughout these six docs where still current, and
  flagged where superseded by commits since its audit commit (`2bf444e`).
- No tracked files were modified during this audit. Only new files were created, all under
  `docs/website-redesign/`.
- No secrets were printed. No `.env*` files exist at the repo root. No `npm install`, build
  config change, deploy, or destructive git command was run.

## Did the site run?

Yes, cleanly. `npm run dev` served the site on `localhost:4321` with no console errors
observed during screenshot capture. `npm run build` completed in ~1.1s with 7 static pages
emitted and no warnings. Full command output: `05-baseline-results.md`.

## Framework and stack

Astro 7.0.5 (static output) + Tailwind CSS v4 (via `@tailwindcss/vite`) + TypeScript strict.
npm as package manager, Node ≥22.12 required. No server runtime — the entire site is static
HTML served from `dist/`. Full inventory: `03-technical-inventory.md`.

## Routes found

| Route | Purpose |
|---|---|
| `/` | English landing page |
| `/privacy` | English Privacy Policy (real content, not placeholder) |
| `/terms` | English Terms of Service (real content, not placeholder) |
| `/fa/` | Farsi landing page (RTL, native copy) |
| `/fa/privacy` | Farsi Privacy Policy (**now a real translation** — commit `cca27ac`, the repo's current HEAD; the 2026-07-14 prior audit's finding that this was an English stub is superseded) |
| `/fa/terms` | Farsi Terms of Service (**now a real translation**, same commit) |
| `/404` | Not-found page (EN only; verified live, renders correctly, no broken state) |

No blog, no newsletter signup, no account/auth routes, no PWA shell — consistent with the
"never collect emails/accounts" hard constraint and the `docs/progress.md` W2-deferred list.

## Language support

Full bilingual EN/FA at every route, prefix-based routing (`/fa/*`), correct `dir="rtl"`
document semantics on Farsi pages (not simulated with text-align alone), hreflang alternates
(en/fa/x-default), a working language-toggle round-trip that preserves the current path. Both
legal pages are now native Farsi content, not machine-translation stubs — a genuine
improvement since the last audit. Full detail: `03-technical-inventory.md` §17–18,
`04-north-star-gap-analysis.md` §9.

## Analytics

**Ambiguous, worth resolving before any redesign.** The README states "No analytics, no
tracking, no third-party SDKs." `public/_headers`' CSP explicitly allows
`https://static.cloudflareinsights.com` (script-src) and `https://cloudflareinsights.com`
(connect-src), and `docs/progress.md` records "Cloudflare Web Analytics unblocked in CSP
(Option B, no custom events)" as shipped in Phase W1. But **no analytics beacon script tag
exists anywhere in the source** (`src/`) — grepped for `cloudflareinsights`/`beacon`, zero
hits. Cloudflare Web Analytics is normally toggled and auto-injected at the edge from the
Cloudflare dashboard, outside this repo, so its live-enabled state cannot be confirmed from
the code alone. Flagged as a content/claims risk in `01-content-inventory.md`.

## App Store conversion paths

`APP_STORE.RELEASED = false` (`src/lib/appStore.js`) — pre-launch. Every CTA (hero, final
CTA, EN + FA) currently renders the "Coming soon to iPhone" pill, not a real App Store link,
per Apple's badge-usage rules for unreleased apps. The real App Store ID (`6784461990`) is
already wired and only needs the flag flip on launch day per `docs/progress.md`. Smart App
Banner meta tag is present. No other conversion path exists (no email capture, no waitlist —
consistent with the hard "no" on collecting emails/accounts).

## Top technical constraints for any future redesign

1. **Enforcing CSP with no `unsafe-inline`** (`style-src 'self'`, `assetsInlineLimit: 0`,
   `inlineStylesheets: 'never'`) — any new interactive component must ship as a real external
   file, not inline styles/scripts.
2. **`[data-reveal]` scroll-animation system** — most homepage content is `opacity:0` until
   an IntersectionObserver fires; this is invisible in a naive full-page screenshot (it cost
   this audit a re-shoot, documented in `06-screenshot-index.md`) and must be accounted for
   in any new section design.
3. **Zero photography below the `sm` Tailwind breakpoint** — `SceneBackground.astro` is
   `hidden sm:block`, so mobile visitors (the majority) currently see no imagery anywhere
   outside the hero, `og:image`, and icons, regardless of desktop's edge-anchored scenes.

## Top visual gaps vs. the North Star

Full detail and screenshots: `04-north-star-gap-analysis.md`. Headline findings:

1. **No poet portraiture anywhere.** The app's North Star Discover screen features large
   photographic/painted poet portraits (e.g. Rumi). The website's `PoetCard.astro` is
   text-only (Persian name + transliteration + one-line description) — no images exist for
   any of the five poets in this repo.
2. **The app's North Star is photo-driven by design** ("full-bleed atmospheric backgrounds,"
   "verse as the hero," explicit design-principle "feel like a place, not a dashboard") while
   the website is almost entirely a flat cream field with three low-opacity, desktop-only
   scene crops. This is a large gap even against this repo's own
   `.claude/skills/hamdam-web-director/SKILL.md`, which asks for photography "as an emotional
   layer" — currently there is barely a layer at all on 2 of 7 homepage sections, and none on
   mobile.
3. **Cultural-moment specificity is lost.** The app's Roots screen gives Yalda, Norooz, and
   Chaharshanbe Suri each their own card and photograph. The website names all five moments
   (Yalda, Norooz, Chaharshanbe Suri, Mehregan, Sizdah Bedar) in one undifferentiated
   paragraph under a single shared background image.

## Missing evidence a designer will need

- **No app screenshots or device mockups exist in this repo** (expected pre-launch, but a
  redesign will need real or placeholder-disclosed device frames — none exist to source from
  today; asset inventory: `02-asset-inventory.md`).
- **No poet portrait assets** in this repo (see gap #1 above) — would need sourcing (with
  licensing care — these are historical figures, not the public-domain poetry text) or
  commissioning.
- **Canva asset state not re-verified this pass.** The 2026-07-14 audit (`docs/website-
  evolution-audit.md`) found a Canva folder ("Hamdam via Claude" → "raw") with 16 approved
  scene images and an "Hamdam Website Art Direction" deck; this pass did not have Canva
  access and could not confirm those assets are unchanged or that any have since been
  consumed (3 of them — dawn, norooz-morning, quiet-garden — are already in
  `src/assets/scenes/`, presumably drawn from that set). Re-verify directly before relying on
  it as a source of new imagery.
- **Live-site parity not checked.** All capture and baseline checks in this audit ran against
  the local dev server (`localhost:4321`) at commit `cca27ac`, not the deployed
  `hamdam.com.au`. The prior 2026-07-14 audit did check the live site; no reason to expect
  drift (deploy is on push to `main`) but this pass did not independently reconfirm it.

## Document index

| File | Contents |
|---|---|
| `01-content-inventory.md` | Every visible string on the site, tagged by claim category, with unsupported/inconsistent claims flagged |
| `02-asset-inventory.md` | Screenshots, mockups, brand assets, Canva/video/poet assets, licensing records found in-repo |
| `03-technical-inventory.md` | The 40-item technical audit (framework through perf config) |
| `04-north-star-gap-analysis.md` | Live screenshots vs. the two North Star PNGs, section by section |
| `05-baseline-results.md` | Exact `build`/`test`/`check:persian` output |
| `06-screenshot-index.md` | Every captured screenshot, indexed with a one-line description |

No redesign proposal is included anywhere in this set, per the audit-only scope.
