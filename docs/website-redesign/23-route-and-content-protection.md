# Hamdam Website Redesign: Route and Content Protection

Enumerates every route, file, and content item that must survive the redesign unchanged, per
the repository safety rules ("preserve valid redirects," "preserve domain verification
files," "do not remove content without recording it," "preserve privacy, terms, support and
contact routes"). Anything not listed here is fair game for the redesign, subject to the
rest of the plan set.

## Route verification method (this correction)

Every route below was re-verified directly against `src/pages/**` on branch `main`, commit
`ce98883`, by listing the file tree and reading each file's frontmatter/path declaration —
not inferred from prior documents. The file tree is exactly seven files:

```
src/pages/404.astro
src/pages/fa/index.astro
src/pages/fa/privacy.astro
src/pages/fa/terms.astro
src/pages/index.astro
src/pages/privacy.astro
src/pages/terms.astro
```

Astro's file-based routing maps these to exactly seven routes, no more and no fewer. A
prior response referenced a route that does not exist in this repository in any form; no
such route (or anything resembling it) is present in `src/pages`, in `astro.config.mjs`, or
in any redirect configuration (none exists, see "Redirects" below). It is not carried
forward into this document. The list below is the complete, exact, re-verified set.

## 1. Existing protected routes (must resolve identically after the redesign)

| Route | Source file | Protection level | Notes |
|---|---|---|---|
| `/` | `src/pages/index.astro` | Content protected, presentation redesigned | This is the redesign's actual target; "protected" here means the URL, not the layout |
| `/fa/` | `src/pages/fa/index.astro` | Content protected, presentation redesigned | Same |
| `/privacy` | `src/pages/privacy.astro` | Fully protected | Legal content, not part of the redesign scope; homepage §8 references it but never duplicates it |
| `/fa/privacy` | `src/pages/fa/privacy.astro` | Fully protected | Native FA translation (confirmed non-machine-translated as of `cca27ac`); never hand-edited |
| `/terms` | `src/pages/terms.astro` | Fully protected | Legal content |
| `/fa/terms` | `src/pages/fa/terms.astro` | Fully protected | Native FA translation |
| `/404` | `src/pages/404.astro` | Fully protected | Verified in the baseline audit to return a real HTTP 404 with the site's own not-found page, not a raw platform error; redesign may apply new tokens for visual consistency but must not change its content or status behaviour |

These seven are the complete route set. No eighth route, and no route under any other path
shape, exists in the repository.

## 2. Missing but recommended routes (not present, not created by this document)

Two gaps observed, neither created or scaffolded here (route source files are not modified
by this planning correction):

- **No dedicated `/support` or `/contact` route.** Support is handled entirely by a
  `mailto:` link (see §3 below), which is a valid, functioning pattern for a pre-launch
  static site with no ticketing need, but is worth Ealia's awareness as a gap if support
  volume ever justifies a dedicated page (FAQ, response-time expectation, etc.). Not
  required by any binding redesign document; recorded as an observation, not a requirement.
- **No Farsi-specific 404 route (no `/fa/404` or locale-aware 404 rendering).** `404.astro`
  hardcodes `lang="en"` and English-only copy ("This page has wandered off," "Return to the
  beginning," "Back to Hamdam"); a Farsi-speaking visitor who hits a broken `/fa/*` URL sees
  an English-only not-found page. This is an existing-state gap, not something introduced by
  the redesign, and is recorded here as a recommendation for Ealia to consider (likely a
  small, separate scoped task: detect `/fa/` in the referrer or requested path and render a
  localised 404), not as an in-scope item for this plan's Phases 1 through 13.

## 3. Footer mailto behaviour

Verified directly in `src/components/Footer.astro`: two `mailto:developer@hamdam.com.au`
links exist, both in the footer — one in the nav row (label "Contact") and one in the legal
block ("For support, contact developer@hamdam.com.au"). Both must survive the redesign
verbatim (same address, both instances), per page spec §11 item 3's footer nav row
(Privacy, Terms, Support-as-mailto, language toggle).

## 4. 404 behaviour

`src/pages/404.astro` renders a real, styled not-found page (not a raw platform error),
confirmed in the baseline audit returning an actual HTTP 404 status. It is English-only
throughout (see §2's gap note above) and links back to `/`. One pre-existing observation,
unrelated to any item in this correction and not actioned here since it is source code: the
page's `<title>` reads `"Page not found — Hamdam"`, which contains an em dash (U+2014).
This predates the redesign entirely and is a pre-existing violation of the site's own
no-em-dash rule and of acceptance criterion C7 (grep for U+2013/U+2014 in rendered HTML).
It is noted here for visibility, not fixed, since fixing it is a source-code change and this
response modifies only planning documents 20 through 27. Phase 11 or Phase 13's grep pass
will surface it on its own; this note just means it should not be a surprise when that grep
finds a pre-existing hit outside the redesign's own new copy.

## 5. English and Farsi route relationships

Every EN route has exactly one FA mirror, at the `/fa` prefix, except `/404`, which has none
(see §2). The relationship is enforced in code by `src/lib/locale.js`
(`switchLocalePath`), not by convention alone: `resolveLocaleFromPath` treats any path
starting with `/fa` (or exactly `/fa`) as the FA locale, everything else as EN;
`switchLocalePath` strips or adds the `/fa` prefix symmetrically, mapping `/` to `/fa/` (not
`/fa`, the trailing slash is deliberate) and `/privacy` to `/fa/privacy`, `/terms` to
`/fa/terms`, and the reverse. This is the single source of truth for the EN/FA route
relationship and must not be forked or duplicated by any new redesign component; the
language toggle (Phase 2) consumes this function, never reimplements the mapping.

| EN route | FA route | Relationship |
|---|---|---|
| `/` | `/fa/` | Mirror pair |
| `/privacy` | `/fa/privacy` | Mirror pair, native translation |
| `/terms` | `/fa/terms` | Mirror pair, native translation |
| `/404` | none | No mirror; EN-only (§2 gap) |

## No domain verification files present (confirmed, not assumed)

Checked `public/` in full: no `apple-app-site-association` file and no `.well-known/`
directory exist in this repo. There is no universal-links configuration to preserve, which is
consistent with the site's only App Store integration point being outbound links plus the
Smart App Banner meta tag (not universal links). If a future phase (outside this redesign's
scope) adds universal links, that is a new capability, not a protection item for this plan.

## Protected non-route files

| File | Why protected |
|---|---|
| `public/_headers` | CSP, HSTS, security headers, cache-control rules for `/_astro/*`, `/og/*`, `/badges/*`, `/icons/*`. The redesign must not weaken CSP (no `unsafe-inline` additions, per acceptance criterion G6) and must not remove any existing cache-control block. If new asset directories are introduced (for example a new `/scenes/*` or similar path for the fifteen Canva assets, per the reconciled count in `20-implementation-plan.md`), an equivalent cache-control block should be added, additively, never replacing an existing one |
| `public/robots.txt` | Blocks GPTBot, ChatGPT-User, CCBot, anthropic-ai, Claude-Web explicitly; allows everything else; points to the sitemap. Preserve verbatim unless Ealia explicitly changes crawler policy |
| `public/site.webmanifest` | PWA manifest; preserve unless the redesign changes app icons or theme colour, in which case update in place, never remove |
| `public/favicon.ico`, `public/favicon.svg`, `public/icons/icon-{192,512,source-1024}.png` | Preserve; only replace if a Canva/design asset explicitly supersedes them with Ealia's approval (none currently specified in `14-canva-asset-brief.md`) |
| `public/badges/app-store-badge.svg` | The one official Apple badge asset already in the repo, currently dormant pre-release. Conversion spec §12 is explicit: "Official Apple badge artwork only... never redrawn, recoloured, distorted or animated." This exact file is the one to use in Phase 9's ceremony and Phase 2's post-release nav CTA; never generate a substitute |
| `public/og/hamdam-dawn-{,fa-}1200x630.jpg` | Existing Open Graph images; preserve unless a redesign-specific OG image is explicitly commissioned and approved (none specified currently) |
| `astro.config.mjs` | `site` URL, sitemap i18n config, `assetsInlineLimit: 0`, `inlineStylesheets: 'never'` — the last two are CSP-driven and load-bearing; changing either would require a corresponding CSP change, which is out of scope for this redesign |
| `wrangler.jsonc` | Cloudflare Pages config: asset directory, custom domains (`hamdam.com.au`, `www.hamdam.com.au`), `workers_dev: false`. Never touch (hosting platform change is explicitly forbidden by the architecture rules) |
| `.gitignore` | Reserves `.env`/`.env.production` for future use even though unused today; no reason to touch |
| `tsconfig.json` | Extends `astro/tsconfigs/strict`; no reason to touch |

## Redirects

No redirect rules exist in the current repository (no `_redirects` file found in `public/`,
no redirect block in `wrangler.jsonc`). There is nothing to preserve in this category beyond
confirming none is silently introduced with a routing error (for example, if any homepage
anchor link changes from a hash target to a full route during the redesign, that must not
orphan any inbound link that might already be shared, though none are known to exist for a
pre-launch site).

## Analytics preservation

The current analytics state is a live, twice-audited, still-open contradiction (see
`26-analytics-plan.md` for the full decision record): the homepage claims "No analytics," the
Privacy Policy claims "no third-party analytics" (naming specific SDKs, silent on Cloudflare),
and the CSP permits `static.cloudflareinsights.com`/`cloudflareinsights.com`, yet zero beacon
script exists anywhere in `src/`. "Preserve analytics" in this context means: do not silently
resolve this contradiction in either direction. The redesign must not add a beacon script
without Ealia's explicit approval, and must not strengthen the "No analytics" claim's wording
without confirming the Cloudflare dashboard's actual toggle state first. This file is the
authority for what "protection" means here; `26-analytics-plan.md` carries the decision
record itself.

## Environment variable handling

There are no environment variables in this repository today (confirmed: zero
`import.meta.env`/`process.env` references in `src/`, no `.env*` file present). This redesign
introduces none. The `.gitignore` entries for `.env`/`.env.production` stay as defensive
infrastructure for a future need, not evidence that one exists now. If a future phase needs a
build-time secret (none anticipated for a static marketing site with no analytics API keys
and no backend), it would be introduced via Cloudflare Pages' own environment variable
dashboard feature, never committed to the repository, and documented as a new decision at
that time.

## Content removal record

No content is removed by this redesign as specified in `10` through `17`. Page spec's own
"Page structure decision" is explicit: "All twelve candidate sections are retained; none is
dropped," with two sections merged (not deleted) into others for focal-point reasons (Your
Journey insights merges into §6; Free/Plus value merges with Lifetime Founding Companion into
§9). If any component listed as a redesign-time removal candidate in
`21-component-map.md` (`VerseShowcase.astro`, `SectionDivider.astro`) is confirmed unused and
actually deleted at Phase 13, that deletion is recorded in `18-acceptance-results.md` at the
time it happens, per the "do not remove content without recording it" rule; neither is
deleted in this plan itself.

## Existing test and quality gates (preserve, do not weaken)

| Gate | Mechanism | Must survive |
|---|---|---|
| `npm run test` | Vitest, 60 existing tests | All 60 pass at every phase; new tests added, none removed or weakened |
| `npm run check:persian` | `scripts/check-persian.mjs`, pre-commit-hooked via `core.hooksPath` | Passes at every commit; the pre-commit hook itself is not bypassed (`--no-verify` never used) |
| `npm run build` | `astro build`, zero warnings baseline | Stays zero-warning; 7 routes today, more only if a route is intentionally added (none planned) |
