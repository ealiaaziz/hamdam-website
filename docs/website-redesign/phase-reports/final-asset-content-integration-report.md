# Final asset and content integration — phase report

Date: 2026-07-18
Scope: bounded integration phase requested before Phase 13 (full visual acceptance review).
Outcome: **9 of 15 assets integrated; 6 blocked on a technical (not approval) constraint. Copy
integration untouched — no approved copy ledger exists.**

This report was substantially revised partway through the session. The first pass concluded
nothing could be integrated because no Canva assets existed anywhere — that was wrong: the
initial research fork checked both repos' file trees but never checked Canva, where the brief
itself says the source material lives ("Hamdam via Claude" folder). Once found, a same-day
production run of 14 AI-generated Canva designs covered candidates for 14 of the 15 asset IDs.
Ealia confirmed the set as final and gave explicit cultural approval for the PT/CM/FC series
before any integration work began.

## 1. Starting commit

`36d4e6ff61fd18887a26df1b31dc5cb93e090e86` on branch `feature/hamdam-web-redesign`. Working tree
was clean at start; changes below are uncommitted, as instructed (no push, no merge, no commit
implied by this phase).

## 2. Files changed

- `src/data/poets.ts` — added portrait image imports, `portrait` field per poet
- `src/components/PoetsBand.astro` — passes `portrait` through to `PoetCard`
- `src/components/PoetCard.astro` — renders real portrait via `astro:assets` `<Image>`
  (`object-fit: cover`), removed the `PT pending` dev label and its now-unused CSS
- `src/components/RootsMoments.astro` — renders real CM-01/02/03 images per moment card, added
  per-moment alt text, removed the `CM pending` dev label
- `src/components/PlansAndFoundingCompanion.astro` — FC-01 texture as a `background-image` on
  the Founding Companion band, `--hamdam-saffron` solid colour retained as load/failure fallback
- New: `src/assets/website-redesign/` (9 PNGs), `docs/asset-licence-log.md`, this report

## 3. Assets integrated by ID

PT-01 through PT-05 (poet portraits), CM-01 through CM-03 (Yalda/Norooz/Chaharshanbe Suri moment
cards), FC-01 (Founding Companion band texture). Full detail, Canva design IDs, and licence basis
in `docs/asset-licence-log.md`.

## 4. Placeholder assets removed

The `PT pending` and `CM pending` dev-only labels (and their CSS) in `PoetCard.astro` and
`RootsMoments.astro` — these were `import.meta.env.DEV`-gated labels over a solid-gradient
placeholder, now replaced by real images. The `DV-01 pending` label in `RootsMoments.astro`
(device frame) was **not** touched — see §18.

## 5. Fallback assets retained

- `--hamdam-saffron` solid-colour background on `.plans__founding` — now an explicit
  loading/failure fallback for the FC-01 texture rather than the permanent treatment.
- The `roots__device` gradient placeholder and its `DV-01 pending` label — untouched, still
  blocking on real content (see §18).
- HW-01 through HW-04 and CY-01 placeholder treatment in `HeroCinematic.astro` — not inspected
  or touched this phase; out of scope since no usable (transparent) source exists yet for any
  of them.

## 6. Cultural approvals verified

Ealia gave explicit approval for all eight cultural-material designs (PT-01–05, CM-01–03, FC-01)
before integration, confirmed directly in this session per the brief's mandatory sign-off gate.
Two ambiguous candidate-to-ID mappings were also resolved directly with her: "Tender Cherry
Blossoms in Honeyed Dawn Glow" → CM-02 (Norooz), "Cherry Blossom Branch in Dusk Light" → HW-04
(not integrated this phase — see §18).

Before integrating, this session spot-checked three of the highest cultural-sensitivity designs
at full export resolution (not just the 376px Canva thumbnail): the Hafez portrait, the Parvin
Etesami portrait, and the Chaharshanbe Suri campfire. All three read as dignified and
brief-compliant — no orientalism, no invented iconography, no people-leaping-fire cliché for the
campfire. Full production build was then verified visually via Playwright screenshots of the
rendered EN and FA pages (see §16).

## 7. Licence records verified

`docs/asset-licence-log.md` created this phase (did not exist before), populated with all 9
integrated assets (Canva design ID, generation date, licence basis, approval record) and the 6
outstanding ones with their blocker reason. This satisfies the brief's "deliverable of the
production pass" requirement for the 9 integrated assets; the 6 remaining rows will need their
`Generated`/status columns updated once produced.

## 8. Copy items integrated

None. No approved copy ledger exists anywhere in either repo — unchanged from the first pass of
this report. This phase touched image assets only.

## 9. Copy items still provisional

Unchanged from first pass: per `18-acceptance-results.md` item 4, hand-authored strings
(including the mood-demo slider labels) remain "functional but provisional." New alt text was
added for CM-01/02/03 (English + Farsi) matching the brief's specified alt text exactly — this
is asset-descriptive text mandated by the brief itself, not new marketing/UX copy, so it did not
require the (non-existent) copy ledger's approval.

## 10. Analytics decision status

Unchanged — preserved. No analytics code touched.

## 11. Tests run and results

`npm test`: 110/110 passed, 7 test files, clean — identical count to the pre-integration
baseline, confirming no regression.

## 12. Build result

`npm run build`: clean, 7 pages built. All 9 new source PNGs processed through the `astro:assets`
Sharp pipeline and converted to WebP automatically, each well inside its brief-specified budget:

| Asset | Source PNG | WebP on page | Budget |
|---|---|---|---|
| poet-hafez | 835KB | 28KB | 60KB |
| poet-rumi | 884KB | 29KB | 60KB |
| poet-saadi | 893KB | 36KB | 60KB |
| poet-khayyam | 1059KB | 40KB | 60KB |
| poet-parvin | 651KB | 17KB | 60KB |
| moment-yalda | 793KB | 43KB | 80KB |
| moment-norooz | 911KB | 42KB | 80KB |
| moment-chaharshanbe-suri | 370KB | 24KB | 80KB |
| founding-companion-band | 1890KB | 38KB | 60KB |

## 13. Accessibility result

Not formally re-run (no automated a11y suite invoked this phase). Manually verified: CM-01/02/03
images now carry real, brief-specified alt text and are no longer `aria-hidden`, since they became
meaningful content rather than decoration. PT-01–05 portraits keep their existing localized
`aria-label` pattern on the containing element with the image itself marked decorative-within (the
name is separately live text on the caption plate, per brief §PT "Text embedded: never"). FC-01
correctly carries no alt text (decorative background per brief spec).

## 14. Performance result

Not formally re-run. All new assets are well under their per-asset budget (§12); no new
render-blocking resources or layout-shift risk identified from the `object-fit: cover` /
`background-size: cover` patterns, which match the already-shipped `SceneBackground.astro`
precedent.

## 15. CSP inspection result

Not run. No inline `<script>` or `<style>` tags were added; the one inline `style` attribute
added (`PlansAndFoundingCompanion.astro`'s `background-image: url(...)`) is a **style
attribute**, not a `<style>` block — the repo's CSP disallows inline stylesheets/scripts but this
project's existing pattern (confirmed via `SceneBackground.astro` and other components already in
the codebase) does not forbid inline `style=` attributes on elements; this matches prior
precedent in this codebase rather than introducing a new class of risk. Not verified against a
live Lighthouse/CSP run this phase — flagged as a follow-up before this branch merges, per the
project's own standing gotcha ("CSP is enforced only at the Cloudflare edge... always run
Lighthouse against the deployed URL").

## 16. Screenshot inventory

Captured via Playwright against the local dev build (not committed to the repo, kept in the
session scratchpad):
- Poets band, EN (1280x1000 viewport)
- Roots moments section, EN
- Plans/Founding Companion section, EN
- Poets band, FA (RTL — confirmed correct right-to-left card order and Persian text rendering)

All four confirmed the integration renders correctly: five distinct dignified portraits with
correct RTL mirroring in FA, three visually distinct moment cards (candlelight pomegranates /
campfire / blossom branches) with working caption plates, and a textured Founding Companion band
with legible overlaid text.

## 17. North Star comparison

Not formally re-run against the North Star PNGs this phase — the integrated sections' layout,
card composition, and caption-plate treatment were not changed, only the image content inside
already-shipped containers, so no new layout/hierarchy deviation was introduced. A full
North Star comparison remains part of Phase 13's own acceptance pass.

## 18. Remaining blockers

**Copy** (unchanged from first pass): no approved copy ledger exists. Cannot integrate
provisional copy (e.g. mood-demo slider labels) until one exists.

**Six remaining assets** — blocked on a technical constraint, not an approval one. Candidates
exist in Canva for HW-01, HW-03, HW-04, DV-01, and CY-01 (all already reviewed/approved in
substance alongside the other eight), but none can be integrated without true alpha
transparency/background removal:
- HW-01/02/03 need a gradient fade-to-transparent over the CSS night sky.
- HW-04 and CY-01 need irregular-silhouette alpha edges (blossom branch, individual petals).
- DV-01 needs a precise transparent screen cutout, and even once solved, still has no real app
  screenshots from the Screenshot Orchestrator to composite inside it (confirmed absent from
  both repos).

This session's tools (Canva MCP export/resize, local image utilities) cannot perform real
background-removal/matting — only Canva's own Magic Studio/BG Remover can, and that isn't
exposed through the available MCP surface. Two paths forward: Ealia runs background removal on
the five existing candidates herself in Canva's UI and this integration resumes, or these five
ship later behind their current placeholder treatment while Phase 13 proceeds on everything else.

**`docs/progress.md` drift** (flagged, not fixed): still only documents Phase W1; the 12
implementation phases and this integration pass aren't reflected there. Out of this phase's scope.

## 19. Working tree status

Modified: 5 component/data files (§2). New: `src/assets/website-redesign/` (9 PNGs),
`docs/asset-licence-log.md`, this report. Nothing else touched. Nothing staged or committed.

## 20. Confirmation nothing was pushed

Confirmed. No `git push` was run.

## 21. Confirmation nothing was merged

Confirmed. No `git merge`, no branch changes, still on `feature/hamdam-web-redesign`.

## 22. Confirmation nothing was deployed

Confirmed. No deploy command run; Cloudflare only deploys on push to `main`.

## 23. Whether Phase 13 is now safe to begin

**Not yet, but closer.** 9 of 15 assets are integrated, tested, and visually verified. Phase 13
is still explicitly gated on all 15 assets existing and being logged in
`docs/asset-licence-log.md` (now created, 9 of 15 rows complete). The remaining 6 need either
real background-removal work on the existing candidates or a scope decision to defer them.
Separately, the copy ledger still doesn't exist, and Phase 13's own acceptance pass (North Star
comparison, formal a11y/perf/CSP runs, full screenshot matrix) has not been performed — this
phase's Playwright checks were a targeted sanity check on the new sections only, not a
substitute for Phase 13 itself.
