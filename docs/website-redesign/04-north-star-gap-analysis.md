# Hamdam Website — North Star Gap Analysis

Direct visual comparison of the live website (screenshots in `baseline-screenshots/`,
indexed in `06-screenshot-index.md`) against the two North Star mockup images in
`hamdam-ios/docs/design/north-star/`: `Designer (2).png` (Today / Discover / Reflections /
Roots / Your Hamdam app screens) and `Designer (3).png` (empty states, reflection-completion
ceremony, and the "Claude Code Prompt — Phase 1 Implementation" design-principles panel).
Both were inspected directly as images, not summarized secondhand. No redesign proposal is
included here — gaps only, per the audit-only scope.

**A framing note before the gaps:** the North Star's own design-principles panel (bottom
third of `Designer (3).png`) states the *website* should not simply clone the app's full-
bleed treatment wholesale — the audit brief itself instructs "full-bleed photographic imagery
must not become the default structural background across the page" for the site specifically.
So the gaps below are not "make the website full-bleed like the app" — they're places where
the site currently falls short of even a *restrained, framed* version of the app's warmth,
per this repo's own `.claude/skills/hamdam-web-director/SKILL.md` ("Prefer original Hamdam
photographs... use photography selectively, as an emotional layer, not decoration").

## 1. No poet portraiture — the single largest asset gap

**North Star:** The Discover screen's "Featured Poets" card shows a large photographic/
painted portrait of Rumi (turbaned, ornate robe) alongside his quote, in a horizontally-
swipeable carousel (dot indicators visible for 3 poets).

**Live site:** `PoetCard.astro` (see `1440x900_en-home_full.png`, "Five poets, five voices"
section) is a plain rounded card with the Persian name in large type, a transliteration
label, and a one-line italic description — zero imagery, for any of the five poets. This is
not a framing/treatment gap, it's a missing-asset gap: no portrait exists in the repo for any
poet (`02-asset-inventory.md`).

## 2. Photography is present but marginal, and absent on mobile entirely

**North Star:** Every screen shown — Today, Discover, Reflections, Roots, and all four empty
states in `Designer (3).png` — has a full-frame or large-format photographic/illustrative
background. The design-principles panel names this explicitly: "Full-bleed atmospheric
backgrounds... Photo-driven Reflections... Cultural richness in Roots."

**Live site:** Only 2 of the homepage's 7 sections (Iranian calendar, Quiet intelligence)
carry any imagery at all, each a single JPG at 25% opacity, edge-anchored to one side,
`hidden` below the `sm` Tailwind breakpoint (confirmed in `SceneBackground.astro` and visible
directly in `390x844_en-home_full.png`, which has zero photography anywhere below the hero).
The hero itself is not photographic — it's a CSS gradient sky with an SVG star field and a
CSS circle sun (`HeroCinematic.astro`), which is a deliberate, defensible engineering choice
(deterministic, CSP-safe, zero image weight) but reads very differently from the North Star's
photographic hero. Compare `1440x900_en-home_full.png` (mostly flat cream between text
blocks) against the density of imagery in `Designer (2).png`'s Today screen.

## 3. Cultural moments lost their individual identity

**North Star:** The Roots screen gives Norooz, Yalda Night, and Chaharshanbe Suri each their
own card with distinct photography (cherry blossoms for Norooz, pomegranate-and-candle for
Yalda, implied fire imagery for Chaharshanbe Suri) and a day-countdown.

**Live site:** The "Iranian calendar breathes through Hamdam" section names five moments
(Yalda, Norooz, Chaharshanbe Suri, Mehregan, Sizdah Bedar) in one continuous paragraph, over
one shared background image (`norooz-morning-section.jpg`) that doesn't change per moment.
No countdown, no per-moment visual distinction. See `1440x900_en-home_full.png` "Iranian
calendar" section vs. the Roots screen in `Designer (2).png`.

## 4. Typography — directionally aligned, not a major gap

**North Star:** Headlines read as an editorial serif (e.g. "Discover," poet names) with
sans-serif or lighter-weight body/meta text; Persian verse text in a clean, generously-spaced
Arabic-script face.

**Live site:** Source Serif Pro for EN headlines/body, Vazirmatn for FA — both self-hosted,
both read as intentional editorial choices consistent with the North Star's mood. This is the
smallest gap found: the type family choices themselves are compatible, though the North
Star's app screens run noticeably larger/bolder display type against photographic backdrops
than the website's headlines do against flat cream (a spacing/scale gap more than a font
gap — see §7).

## 5. Colour — same named palette, different dominant value

**North Star:** Most screens shown are in a **dark/night mode** — deep indigo-black
backgrounds with warm saffron/gold accent lighting (sun, candle glow, lantern) — consistent
with the app's per-screen weather/time-of-day-driven palette (see hamdam-ios
`docs/decisions.md` history).

**Live site:** Always light — `bg-cream` (`#F4EDD8`) dominant, indigo used only for text,
saffron/ember as small accents (buttons, dividers, hero sun). This is a defensible product
decision (a marketing site doesn't need weather-driven theming, and "morning/dawn" is
arguably the more inviting default for a first-time visitor) rather than a clear error, but
it does mean the site's dominant visual mood — bright, paper-like, mostly empty — reads
differently from almost every North Star screen shown, which are moodier and darker. Worth
Ealia's explicit call on whether this is intentional divergence or a gap to close.

## 6. Component shapes — CTA pill vs. rounded rectangle

**North Star:** The "Take a moment to reflect" primary CTA in the Today screen is a fully
rounded capsule/pill shape.

**Live site:** `AppStoreBadge.astro`'s pending-state CTA (`rounded-[12px]`, `--radius-
button: 12px`) is a rounded rectangle, not a full capsule. Minor, easy-to-verify visual
mismatch — see the "Coming soon to iPhone" pill in any homepage screenshot vs. the North
Star's Today-screen CTA.

## 7. Density and pacing — the site reads as sparser than the North Star's cards suggest

**North Star:** Cards are dense with visual information — photography, layered text, icons,
countdowns — packed edge-to-edge with minimal dead space between elements on a given screen.

**Live site:** `--spacing-section-desktop: 140px` / `--spacing-section-mobile: 90px` between
every homepage section, plus each section itself is mostly a heading + 2–3 short paragraphs
with generous line-height (`leading-[1.7]`/`leading-[1.9]`). The result (visible across every
full-page screenshot) is a very long, airy scroll with long stretches of unbroken cream
between short text blocks — a legitimate "restrained cinematic" reading per this repo's own
web-director skill, but a visibly sparser pacing than any North Star screen, which are all
information-dense within their single-screen frame.

## 8. App screenshots / device mockups — structurally absent, not a treatment gap

**North Star:** N/A as a website concern directly, but the app screens themselves are the
source material a real "download the app" section should eventually show.

**Live site:** No device mockups exist anywhere in the site. Currently correct pre-launch
(the App Store badge is dormant, matching the "no unverified screenshots" caution in the
`hamdam-ios` `LAUNCH_READINESS_AUDIT.md`), but flagged as a known future need once real device
screenshots exist — see `00-current-state-audit.md` "Missing evidence."

## 9. Farsi / RTL — no visual mismatch found

Both `1440x900_fa-home_full.png` and `390x844_fa-home_full.png` mirror the English layout
correctly: language toggle moves to the visual left (logically still `end`), poet-card grid
reads right-to-left in browsing order, verse cards keep Persian as the dominant (larger)
text with English as the secondary translation underneath — consistent with "Persian rooted,
not decorated." The scene-background mask direction was confirmed in source
(`:dir(rtl)` flip in `global.css`) and its visual effect is consistent between locales in the
screenshots. No RTL-specific gap against the North Star was found — the North Star mockups
themselves are English-only, so there's no Farsi reference to gap-check against directly;
this is a case where the website's own bilingual parity work has already gone further than
the North Star currently documents.

## 10. Where the site currently reads generic rather than recognisably Hamdam

The homepage's long stretches of unbroken cream (§7) combined with the near-total absence of
photography on mobile (§2) is the main place a visitor could plausibly mistake this for a
generic minimalist SaaS/wellness landing page rather than something rooted in Persian poetic
culture — the poetry itself (verse cards, poet names in Persian script) is the main thing
currently doing the work of making it feel like Hamdam, everything else (layout rhythm, empty
space, plain cards) is close to template-neutral. This matches, independently, the prior
2026-07-14 audit's "the homepage is visually empty" finding — this pass confirms the
underlying cause more precisely (see the `[data-reveal]` capture-methodology note in
`06-screenshot-index.md`: the page is less *literally* empty than a naive screenshot suggests,
since content does exist in every section, but the sparse pacing and near-absent imagery are
real, not a capture artifact).
