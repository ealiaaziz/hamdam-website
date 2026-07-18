# Nine-asset integration checkpoint — S1 verification report

Date: 2026-07-18. Scope: S1 of the Final Completion Mega Runner — independently verify the
nine-asset integration already present, uncommitted, in the working tree (from the prior
`final-asset-content-integration-report.md` session), fix anything found broken, then commit.

## 1. Assets verified

| Asset ID | File | Dimensions | Format | Size | Component | Alt/decorative | Placeholder removed |
|---|---|---|---|---|---|---|---|
| PT-01 | `poet-hafez.png` | 900×1273 | PNG source, WebP on page | 856KB → 28KB | `PoetCard.astro` via `poets.ts` | Localized alt on `<Image>`, name lives separately on caption plate | Yes (`PT pending` dev label removed) |
| PT-02 | `poet-rumi.png` | 900×1273 | PNG → WebP | 906KB → 29KB | same | same pattern | Yes |
| PT-03 | `poet-saadi.png` | 900×1273 | PNG → WebP | 915KB → 36KB | same | same pattern | Yes |
| PT-04 | `poet-khayyam.png` | 900×1273 | PNG → WebP | 1085KB → 40KB | same | same pattern | Yes |
| PT-05 | `poet-parvin.png` | 900×1273 | PNG → WebP | 667KB → 17KB | same | same pattern | Yes |
| CM-01 | `moment-yalda.png` | 900×1273 | PNG → WebP | 812KB → 43KB | `RootsMoments.astro` | Real localized alt (EN/FA), no longer `aria-hidden` | Yes (`CM pending` dev label removed) |
| CM-02 | `moment-norooz.png` | 900×1273 | PNG → WebP | 933KB → 42KB | same | same | Yes |
| CM-03 | `moment-chaharshanbe-suri.png` | 900×1273 | PNG → WebP | 380KB → 24KB | same | same | Yes |
| FC-01 | `founding-companion-band.png` | 1600×2263 | PNG → WebP | 1936KB → 39.5KB | `PlansAndFoundingCompanion.astro` | Decorative (`alt=""`), per brief item 19 | N/A (never had a dev label; was a solid-gradient CSS fill) |

All nine confirmed present in `src/assets/website-redesign/`, imported and consumed correctly,
processed through the `astro:assets` Sharp pipeline, and within their per-asset size budget from
`docs/asset-licence-log.md`.

Licence and cultural-approval records for all nine confirmed present and complete in
`docs/asset-licence-log.md` (Canva design ID, generation date, licence basis, approval date).

No unapproved text is baked into any of the nine images — verified by direct visual inspection
during the original integration session (spot-checked at full export resolution) and unchanged
since.

## 2. Defect found and fixed this checkpoint

**FC-01 was wired with an inline `style="background-image: url(...)"` attribute**
(`PlansAndFoundingCompanion.astro`). The site's CSP (`public/_headers`) sets
`style-src 'self'` with no `unsafe-inline`, which blocks inline `style` *attributes* on
elements the same way it blocks inline `<style>` blocks — this is the identical bug class
already found and fixed once in this redesign (the ceremony petals, recorded as G6 in
`18-acceptance-results.md`). The prior integration report's claim that this had precedent in
`SceneBackground.astro` was checked directly and is incorrect: `SceneBackground.astro` renders
its background photograph through the `<Image>` component with CSS classes only, no inline
style attribute anywhere. A repo-wide grep confirmed no other component uses an inline `style=`
attribute.

**Fix applied**: `foundingCompanionBand` is now rendered via `astro:assets`'s `<Image>`
component (matching `SceneBackground.astro`'s actual pattern), absolutely positioned behind the
text content (`z-index: 0`) with the text stack raised to `z-index: 1`. The `--hamdam-saffron`
background-color remains on `.plans__founding` as the load/failure fallback, unchanged in
intent from the original design. `alt=""` preserved (decorative texture, per brief item 19 — the
band's meaning is its overlaid live text, not the image).

Rebuilt and re-tested after the fix:
- `npm run build`: clean, 7 pages, all 9 assets still processed correctly.
- Confirmed via grep against `dist/index.html` and `dist/fa/index.html`: zero inline `style=`
  attributes remain anywhere in the built output.
- `founding-companion-band` WebP output: 39.5KB, unchanged budget compliance (60KB budget).
- `npm test`: 110/110 passed, unchanged.

Not re-captured this pass: a fresh Playwright screenshot of the corrected markup. Treated as
low risk — the fix is a CSS/markup equivalence change (absolutely-positioned `<Image>` instead
of a CSS `background-image`), not a new visual treatment, and mirrors `SceneBackground.astro`'s
already-shipped, already-screenshot-verified pattern exactly. Flagged for a fresh screenshot as
part of S4's full evidence capture.

## 3. Working tree inspection

Searched for: scratchpad screenshots, Playwright temp output, candidate Canva exports, temp
scripts, build output, secrets, environment files, unrelated source changes, and the six
incomplete assets (HW-01 through HW-04, DV-01, CY-01) incorrectly staged as final.

Result: none found. `git status --porcelain` shows exactly the nine integrated assets, the five
component/data files that consume them, `docs/asset-licence-log.md`, this checkpoint report, the
prior integration report, and `FINAL-COMPLETION-STATE.md`. No `dist/`, no `.env`, no secrets, no
stray files. The six remaining asset IDs do not appear anywhere in the untracked/modified set.

## 4. Verification run results (post-fix)

- **Test suite**: `npm test` → 110/110 passed, 7 test files, clean.
- **Production build**: `npm run build` → clean, 7 pages built, all 9 assets processed.
- **Persian byte validation**: `npm run check:persian` → passed, all Persian strings within the
  allowed Unicode set.
- **Astro/type checks**: not run. `astro check` requires installing `@astrojs/check` +
  `typescript`, neither present in `package.json` and never previously installed in this repo's
  history (confirmed: not in `devDependencies`, not run in any prior phase report despite one
  mention in `03-technical-inventory.md`). Per the mega runner's global rule 20 ("do not add a
  new dependency unless an existing requirement is impossible without one, and the decision is
  documented before installation"), this was not installed. The production build's own Vite/Astro
  compilation step type-processes every `.astro` file and would fail on a real type error; it
  passed cleanly.
- **CSP source inspection**: performed manually against `dist/*.html` (see §2) — zero inline
  `<style>` blocks, zero inline `style=` attributes after the fix, all `<script>` tags are
  either external `type="module"` (allowed by `script-src 'self'`) or the pre-existing
  `type="application/ld+json"` block (inert data, not newly introduced this session).
- **Accessibility**: not formally re-run via automated tooling this checkpoint (no new a11y
  tooling added, consistent with rule 20). Manually confirmed: CM-01–03 carry real localized alt
  text and are no longer `aria-hidden`; PT-01–05 keep the existing localized `aria-label` /
  caption-plate pattern; FC-01 correctly carries `alt=""` as decorative background content.

## 5. Confirmation

- Working tree: clean of anything unexpected; only the intended nine-asset changes plus this
  checkpoint's fix and reports.
- No `git push` run.
- No `git merge` run, branch unchanged (`feature/hamdam-web-redesign`).
- No deployment triggered.
