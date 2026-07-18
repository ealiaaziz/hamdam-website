# Fable final visual and copy audit (F1)

Date: 2026-07-18. Model: Fable 5. Stage F1 of the Final Completion Mega Runner.

Every judgement below was made from direct inspection of images: the four North Star
comparison sheets and six page captures in `final-evidence/pre-fable/`, the two North Star
mockups themselves (`Designer (2).png`, `Designer (3).png`, read directly this session via
the same scratchpad-copy route S4 used), all fifteen asset source files in
`src/assets/website-redesign/` at full resolution, fresh 4-background alpha contact sheets
regenerated this session for all eight transparency files, and four fresh live-page section
captures taken this session against a fresh production build served locally (1440x900, EN and
FA), because the archived full-page captures carry a documented scroll-reveal/lazy-load
artefact that made the poets band appear empty. No production source was modified.

## 0. Two capture-artefact suspicions investigated and cleared

These are recorded first so nobody re-raises them from the same evidence:

1. **Poets band "empty" at 1440/1728 in the archived full-page captures.** Fresh live
   captures this session (`live_poets_1440.png`, `live_poets_fa_1440.png`, scratchpad) show
   all five portrait cards fully rendered in both locales, with correct RTL order reversal on
   the FA page. The archived appearance is a lazy-load/scroll-reveal capture artefact, per the
   methodology note already in `06-screenshot-index.md`. Not a defect.
2. **Roots countdown numbers.** The 430-wide comparison sheet made Chaharshanbe Suri and
   Norooz look like they shared "241 days". The built HTML says otherwise: Yalda 156,
   Chaharshanbe Suri 241, Norooz 245, sorted soonest first, Persian digits on the FA page.
   Correct on both counts (values and ordering). Not a defect.

## 1. Asset review, all fifteen

Scored against the eleven runner dimensions (brand fit, warm dawn continuity, North Star
compatibility, cultural quality, image quality, crop, alpha where relevant, mobile, EN
suitability, FA suitability, production readiness). Scale: pass / note / fail.

| Asset | Verdict | Notes |
|---|---|---|
| HW-01 hero horizon desktop | **Pass** | Gradient fade verified over white, black, cream, plum: clean on all four. Dome-and-skyline silhouette reads as a place, not a specific real city. Crop window (a horizon band from a taller scene) is well chosen: skyline sits low, fade zone generous for the headline. |
| HW-02 hero horizon mobile | **Pass, note** | Same world, dome near centre, reads at 390px. A faint straight seam is visible in the lower dark band on the contact sheet at high zoom; invisible in situ because that zone renders near-black at page bottom. Derivation from HW-01's source is legitimate per the brief's own text. No change needed. |
| HW-03 ceremony morning horizon | **Pass, note** | Continuity with HW-01 confirmed side by side: same skyline, later hour, sun risen over the same dome. Fade is near-seamless over `--surface-morning`. Over dark grounds the fade zone goes muddy, so this asset must never be placed on a dark surface; current usage is safe. |
| HW-04 hero blossom foreground | **Pass** | Alpha clean on all four grounds, no halo, no fringing at high zoom. Sparse single branch, never a floral border. Composition sits in the lower-left region per brief. |
| PT-01 Hafez | **Pass** | Dignified, warm, painterly. No orientalist props, no invented iconography. |
| PT-02 Rumi | **Pass** | Distinct from Hafez (older, weathered, grey-streaked beard). Same series register. |
| PT-03 Saadi | **Pass** | Profile pose and ochre turban give the series variety; still unmistakably the same commissioned family. |
| PT-04 Khayyam | **Pass** | Frontal, contemplative. Reads as a different man from Rumi at card size. |
| PT-05 Parvin | **Pass** | Equal painterly dignity, arguably the strongest portrait of the five. Early-twentieth-century dress, informed by her photographs, not modernised into stock imagery. |
| CM-01 Yalda | **Pass, note** | Pomegranates on dark wood, longest-night warmth; reads as Yalda to someone who knows it and as warmth to someone who does not. The brief's "low candlelight" is implied by the grade rather than shown as a literal candle: acceptable, the pomegranates carry the meaning. |
| CM-02 Norooz | **Pass** | Morning blossom, clearly distinct in hour and mood from CM-01. |
| CM-03 Chaharshanbe Suri | **Pass** | Small bonfire, embers, festive not hazardous, no people leaping, palette inside the warm family. |
| DV-01 device frame | **Frame pass; content BLOCKER (F1-00)** | The frame asset itself is clean: anti-aliased body, fully transparent procedural cutout at exactly 1290:2796, no Apple trade dress, reads well on night and morning surfaces. But six frame instances sitewide currently show an empty gradient through the cutout. See finding F1-00. |
| CY-01 petal set | **Pass, note** | Three presentations of one approved petal, cycled six ways. At the rendered 32px they read as distinct petals; I explicitly accept the one-source-three-ways substitution against the brief's literal "three individual petals" (recorded as an accepted difference). Contact sheets show a soft shadow-remnant glow on dark grounds only; the petals render exclusively over light morning surfaces, where they are clean. Constraint: never reuse these files over dark surfaces without re-matting. |
| FC-01 Founding Companion band | **Pass, note** | Warm saffron plate, central band genuinely low-contrast for the overlaid text, no text-like marks. The corner relief reads as generic rectilinear fretwork rather than the brief's shamseh; Ealia's cultural approval of this design is already on record in the licence log, so this is noted, not reopened. |

## 2. Poet series review (runner requirement)

1. The five portraits read as one commissioned collection: shared warm-umber grounds, shared
   brush register, consistent lighting. **Pass.**
2. Hafez, Rumi, Saadi, Khayyam, Parvin all present, matching the locked list; a source grep
   for any sixth poet returns nothing. **Pass.**
3. Parvin receives equal visual dignity. **Pass**, emphatically.
4. No poet treatment reads synthetic, stereotyped, or materially weaker. The four classical
   poets all wear turbans, which is period-respectful dress rather than costume cliche; there
   are no scimitars, crystal balls, or invented iconography anywhere. **Pass.**
5. No portrait contains generated writing or text of any kind. **Pass** (inspected at full
   resolution).
6. The band reads as living wisdom rather than a museum grid: the staggered card heights and
   Persian-led name plates carry it. **Pass.**
7. One real defect found in this section, in copy not paint: the Rumi card's Farsi plate says
   "رومی" while the shipped app names him "مولانا" on every surface (verified directly in
   hamdam-ios: `Localization.swift`, Watch, widgets, complications) and this site's own body
   copy (COMPANION-02) also says "مولانا". Finding F1-01, Major.

## 3. Roots review (runner requirement)

1. The three moment cards avoid national stereotype: pomegranates, blossom, and a small fire
   are the moments' own symbols, not flag-waving. **Pass.**
2. Imagery does not overpromise coverage; the copy names Mehregan and Sizdah Bedar as marked
   moments, which remains a product-truth verification item for Ealia (inherited from S3, not
   resolvable from this repo). **Pass visually; claim still flagged.**
3. Countdown hierarchy is understandable and, per the built HTML, correctly sorted soonest
   first with correct values in both locales. **Pass.**
4. The section stays universal while rooted: Persian-led card naming with English body text
   is the right balance. **Pass.**
5. EN and FA compositions are equally intentional; the FA page mirrors order and alignment
   correctly. **Pass.**
6. The North Star's full-bleed illustrated "Cultural Calendar" archway header has no
   counterpart on the site. Ruled an **accepted difference** this round: no header asset was
   ever briefed (the brief scopes Roots to CM-01..03), and adding one now would require fresh
   cultural art and Ealia approval. Recorded explicitly per the North Star rule; a reasonable
   post-launch enhancement.

## 4. Site section audit

Judged from the archived captures plus this session's fresh live captures.

- **Hero.** The reduced-motion/static first-light state is genuinely beautiful and close to
  the North Star's warmth; the scroll-linked arc opening on night is the accepted structural
  divergence recorded in `04-north-star-gap-analysis.md` §2 before implementation began. The
  shamseh line mark, serif stack, and capsule CTA all match the design system. Pass, except
  that the hero's device frame is the most prominent of the six empty screens (F1-00).
- **Mood demonstration.** Composition and behaviour read well; the verse card presents
  Persian dominant over English per C4. The FA slider labels are the clinical Apple Health
  valence strings, a register clash the component itself flags: resolved by F1-02 below.
- **Verse showcase and companion block.** Calm, legible, Persian dominant. Pass.
- **Poets band.** Strong match to the North Star Discover treatment; the clearest win of the
  whole asset effort. Pass (with F1-01's one-word Farsi correction).
- **Context constellation.** Legible, well organised, six signals silent to screen readers as
  designed. The copper ground is saturated but sits inside the ember family and carries dark
  text at comfortable contrast in the rendered output I inspected directly; Lighthouse's
  contrast complaint remains contradicted by direct verification and stays on the manual
  real-device checklist rather than becoming a code change. Pass, minus its empty frame
  (F1-00).
- **Journey pair.** Pass, minus two empty frames (F1-00).
- **Roots.** Pass, see §3.
- **Quiet intelligence.** Modest and honest; five platform claims remain on the S3
  verification list (widgets especially). Visually pass.
- **Privacy trust.** Pass; copy verified in S3 against the policy.
- **Plans and Founding Companion.** Pass. Gold band text zone comfortably legible; no dollar
  figures anywhere; capsule CTAs correct.
- **Final ceremony.** The weakest section against the North Star, and the one place the page
  genuinely under-delivers its own emotional architecture: the North Star's completion bloom
  is large, rich, and central, while the live section is a handful of 32px petals over a
  long stretch of unbroken cream, with all the warmth pooled at the very bottom. At mobile
  widths the empty run approaches a full viewport, which grazes acceptance criterion A6.
  Finding F1-04, Major.
- **Footer, nav, 404.** Pass, except the 404 is English-only (F1-05, Moderate).

## 5. Findings

### Blocker

- **F1-00 DV-01 screen content.** Six device-frame instances sitewide (hero, constellation,
  two journey frames, roots, privacy) show an empty gradient through the transparent cutout.
  Honest as a pending state, correct per B1 in that no invented screen is shown, but a
  marketing page displaying six blank phones cannot receive production visual approval.
  Not fixable from this repository: the correction is to run the existing hamdam-ios
  Screenshot Orchestrator (`Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/`) to export the
  approved deterministic marketing states per locale at 1290x2796, then composite them under
  the cutout with `object-fit: contain`. This was the runner's own anticipated "sole asset
  blocker" and it remains exactly that: the only asset-evidence blocker on the site.

### Major (all implementable by S5; full specifications in `41-sonnet-correction-list.md`)

- **F1-01 Rumi's Farsi name.** `poets.ts` card plate and `verses.ts` attribution say "رومی";
  the shipped app and the site's own body copy say "مولانا". Correct both to "مولانا".
- **F1-02 Mood slider Farsi register.** Replace the interim clinical valence strings with
  warm, natural Farsi at the same emotional range as the EN set:
  سنگین / ناآرام / آرام / سبک / روشن. This resolves the runner's Mood Label Rule item. If
  Ealia prefers byte-continuity with the app's HealthKit-facing strings she can veto in her
  review, but the marketing demo should speak the same warm register in both languages.
- **F1-03 Em dashes in Parvin's card copy.** Rendered on both locales; the no-em-dash rule
  is hard. EN: "the mirror — all with lessons" becomes "the mirror: all with lessons". FA:
  "آینه — همه با درسی" becomes "آینه؛ همه با درسی".
- **F1-04 Ceremony density.** Vary petal sizes across the approved 24-48px range, add fall
  positions (one pass preserved), extend the warm glow higher into the section, and remove
  the near-viewport-height unbroken cream run at mobile widths.

### Moderate

- **F1-05 English-only 404.** Static hosting serves a single 404 document, so a separate
  `fa/404.astro` would never be served for missing FA routes; make the existing 404
  bilingual instead. Approved FA copy is in the correction list.
- **F1-06 Privacy meta description.** Replace the absolute "no analytics" with the page
  body's own precise "no third-party analytics" framing. Exact string in the correction list.
- **F1-07 MOOD-03 English.** "There is more waiting in the app" reads clipped and diverges
  from its own FA line ("منتظرت", waiting for you): make it "There is more waiting for you
  in the app."

### Minor (recorded, no correction ordered)

- CY-01 shadow-remnant glow on dark grounds only; current usage is light-surface only.
- HW-02 faint seam in the lower dark band, invisible in situ.
- FC-01 corner relief reads generic-geometric rather than shamseh; Ealia-approved, noted.
- Mood stops "unsettled" and "steady" both map to `rumi-011`, so one slider step changes the
  label but not the verse; expanding the site's three-verse bank is content ingestion out of
  this round's scope.
- The three em dashes inside `verses.ts` English translations are byte-copies of the app's
  bundled translations; the identical style question is already open with Ealia app-side
  (2026-07-16 audit). Changing them here alone would desync web from app, so they stay until
  Ealia rules once for both.

### Accepted differences (recorded per the North Star rule)

1. Hero is headline-first rather than immediately full-bleed (pre-accepted in
   `04-north-star-gap-analysis.md` §2).
2. Roots has no illustrated full-bleed header (see §3.6).
3. The site's dominant surface is light cream while most North Star screens are night-dark:
   the page's night-opens-dawn-wins arc satisfies A5, and morning is the right default for a
   first-visit marketing page.
4. CY-01 ships as one petal in three presentations rather than three separate source petals.
5. HW-02 is a recomposed crop of HW-01's source rather than an independently generated
   design (authorised by the brief's own wording).

## 6. Copy authority

Every row of `30-final-copy-ledger.md` is resolved in `32-fable-approved-copy-ledger.md`.
Summary: all rows previously marked "Fable F1" are now either approved as written or given
exact replacement text (F1-02, F1-03, F1-07); every "verification required" row stays flagged
to Ealia unchanged (trademark names, App Store ID, Roots coverage, widgets, SIMA review,
CONST-03 wording check); the locked tagline is untouched everywhere it appears.

## 7. What F1 did not grant

Production visual approval is **not granted** this round. Sole reason at asset level: F1-00.
The four Majors are correction-round items I expect S5 to close cleanly. Everything else on
the page is at or above the bar; when real screenshots land in the frames and the Majors are
closed, this site will deserve its poetry.
