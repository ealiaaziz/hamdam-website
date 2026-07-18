# Hamdam Website Redesign: Canva Asset Brief

Production-ready brief for every Canva-produced asset the redesign requires. Fourteen
assets. Existing Canva material lives in the folder "Hamdam via Claude" (subfolder "raw",
16 approved scene images, plus the "Hamdam Website Art Direction" deck); verify that folder
directly before generating, and reuse or derive from approved scenes where a brief allows
it. Assets already covered by other pipelines are **not** in this brief: real app
screenshots come from the in-app Screenshot Orchestrator, OG images from
`scripts/generate-og.mjs`, App Store badges from Apple, and the icon set (`IC-01`) is
hand-drawn SVG in-repo, not Canva output.

## Global rules (apply to every asset below)

- **No text of any kind inside imagery.** Persian and English both remain live web text,
  no exceptions granted in this brief. Canva must never be asked to render Persian script.
- **Colour space:** sRGB, every asset.
- **Grade:** the warm dawn family (`12-design-system.md` §13): warm lifted shadows, no
  crushed blacks, saffron-leaning highlights. Every asset must sit beside the North Star
  mockups without a temperature clash.
- **Compression owner:** the implementation session (Sonnet), via the repo's `astro:assets`
  pipeline plus manual `sharp` where needed. Canva exports at maximum quality; the repo
  compresses to the stated budget. Budgets below are the final on-page budget, not the
  export size.
- **Licensing record:** every asset gets a row in a new `docs/asset-licence-log.md`
  (asset ID, Canva design URL, generation date, prompt or source, licence basis). This
  file is a deliverable of the production pass. Required for all fourteen assets.
- **Naming:** exports named exactly as the Filename field, saved to the Canva folder
  "Hamdam via Claude / website-redesign" (create it), never overwriting "raw" originals.
- **Cultural review:** any asset depicting cultural material (PT, CM, FC series) requires
  Ealia's explicit approval before entering the repo. No stereotype, no exoticism, no
  invented historical claims.

---

### HW-01: Hero horizon plate, desktop

1. Asset ID: HW-01
2. Filename: `hero-horizon-desktop.png`
3. Purpose: photographic horizon layer of the 2.5D hero; the "place" the dawn happens over
4. Scene description: distant warm-dusk horizon after the North Star Today scene: low
   city-and-hills silhouette with one modest dome or pavilion silhouette, first light
   glowing at the skyline, upper two thirds fading to transparent for the CSS night sky
5. Exact dimensions: 2880x1200
6. Aspect ratio: 12:5
7. Desktop or mobile use: desktop and tablet (≥768px)
8. Safe zones: top 60% must fade to full transparency (headline zone above); no detail of
   interest in the outer 10% horizontal margins (bleed for wide viewports)
9. Background requirement: transparent above the fade; opaque only at the skyline band
10. Transparency requirement: yes, PNG/WebP alpha, gradient fade mandatory
11. Motion requirement: none in-asset (scroll drift applied in code)
12. Duration if animated: n/a
13. Loop behaviour: n/a
14. Export format: PNG (repo converts to WebP/AVIF)
15. Maximum target file size: 180KB on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: yes (presentation layer)
19. Alt text: none (decorative, empty alt)
20. Static poster requirement: n/a (static asset)
21. Licensing record: required
22. Compression owner: implementation session
23. Acceptance criteria: silhouette reads at 25% opacity ambient dusk; no readable
    landmarks of a specific real city; fade-to-transparent verified over `--surface-night`;
    mirrors cleanly when flipped horizontally for RTL

### HW-02: Hero horizon plate, mobile

1. Asset ID: HW-02
2. Filename: `hero-horizon-mobile.png`
3. Purpose: lighter, recomposed horizon for small screens
4. Scene description: same world as HW-01, recomposed tighter (dome silhouette nearer
   centre), less fine detail so it reads at 390px width
5. Exact dimensions: 1170x900
6. Aspect ratio: 13:10
7. Desktop or mobile use: mobile (<768px)
8. Safe zones: top 55% transparent fade; central third holds the focal silhouette
9. Background requirement: as HW-01
10. Transparency requirement: yes, as HW-01
11. Motion requirement: none
12. Duration: n/a
13. Loop: n/a
14. Export format: PNG
15. Maximum target file size: 90KB on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: yes
19. Alt text: none (empty alt)
20. Static poster: n/a
21. Licensing record: required
22. Compression owner: implementation session
23. Acceptance criteria: as HW-01, verified at 390x844 with the headline stack overlaid

### HW-03: Ceremony morning horizon plate

1. Asset ID: HW-03
2. Filename: `ceremony-morning-horizon.png`
3. Purpose: the completed-dawn horizon behind the final download ceremony
4. Scene description: the same skyline as HW-01 in full morning: sun just risen, warm
   cream-gold sky at the skyline, softly overexposed warmth; hopeful, not glaring
5. Exact dimensions: 2880x1000
6. Aspect ratio: 2.88:1
7. Desktop or mobile use: both (art-directed crop in code for mobile)
8. Safe zones: top 55% fades to transparent (CTA zone above); horizontal outer 10% bleed
9. Background requirement: transparent fade to `--surface-morning`
10. Transparency requirement: yes
11. Motion requirement: none
12. Duration: n/a
13. Loop: n/a
14. Export format: PNG
15. Maximum target file size: 150KB on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: yes
19. Alt text: none (empty alt)
20. Static poster: n/a
21. Licensing record: required
22. Compression owner: implementation session
23. Acceptance criteria: continuity with HW-01 (same world, later hour) confirmed side by
    side; App Store badge passes contrast requirements over the composition's CTA zone

### HW-04: Hero foreground blossom plate

1. Asset ID: HW-04
2. Filename: `hero-blossom-foreground.png`
3. Purpose: near-depth layer completing the hero's 2.5D composition (North Star Today
   screen's blossom framing)
4. Scene description: a single soft-focus blossom branch entering from one lower corner,
   dusk-lit, petals warm against the dark sky; sparse, never a floral border
5. Exact dimensions: 1600x1200
6. Aspect ratio: 4:3
7. Desktop or mobile use: desktop only (dropped on mobile per page spec)
8. Safe zones: branch occupies at most the lower-corner quarter; everything else
   transparent
9. Background requirement: fully transparent
10. Transparency requirement: yes, clean alpha edges (no halo)
11. Motion requirement: none in-asset (12% scroll drift in code)
12. Duration: n/a
13. Loop: n/a
14. Export format: PNG
15. Maximum target file size: 80KB on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: yes
19. Alt text: none (empty alt)
20. Static poster: n/a
21. Licensing record: required
22. Compression owner: implementation session
23. Acceptance criteria: no alpha fringing over the night sky; headline never overlapped
    at any viewport ≥768px; flips cleanly for RTL

### PT-01 to PT-05: Poet portraits (five assets, one brief)

Five separate assets: PT-01 Hafez, PT-02 Rumi, PT-03 Saadi, PT-04 Khayyam,
PT-05 Parvin Etesami. No other poet may be produced.

1. Asset ID: PT-01, PT-02, PT-03, PT-04, PT-05
2. Filename: `poet-hafez.png`, `poet-rumi.png`, `poet-saadi.png`, `poet-khayyam.png`,
   `poet-parvin.png`
3. Purpose: portrait gallery band, §4 of the page spec; closes the audit's largest asset gap
4. Scene description: painterly portrait, artistic interpretation, in one consistent style
   family matching the North Star Discover treatment (warm classical painting register,
   dignified, individual): Hafez, Rumi, Saadi, Khayyam in period-respectful dress without
   costume cliché; Parvin Etesami (1907 to 1941) in early twentieth-century Iranian dress,
   informed by her historical photographs, treated with the same painterly dignity as the
   four classical poets, never modernised into stock imagery
5. Exact dimensions: 1200x1800 each
6. Aspect ratio: 2:3
7. Desktop or mobile use: both
8. Safe zones: face centred in the upper 60%; lower 25% calm in tone (the live-text caption
   plate overlays there); nothing critical in outer 8%
9. Background requirement: quiet warm atmospheric ground (dusk tones), consistent across
   all five
10. Transparency requirement: none (full-bleed card image)
11. Motion requirement: none
12. Duration: n/a
13. Loop: n/a
14. Export format: PNG
15. Maximum target file size: 60KB each on page
16. Colour space: sRGB
17. Text embedded: never (names are live text; Canva must not attempt Persian script)
18. Decorative: no (meaningful content)
19. Alt text: required: "Artistic portrait interpretation of [poet name]" (localised)
20. Static poster: n/a
21. Licensing record: required, per portrait, including the note "artistic interpretation,
    no authentic likeness exists" for the four classical poets and "informed by historical
    photographs" for Parvin
22. Compression owner: implementation session
23. Acceptance criteria: five portraits read as one commissioned series (shared palette,
    brush register, lighting); each is distinct and dignified; no turban-and-scimitar
    orientalism, no crystal balls, no invented iconography; Ealia approves all five
    together before any enters the repo

### CM-01: Yalda moment card image

1. Asset ID: CM-01
2. Filename: `moment-yalda.png`
3. Purpose: Roots section moment card (§7)
4. Scene description: pomegranates and low candlelight on a dark warm table, night-depth
   background, echoing the North Star Yalda card; intimate, warm, longest-night feeling
5. Exact dimensions: 1200x900
6. Aspect ratio: 4:3
7. Desktop or mobile use: both
8. Safe zones: lower 30% calm for the caption plate; focal fruit in the central 60%
9. Background requirement: full-bleed within its card
10. Transparency requirement: none
11. Motion requirement: none
12. Duration: n/a
13. Loop: n/a
14. Export format: PNG
15. Maximum target file size: 80KB on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: no (meaningful)
19. Alt text: required: "Pomegranates and candlelight for Yalda night" (localised)
20. Static poster: n/a
21. Licensing record: required
22. Compression owner: implementation session
23. Acceptance criteria: reads as Yalda to someone who knows it and as warmth to someone
    who does not; palette continuity with the app's Yalda card; caption plate contrast
    verified

### CM-02: Norooz moment card image

1. Asset ID: CM-02
2. Filename: `moment-norooz.png`
3. Purpose: Roots section moment card
4. Scene description: blossom branches in soft morning light, renewal register, spring
   warmth; may derive from the approved `norooz_morning` raw scene as a new named
   derivative (never overwrite the original)
5. Exact dimensions: 1200x900
6. Aspect ratio: 4:3
7. Desktop or mobile use: both
8. Safe zones: as CM-01
9. Background requirement: full-bleed within card
10. Transparency requirement: none
11. Motion requirement: none
12. Duration: n/a
13. Loop: n/a
14. Export format: PNG
15. Maximum target file size: 80KB on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: no
19. Alt text: required: "Spring blossoms in morning light for Norooz" (localised)
20. Static poster: n/a
21. Licensing record: required
22. Compression owner: implementation session
23. Acceptance criteria: clearly distinct in hour and mood from CM-01 (morning vs night);
    caption plate contrast verified

### CM-03: Chaharshanbe Suri moment card image

1. Asset ID: CM-03
2. Filename: `moment-chaharshanbe-suri.png`
3. Purpose: Roots section moment card
4. Scene description: warm fire glow at dusk (embers and flame warmth, small bonfire
   scale), celebratory warmth, never alarming, no people leaping (avoid stock-photo
   cliché; the fire's warmth is the subject)
5. Exact dimensions: 1200x900
6. Aspect ratio: 4:3
7. Desktop or mobile use: both
8. Safe zones: as CM-01
9. Background requirement: full-bleed within card
10. Transparency requirement: none
11. Motion requirement: none
12. Duration: n/a
13. Loop: n/a
14. Export format: PNG
15. Maximum target file size: 80KB on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: no
19. Alt text: required: "Fire glow at dusk for Chaharshanbe Suri" (localised)
20. Static poster: n/a
21. Licensing record: required
22. Compression owner: implementation session
23. Acceptance criteria: fire reads warm and festive, not hazardous; ember palette stays
    inside the brand's warm family; caption plate contrast verified

### DV-01: Device frame

1. Asset ID: DV-01
2. Filename: `device-frame-iphone.png`
3. Purpose: the single frame all real app screenshots sit in, sitewide
4. Scene description: neutral modern iPhone outline: near-black warm-grey body, thin
   bezel, punched screen area fully transparent; visually consistent with the app's own
   `ScreenshotComposerView` marketing frame so web and App Store show the same object;
   generic enough to imply no specific model claim
5. Exact dimensions: 1400x2820 (screen cutout matching 1290x2796 proportions)
6. Aspect ratio: approximately 1:2
7. Desktop or mobile use: both
8. Safe zones: screen cutout must be exactly proportional to 1290x2796 so orchestrator
   screenshots drop in with zero distortion
9. Background requirement: transparent outside the body
10. Transparency requirement: yes, body edges anti-aliased, screen area fully transparent
11. Motion requirement: none
12. Duration: n/a
13. Loop: n/a
14. Export format: PNG
15. Maximum target file size: 40KB on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: yes (the screenshot inside carries meaning and alt text)
19. Alt text: none on the frame itself
20. Static poster: n/a
21. Licensing record: required (confirm no Apple trade dress issue: generic rounded frame,
    no notch trademark detailing, no Apple logo)
22. Compression owner: implementation session
23. Acceptance criteria: an orchestrator screenshot composited into the cutout shows no
    stretching, gap or corner mismatch at any rendered size; frame reads cleanly on both
    night and morning surfaces

### CY-01: Ceremony petal set

1. Asset ID: CY-01
2. Filename: `ceremony-petals.png` (single sprite sheet, three petal variants)
3. Purpose: the final ceremony's one-pass petal drift, echoing the app's
   reflection-completion bloom
4. Scene description: three individual warm blossom petals (peach to gold), soft-lit,
   slight translucency, matching the North Star bloom animation's flower species feeling
5. Exact dimensions: 600x200 sheet (three 200x200 cells)
6. Aspect ratio: cells 1:1
7. Desktop or mobile use: both
8. Safe zones: each petal centred in its cell with 15% padding
9. Background requirement: transparent
10. Transparency requirement: yes, soft alpha edges
11. Motion requirement: none in-asset; motion is coded (6s single pass,
    `13-motion-specification.md` §7)
12. Duration if animated: n/a in-asset
13. Loop behaviour: never loops (coded constraint)
14. Export format: PNG
15. Maximum target file size: 30KB total on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: yes
19. Alt text: none (aria-hidden)
20. Static poster requirement: not needed (reduced motion omits petals entirely)
21. Licensing record: required
22. Compression owner: implementation session
23. Acceptance criteria: petals read at 24 to 48px render size over the morning sky; no
    visible cell edges; alpha clean over both light bloom and sky

### FC-01: Founding Companion band texture

1. Asset ID: FC-01
2. Filename: `founding-companion-band.png`
3. Purpose: background texture for the Founding Companion band (§9), continuing the
   existing App Store promo art family
4. Scene description: deep saffron-gold plate with a soft-relief shamseh (eight-point
   star) motif, atmospheric and dimensional like the existing
   `hamdam-plus-lifetime-promo.png` interior art, ambient warm light, no hard geometry
   edges near the band's text zones
5. Exact dimensions: 2400x800
6. Aspect ratio: 3:1
7. Desktop or mobile use: both (mobile uses centre crop)
8. Safe zones: central 60% horizontal band kept low-contrast for overlaid live text; motif
   weight toward the edges
9. Background requirement: opaque
10. Transparency requirement: none
11. Motion requirement: none (static sheen only, coded)
12. Duration: n/a
13. Loop: n/a
14. Export format: PNG
15. Maximum target file size: 60KB on page
16. Colour space: sRGB
17. Text embedded: never
18. Decorative: yes
19. Alt text: none (empty alt; the band's meaning is its live text)
20. Static poster: n/a
21. Licensing record: required
22. Compression owner: implementation session
23. Acceptance criteria: overlaid cream display text passes 4.5:1 across the entire safe
    zone; motif continuity with the existing promo set confirmed side by side; no
    text-like marks anywhere in the texture

---

## Production notes

- **Order of production:** DV-01 first (unblocks every screenshot section), then HW series
  (hero is the first impression), then PT series (largest review risk, five-as-one-series
  approval), then CM series, then FC-01 and CY-01.
- **Review gate:** every asset is reviewed against `16-visual-acceptance-criteria.md` and
  the North Star PNGs before repo entry; the PT and CM series additionally require Ealia's
  cultural approval.
- **Asset count: 15** (HW-01, HW-02, HW-03, HW-04, PT-01 to PT-05, CM-01 to CM-03, DV-01,
  CY-01, FC-01).
