# Hamdam Website — Evolution Audit

Read-only audit. Nothing in this repo, Canva, GitHub, or Cloudflare was modified.
Audited 2026-07-14 against the deployed site at hamdam.com.au and the `main`
branch of `hamdam-website` at commit `2bf444e`.

## 1. Current technical structure

Astro 7 + Tailwind v4 (via `@tailwindcss/vite`), npm, Node ≥22.12. Static
build (`astro build`) served entirely from `dist/`; no server runtime. Pages:
`/`, `/privacy`, `/terms`, `/404`, and Farsi mirrors `/fa/`, `/fa/privacy`,
`/fa/terms`. Locale routing is prefix-based (`/fa/*`) driven by a pure
resolver in `src/lib/locale.js`. Design tokens live in two places: Tailwind
`@theme` in `src/styles/global.css` (source of truth for utility classes) and
`src/styles/tokens.css` (newer `--hamdam-*` custom properties, not yet fully
adopted — its own comment says so). Fonts are self-hosted (`@fontsource`,
Source Serif Pro + Vazirmatn), no third-party font CDN. `npm test` runs 60
Vitest cases; `npm run check:persian` byte-validates every Persian string and
is also wired as a `pre-commit` hook via `core.hooksPath`.

## 2. Deployment structure found in the repo

No `.github/` workflows — deployment is Cloudflare's git integration
(`wrangler.jsonc` maps `hamdam.com.au` and `www.hamdam.com.au` as custom
domains onto `./dist`, `not_found_handling: "404-page"`), triggered on push
to `main`, not GitHub Actions. `public/_headers` enforces a strict CSP
(`style-src 'self'`, no `unsafe-inline`), HSTS with preload, and long-cache
rules for `/_astro/*`, `/og/*`, `/badges/*`, `/icons/*`. No `_redirects`
file exists — confirmed by direct search.

## 3. Current functionality that must be preserved

Bilingual EN/FA with a working language toggle that round-trips path state;
correct RTL document semantics on `/fa/*` (`dir="rtl"`, Vazirmatn); the
scroll-driven cinematic sunrise hero with a full reduced-motion path; hreflang
alternates (en/fa/x-default); sitemap via `@astrojs/sitemap`; JSON-LD
`SoftwareApplication` schema with prices deliberately unpublished; OG/Twitter
metadata with locale-specific 1200×630 images; Smart App Banner and an
"App Store" badge gated behind `APP_STORE.RELEASED` (still `false`); the CSP
and all security headers; zero third-party trackers except Cloudflare Web
Analytics (privacy copy explicitly promises "no analytics" in the app, not
the site — worth double-checking that distinction stays clear); no forms
exist anywhere (none to preserve, none to add without a hard-constraint
review — "never collect emails/accounts").

## 4. Five highest-impact problems

1. **The homepage is visually empty.** Live screenshots at 390×844, 768×1024,
   and 1440×900 (both locales) show a ~8,700px scroll of almost entirely flat
   cream background between short text blocks — no photography, no imagery
   of any kind outside the hero's star field and small line icons. This
   directly contradicts the "restrained cinematic experience" direction by
   reading as unfinished rather than restrained.
2. **Farsi legal pages are English-language stub notices, not translations.**
   `/fa/privacy` and `/fa/terms` render `lang="fa" dir="rtl"` shells wrapping
   `lang="en" dir="ltr"` English placeholder text pointing back to `/privacy`
   and `/terms`. This is the one place "Farsi as equal, not afterthought"
   currently fails outright.
3. **Two colour-token systems, not reconciled.** `tokens.css` defines
   `--hamdam-saffron: #E8A03D`; `global.css`'s Tailwind theme defines
   `--color-saffron: #E8B04B` — different hex values for the same name,
   acknowledged in-code as a mid-migration state with no tracked completion
   date.
4. **Mail and canonical-domain hygiene still open at the DNS layer.**
   `www` and apex both serve independent 200s with no redirect; SPF only
   authorizes GoDaddy while MX is Microsoft 365; no DKIM. Tracked in
   `TODO-Ealia.md`, unresolved as of this audit — a real pre-launch risk for
   mail deliverability and duplicate-content SEO, but outside repo scope.
5. **No CI gate before deploy.** `npm test` and `check:persian` exist and
   run locally via a pre-commit hook, but nothing enforces them server-side —
   a bypassed hook (`--no-verify`) or a direct push reaches Cloudflare
   without any automated check.

## 5. Recommended visual thesis

Canva discovery found a folder ("Hamdam via Claude" → "raw") holding 16
generated scene images — `dawn`, `night`, `morning`, `afternoon`, `sunset`,
`mist`, `cloud`, `clear`, `rain`, `storm`, `quiet_garden`, `candlelight`,
`yalda_night`, `norooz_morning`, `chaharshanbe_suri`, `spring_bloom` — plus a
16-page deck titled "Hamdam Website Art Direction," all created 2026-07-13.
These map exactly onto the app's weather-driven palette states and its
Iranian-calendar cultural moments, which the homepage copy already names
("Yalda in December... Norooz in spring... Chaharshanbe Suri, Mehregan") with
no accompanying image. The thesis: give each of the site's empty sections a
low-opacity, edge-anchored scene image drawn from this set — rooted in
Hamdam's own approved art direction, not stock photography — rather than
adding more gradient blur orbs or generic imagery.

## 6. Recommended page structure

Keep the single long-scroll homepage (it already avoids generic SaaS card
rows). Pair sections with content-matched scenes: hero keeps its own
cinematic system untouched; "Iranian calendar" section ↔ `yalda_night` /
`norooz_morning` / `chaharshanbe_suri`; "meets you wherever you look" ↔
`quiet_garden` or `candlelight`; verse showcase ↔ `dawn`/`morning`. No new
routes needed — this is a treatment change, not an IA change. Fix the two FA
legal pages as real translations, independent of the imagery work.

## 7. Canva asset shortlist

- **16× `scene_<name>_selected.png`** (folder `raw`) — Generated image,
  candidate section backgrounds.
- **"Hamdam Website Art Direction"** (`DAHPViR88oI`, 16 pages) — Finished
  design; likely already specifies pairing/placement — review before building.
- **"Instagram"** (`DAHPQlwsN7s`, 1 page) — Uncertain; social-only, out of
  scope for the website.

## 8. Missing visual assets

No original Hamdam photographs, no app screenshots (expected — app hasn't
shipped), and no separate logo/brand-asset library in Canva (the mark and
wordmark already exist as coded SVG components, `PersianShamseh.astro` /
`HamdamLogotype.astro`, not as Canva files).

## 9. Implementation risks

CSP forbids inline styles and `assetsInlineLimit: 0` forbids inlined assets
— any new imagery must ship as real optimized files through the build, not
base64. The site currently has zero images outside OG/icons and passes
Lighthouse 96–98/100/100/100 with CLS 0; adding imagery changes that budget
and must be re-measured, not assumed safe. `sharp` is already a
devDependency, so an optimization path exists. The skill's own rule —
never place photography behind large text blocks without proven contrast —
rules out full-bleed-behind-copy treatments for the mostly-text sections;
edge/low-opacity placement is the safer default. Confirm RTL mirroring for
any directional scene content on `/fa/*`.

## 10. Acceptance criteria

Build clean; `npm test` and `npm run check:persian` pass; Lighthouse mobile
stays ≥95/100/100/100 on both `/` and `/fa/`; CLS stays <0.05; zero
console/CSP violations against the live `_headers`; keyboard nav, focus
rings, and reduced-motion behaviour unchanged; no inline styles introduced;
FA legal pages contain real, reviewed Farsi before any claim of bilingual
parity; no photograph placed behind text without a measured contrast check.

## 11. Exact files likely to change

`src/pages/index.astro`, `src/pages/fa/index.astro` (section markup),
probably a new `src/components/SceneBackground.astro`, `public/scenes/*`
(new optimized image assets), `src/styles/tokens.css` / `global.css` (only
if new image-layer tokens are needed — also the moment to reconcile the two
saffron values), `src/pages/fa/privacy.astro`, `src/pages/fa/terms.astro`
(real translation content), `docs/progress.md` (record the phase).

## 12. Safe to modify

Yes. Working tree is clean, `main` is up to date with `origin/main`, no
uncommitted changes, and the test suite / Persian byte-check / pre-commit
hook are all in place as guardrails for any implementation session.

---

STATUS: audit complete, no code changed
CURRENT BRANCH: main
WORKTREE CLEAN: YES
STACK: Astro 7 + Tailwind v4, npm, Cloudflare git-integrated deploy (no GitHub Actions)
BUILD COMMAND: npm run build
TEST COMMAND: npm test (Vitest) + npm run check:persian
CANVA ACCESS: YES
NORTH STAR FOUND: PARTIAL — app-level North Star exists in the hamdam-ios repo (`docs/design/north-star/`); no website-specific North Star doc, but the new "Hamdam Website Art Direction" Canva deck + 16 scene images now serve that role for the site
SAFE TO IMPLEMENT: YES
BLOCKERS: none in-repo; www/apex canonical redirect, SPF, and DKIM remain open in the Cloudflare/DNS dashboard, owned by Ealia
CONFIDENCE: high on repo, deployment, and live-functionality findings (direct inspection + live screenshots); medium on Canva asset fitness (classified by folder/name, not pixel-reviewed against the app's actual palette)
