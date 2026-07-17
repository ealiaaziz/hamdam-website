# Hamdam Website — Asset Inventory

Catalogue of every visual asset physically present in this repository (`public/` and
`src/assets/`), plus what's known from external systems (Canva) via the prior 2026-07-14
audit — not re-verified with live Canva access in this pass, flagged as such.

## Images in `public/` (served as-is, not build-processed)

| File | Purpose | Notes |
|---|---|---|
| `public/favicon.ico`, `public/favicon.svg` | Browser tab icon | |
| `public/icons/icon-192.png` | Webmanifest icon | |
| `public/icons/icon-512.png` | Webmanifest icon | |
| `public/icons/icon-source-1024.png` | Source icon, presumably the master the two above are generated from | From the "real app icon" per `docs/progress.md` |
| `public/badges/app-store-badge.svg` | Official App Store badge | Only rendered once `APP_STORE.RELEASED = true`; currently dormant |
| `public/og/hamdam-dawn-1200x630.jpg` | English Open Graph / Twitter card image | Generated via `scripts/generate-og.mjs` (Chrome render + Sharp) |
| `public/og/hamdam-dawn-fa-1200x630.jpg` | Farsi Open Graph / Twitter card image | Same pipeline, FA variant. **Resolves the prior 2026-07-14 audit's "OG image blocked on Higgsfield credits" finding — both now exist.** |
| `public/site.webmanifest` | PWA manifest metadata (not a PWA shell — no service worker found) | |

No app screenshots, no device mockups (iPhone/Watch frames), no marketing hero photography,
no video assets, and no poet portrait images exist anywhere in `public/` or `src/assets/`.

## Images in `src/assets/scenes/` (build-processed via `astro:assets`, optimized to WebP)

| File | Used in | Treatment |
|---|---|---|
| `dawn-section.jpg` | Verse showcase section background (`VerseShowcase.astro`, both `/` and `/fa/`) | 25% opacity, edge-anchored, `hidden` below `sm` breakpoint |
| `norooz-morning-section.jpg` | "Iranian calendar" section background | Same treatment |
| `quiet-garden-section.jpg` | "Quiet intelligence" (Siri/widget/Watch/Health/Music) section background | Same treatment |

These three are the entirety of the site's photography. Sourced (per the 2026-07-14 audit)
from a Canva folder of 16 generated scene images matching the app's weather/calendar palette
states — only 3 of the 16 have been brought into the repo so far. Not re-verified against
live Canva in this pass.

## Brand marks (coded, not image files)

| Component | What it is |
|---|---|
| `src/components/PersianShamseh.astro` | The Hamdam mark — an inline SVG rotated-square (8-point star / shamseh motif), parameterized by size/color/opacity/animation. Not a raster logo file. |
| `src/components/HamdamLogotype.astro` | Wordmark ("Hamdam" / "همدم") as styled text + optional `PersianShamseh`, not an image. |

No separate logo/brand-asset library (e.g. an SVG/PNG export set) exists in this repo — the
mark and wordmark are defined entirely as code, consistent with the prior audit's finding
that there is "no separate logo/brand-asset library in Canva."

## Poet assets

**None exist.** `src/data/poets.ts` is pure text (Persian name, transliteration, one-line
description). No portrait, illustration, or likeness for any of the five poets (Hafez, Rumi,
Saadi, Khayyam, Parvin Etesami) is present anywhere in this repo. This is the largest single
asset gap relative to the North Star (see `04-north-star-gap-analysis.md` §1), which shows a
large photographic/painted portrait treatment for featured poets in the app's Discover tab.

## Cultural-moment assets

Only `norooz-morning-section.jpg` exists as a named cultural-moment image. Yalda,
Chaharshanbe Suri, Mehregan, and Sizdah Bedar — all named in the homepage copy — have no
corresponding imagery in this repo, despite the (unverified this pass) Canva set reportedly
containing `yalda_night`, `chaharshanbe_suri`, and others by name per the 2026-07-14 audit.

## Video assets

None found in `public/`, `src/`, or referenced in any `.astro`/`.ts`/`.js` file.

## Licensing / attribution records

No standalone `LICENSE`, `NOTICE`, or `ATTRIBUTIONS` file exists in the repo. All
attribution is inline prose in `src/pages/privacy.astro` §1.5/§5 and `src/pages/terms.astro`
§5.1/§15: Persian poetry text credited to Ganjoor.net as public-domain source; English
translations and curation credited as original work; HAMDAM™ and app IP credited to Seyed
Valiallah Azizollahi (see the name-discrepancy flag in `01-content-inventory.md`). No
per-image licensing metadata exists for the three scene JPGs (no EXIF/credit-line check
performed — out of scope for a repo-only pass, and the prior audit's "no images exist" note
for EXIF is now stale given these three scene files, worth a follow-up check).

## Canva state (external system, not re-verified this pass)

Per the 2026-07-14 audit (`docs/website-evolution-audit.md` §5–8), a Canva folder "Hamdam via
Claude" → "raw" held 16 generated scene images (`dawn`, `night`, `morning`, `afternoon`,
`sunset`, `mist`, `cloud`, `clear`, `rain`, `storm`, `quiet_garden`, `candlelight`,
`yalda_night`, `norooz_morning`, `chaharshanbe_suri`, `spring_bloom`) plus a 16-page
"Hamdam Website Art Direction" deck (`DAHPViR88oI`), all created 2026-07-13. This audit did
not have live Canva access and cannot confirm this set is unchanged, fully consumed, or still
the intended source for further imagery — **re-verify directly before treating it as
current** rather than trusting this secondhand record.
