# Claude Code handoff — Hamdam website, universal Roots + homepage restructure

Paste this whole file as your prompt in a Claude Code session opened on
`hamdam-website`. It assumes you also have read access to `hamdam-ios`
(product truth), or the quoted facts below are enough on their own.

Design mockups this brief was written from (Design Components, not Astro —
reference only, do not copy the markup):
`Hamdam Homepage (current).dc.html`, `Hamdam Homepage (improved).dc.html`.

---

## Read first

- `AGENTS.md` and `README.md` in this repo.
- `src/styles/global.css` and `src/styles/tokens.css` — every colour, type
  size and spacing value must come from these, not new literals.
- `docs/website-redesign/32-fable-approved-copy-ledger.md` — the copy
  approval process. New English copy below is DRAFT and needs Ealia's
  sign-off, same as every other section.
- In `hamdam-ios`: `CLAUDE.md`, `Hamdam/Hamdam/Calendar/CulturalMoment.swift`,
  `Hamdam/Hamdam/Calendar/CulturalMomentsProvider.swift`,
  `Hamdam/Hamdam/Roots/RootsTabView.swift`.

## Hard constraints — do not break these

1. **CSP is enforcing** (`public/_headers`, `style-src 'self'`, no
   `unsafe-inline`). No inline `style` attributes, no inline `<style>`
   blocks, no per-element `--custom-property` set from markup. Keep
   `inlineStylesheets: 'never'` and `assetsInlineLimit: 0` in
   `astro.config`. Precedent for working around this: the `nth-child`
   petal positions in `FinalCeremony.astro` and the `<Image>`-instead-of-
   background-image in `PlansAndFoundingCompanion.astro`.
2. **Never hand-type Persian.** Regenerate or copy byte-exact from an
   existing approved source. Any new Farsi UI string is Ealia's to author.
   `npm run check:persian` must pass (it is also a pre-commit hook).
3. **No em-dashes or en-dashes in generated text** (`hamdam-ios/CLAUDE.md`,
   Hard "no"s). Australian English throughout. Existing em-dashes inside
   verse translations in `src/data/verses.ts` are approved content — leave
   them alone.
4. **`npm test`** (Vitest) must pass. Add cases for new pure logic rather
   than leaving it untested; follow the existing `src/lib/__tests__/`
   pattern.
5. Every interactive element keeps a 44px minimum touch target and the
   existing `:focus-visible` treatment.
6. RTL must work. Use logical properties (`inset-inline-*`,
   `padding-inline`, `margin-inline`) as the existing components do.
7. Do not deploy. `npm run build && npx wrangler deploy` is Ealia's call.

---

## Task 1 — Rebuild Roots on the universal heritage/region model

**This is the substantive one. Do it first.**

### The problem

`src/components/RootsMoments.astro` presents Roots as Persian-heritage
only: a fixed three-card row of Yalda / Norooz / Chaharshanbe Suri from
`src/lib/countdown.js`, plus a closing line about Mehregan and Sizdah
Bedar. The shipped app has moved past this.

### What the app actually does

`hamdam-ios/CLAUDE.md`: *"Universal audience, not Iranian-diaspora-only."*

`RootsTabView` renders **two independent sections**, and
`CulturalMomentsProvider.matchesHeritageAndRegion` gates them differently:

- **Section 1, "Where you come from"** — `source == .culturalHeritage`,
  gated by the user's `heritages[]` (and by `regions` when an entry
  declares them). Entries tagged `"*"` are universal.
- **Section 2, "Where you live"** — `source == .governmentPublic`, gated by
  **`homeRegion` ONLY, never heritage.** The source comment is explicit
  about why: *"A user whose heritage isn't AU but who lives in AU-QLD
  should still see Ekka — Section 2's whole purpose is 'what's relevant
  where you live', independent of where you're from."*

Heritage values in `CulturalMoment.swift` today: `IR`, `AF`, `TJ`
(Yalda, Norooz, Chaharshanbe Suri, Mehregan, Sizdah Bedar) and `IR` alone
(Tirgan, Sepandarmazgan). Region values are AU-only in v1.0:
`AU-QLD`, `AU-NSW`, `AU-VIC`, `AU-WA`, `AU-SA`, `AU-TAS`, `AU-ACT`,
`AU-NT`. **Roadmap: UK, US, NL and DE regions are next** (Ealia,
2026-07-25) — build the section so adding a region is a data change, not a
layout change.

Live holiday data comes from `RegionHolidayService`; banked
`CulturalMoment` entries are the offline fallback. `resolvedMoments`
defines precedence: heritage entries always win their date, government
entries only surface when the live fetch failed or has a gap.

### What to build

Replace `RootsMoments.astro`'s single card row with two labelled columns:

- **"Where you come from"** — heritage moments, closest-upcoming first.
- **"Where you live"** — public holidays for the region, closest first.

Both computed at build time in `Australia/Brisbane`, as
`src/lib/countdown.js` already does (`getBrisbaneToday`,
`upcomingMoments`). Static output, no client JS for the countdowns.

**The website has no user, so it cannot detect heritage or region.** Two
options — pick one and say which you chose and why:

- **(a) Illustrative, static.** Show one representative pairing (Iranian
  heritage + Brisbane) with a line making clear both are chosen by the
  visitor in the app, not detected by the site. Simplest, zero JS, no CSP
  risk.
- **(b) Interactive switcher.** Chips for heritage (Iran / Afghanistan /
  Tajikistan / not set) and region (the AU states you have banked data
  for, plus "outside Australia"), filtering both lists client-side. This
  is what the mockup does and it demonstrates the model far better. Needs
  a small script and class-toggle-only styling to stay CSP-safe — no
  inline styles. Put the filter logic in a pure, unit-tested module in
  `src/lib/` (mirror `src/lib/moodDemo.js`), not inline in the component.

Show UK / US / NL / DE as visibly "next", not as available.

### Content rules for this section

- Heritage moment names and their EN/FA sentences already exist in
  `RootsMoments.astro`'s `CARD_COPY` — reuse byte-exact.
- Mehregan, Sizdah Bedar, Tirgan and Sepandarmazgan have **no** approved
  EN or FA sentence in this repo. Either add EN drafts flagged for
  sign-off, or render name plus countdown only. Do not invent Farsi.
- AU holiday names come from `CulturalMoment.swift` ids and the app's own
  localisation. Two facts worth surfacing because the source flags them:
  Ekka is **Brisbane LGA only, not statewide QLD**, and 2027 is not yet
  published by the RNA; Boxing Day falls on a weekend in both 2026 and
  2027, so the observed substitute date is what shows.
- **No new Farsi.** There is no approved FA string for "Where you come
  from" / "Where you live" / "Heritage" / "You live in". The FA equivalents
  exist in `hamdam-ios/Hamdam/Hamdam/Core/Localization.swift` at
  `rootsHeritageSection` (line ~3723) and `rootsRegionSection` (~3732) —
  **copy those FA cases byte-exact into `src/data/siteCopy.ts` via a
  generator, do not retype them.** If you cannot reach that file, leave
  the labels untranslated and flag it; an untranslated label is better
  than an invented one.

### Also update

- `src/pages/index.astro` and `src/pages/fa/index.astro` — the section
  comment and any surrounding copy that frames Roots as Persian-only.
- The homepage `description` in both page files and the JSON-LD: they
  currently read as diaspora-only. Reflect the universal audience.

### Acceptance

- Both sections render at all six viewports in `docs/website-redesign/06-screenshot-index.md`, LTR and RTL.
- Filter logic (if you build (b)) has unit tests covering: heritage-only,
  region-only, neither, and the rule that a non-AU heritage with an AU
  region still sees AU holidays.
- `npm test` and `npm run check:persian` pass.

---

## Task 2 — Cut the homepage from thirteen sections to seven

`src/pages/index.astro` currently stacks thirteen sections plus footer,
each a centred single-column block. Two consequences Ealia named: it is
too long, and it does not say what the app does fast enough.

Target structure:

| # | Section | Built from |
|---|---|---|
| 1 | Hero | `HeroCinematic.astro`, one viewport not `200vh` |
| 2 | How it works | `MoodDemo.astro` + the "companion for the daily reflection" prose + `JourneyPair.astro`, merged |
| 3 | Five poets | `PoetsBand.astro`, unchanged |
| 4 | Roots (Task 1) | `RootsMoments.astro`, rebuilt |
| 5 | In your day | "meets you wherever you look" + "quiet companions", merged into one feature grid |
| 6 | Privacy | `PrivacyTrust.astro`, condensed |
| 7 | Plans and close | `PlansAndFoundingCompanion.astro` + `FinalCeremony.astro`, merged |

Retire as standalone sections: "Hamdam is still becoming", the
"quiet companions" prose block, and `ContextConstellation.astro` (fold its
six signals into section 6, where they support the privacy claim rather
than competing with it). All three are DRAFT copy per their own comments
in `index.astro`, so no approved copy is lost.

**The hero is the priority.** It currently spends `200vh` before any
content and leads with the brand line. Lead with function instead — what
the app does, in one sentence, above the fold, next to the App Store badge
and the device. Keep the scroll-driven sunrise as the hero's own treatment
and keep the `?dawn=N` review parameter; do not delete `cinematic.js`.

Do **not** delete the retired components — leave the files in place so the
change is revertible per
`docs/website-redesign/27-release-and-rollback-plan.md`.

Mirror every change in `src/pages/fa/index.astro`.

---

## Task 3 — Copy corrections

1. **Em-dash sweep.** Grep for `—` and `–` across `src/` and remove them
   from all UI copy, keeping those inside `src/data/verses.ts`
   translations. Replace with commas, colons or a full stop.
2. **README is stale.** It says the app is "launching on iPhone August
   2026" while `src/lib/appStore.js` has `RELEASED: true` and the homepage
   description says "available now". Reconcile.
3. **`AppStoreBadge.astro`'s pre-release branch** is now dead code with
   `RELEASED: true`. Either remove it or comment why it is kept.
4. Check `src/pages/fa/index.astro` for a Farsi string reused in more than
   one slot. Prefer an empty slot over the same approved sentence three
   times.

---

## Task 4 — Re-run the screenshot orchestrator at iPhone width

**This one needs a machine and cannot be done from a review session.**

Every screenshot in `src/assets/website-redesign/screenshots/EN|FA/` was
captured at an iPad-ish width: four-column grids, full-bleed rows, and
40–55% empty canvas below the content. Rendered inside a 200–360px device
frame on the marketing site the text is illegible, and no crop or zoom
fixes it — magnifying only trades "too small" for "cut off at the bezel".

Six on-site instances are affected, across `HeroCinematic`,
`ContextConstellation`, `JourneyPair` (×2), `RootsMoments` and
`PrivacyTrust`.

Re-run the orchestrator (`hamdam-ios docs/app-store/phase-3-screenshot-orchestrator.md`,
the raw uncomposed set) at a real iPhone width — 1290×2796 — so the
captures match the frame's own aspect and the content fills the screen.
`06-privacy` is the worst case: roughly 88% empty canvas with a small
centred content band.

Until that happens, the device mockups on the site will keep looking wrong
no matter what the CSS does.

---

## Working style

Commit per task, not per file. Build clean and push before starting the
next. After each task, report: what changed, what you verified and how,
what still needs Ealia. Flag every new English string as DRAFT pending
sign-off, and every place you wanted a Farsi string and did not have one.

If a task turns out to be larger than described, sequence it — do not cut
scope unprompted.
