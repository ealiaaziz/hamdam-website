# Hamdam Website Redesign: Implementation Handoff

Instructions for the implementation session (Sonnet or equivalent) that will build the
redesign in this repository. This is a handoff, not a licence to redesign: the binding
documents are `10` through `16` in this directory, and where they are silent, the
`hamdam-web-director` skill and the North Star mockups govern. Do not re-litigate decisions
recorded there.

## 0. Read first, in order

1. `.claude/skills/hamdam-web-director/SKILL.md` (repo authority and workflow; its
   verification checklist applies to every phase below)
2. `10-creative-direction.md` (the concept and governing principles)
3. `11-page-design-specification.md` (what to build, section by section)
4. `12-design-system.md`, `13-motion-specification.md` (how it looks and moves)
5. `15-conversion-specification.md` (CTA logic, flags, parameters)
6. `16-visual-acceptance-criteria.md` (your definition of done)
7. The two North Star PNGs in `hamdam-ios/docs/design/north-star/` (look at them,
   directly, before writing any CSS)

## 1. Hard technical constraints (all pre-existing, all verified in the audit)

- **Stack stays:** Astro 7 static output, Tailwind v4 via `@tailwindcss/vite`, npm,
  Cloudflare Pages deploy on push to `main`. No framework migration, no hosting change,
  no CMS, no routing rewrite, no animation library, no WebGL, no new runtime
  dependencies. New devDependencies require a stated reason and Ealia's approval.
- **CSP is enforcing:** `style-src 'self'`, `script-src 'self'` (plus Cloudflare
  Insights), `assetsInlineLimit: 0`, `inlineStylesheets: 'never'`. Every style and script
  is a real external file. No inline `style=""` attributes for anything dynamic: dynamic
  values go through CSS custom properties set via JS `style.setProperty` on elements
  (this is how the existing hero already works; follow `HeroCinematic.astro`).
- **Persian text:** never typed by hand, never edited inline. Verses come from
  `src/data/verses.ts`; FA UI copy extends `src/data/siteCopy.ts` through the approved
  pipeline; `npm run check:persian` must pass at every commit (pre-commit hook enforces).
  New FA marketing copy must be flagged to Ealia for approval before ship.
- **No em or en dashes** in any authored copy, comment, or doc, either language.
- **Locale architecture stays:** `/` EN, `/fa/*` FA mirrors, `src/lib/locale.js` as the
  single source of truth, `dir="rtl"` at the html element, logical properties for new
  layout (prefer `ps-`/`pe-`/`start-`/`end-` utilities; do not copy the older
  per-locale `pl-`/`pr-` pattern into new components).
- **Never push, deploy, or flip `APP_STORE.RELEASED`** without explicit instruction.

## 2. What already exists and must be reused, not rebuilt

| Existing | Reuse as |
|---|---|
| `HeroCinematic.astro` + `src/lib/cinematic.js` (scroll timeline, `?dawn=N`, reduced-motion fallback, unit tests) | The foundation of the page-wide sky arc; extend the pure functions, keep the review parameter |
| `[data-reveal]` + `src/lib/reveal.js` + IntersectionObserver wiring | The editorial reveal system, unchanged parameters per `13-motion-specification.md` §5 |
| `src/lib/appStore.js` (ID, RELEASED flag, `appStoreUrl`) | All CTA logic; add the campaign-parameter pure function beside it |
| `PersianShamseh.astro`, `HamdamLogotype.astro` | The mark, everywhere it appears (nav, hero, ceremony gold state) |
| `VerseCard.astro`, `src/data/verses.ts` | The mood demonstration's verse presentation |
| `PoetCard.astro`, `src/data/poets.ts` | Evolves into the portrait card (keep the data module untouched) |
| Token layers (`global.css` `@theme`, `tokens.css`) | Extend with the §1 new tokens; never fork a third token system |
| `LegalSection`, legal pages, 404, sitemap, OG pipeline, `_headers` | Untouched except colour-token inheritance |

## 3. Build order (commit per phase, keep the site shippable at every phase)

Phase numbering note: these are website-repo work packages; confirm the next free W-number
against `docs/progress.md` before naming them (the iOS repo's phase rules apply in spirit).

1. **W-A Design system foundation.** New tokens, fluid type scale, pill radius migration,
   two-token focus system, surface-stage data attributes. No visual redesign yet; existing
   page must still render correctly. Unit tests for the sky ramp function.
2. **W-B Sky arc.** Page-level `--sky-progress` module (evolved `cinematic.js`), fixed sky
   surface, threshold token flips, reduced-motion behaviour, `?dawn=N` page-wide. Ship
   behind visual parity: sections still their current selves on top of the new sky.
3. **W-C Hero.** 2.5D composition with HW-01/02/04, device frame with orchestrator shot,
   settle-in, RTL mirroring. (Blocked on assets: HW series, DV-01, orchestrator export.)
4. **W-D Sections 3 to 9.** In scroll order: mood demonstration (with unit-tested state
   map), poets band, constellation, journey pair, roots cards (unit-tested countdown),
   privacy, plans and Founding Companion. Each is its own commit with its own screenshot
   check.
5. **W-E Ceremony and conversion system.** Final section, sticky mobile CTA logic,
   mid-page CTA, campaign parameter pass-through (unit tested), badge gating.
6. **W-F Acceptance pass.** Run `16-visual-acceptance-criteria.md` in full: viewport
   matrix screenshots, keyboard and VoiceOver pass, Lighthouse both locales, reduced
   motion captures, greps (dashes, Forough, prices), `npm test`, `npm run build`,
   `npm run check:persian`. Fix, re-run, record results in a new
   `docs/website-redesign/18-acceptance-results.md`.

## 4. Asset dependencies and their gates

- **Real app screenshots (blocking W-C, W-D):** run the Screenshot Orchestrator in the
  iOS repo per `hamdam-ios/docs/app-store/phase-3-screenshot-orchestrator.md`
  (`exportAll()` in a DEBUG simulator launch), pull the 12 PNGs from the simulator
  sandbox, and commit web-optimised derivatives under `src/assets/app/`. If Ealia has
  since captured approved ASC screenshots, prefer those. Never substitute mocks.
- **Canva assets (blocking W-C, W-D):** produced per `14-canva-asset-brief.md`, PT and CM
  series gated on Ealia's cultural approval, all fourteen logged in
  `docs/asset-licence-log.md`.
- **Copy:** EN copy drafts exist in the page spec's "primary message" fields; final EN
  copy and all new FA copy require Ealia's approval before merge. Reuse the approved App
  Store description register wherever the same fact is described.
- If an asset is late, build the section with a clearly-labelled solid-tone placeholder
  block (never a stock image, never an invented screen) and keep the section behind a
  single `SHOW_REDESIGN_SECTION_X` build flag if it would otherwise ship incomplete.

## 5. Testing expectations (extend the existing 60-test suite)

New unit tests, same Vitest pattern as `src/lib/__tests__/`:

- Sky ramp: progress-to-colour-stop mapping, threshold flips at 0.45/0.8, clamping.
- Mood demonstration: feeling-to-scene and feeling-to-verse mapping, settle debounce
  logic as a pure function.
- Countdown: next-occurrence date maths for Yalda, Norooz, Chaharshanbe Suri, including
  year rollover, computed in Australia/Brisbane.
- Campaign parameters: inbound query to App Store URL mapping, `ct`/`pt` handling,
  fallback default.
- Sticky CTA visibility: state machine (hero visible / mid visible / ceremony visible /
  none visible) as a pure function.

## 6. Things you will be tempted to do; do not

- Do not rebuild the app's UI in HTML "because the screenshot is late."
- Do not add GSAP, Framer Motion, Lenis, three.js or any animation/scroll library.
- Do not inline styles or scripts to dodge the CSP; fix the architecture instead.
- Do not soften the night surfaces to "fix" contrast; fix the token, keep the arc.
- Do not add prices, ratings, counts, or any claim not in the verification table
  (`15-conversion-specification.md` §13).
- Do not touch DNS, Cloudflare settings, analytics toggles, or the RELEASED flag.
- Do not "improve" Persian copy, spacing, or punctuation by hand, ever.
- Do not skip the reduced-motion rendering because the animated one looks better; the
  reduced rendering is a first-class deliverable and an acceptance gate.

## 7. Definition of done

Every gate in `16-visual-acceptance-criteria.md` recorded as PASS (or waived in writing by
Ealia) in `18-acceptance-results.md`, all tests green, build clean, Persian check green,
Lighthouse floors met, and a side-by-side screenshot set (page vs North Star mockups)
attached for Ealia's final visual approval. The redesign does not deploy until Ealia says
so.
