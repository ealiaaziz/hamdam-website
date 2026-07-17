# Hamdam Website Redesign: Creative Direction

Binding creative specification. Produced 2026-07-18 from direct inspection of the North Star
mockups (`hamdam-ios/docs/design/north-star/Designer (2).png` and `Designer (3).png`), all six
audit documents (`00` to `06`), every baseline screenshot state, the approved App Store listing
draft (`hamdam-ios/docs/app-store/v1.0-listing.md`), the existing legal pages, and the
`hamdam-web-director` skill. The North Star mockups are the pass or fail authority for this
direction; nothing below contradicts them.

## 1. Concept evaluation

Two concepts were scored. The brief supplied "A sky that listens." One alternative was
developed to test it, per the brief's instruction not to accept the supplied concept
automatically.

### Candidate A: "A sky that listens"

The visitor enters a living emotional sky that responds, with restraint, to mood, weather,
poetry, place and reflection. The sky is the product metaphor made literal: Hamdam reflects
your heart and your sky, so the website's sky reflects you back.

### Candidate B: "The dawn you return to"

The page is one slow, continuous dawn. The visitor arrives at night, scrolls through first
light, and reaches morning at the download action. The structure mirrors the app's daily
ritual and its reflection completion ceremony (saved, bloom, verse, glow, return).

### Scores (out of 10 per criterion)

| Criterion | A: Sky that listens | B: Dawn you return to |
|---|---|---|
| 1. Hamdam brand fit | 10 | 9 |
| 2. North Star continuity | 9 | 9 |
| 3. Emotional distinctiveness | 9 | 7 |
| 4. Universal audience relevance | 9 | 9 |
| 5. Persian cultural authenticity | 8 | 8 |
| 6. Product clarity | 8 | 9 |
| 7. App Store conversion | 8 | 9 |
| 8. Technical feasibility | 9 | 9 |
| 9. Mobile feasibility | 9 | 9 |
| 10. Accessibility | 8 | 9 |
| 11. Performance risk | 8 | 9 |
| 12. Long term maintainability | 9 | 9 |
| **Total** | **104/120** | **105/120** |

### Decision: "A sky that listens", structured as one long dawn

The totals are effectively tied, and the two concepts are not rivals; they answer different
questions. A answers "what does this place feel like" (a sky that responds). B answers "how
is the page organised" (a single dawn arc). B alone is emotionally safer but less distinctive:
"daily ritual" framing is common across wellness marketing, and B scored 7 on distinctiveness
for exactly that reason. A alone risks vagueness about what the product actually is, which is
why it scored 8 on product clarity and conversion.

**The selected direction is "A sky that listens," with candidate B adopted as its structural
spine.** The sky listens; the dawn is how the page proves it. This is not novelty-driven
replacement: it keeps the supplied concept and closes its two weakest scores (product
clarity, conversion) using the structure of the alternative.

### What "listening" concretely means (and what it never means)

The sky responds to exactly three inputs, and no others:

1. **Scroll position.** The page background is a solid, subtly changing sky surface that
   moves from night, through first light, to warm morning as the visitor moves toward the
   download action. This extends the site's existing, tested, scroll-driven hero timeline
   (`HeroCinematic.astro`, `cinematic.js`) page-wide instead of replacing it.
2. **A stated feeling.** One interactive moment (Section 3 in `11-page-design-specification.md`)
   lets the visitor move the same kind of mood slider the app really has. The sky within that
   section, and the verse presented, respond to the chosen feeling. This mirrors a real
   product behaviour, so the demonstration is product proof, not theatre.
3. **Language.** Choosing Farsi mirrors the composition itself (light source, reading order,
   constellation direction), not just text alignment.

The sky never responds to pointer position, never chases the cursor, never autoplays audio,
and never animates without one of the three inputs above. Restraint is the concept: a
listener is quiet.

## 2. Why this wins for Hamdam specifically

- The tagline is the concept. "Hamdam reflects your heart and your sky" stops being a line
  of copy and becomes what the page does.
- It is continuous with the North Star mockups, which are dominated by sky: dawn over the
  city in Today, stars in the empty states, warm glow in the ceremony screens.
- It is universal (everyone lives under this sky) while the poetry, the calendar, and the
  Persian script carry the cultural root. Culture is the content, never the decoration.
- It is technically humble. Solid gradient surfaces driven by CSS custom properties, layered
  2.5D imagery in one hero, no WebGL, no animation library. The heaviest machinery already
  exists in the repo and is unit tested.

## 3. Emotional arc of the page

| Scroll stage | Sky state | Visitor's question | Page's answer |
|---|---|---|---|
| Arrival | Night, stars, first warmth at horizon | What is this? | The hero: name, tagline, product sentence, real app on screen |
| Early scroll | First light | How does it work? | The mood demonstration: tell it how your heart feels |
| Middle | Warming dawn | Who is behind these words? What does it know about me? | Five poets; the context constellation; journey and reflections |
| Late | Full dawn | Can I trust it? What does it cost? | Roots; privacy; Free, Plus and Founding Companion |
| End | Morning, fully warm | Where do I get it? | The dawn completes exactly at the download ceremony |

The download action is the sunrise. The visitor does not "reach the bottom of a page"; they
arrive at morning.

## 4. Governing principles (binding on every section)

Carried from the North Star principles panel and the web-director skill, made specific:

1. **Feel like a place, not a dashboard.** One focal point per section. Emotion first,
   information second.
2. **The app is the proof.** Wherever the product is demonstrated, use real screenshots from
   the in-app Screenshot Orchestrator (12 real shots, 6 EN + 6 FA, at 1290x2796; see
   `hamdam-ios/docs/app-store/phase-3-screenshot-orchestrator.md`). No invented screens, no
   invented capabilities, no fabricated reviews, counts, awards or press.
3. **Warm dawn remains the primary visual world.** Dark night surfaces open the page, but
   the destination and the dominant memory is dawn: peach, saffron, cream, with indigo depth.
4. **Persian rooted, not Persian decorated.** The five locked poets (Hafez, Rumi, Saadi,
   Khayyam, Parvin Etesami) and the real cultural calendar are the cultural presence. No
   ornament clip art, no fake calligraphy, no stereotype. Persian text is always live web
   text from approved repo sources; it is never retyped, never generated into imagery.
5. **Exactly three dimensional moments.** The cinematic hero, the mood demonstration, the
   final dawn ceremony. Everything else is editorial: strong type, calm spacing, real
   photography inside controlled compositions, real product screens.
6. **Both languages are first languages.** Farsi receives intentional composition (mirrored
   light, mirrored order), a type scale tuned for Vazirmatn, and identical content depth.
7. **Nothing hides the App Store action.** The conversion path is always one glance away
   (`15-conversion-specification.md`).
8. **No em dashes or en dashes in any public copy**, either language.

## 5. What changed from the current site, and why

| Current state (from audits) | Direction |
|---|---|
| Always-light cream page; North Star screens are mostly warm dark | Page opens at night and earns its way to cream morning: both moods, one arc |
| Photography marginal on desktop, absent on mobile | Controlled photographic compositions in every major section, mobile included, never as repeated full-bleed structure |
| Poets are text-only cards | Portrait gallery band with commissioned painterly portraits (artistic interpretations, recorded as such; see `14-canva-asset-brief.md`) |
| Cultural moments share one paragraph and one image | Norooz, Yalda and Chaharshanbe Suri each get their own card, image and live countdown, exactly as the app's Roots tab really behaves |
| No app screenshots anywhere | Real orchestrator screenshots in device frames are the spine of the middle page |
| CTA is a 12px-radius rectangle | Full capsule pill, matching the North Star "Take a moment to reflect" |
| Hero is gradient plus SVG stars only | Same system, elevated to a layered 2.5D composition with photographic horizon plates (hero decision: `11-page-design-specification.md` §Hero) |

## 6. What is explicitly rejected

Neon AI aesthetics, purple gradients, 3D tech demonstration, WebGL dependence, floating
objects without meaning, bouncing cards, aggressive parallax, pointer chasing, autoplay
audio, full-bleed photography as repeated structural background, invented product screens,
invented poetry, invented social proof, national stereotype, exoticised ornament.

## 7. Companion documents

| File | Contents |
|---|---|
| `11-page-design-specification.md` | Every section, all 14 required attributes, hero technology decision |
| `12-design-system.md` | Tokens, typography, spacing, surfaces, motion values, focus, contrast |
| `13-motion-specification.md` | The three dimensional moments, global sky choreography, reduced motion |
| `14-canva-asset-brief.md` | Production-ready Canva asset briefs, all fields per asset |
| `15-conversion-specification.md` | CTA system, analytics, campaign parameters, claims verification |
| `16-visual-acceptance-criteria.md` | Pass or fail checks against the North Star authority |
| `17-sonnet-implementation-handoff.md` | Build order, technical constraints, verification gates |
