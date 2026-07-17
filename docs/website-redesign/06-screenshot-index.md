# Hamdam Website — Screenshot Index

40 screenshots captured against the local dev server (`localhost:4321`, Astro dev, commit
`cca27ac`) using headless Chromium via Playwright, per the `webapp-testing` skill. All files
live in `baseline-screenshots/`.

## Methodology note — read this before interpreting the `_full.png` files

The homepage uses a scroll-triggered reveal system (`[data-reveal]`, `IntersectionObserver`
in `BaseLayout.astro`): most sections start at `opacity:0` in CSS and only become visible once
they've scrolled into the viewport. A naive Playwright `full_page=True` screenshot renders
the entire page height in one paint **without** scrolling through it first, so those
intersection callbacks never fire and most of the page renders blank. The first capture pass
hit exactly this (visible if you diff against `1440x900_en-home_full-scrolled-motion-enabled.png`,
kept below as the motion-enabled control). **All `*_full.png` files below were captured with
`reduced_motion: reduce` emulated**, which the site's own CSS (`global.css`) uses to force
`[data-reveal]` elements to `opacity:1` immediately — this is the accurate, complete-content
version of every page, not a workaround that changes what a real visitor sees on any
individual viewed section (it only skips the progressive stagger-in animation, which reduced-
motion visitors don't see anyway).

## Homepage, full page, all 6 required viewports × 2 locales (12 files)

| File | Viewport | Locale |
|---|---|---|
| `390x844_en-home_full.png` | 390×844 | EN |
| `390x844_fa-home_full.png` | 390×844 | FA |
| `430x932_en-home_full.png` | 430×932 | EN |
| `430x932_fa-home_full.png` | 430×932 | FA |
| `768x1024_en-home_full.png` | 768×1024 | EN |
| `768x1024_fa-home_full.png` | 768×1024 | FA |
| `1024x768_en-home_full.png` | 1024×768 | EN |
| `1024x768_fa-home_full.png` | 1024×768 | FA |
| `1440x900_en-home_full.png` | 1440×900 | EN |
| `1440x900_fa-home_full.png` | 1440×900 | FA |
| `1728x1117_en-home_full.png` | 1728×1117 | EN |
| `1728x1117_fa-home_full.png` | 1728×1117 | FA |

Each of these is the complete homepage top-to-footer at that width/locale — hero, verse
showcase, "what Hamdam is," five poets, Iranian calendar, "meets you wherever you look,"
privacy commitment, final CTA, and footer, all in one image.

## Legal pages, full page, mobile + desktop × 2 pages × 2 locales (8 files)

| File | Page | Viewport | Locale |
|---|---|---|---|
| `390x844_en-privacy_full.png` | Privacy | 390×844 | EN |
| `390x844_en-terms_full.png` | Terms | 390×844 | EN |
| `390x844_fa-privacy_full.png` | Privacy | 390×844 | FA (native translation) |
| `390x844_fa-terms_full.png` | Terms | 390×844 | FA (native translation) |
| `1440x900_en-privacy_full.png` | Privacy | 1440×900 | EN |
| `1440x900_en-terms_full.png` | Terms | 1440×900 | EN |
| `1440x900_fa-privacy_full.png` | Privacy | 1440×900 | FA (native translation) |
| `1440x900_fa-terms_full.png` | Terms | 1440×900 | FA (native translation) |

Captured at mobile + desktop only (not all 6 viewports) since these are long single-column
text documents with no responsive layout changes beyond text reflow — the two extremes cover
the meaningful range. All render correctly, RTL confirmed intact on the FA pair.

## Hero "as-loaded" state, motion enabled, unscrolled (4 files)

Documents exactly what a real first-time visitor with no reduced-motion preference sees
before scrolling — i.e. the true above-the-fold first impression, hero entrance animation
settled (~1.2s wait).

| File | Viewport | Locale |
|---|---|---|
| `390x844_en-home_as-loaded-unscrolled.png` | 390×844 | EN |
| `1440x900_en-home_as-loaded-unscrolled.png` | 1440×900 | EN |
| `390x844_fa-home_as-loaded-unscrolled.png` | 390×844 | FA |
| `1440x900_fa-home_as-loaded-unscrolled.png` | 1440×900 | FA |

## Cinematic hero, pinned timeline states via `?dawn=N` (10 files)

The hero's scroll-driven day/night timeline supports a `?dawn=N` query param
(`0`–`1`) that pins the animation at a specific progress point — built into the site
specifically for deterministic design-review screenshots (see the in-code comment in
`HeroCinematic.astro`). Used here to document night → dawn → morning without relying on
scroll-position timing.

| File | Viewport | Locale | Progress |
|---|---|---|---|
| `1440x900_en-home_dawn-0_hero.png` | 1440×900 | EN | 0 (night) |
| `1440x900_en-home_dawn-0.35_hero.png` | 1440×900 | EN | 0.35 (first light) |
| `1440x900_en-home_dawn-0.6_hero.png` | 1440×900 | EN | 0.6 (dawn) |
| `1440x900_en-home_dawn-1_hero.png` | 1440×900 | EN | 1 (morning) |
| `390x844_en-home_dawn-0_hero.png` | 390×844 | EN | 0 |
| `390x844_en-home_dawn-0.35_hero.png` | 390×844 | EN | 0.35 |
| `390x844_en-home_dawn-0.6_hero.png` | 390×844 | EN | 0.6 |
| `390x844_en-home_dawn-1_hero.png` | 390×844 | EN | 1 |
| `1440x900_fa-home_dawn-0_hero.png` | 1440×900 | FA | 0 |
| `1440x900_fa-home_dawn-1_hero.png` | 1440×900 | FA | 1 |

## Reduced-motion state (2 files)

Playwright's `reduced_motion: "reduce"` context emulation, hero only (viewport screenshot,
not full page — the full-page reduced-motion captures are the `_full.png` files above, which
all use this same emulation).

| File | Viewport | Locale |
|---|---|---|
| `1440x900_en-home_reduced-motion_hero.png` | 1440×900 | EN |
| `1440x900_fa-home_reduced-motion_hero.png` | 1440×900 | FA |

Confirms the static "morning" fallback (warm gradient sky, no stars, no text-shadow, no
entrance animation) fires correctly per `HeroCinematic.astro`'s `@media
(prefers-reduced-motion: reduce)` block.

## Motion-enabled, naturally scrolled full page — control image (1 file)

`1440x900_en-home_full-scrolled-motion-enabled.png` — captured by programmatically scrolling
through the page in ~900px steps (motion enabled, no reduced-motion emulation) before taking
the full-page screenshot, so every `[data-reveal]` element's `IntersectionObserver` fires
naturally, the same as a real visitor scrolling down. Kept as the control that proves the
`reduced_motion`-emulated `_full.png` captures show equivalent final content, not a
motion-preference-dependent difference — compare against `1440x900_en-home_full.png`.

## Language toggle close-ups (4 files)

| File | Viewport | Locale |
|---|---|---|
| `390x844_en-home_language-toggle.png` | 390×844 | EN (shows "فارسی") |
| `390x844_fa-home_language-toggle.png` | 390×844 | FA (shows "English") |
| `1440x900_en-home_language-toggle.png` | 1440×900 | EN |
| `1440x900_fa-home_language-toggle.png` | 1440×900 | FA |

There is no expandable/collapsible navigation menu anywhere on this site (no hamburger, no
dropdown) — the language toggle is the entire "navigation," a single fixed-position link that
round-trips the current path to the other locale. "Nav open/closed" from the audit brief is
therefore **not applicable** to this site; these close-ups substitute as the nearest
equivalent (confirming the toggle renders and labels correctly in both directions).

## Error / broken state (2 files)

| File | Viewport | Notes |
|---|---|---|
| `1440x900_404-error_full.png` | 1440×900 | `/this-page-does-not-exist` → HTTP 404, renders the site's own styled not-found page ("This page has wandered off"), not a raw server error |
| `390x844_404-error_full.png` | 390×844 | Same route, mobile width |

No other broken/error state was discovered during capture (no missing-image placeholders, no
console errors observed, no layout breaks at any of the 6 required viewports).

## Not captured / not applicable

- **Nav open/closed** — no expandable nav exists (see language-toggle note above).
- **Live production site (`hamdam.com.au`)** — all capture was against the local dev server
  per the audit brief's "do not alter code to make the audit easier... run using the
  repository's documented commands" instruction (`npm run dev`); not independently
  re-confirmed against the deployed site this pass (noted as an open item in
  `00-current-state-audit.md`).
