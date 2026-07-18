# Final six assets — S2 resolution report

Date: 2026-07-18. Scope: S2 of the Final Completion Mega Runner — resolve HW-01, HW-02, HW-03,
HW-04, DV-01, CY-01, the six asset IDs left blocked at the end of the S1 checkpoint (see
`nine-assets-checkpoint-report.md` and commit `846c22d`).

## 1. What was actually blocking these six

The S1 checkpoint's own conclusion was correct: this repo's available tooling (Canva MCP
export/resize only, no ImageMagick installed — `which magick convert` still returns nothing)
could crop and recompress but not perform real background removal / alpha matting. What changed
this session: Pillow 11.3.0 turned out to be available system-wide via `python3`, never checked
before, and numpy was installed locally (`pip3 install --user numpy`) specifically for this
session's own matting scripts — a Python tool for local image processing, not a website repo
dependency; nothing in `package.json` changed. This combination made deterministic matting
possible without Canva's Magic Studio/BG Remover.

## 2. HW-01, HW-02, HW-03: resolved via graduated alpha fade, not chroma-key

The brief calls for "a genuine graduated alpha fade... gradient fade mandatory" for these three —
they're full photographic skies, not flat-background subjects, so chroma-key matting doesn't
apply. Exported the two Canva candidates already on record in `docs/asset-licence-log.md`
(HW-01: `DAHPsx34gRk`, HW-03: `DAHPtBuaXkE`) via the Canva MCP `export-design` tool at PNG/
pro/lossless quality, downloaded locally, and inspected each source's own vertical luminance
profile by direct pixel sampling before choosing a crop.

- **HW-01**: full-width crop of the 1587x2245 source at y=801-1462 (2.4:1 aspect matching the
  brief's 2880x1200 target), resized to 2880x1200. A programmatic smoothstep alpha ramp (0 at
  top, 1 by 60% down) applied over the source's own colour — no chroma key needed since the top
  of the source is already a smooth dark-to-warm gradient.
- **HW-03**: same technique against `DAHPtBuaXkE`, full-width crop at y=975-1526 (2.88:1 aspect),
  resized to 2880x1000, smoothstep fade over the top 55%. The source's own top colour
  (`~rgb(236,215,176)`) is already close to `--surface-morning` (`#F4EDD8`), so the seam is close
  to invisible by construction.
- **HW-02**: no Canva candidate exists for this ID (confirmed absent from the licence log's
  candidate list). Per the brief's own instruction ("same world as HW-01, recomposed tighter,
  dome silhouette nearer centre"), derived it as a narrower 984x757 crop of HW-01's own source
  (left=222, top=806, centred on the dome at ~45% of source width), resized to 1170x900, same
  smoothstep-fade technique. Not a new AI generation, so no fresh cultural review was needed.

## 3. HW-04: resolved via true chroma-key matting

Source candidate `DAHPs6wWrOM` ("Cherry Blossom Branch in Dusk Light") sits on a background
confirmed pure `(0,0,0)` black by direct corner-pixel sampling. Before matting, trimmed a 1-2px
grey `rgb(103,103,103)` export-artifact border found on the source's right/bottom edge (a Canva
PNG-export quirk) — caught because an initial matte attempt produced a bounding box spanning the
entire source image, which was the tell that something outside the real branch content was being
picked up.

Matted with a per-pixel distance-from-black soft ramp (low=15, high=60) plus edge decontamination
(unpremultiplying colour against black) for halo-free edges — verified clean at high zoom over a
cream background. Tight-cropped to the alpha bounding box (824x939), scaled to fit the lower 62%
of a 1600x1200 canvas, anchored to the bottom-left corner per the brief's "branch entering from
one lower corner" safe zone.

## 4. DV-01: resolved via chroma-key body removal + procedural screen cutout

Source candidate `DAHPs-GvuWw` ("Modern Smartphone Mockup in Soft Lighting") sits on a background
confirmed pure `(255,255,255)` white. A soft drop-shadow beneath the phone (max lightness distance
from white ~20) was excluded by choosing a distance-from-white ramp (low=35, high=90) safely above
that threshold — verified via direct pixel sampling of the shadow region before picking the
threshold, not by trial and error.

The screen cutout was **not** produced by chroma-keying the source's own grey screen fill. Its
rectangle was located precisely (horizontal/vertical scans through the phone body away from the
notch: x=402-1187, y=277-1974 in source-pixel space, confirming an aspect ratio of 0.4626, already
close to the brief's 1290:2796 = 0.4614 target), then a *procedural* rounded-rectangle cutout was
drawn at the exact 1290:2796 ratio by construction (width taken from the measured screen, height
derived from the exact target ratio — not measured independently), with a Gaussian-blurred mask
edge for anti-aliasing. This guarantees the "exactly proportional to 1290x2796" acceptance
criterion holds by construction rather than by measurement luck. Verified directly against the
shipped file: the transparent span through the body's vertical centre measures x=90-1315 in the
final 1400x2820 canvas, matching the computed cutout to the pixel — ratio 0.4614, an exact match,
not an approximation.

## 5. CY-01: resolved via chroma-key with a saturation gate

Source candidate `DAHPszKU8kQ` ("Elegant Blossom Petal Displayed in Soft Light") sits on a
near-white `(253-255)` background. A first matting pass using only a lightness-distance threshold
left a visible pale halo on dark backgrounds (confirmed via a 5-background contact sheet) — the
source's own soft ambient-occlusion shadow beneath the petal has a lightness distance from white
(up to ~74 near the petal) that overlaps real petal edge-antialiasing pixels, so no single
lightness threshold could separate them.

Fixed by adding a saturation gate alongside the lightness ramp: real petal colour is highly
chromatic (e.g. `rgb(245,173,86)`, max-min channel spread ~159), while the shadow is
near-neutral grey (spread ~46 at its densest). Final alpha is the product of a lightness-distance
ramp (low=10, high=70) and a chroma-spread gate (low=35, high=65) — verified clean over all five
contact-sheet backgrounds and at high zoom.

Composed into three separate small PNGs (160x160, 15% cell padding) at three
rotation/scale/brightness variants (-18°, 35°+flip/0.94x, -95°/1.05x) of the one approved source
petal — not the brief's literal single 600x200 three-cell sprite sheet. A CSS sprite-position crop
needs either an inline `style` attribute (blocked by this site's `style-src 'self'` CSP, the same
bug class fixed in S1) or an RTL-unsafe hardcoded pixel offset; three plain `<Image>` elements
give the same visual result without either problem. This is a real deviation from the brief's
literal spec, flagged explicitly in `docs/asset-licence-log.md` for Fable's F1 judgement — one
approved petal shown three ways, not three independently generated petals.

## 6. Component wiring

All six assets were wired into their consuming components, replacing every remaining
`import.meta.env.DEV`-gated `"... pending"` placeholder label in the redesign (`HeroCinematic.astro`
for HW-01/02/04 + DV-01, `FinalCeremony.astro` for HW-03 + CY-01). A full-repo grep for
`device-frame-iphone` surfaced two DV-01 consumers not mentioned in this session's own initial
scoping — `ContextConstellation.astro` and `PrivacyTrust.astro` — in addition to the two already
known (`HeroCinematic.astro`, `RootsMoments.astro`) and `JourneyPair.astro`'s two frames
(`reflect`/`journey`), which still had unfinished placeholder buttons with no `<Image>` at all.
All six DV-01 instances across five components now render the real transparent-cutout frame with
the existing gradient fill showing through as an honest "screenshot pending" state — never a
fabricated screen.

Verified every wiring change visually via Playwright against the production `astro preview`
build (not the dev server): hero at three pinned scroll states (`?dawn=0/0.5/1`) in EN desktop,
mobile, and FA desktop (RTL mirroring of the horizon photo and blossom foreground both confirmed
correct via `scaleX(-1)`); ceremony section with HW-03 and petals mid-fall; roots section in EN
desktop/mobile and FA desktop (RTL card order confirmed); context constellation, privacy, and
journey sections in EN desktop. All read correctly, no broken images, no visible placeholder
labels, no layout regressions.

## 7. DV-01 screenshot content: investigated, still a genuine separate blocker

DV-01 the *frame* is now real everywhere it's used. The app *screenshot* that belongs inside it is
a different, still-open question. Dispatched a read-only investigation against `hamdam-ios`
(no files modified there, no commits) into whether the existing
`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/` (`ScreenshotOrchestrator.swift`,
`ScreenshotSeedData.swift`, `ScreenshotViewFactory.swift`, `ScreenshotRunnerView.swift`,
`ScreenshotComposerView.swift`, `ScreenshotBatchSpec.swift`) can produce a real deterministic
screenshot without any app code changes. That infrastructure is confirmed real — not a prior
session's false negative — but whether it has a zero-code-change invocation path was still being
investigated as of this report; do not assume either outcome until that investigation's findings
are read directly.

## 8. Validation run

- `npm test`: 110/110 passed, 7 test files, clean (re-run fresh after every wiring change).
- `npm run build`: clean, 7 pages built, all 15 asset IDs processed through the `astro:assets`
  Sharp pipeline. One transient internal Astro error (`Cannot read properties of undefined
  (reading 'setInternals')`) occurred once mid-session and cleared on immediate retry — not
  reproducible, not related to any change made this session.
- `npm run check:persian`: passed.
- CSP source inspection: zero inline `<style>` blocks, zero inline `style=` attributes anywhere
  in `dist/*.html` (grepped directly, re-checked after every component edit).
- Placeholder audit: zero remaining `import.meta.env.DEV` dev-only labels anywhere in
  `src/components/*.astro`.
- Astro/type checks (`astro check`) not run — requires installing `@astrojs/check` + `typescript`,
  neither present in this repo's `package.json` history; not installed per the runner's rule
  against new dependencies without a documented impossibility. The build's own Vite/Astro compile
  step type-processes every `.astro` file and passed cleanly instead.

### Per-asset on-page size vs. budget (measured directly from `dist/_astro/`)

| Asset | On-page size | Budget |
|---|---|---|
| HW-01 (`hero-horizon-desktop`) | 25.6KB | 180KB |
| HW-02 (`hero-horizon-mobile`) | 10.0KB | 90KB |
| HW-03 (`ceremony-morning-horizon`) | 16.6KB | 150KB |
| HW-04 (`hero-blossom-foreground`) | 30.6KB | 80KB |
| DV-01 (`device-frame-iphone`, three output sizes: 600w hero / 520w roots+constellation / 480w privacy+journey) | 19.2KB / 15.8KB / 13.9KB | 40KB each |
| CY-01 (three petal PNGs combined) | 2.8 + 2.5 + 3.4 = 8.7KB | 30KB total |

All fifteen asset IDs are within budget.

## 9. Safety confirmation

Nothing pushed. Nothing merged (branch remains `feature/hamdam-web-redesign`). Nothing deployed.
`hamdam-ios` was not modified — the Screenshot Orchestrator investigation was read-only.

## 10. Asset status: 15 of 15

All fifteen asset IDs from `14-canva-asset-brief.md` are now integrated: the nine from S1
(PT-01–05, CM-01–03, FC-01) plus HW-01, HW-02, HW-03, HW-04, DV-01 (frame), and CY-01 from this
session. The one genuinely open item is DV-01's *screenshot content* (not the frame asset
itself) — a product-data blocker, not an asset-production one — and CY-01's three-petals-from-one
deviation, both flagged explicitly for Fable's F1 review rather than silently treated as
resolved.
