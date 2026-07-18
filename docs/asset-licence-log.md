# Website redesign asset licence log

Per `docs/website-redesign/14-canva-asset-brief.md`'s global rule: every asset gets a row here
(asset ID, Canva design URL, generation date, prompt or source, licence basis). This file is a
deliverable of the production pass, created 2026-07-18 during the bounded asset-integration
phase, updated the same day once all 15 asset IDs were resolved.

All source designs were generated via Canva's AI image generation feature inside the "Hamdam
via Claude" Canva folder (folder ID `FAHPUJLFQhY`), created in a single production session on
2026-07-17/18. Canva's AI-generated image terms grant the account holder (Ealia Azizollahi)
usage rights to generated output; no third-party stock or copyrighted reference material was
used as an input prompt.

## Integrated (15 of 15)

| Asset ID | Filename | Canva design | Generated | Basis | Cultural approval |
|---|---|---|---|---|---|
| PT-01 | `poet-hafez.png` | canva.com/design/DAHPs0hMMWk | 2026-07-17 | AI-generated, artistic interpretation, no authentic likeness exists | Approved by Ealia 2026-07-18 (five-as-one-series) |
| PT-02 | `poet-rumi.png` | canva.com/design/DAHPs9zP3MY | 2026-07-17 | AI-generated, artistic interpretation, no authentic likeness exists | Approved by Ealia 2026-07-18 (five-as-one-series) |
| PT-03 | `poet-saadi.png` | canva.com/design/DAHPsxLNHf0 | 2026-07-17 | AI-generated, artistic interpretation, no authentic likeness exists | Approved by Ealia 2026-07-18 (five-as-one-series) |
| PT-04 | `poet-khayyam.png` | canva.com/design/DAHPs-LF55Y | 2026-07-17 | AI-generated, artistic interpretation, no authentic likeness exists | Approved by Ealia 2026-07-18 (five-as-one-series) |
| PT-05 | `poet-parvin.png` | canva.com/design/DAHPs39sAKo | 2026-07-17 | AI-generated, informed by historical photographs of Parvin Etesami (1907-1941) | Approved by Ealia 2026-07-18 (five-as-one-series) |
| CM-01 | `moment-yalda.png` | canva.com/design/DAHPs2w3Knc | 2026-07-17 | AI-generated | Approved by Ealia 2026-07-18 |
| CM-02 | `moment-norooz.png` | canva.com/design/DAHPs9Elves | 2026-07-17 | AI-generated | Approved by Ealia 2026-07-18 |
| CM-03 | `moment-chaharshanbe-suri.png` | canva.com/design/DAHPs9HuOPI | 2026-07-17 | AI-generated | Approved by Ealia 2026-07-18 |
| FC-01 | `founding-companion-band.png` | canva.com/design/DAHPs2ttH8M | 2026-07-17 | AI-generated, motif continuity with existing `hamdam-plus-lifetime-promo.png` | Approved by Ealia 2026-07-18 |

All nine exported as PNG from Canva at production resolution, saved to
`src/assets/website-redesign/`, and run through the repo's `astro:assets` build pipeline (Sharp),
which auto-converts to WebP and compresses well inside each asset's on-page budget (e.g.
poet-hafez.png: 835KB source PNG to 28KB WebP on page, against a 60KB budget).

Integration used CSS cover-cropping (`object-fit: cover` for the `<Image>` elements in
`PoetCard.astro` / `RootsMoments.astro`; `background-size: cover` for the `background-image` in
`PlansAndFoundingCompanion.astro`), consistent with the existing `SceneBackground.astro` pattern
already shipped in this repo (Phase 5-era commit `4be55c5`). Source files were exported near
their native Canva canvas resolution rather than pre-cropped to each asset's literal target
pixel dimensions, since none of the three consuming components require a pre-cut aspect ratio.

## HW-01, HW-02, HW-03, HW-04, DV-01, CY-01: resolved via local alpha matting (2026-07-18, S2)

The prior session's blocker was real: this repo's toolset had no background-removal/matting
capability, and the Canva MCP surface doesn't expose Magic Studio/BG Remover. Resolved this
session by confirming Pillow 11.3.0 was available system-wide (not previously checked),
installing numpy locally (a Python tool for this session's own image-processing scripts, not a
website repo dependency — nothing in `package.json` changed), and writing deterministic matting
scripts rather than waiting on manual Canva UI work. Every matte was verified via a 5-background
contact sheet (white, black, warm cream `#F4EDD8`, deep plum `#2A2140`, checkerboard) plus a
high-zoom edge inspection before use.

| Asset ID | Filename | Canva design (source) | Method | Output | Budget |
|---|---|---|---|---|---|
| HW-01 | `hero-horizon-desktop.png` | DAHPsx34gRk ("Serene Urban Landscape with Pavilion at Dusk") | Not chroma-key matting — the source is already a smooth vertical luminance gradient (near-black top fading to a warm horizon glow), so the brief's "gradient fade mandatory" requirement was met directly: full-width crop of the 1587x2245 source at y=801-1462 (2.4:1 aspect, horizon peak at ~58% down the crop), resized to 2880x1200, then a programmatic smoothstep alpha ramp (0 at top, 1 by 60% down) applied on top of the source's own colour | 25.6KB on page | 180KB |
| HW-02 | `hero-horizon-mobile.png` | Derived from HW-01's own source (DAHPsx34gRk) — no separate candidate existed for this ID, and none was generated; the brief's own text authorises deriving HW-02 from HW-01 ("same world as HW-01, recomposed tighter, dome silhouette nearer centre") | Narrower crop of the same source (984x757 window, left=222/top=806, centred on the dome at ~45% of source width), resized to 1170x900, same smoothstep alpha technique (0-55% fade) | 10.0KB on page | 90KB |
| HW-03 | `ceremony-morning-horizon.png` | DAHPtBuaXkE ("Transition from Night to Daylight") | Same technique as HW-01 — source top is already near `--surface-morning` cream, so the fade is close to seamless by construction. Full-width crop at y=975-1526 (2.88:1 aspect), resized to 2880x1000, smoothstep alpha (0-55% fade) | 16.6KB on page | 150KB |
| HW-04 | `hero-blossom-foreground.png` | DAHPs6wWrOM ("Cherry Blossom Branch in Dusk Light") | True chroma-key: source background confirmed pure `(0,0,0)` black by direct corner/edge pixel sampling (a 1-2px grey `(103,103,103)` PNG export-artifact border on the source's right/bottom edge was trimmed first). Per-pixel distance-from-black ramp (low=15, high=60) with edge decontamination (unpremultiply against black) for clean, halo-free edges. Tight-cropped to the alpha bounding box (824x939), scaled to fit the lower ~62% of a 1600x1200 canvas, anchored to the bottom-left corner (branch entering from off-frame) | 30.6KB on page | 80KB |
| DV-01 | `device-frame-iphone.png` | DAHPs-GvuWw ("Modern Smartphone Mockup in Soft Lighting") | Outer body: chroma-key against the source's confirmed pure `(255,255,255)` white background, distance ramp (low=35, high=90) chosen specifically above the soft drop-shadow's own max distance from white (~20) so the shadow is excluded cleanly rather than surviving as a pale halo. Screen cutout: **not** chroma-keyed — a precise *procedural* rounded-rectangle cutout (Gaussian-blurred mask edge for anti-aliasing) computed directly from the detected screen rectangle's scaled position, with its aspect ratio forced to exactly 1290:2796 by construction (width taken from measurement, height derived from the exact ratio) rather than measured independently — this guarantees the "exactly proportional to 1290x2796" requirement holds by construction, verified directly against the shipped file: transparent span measured at x=90-1315 through the body's vertical centre, matching the computed cutout to the pixel | 19.2KB (hero, 600px) / 15.8KB (roots, 520px) / 13.9KB (journey, 480px) on page | 40KB |
| CY-01 | `ceremony-petal-1.png`, `ceremony-petal-2.png`, `ceremony-petal-3.png` | DAHPszKU8kQ ("Elegant Blossom Petal Displayed in Soft Light") | Chroma-key against the confirmed near-white `(253-255)` background needed a second signal beyond lightness distance: the source's soft ambient-occlusion shadow beneath the petal is close enough in lightness distance from white (max ~74) to overlap real petal edge-antialiasing pixels, so a **saturation gate** was added (petal pixels are chromatic, e.g. `(245,173,86)`, chroma spread ~159; shadow pixels are near-neutral, chroma spread ~46) — alpha is the product of the lightness-distance ramp (low=10, high=70) and a chroma-spread gate (low=35, high=65), which cleanly excludes the shadow while keeping the petal's soft edges. Tight-cropped, then composed into three separate small PNGs (160x160, 15% cell padding) at three rotations/scales/brightness levels (-18°/1.0x, 35°+flip/0.94x, -95°/1.05x) — shipped as three files rather than the brief's literal single 600x200 three-cell sprite sheet, since a CSS sprite-position crop needs either an inline `style` attribute (blocked by this site's `style-src 'self'` CSP) or an RTL-unsafe hardcoded pixel offset; three plain `<Image>` elements give the same visual result without either problem. Cycled across the section's six fall positions (three petals × 2) | 2.8KB + 2.5KB + 3.4KB = 8.7KB combined on page | 30KB total |

**HW-01/HW-02/HW-03 acceptance note**: these are horizon-band crops from full photographic scenes,
not literal "the whole approved candidate design" — Fable's F1 review should treat the crop
window (not just the source design) as part of what needs visual acceptance, since the same
source photo could plausibly be cropped differently.

**CY-01 acceptance note**: the brief calls for "three individual" petals; what exists is one
approved petal source shown three ways (rotation/scale/brightness varied, same underlying
photograph). Flagged explicitly for Fable's F1 judgement on whether this reads as three distinct
petals or should be regenerated as three separate source images — not silently treated as
equivalent to the brief's literal spec.

**DV-01 screenshot content still separately blocked**: the frame asset is real and integrated
(transparent screen cutout, per the brief's "Preferred DV-01 architecture") in all five consuming
components (`HeroCinematic.astro`, `RootsMoments.astro`, `ContextConstellation.astro`,
`PrivacyTrust.astro`, `JourneyPair.astro`'s two frames — six frame instances total), but the app
screenshot that belongs inside each is a separate,
still-open blocker — hamdam-ios does have a Screenshot Orchestrator
(`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`), investigated read-only this session; see
the phase report for what it can and cannot produce without app code changes. Until real
screenshots land, every device frame shows its existing gradient fill through the transparent
cutout — an honest "pending" state, not a fabricated screen.

All six exported/derived at production resolution, saved to `src/assets/website-redesign/`, and
wired into every consuming component (full detail, including one real CSP bug found and fixed
during S1, in the phase reports).
