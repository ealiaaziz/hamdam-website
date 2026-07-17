# Hamdam Website — Technical Inventory

Direct inspection of the repo at commit `cca27ac867c1c3ad9b9a064dbffe2a62cb6867f5`. Numbered
to match the audit brief's 1–40 list.

**1. Framework and version** — Astro `^7.0.5` (installed: 7.x per `package-lock.json`),
static output mode (`[build] output: "static"` confirmed in build log).

**2. Package manager** — npm (`package-lock.json` present, no `yarn.lock`/`pnpm-lock.yaml`).

**3. Build commands** — `npm run build` → `astro build`. Verified: succeeds, 7 pages, ~1.1s,
zero warnings. Full log: `05-baseline-results.md`.

**4. Test commands** — `npm test` → `vitest run`. Verified: 60/60 passed across 4 files
(locale, cinematic, reveal, appStore unit tests in `src/lib/__tests__/`).

**5. Lint commands** — **None defined.** `package.json` scripts are: `dev`, `build`,
`preview`, `astro`, `test`, `check:persian`, `prepare`. No `lint`, `typecheck`, or `format`
script exists, and no ESLint/Prettier config files were found at the repo root. TypeScript is
used (`tsconfig.json`, `"type": "module"`) but there is no standalone `tsc --noEmit` script —
type-checking happens implicitly via `astro check`/`astro build`'s internal Astro
type-generation step (`[types] Generated` in the build log), not a dedicated command.

**6. Hosting and deployment configuration** — Cloudflare Pages/Workers via `wrangler.jsonc`:
`assets.directory: "./dist"`, `not_found_handling: "404-page"`, `workers_dev: false`, custom
domain routes for `hamdam.com.au` and `www.hamdam.com.au`. No `.github/workflows/` — deploy
is triggered by Cloudflare's git integration on push to `main`, not GitHub Actions. No CI gate
runs `npm test`/`check:persian` before deploy (they run locally via the pre-commit hook only).

**7. Routing structure** — File-based Astro routing. Prefix-based locale routing: `/` = EN
root, `/fa/*` = Farsi mirror. Pure resolver in `src/lib/locale.js`
(`resolveLocaleFromPath`, `switchLocalePath`) drives both the language toggle and hreflang
tags from one source of truth — no duplicated routing logic.

**8. Page structure** — 7 static pages: `/`, `/privacy`, `/terms`, `/404` (all EN); `/fa/`,
`/fa/privacy`, `/fa/terms` (Farsi mirrors). Single-long-scroll homepage, no sub-navigation.

**9. Reusable component structure** — 13 components in `src/components/`: `AppStoreBadge`,
`FeatureIcon`, `Footer`, `HamdamLogotype`, `HeroCinematic`, `LanguageToggle`, `LegalSection`,
`PersianShamseh`, `PoetCard`, `SceneBackground`, `SectionDivider`, `VerseCard`,
`VerseShowcase`. Legal pages (`privacy.astro`/`terms.astro`, both locales) share
`LegalSection` for consistent heading/spacing treatment.

**10. Styling system** — Tailwind CSS v4 via `@tailwindcss/vite` (no separate PostCSS config
needed under v4). Two token layers: `src/styles/tokens.css` (`--hamdam-*` custom properties,
consumed by the cinematic hero) and the Tailwind `@theme` block in `src/styles/global.css`
(source of truth for utility classes like `bg-cream`, `text-indigo`). **These two systems are
now reconciled** — both define saffron as `#E8B04B` (confirmed by direct inspection of both
files) — resolving the prior 2026-07-14 audit's finding of a two-value mismatch (commit
`4be55c5`, "reconcile colour tokens").

**11. Typography** — Source Serif Pro (EN, self-hosted via `@fontsource`) + Vazirmatn (FA,
self-hosted via `@fontsource`). No system-font-only fallback path in normal use; `--font-sans`
exists as a system-stack token but is only used for the pill CTA's small eyebrow text.
Per-locale `<link rel="preload">` for the above-the-fold font files, keyed to the actual
hashed `@fontsource` URLs so preloads can't silently drift from the bundled files.

**12. Current colours and design tokens** — From `global.css` `@theme`: `--color-cream:
#F4EDD8`, `--color-indigo: #1B1B3A`, `--color-saffron: #E8B04B`, `--color-saffron-ink:
#7F6029` (AA-contrast text variant, 4.98:1 on cream per in-code comment), `--color-ember:
#D07B3F`, `--color-mist-amber-grey: #C98F45`, `--color-night-gold: #F0C878`, `--color-peach:
#F4C6A8`. Matching `--hamdam-*` tokens in `tokens.css` plus dark-mode overrides
(`prefers-color-scheme: dark` swaps `--hamdam-text`/`--hamdam-bg`). Spacing:
`--spacing-section-desktop: 140px`, `--spacing-section-mobile: 90px`. Radius:
`--radius-card: 16px`, `--radius-button: 12px`.

**13. Animation libraries** — None. All animation is hand-written CSS (`@keyframes
hero-rise`, `.animate-breathe`) plus vanilla JS driving CSS custom properties (no GSAP,
Framer Motion, or similar). Scroll-linked hero timeline: `src/lib/cinematic.js` (pure
functions, unit-tested) + a `<script>` block in `HeroCinematic.astro` that reads scroll
position and writes CSS variables via `requestAnimationFrame`, throttled with a `ticking`
flag. Reveal-on-scroll: `src/lib/reveal.js` + `IntersectionObserver` in `BaseLayout.astro`.

**14. Existing 3D or canvas code** — None. The "star field" in the hero is inline SVG
`<circle>` elements at deterministic build-time positions (seed 42), not canvas/WebGL.

**15. Image and video pipeline** — `astro:assets` `<Image>` component for the three scene
JPGs (auto-converted to WebP at build, confirmed in build log:
`/_astro/*.webp ... (reused cache entry)`). OG images generated separately via
`scripts/generate-og.mjs` (headless Chrome render + Sharp), not part of the Astro build step.
`sharp` is a devDependency. No video pipeline exists (no video assets, per
`02-asset-inventory.md`).

**16. Internationalisation** — Custom-built, not an Astro i18n integration. `src/lib/
locale.js` is the single source of truth (`LOCALES`, `LOCALE_META`, `resolveLocaleFromPath`,
`switchLocalePath`, `detectPreferredLocale`), unit-tested in isolation. `@astrojs/sitemap`'s
`i18n` option is configured with matching locale codes (`en-AU`/`fa`) so the generated
sitemap reflects the same locale set.

**17. English and Farsi support** — Full parity at the routing and rendering level: every EN
route has a working FA mirror, both legal pages now carry native Farsi content (not MT
stubs — see `00-current-state-audit.md`). FA landing-page copy is centralized in
`src/data/siteCopy.ts` (marked "extracted byte-exact from the previously approved /fa landing
page... do not hand-edit").

**18. RTL behaviour** — `dir="rtl"` set at the `<html>` level for `lang="fa"` via
`LOCALE_META.fa.dir` (not simulated with `text-align` alone). Logical CSS properties used
throughout (`inset-inline-start`, `end-6`, `pr-6` vs `pl-6` handled via Tailwind logical
utilities like `pr-6`→ actually the codebase uses `space-x`-free, `end`/`start`-based
utilities in `LanguageToggle.astro` `top-6 end-6` and `Footer`/legal pages use `pr-6`/`pl-6`
directly per-locale file rather than logical `ps-6`). `.scene-bg img` mask gradient direction
flips via the `:dir(rtl)` CSS pseudo-class rather than a per-call side prop, confirmed in
`global.css` lines 116–123.

**19. Accessibility structure** — Skip-to-content link (localized text per locale), visible
`:focus-visible` outline using the AA-contrast `saffron-ink` token (in-code comment explains
why: raw saffron is only 1.8:1 on cream, below the 3:1 an indicator needs), 44px minimum
touch targets on footer/nav links (`min-h-[44px]`), `aria-hidden` on decorative SVGs,
`aria-label`s on the language toggle and coming-soon badge. `prefers-reduced-motion: reduce`
is respected in three separate places: `[data-reveal]` (global.css), the hero's static
morning fallback (`HeroCinematic.astro`), and `.animate-breathe`.

**20. SEO metadata** — Per-page `<title>`/`<meta name="description">`, canonical URL, hreflang
alternates (en/fa/x-default), `theme-color`, `apple-itunes-app` meta (Smart App Banner) keyed
to the real App Store ID. `@astrojs/sitemap` generates `sitemap-index.xml` at build (confirmed
in build log).

**21. Social metadata** — Open Graph (`og:type`, `site_name`, `title`, `description`, `url`,
`image` + width/height, `locale` + `locale:alternate`) and Twitter Card
(`summary_large_image`) on every page via `BaseLayout.astro`, with locale-specific 1200×630
images now present (see `02-asset-inventory.md`).

**22. Structured data** — JSON-LD on `/` (`SoftwareApplication`, prices deliberately
unpublished, `offers.price: "0"` for the free tier only), `/privacy`
(`PrivacyPolicy`), `/terms` (`TermsAndConditions`). No `FAQPage`, `Review`, or `Organization`
schema found — matches the "no fake reviews/awards" constraint by omission.

**23. Analytics** — See the flagged ambiguity in `01-content-inventory.md`: CSP permits
Cloudflare Web Analytics' domains, `docs/progress.md` says it was "unblocked," but no beacon
script exists in the source (grepped, zero hits) — Cloudflare Web Analytics is dashboard-
toggled and edge-injected, so its actual live state is unconfirmable from this repo.

**24. Cookie or consent behaviour** — None. No cookies are set by any code in this repo (Privacy
Policy §2 states this explicitly: "No cookies — this website is fully static"). No consent
banner/mechanism exists or is needed on that basis.

**25. App Store links** — `src/lib/appStore.js`: `APP_STORE.ID = '6784461990'`,
`APP_STORE.RELEASED = false`, `APP_STORE.COUNTRY = 'au'`. `appStoreUrl(lang)` builds
`https://apps.apple.com/au/app/id6784461990` (with `?l=fa` for Farsi) but this URL is **not
currently rendered anywhere** — `AppStoreBadge.astro` only renders it when `RELEASED` is
`true`; today every CTA shows the static "Coming soon" pill instead.

**26. Privacy route** — `/privacy` (EN), `/fa/privacy` (FA, native translation as of the
current HEAD commit). Both real, substantive content — not placeholders.

**27. Terms route** — `/terms` (EN), `/fa/terms` (FA, native translation as of the current
HEAD commit). Same status.

**28. Support route** — No dedicated `/support` page. Support is `mailto:
developer@hamdam.com.au`, linked from the footer on every page and from Privacy §11/Terms
§16.

**29. Contact route** — No dedicated `/contact` page; same `mailto:` link serves as the sole
contact mechanism, footer-present sitewide.

**30. Existing pricing and subscription claims** — No specific price is stated anywhere on
the site (JSON-LD `offers.price: "0"` covers only the free tier). Terms §3 describes
trial/family-sharing/auto-renewal *mechanics* without naming dollar figures — see
`01-content-inventory.md` for the full breakdown and the note that this can't be cross-checked
against the locked $3.99/$39.99/$229.99 AUD tiers since no site copy states them.

**31. Existing app screenshots** — None exist in this repo (expected pre-launch).

**32. Existing device mockups** — None exist in this repo.

**33. Existing brand assets** — Mark and wordmark are coded SVG/text components, not exported
image files; no separate brand-asset library found (see `02-asset-inventory.md`).

**34. Existing Canva exports** — Three scene JPGs in `src/assets/scenes/` appear to originate
from a Canva-generated set per the prior audit's account; not independently re-verified
against live Canva in this pass.

**35. Existing video assets** — None found anywhere in the repo.

**36. Existing poet or cultural assets** — None; poet and cultural-moment content is
text-only except for the single `norooz-morning-section.jpg` background (see
`02-asset-inventory.md`).

**37. Asset licensing or attribution records** — No standalone licensing file; attribution is
inline prose in the legal pages only (Ganjoor.net for poetry text). No per-image credit/EXIF
metadata was checked for the three scene JPGs.

**38. Environment variable names** — **None found.** No `.env*` file exists at the repo root
(confirmed via direct listing), and no `import.meta.env.*` / `process.env.*` reference was
found in any `src/` file during this inspection. The site has no build-time or runtime
secrets to name.

**39. Security headers** — `public/_headers` (Cloudflare Pages headers file), applied
site-wide (`/*`): `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`,
a full `Content-Security-Policy` (`default-src 'self'`, `script-src 'self'
https://static.cloudflareinsights.com`, `style-src 'self'` — no `unsafe-inline`, `img-src
'self' data:`, `font-src 'self'`, `connect-src 'self' https://cloudflareinsights.com`,
`frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), camera=(),
microphone=(), payment=()`. Route-specific long-cache rules for `/_astro/*`, `/og/*`,
`/badges/*`, `/icons/*`.

**40. Performance-related configuration** — `assetsInlineLimit: 0` and `inlineStylesheets:
'never'` in `astro.config.mjs` (both CSP-driven, not perf-driven per se, but they do force
real cacheable files instead of inlined base64/CSS). Immutable long-cache headers for hashed
`/_astro/*` assets (see §39). `scroll-behavior: smooth` set globally. No explicit image
`loading="lazy"` audit was performed on the three scene images (`astro:assets` `<Image>`
defaults may already handle this — not independently confirmed this pass). No Lighthouse run
was performed in this audit pass (the prior 2026-07-14 audit recorded 96–98/100/100/100
mobile scores on both locales, in-repo tooling has no Lighthouse script to reproduce that
number here — see `05-baseline-results.md`).
