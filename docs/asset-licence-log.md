# Website redesign asset licence log

Per `docs/website-redesign/14-canva-asset-brief.md`'s global rule: every asset gets a row here
(asset ID, Canva design URL, generation date, prompt or source, licence basis). This file is a
deliverable of the production pass, created 2026-07-18 during the bounded asset-integration
phase.

All source designs were generated via Canva's AI image generation feature inside the "Hamdam
via Claude" Canva folder (folder ID `FAHPUJLFQhY`), created in a single production session on
2026-07-17/18. Canva's AI-generated image terms grant the account holder (Ealia Azizollahi)
usage rights to generated output; no third-party stock or copyrighted reference material was
used as an input prompt.

## Integrated (9 of 15)

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

## Not integrated (6 of 15) — technical blocker, not an approval blocker

| Asset ID | Filename | Status |
|---|---|---|
| HW-01 | `hero-horizon-desktop.png` | Candidate exists ("Serene Urban Landscape with Pavilion at Dusk", DAHPsx34gRk) but requires a genuine alpha fade-to-transparent (top 60%) that this session has no background-removal/matting tool to produce. A flat opaque export would not satisfy the brief's transparency requirement over the CSS night sky. |
| HW-02 | `hero-horizon-mobile.png` | No distinct mobile recomposition exists yet; would need deriving from HW-01 once HW-01's transparency is solved. |
| HW-03 | `ceremony-morning-horizon.png` | Candidate exists ("Transition from Night to Daylight", DAHPtBuaXkE) — same alpha-fade blocker as HW-01. |
| HW-04 | `hero-blossom-foreground.png` | Candidate exists ("Cherry Blossom Branch in Dusk Light", DAHPs6wWrOM) but needs clean irregular-silhouette alpha edges (not a rectangular crop) — needs real background removal. |
| DV-01 | `device-frame-iphone.png` | Candidate exists ("Modern Smartphone Mockup in Soft Lighting", DAHPs-GvuWw) but needs a precise transparent screen cutout, and even with the frame solved, real app screenshots from the in-app Screenshot Orchestrator still don't exist in either repo to composite inside it. |
| CY-01 | `ceremony-petals.png` | Candidate exists ("Elegant Blossom Petal Displayed in Soft Light", DAHPszKU8kQ) but needs a 3-cell sprite sheet with soft alpha edges per petal — irregular-silhouette matting, same blocker as HW-04. |

**Why these six are blocked**: this session's toolset (Canva MCP export/resize + local image
tools) can crop and recompress, but cannot perform true background removal / alpha matting on a
flat photographic export. Canva's own Magic Studio / BG Remover can do this but isn't exposed
through the available MCP tools. Options going forward: Ealia runs background removal on these
six candidates in Canva's UI herself and re-exports as PNG with real alpha, or these six ship
later behind their existing dev-only placeholder treatment.
