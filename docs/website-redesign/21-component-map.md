# Hamdam Website Redesign: Component Map

Maps every approved page section (`11-page-design-specification.md`) onto existing or new
Astro components, states what changes and what stays untouched, and cross-references the
phase in `20-implementation-plan.md` that owns each row. File paths are exact as of commit
`ce98883` (`main`).

## Existing components: disposition

| File | Current role | Redesign disposition | Owning phase |
|---|---|---|---|
| `src/components/HeroCinematic.astro` | Scroll-driven hero, `?dawn=N` review parameter | Major revision: composition rebuilt per page spec §2, scroll wiring evolved, review parameter kept | 3, 4 |
| `src/components/VerseShowcase.astro` | Current homepage verse display | Superseded by `MoodDemo.astro` (new); confirm no other page references it before removal, do not delete until Phase 5 lands and a route audit confirms zero remaining usages | 5 |
| `src/components/VerseCard.astro` | Verse presentation (Persian dominant, English beneath, attribution) | Reused as-is inside `MoodDemo.astro`; this is the mood demonstration's verse presentation per doc 17's reuse table | 5 |
| `src/components/PoetCard.astro` | Existing poet card | Evolves into the portrait-card treatment (page spec §4); data source (`poets.ts`) untouched | 6 |
| `src/components/SceneBackground.astro` | Existing scene-photo background | Reused where a section needs a single photographic scene plate (mood demo optional texture, roots cards); not reused for the sky arc itself (that is a gradient, not a photo) | 5, 8 |
| `src/components/SectionDivider.astro` | Existing visual divider between sections | Likely redundant once the continuous sky surface owns section separation (page spec "Global sky choreography"); keep in the tree but audit for zero remaining usages at Phase 13, remove only then if confirmed unused | 13 |
| `src/components/FeatureIcon.astro` | Existing icon wrapper | Reused for the icon set `IC-01` wherever a line icon appears (constellation nodes, privacy trust row) | 7, 9 |
| `src/components/AppStoreBadge.astro` | Existing badge/CTA wrapper | Reused for every App Store action (hero, nav, mid-page, ceremony, sticky); extended, not forked, to avoid four divergent CTA implementations | 2, 3, 9 |
| `src/components/LanguageToggle.astro` | Existing locale switcher | Repositioned (nav inline-end, footer second instance); internal logic (`switchLocalePath` consumption) untouched | 2 |
| `src/components/HamdamLogotype.astro` | Existing wordmark | Reused everywhere the mark appears (nav, hero, ceremony gold state); no new logotype variant needed, gold-state colour is a CSS token swap, not a new asset | 2, 3, 9 |
| `src/components/PersianShamseh.astro` | Existing shamseh mark | Reused identically; gold-state crossfade (ceremony) is a token/opacity change on the existing component, not a new component | 9 |
| `src/components/Footer.astro` | Existing footer | Extended with the second language toggle instance and Ganjoor.net attribution line if not already present; legal links unchanged | 13 (final verification), edits land wherever Footer needs its toggle addition, tracked loosely under Phase 2 since it shares the nav's language-control scope |
| `src/components/LegalSection.astro` | Legal page section renderer | Untouched; privacy and terms pages are explicitly protected content (`23-route-and-content-protection.md`) | none (protected) |
| `src/layouts/BaseLayout.astro` | Page shell, meta tags, locale/dir wiring | Extended with nav bar markup, sky-surface root element, `main` data-attribute for threshold flips; existing meta/OG/structured-data output untouched | 2, 4 |

## New components required

| File | Owns page spec section | Owning phase | Depends on |
|---|---|---|---|
| `src/components/NavBar.astro` | §1 Navigation | 2 | `HamdamLogotype`, `LanguageToggle`, `AppStoreBadge` |
| `src/components/StickyDownloadAction.astro` | Conversion spec §2 (mobile sticky CTA) | 2 | `AppStoreBadge`, `src/lib/stickyCta.js` |
| `src/components/MoodDemo.astro` | §3 Emotional weather demonstration | 5 | `VerseCard`, `src/data/verses.ts`, `src/lib/moodDemo.js` |
| `src/components/PoetsBand.astro` | §4 Five poet wisdom experience | 6 | `PoetCard` (evolved), `src/data/poets.ts` |
| `src/components/ContextConstellation.astro` | §5 Context constellation | 7 | `FeatureIcon`, device frame markup, orchestrator Today shot |
| `src/components/JourneyPair.astro` | §6 Journey and reflections record | 7 | Device frame markup, orchestrator `02-reflect` and `05-journey` |
| `src/components/RootsMoments.astro` | §7 Roots and region experience | 8 | `SceneBackground` (optional), `src/lib/countdown.js`, device frame markup |
| `src/components/PrivacyTrust.astro` | §8 Privacy | 9 | `FeatureIcon`, orchestrator `06-privacy` |
| `src/components/PlansAndFoundingCompanion.astro` | §9 Plans and Founding Companion | 9 | `PersianShamseh` (relief motif reference) |
| `src/components/FinalCeremony.astro` | §10 Final dawn download ceremony | 9 | `AppStoreBadge`, `PersianShamseh`, `HamdamLogotype` |
| `DeviceFrame.astro` (new, shared) | `DV-01` frame used in §2, §5, §6, §7, §8 | First needed in Phase 3, reused through 9 | Recommend extracting a single shared device-frame component the first time it is needed (Phase 3, hero) rather than duplicating the frame markup five times; every subsequent phase that needs a screenshot in a frame reuses it |

A shared `DeviceFrame.astro` is a deliberate deviation worth noting explicitly: nothing in
`11-page-design-specification.md` names it as a component, but five separate sections (§2,
§5, §6, §7, §8) each specify "a real device frame showing the real [X] screenshot" with
identical treatment (`12-design-system.md` §14: one neutral frame, real orchestrator
screenshots only, `--shadow-lift`, never tilted). Building it once in Phase 3 and reusing it
avoids five divergent frame implementations, which the design system's own "one neutral
frame" rule effectively requires.

## New library modules required

| File | Purpose | Owning phase | Pure/tested |
|---|---|---|---|
| `src/lib/stickyCta.js` | Sticky/nav CTA visibility state machine (hero/mid/ceremony/none visible) | 2, extended in 9 | Pure function, unit tested |
| `src/lib/moodDemo.js` | Feeling-to-scene and feeling-to-verse mapping, settle-debounce logic | 5 | Pure function, unit tested |
| `src/lib/countdown.js` | Next-occurrence date maths for Yalda, Norooz, Chaharshanbe Suri | 8 | Pure function, unit tested |
| Sky ramp function (location: extend `src/lib/cinematic.js`, do not create a new file) | Progress-to-colour-stop mapping, threshold flips at 0.45/0.8, clamping | 4 | Pure function, unit tested |
| Campaign parameter mapper (location: extend `src/lib/appStore.js`, beside `appStoreUrl()`) | Inbound query to App Store URL mapping, `ct`/`pt` handling, fallback default | 9 | Pure function, unit tested |

Reusing `cinematic.js` and `appStore.js` as extension points (rather than new files) follows
doc 17 §2's explicit reuse table and avoids forking logic that already has proven unit-test
coverage.

## Untouched, protected components and files

Per `23-route-and-content-protection.md` in full; listed here for component-map completeness:
`src/pages/privacy.astro`, `src/pages/terms.astro`, `src/pages/fa/privacy.astro`,
`src/pages/fa/terms.astro`, `src/pages/404.astro`, `src/lib/locale.js`,
`src/data/verses.ts`, `src/data/siteCopy.ts`, `src/data/poets.ts` (all three consumed
read-only), `astro.config.mjs`, `wrangler.jsonc`, `public/_headers`, `public/robots.txt`,
`public/site.webmanifest`.
