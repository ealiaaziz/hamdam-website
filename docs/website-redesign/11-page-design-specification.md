# Hamdam Website Redesign: Page Design Specification

Binding section-by-section specification for the redesigned homepage (`/` and `/fa/`).
Concept: "A sky that listens," structured as one long dawn (`10-creative-direction.md`).
Design tokens, type and motion values referenced here are defined in `12-design-system.md`
and `13-motion-specification.md`. Asset IDs reference `14-canva-asset-brief.md`. CTA and
measurement behaviour reference `15-conversion-specification.md`.

## Page structure decision

All twelve candidate sections are retained; none is dropped. Two merges keep the page to one
focal point per screen:

- **"Your Journey insights" merges with the reflections record** into one section (§6),
  because both answer the same visitor question ("what does it keep, and what does it give
  back?") and splitting them would force two adjacent screenshot sections.
- **"Free and Plus value" and "Lifetime Founding Companion" merge** into one commerce
  section (§9) with the Founding Companion as its elevated closing treatment, because a
  visitor weighs them as one decision.

Final scroll order: Navigation, Hero, Mood demonstration, Five poets, Context constellation,
Journey and reflections, Roots, Privacy, Plans and Founding Companion, Final dawn ceremony,
Footer. The three dimensional moments are the Hero, the Mood demonstration, and the Final
dawn ceremony. Nothing else is dimensional.

## Global sky choreography (applies to §2 through §10)

The page background is a single fixed-position solid-gradient sky surface whose colour state
is driven by scroll progress through CSS custom properties: night (indigo `#1B1B3A` family)
at the top, through dusk ember and first-light peach, arriving at warm cream morning at the
final ceremony. Sections sit on this surface as translucent-free, solid content planes.
This satisfies the guardrail "solid or subtly changing dark and dawn surfaces for page
structure." Text colour tokens flip per surface stage (see `12-design-system.md` §Surface
hierarchy). Reduced motion: the choreography still occurs (it is scroll-driven state, not
animation over time) but all crossfades become instant threshold changes; there is no
time-based sky movement at all. Full mechanics: `13-motion-specification.md` §2.

---

## Section 1: Navigation

1. **Strategic purpose.** Orient without distracting; keep language choice and the download
   action reachable from anywhere.
2. **Primary message.** "This is Hamdam. It is available in English and Farsi. You can get
   it on iPhone."
3. **Visual composition.** A single slim bar: Hamdam logotype with shamseh mark at the
   inline-start, language toggle and one compact CTA pill at the inline-end. Transparent
   over the night sky at page top; gains a solid night-surface backing with a hairline
   bottom border after 24px of scroll. No menu, no hamburger, no dropdowns (the site has no
   subpages worth a menu; legal links live in the footer).
4. **Real product evidence required.** None. Logotype and shamseh are the existing coded
   components.
5. **Desktop behaviour.** Fixed position. Compact CTA appears in the bar only after the hero
   CTA scrolls out of view (one conversion action visible at a time, never zero).
6. **Mobile behaviour.** Same bar, tighter padding. The bar CTA is suppressed in favour of
   the sticky mobile download action (`15-conversion-specification.md` §2).
7. **Motion behaviour.** Background backing fades in over 200ms on first scroll. Nothing else.
8. **Reduced motion behaviour.** Backing appears without fade.
9. **Farsi RTL behaviour.** Logotype at inline-start (visual right), toggle and CTA at
   inline-end (visual left). Wordmark renders "همدم" primary with Latin secondary, mirroring
   the EN treatment (Latin primary, Persian secondary).
10. **Conversion action.** Compact "Get Hamdam" pill (post-release) or none pre-release
    (pre-release the bar carries no CTA; the coming-soon state lives in the hero only).
11. **Accessibility risks.** Fixed bar must not trap focus; skip-to-content link must remain
    first focusable element; toggle needs an `aria-label` naming the target language in its
    own script (already the current pattern, keep it).
12. **Performance risks.** None meaningful; one scroll listener shared with the sky
    choreography.
13. **Required assets.** None new.
14. **Acceptance criteria.** Bar never exceeds 64px height; CTA and toggle both meet 44px
    touch targets; bar contrast against both night and morning sky states passes 4.5:1 for
    text; exactly one App Store action visible in any viewport state.

---

## Section 2: Cinematic hero

### Hero technology decision

Evaluated: (1) live 3D, (2) layered 2.5D composition, (3) pre-rendered cinematic loop,
(4) hybrid, (5) split desktop/mobile systems.

**Decision: layered 2.5D composition, identical system on desktop and mobile with fewer
layers on mobile.** Live 3D is rejected: nothing in the emotional result requires geometry,
the CSP forbids inline scripts and discourages heavyweight dependencies, and the guardrails
forbid full-page WebGL dependence. A pre-rendered video loop is rejected as primary: it
cannot respond to scroll (the concept's first input), costs megabytes against a
sub-2-second-feel budget, and fights text legibility. The 2.5D composition is the simplest
system that delivers the approved emotional result: the existing scroll-driven
night-to-morning sky timeline (already built, unit tested, with a `?dawn=N` review
parameter) extended with two photographic plates: a distant horizon plate (city, mountains,
a dome silhouette at dusk, matching the North Star Today scene) and a near foreground plate
(blossom branch, bottom corner, transparent PNG/WebP). Layers move only with scroll, at
gentle differential rates capped at 12% of scroll delta (this is depth cueing, not parallax
theatre). The SVG star field stays.

1. **Strategic purpose.** Make the visitor feel the product's world in three seconds and
   understand the product in one headline; establish "a sky that listens" immediately.
2. **Primary message.** Headline: the locked tagline "Hamdam reflects your heart and your
   sky." Support line (explains the product without needing the animation): "A daily
   reflection companion in English and Farsi. A verse from Persian poetry, chosen for how
   your heart feels today." (FA equivalent from approved `siteCopy.ts` pipeline; never
   hand-typed.)
3. **Visual composition.** Full-viewport night sky with stars and first horizon warmth.
   Centred stack: shamseh mark, headline (display serif), support line, primary CTA pill,
   and below it a real iPhone device frame showing the real Today screenshot
   (orchestrator shot `01-hero`), rising into view from the fold so roughly its top third
   is visible above the fold, inviting the first scroll. Scrolling brightens the sky toward
   first light as the device rises fully into view: the first "listening" response.
4. **Real product evidence required.** Orchestrator `01-hero-en.png` / `01-hero-fa.png` in
   the device frame. No invented screen content.
5. **Desktop behaviour.** Composition as above; horizon plate anchored to viewport bottom;
   max content width 1200px; device frame at approximately 360px logical width.
6. **Mobile behaviour.** Same composition minus the foreground blossom plate; device frame
   at approximately 260px logical width; headline on the fluid scale floor; CTA remains
   above the fold at 390x844.
7. **Motion behaviour.** One-time settle-in on load (stack rises 12px and fades in, 600ms,
   staggered 80ms); scroll-linked sky brightening and plate drift thereafter. No looping
   animation, no idle movement. Full spec: `13-motion-specification.md` §3.
8. **Reduced motion behaviour.** No settle-in; page loads at the first-light state (warm,
   legible, complete), matching the current site's proven reduced-motion fallback pattern.
   Scroll still changes sky state instantly at thresholds.
9. **Farsi RTL behaviour.** Horizon light source and foreground plate mirror horizontally
   (light enters from the visual left in FA, composition reads right to left); headline is
   the approved FA tagline; device frame shows `01-hero-fa.png`.
10. **Conversion action.** Primary CTA pill: post-release the App Store action; pre-release
    the "Coming soon to iPhone" pill (never a fake badge; see
    `15-conversion-specification.md` §1, §12).
11. **Accessibility risks.** Text over imagery: headline sits over sky gradient only, never
    over the photographic plates; enforce a contrast-verified text zone. Device screenshot
    needs meaningful alt text ("Hamdam Today screen showing a morning verse by Hafez in
    Persian and English"). Star field stays `aria-hidden`.
12. **Performance risks.** The two plates are the page's LCP risk: horizon plate budgeted
    at or under 180KB (desktop) / 90KB (mobile variant), preloaded, AVIF/WebP with explicit
    dimensions; device screenshot lazy-set below only if it proves LCP-contending, otherwise
    eager. No layout shift: all media has reserved space.
13. **Required assets.** `HW-01`, `HW-02`, `HW-03` (sky plates), `HW-04` (blossom
    foreground), device frame `DV-01`, orchestrator shots `01-hero-en/fa`.
14. **Acceptance criteria.** At 390x844 and 1440x900, both locales: headline, support line
    and CTA visible without scrolling; visual mood matches North Star Today scene (warm
    horizon under dark sky) side by side; no text overlaps a photographic plate; hero
    passes the `?dawn=N` deterministic review states night, first light, morning.

---

## Section 3: Interactive emotional weather demonstration ("Tell it how your heart feels")

1. **Strategic purpose.** Prove the core product mechanic (mood in, matched verse out) by
   letting the visitor do it, once, simply. This is the "listens" in the concept, and it is
   real product behaviour, not theatre.
2. **Primary message.** "Tell Hamdam how your heart feels. It answers with a verse."
3. **Visual composition.** A contained sky panel (rounded 24px card spanning the content
   column, its own miniature sky) with a horizontal feeling slider beneath it, styled after
   the app's real mood slider. Three to five slider stops (for example: heavy, unsettled,
   steady, light, bright; final labels from approved copy). Moving the slider crossfades
   the panel's sky state (night, mist, dawn, clear) and presents one verse card: Persian
   text dominant, English translation beneath, poet attribution, exactly the existing
   byte-exact verse-bank content already in `src/data/verses.ts` (Hafez, Rumi, Parvin
   today; extend only via the approved pipeline). A caption states plainly: "This is how
   the app works. In Hamdam, your reflection follows."
4. **Real product evidence required.** Verse content: byte-exact repo verse bank only.
   Slider visual language mirrors the app's real slider (verify against orchestrator shot
   `02-reflect` before build).
5. **Desktop behaviour.** Panel 720px max width, centred; slider directly beneath; verse
   card animates in within the panel.
6. **Mobile behaviour.** Full-column panel; slider thumb minimum 44px; verse text scales
   down on the fluid scale, Persian remains dominant.
7. **Motion behaviour.** Sky crossfade 400ms; verse card fades and rises 300ms after a
   150ms settle delay (so scrubbing does not spawn card churn). No motion when idle.
8. **Reduced motion behaviour.** Instant state swap, no crossfade, no rise; the feature
   remains fully functional (it is state change, not decoration).
9. **Farsi RTL behaviour.** Slider direction follows RTL (increase toward the visual left);
   stop labels in Farsi from approved copy; verse card already Persian-dominant so
   hierarchy is unchanged; panel light source mirrored.
10. **Conversion action.** A quiet text link beneath the demonstration: "There is more
    waiting in the app" pointing to the final ceremony anchor (mid-page CTA per
    `15-conversion-specification.md` §4); no pill here, the demonstration is the message.
11. **Accessibility risks.** The slider must be a real `input[type=range]` (or equivalent
    ARIA slider) fully keyboard operable, with `aria-valuetext` announcing the feeling
    label, and the responding verse in an `aria-live="polite"` region. Verse legibility
    over the panel sky must pass 4.5:1 in every sky state.
12. **Performance risks.** Panel sky states are CSS gradients (zero image cost); the only
    JS is a small vanilla module in the existing `src/lib/` pattern, unit-testable pure
    functions for state mapping. Budget: under 6KB.
13. **Required assets.** None imagery-critical (gradients); optional texture plate `SC-04`
    reused from the scene library if contrast-proven.
14. **Acceptance criteria.** Keyboard-only operation works end to end; screen reader
    announces feeling then verse; every slider stop maps to a distinct sky state and verse;
    Persian renders from repo bytes (checksum against `verses.ts`); no layout shift when
    the verse card appears (reserved space).

---

## Section 4: Five poet wisdom experience

1. **Strategic purpose.** Answer "whose wisdom is this?" with names, faces and voices;
   carry the cultural authority of seven centuries without exoticism.
2. **Primary message.** "Five poets, five voices." Hafez, Rumi, Saadi, Khayyam, Parvin
   Etesami. No other poet, ever.
3. **Visual composition.** An editorial gallery band on the dusk surface: five upright
   portrait cards (2:3), each a commissioned painterly portrait (artistic interpretation,
   consistent style family with the North Star's Discover portrait treatment), the poet's
   name in Persian script as live text over a solid caption plate (never text baked into
   the image), transliteration and one existing one-line description beneath. Desktop shows
   all five in one row (centre card slightly larger); the band is a scroll-snap carousel
   when space is short. One line of visible provenance under the band: "Verses sourced from
   Ganjoor.net. Portraits are artistic interpretations."
4. **Real product evidence required.** Poet names/descriptions from existing
   `src/data/poets.ts`. Portrait style must match the app's Discover direction (North Star
   `Designer (2).png`, Rumi card) since the app is the design authority.
5. **Desktop behaviour.** Single row of five, no autoplay, no rotation; hover lifts a card
   4px with a warm glow edge (see `12-design-system.md` §Light and glow).
6. **Mobile behaviour.** Horizontal scroll-snap carousel, one-and-a-fraction cards visible,
   swipe naturally; dot indicators; no auto-advance.
7. **Motion behaviour.** Cards reveal with the standard stagger (existing `[data-reveal]`
   system); hover lift 150ms. Nothing else.
8. **Reduced motion behaviour.** Reveal renders instantly (existing behaviour); hover lift
   replaced by border emphasis.
9. **Farsi RTL behaviour.** Card order right to left (Hafez first from the right); carousel
   swipes RTL-correctly; Persian name is already dominant in both locales.
10. **Conversion action.** None. This section builds authority, not clicks.
11. **Accessibility risks.** Carousel must be keyboard reachable (cards focusable, arrow
    key or native scroll); portraits get alt text naming the poet and "artistic
    interpretation"; Persian names as live text must pass contrast on the caption plate.
12. **Performance risks.** Five portraits: 60KB budget each, lazy-loaded (below the fold),
    explicit aspect boxes to prevent shift.
13. **Required assets.** `PT-01` through `PT-05` (`14-canva-asset-brief.md`), licensing
    record required per asset.
14. **Acceptance criteria.** Exactly five poets, locked names spelled per `poets.ts`; no
    Forough Farrokhzad anywhere; portraits share one consistent style family; no Persian
    text embedded in any image; provenance line present in both locales.

---

## Section 5: Context constellation ("What shapes today's reflection")

1. **Strategic purpose.** Differentiate Hamdam from quote apps: today's verse and
   reflection are shaped by real, user-permitted context. Also quietly pre-answer the
   privacy question ("it knows this, and it stays on the device").
2. **Primary message.** "One reflection, shaped by your day." Around it: mood, weather,
   season, time of day, your calendar's cultural moments, and (if you choose) signals from
   Apple Health.
3. **Visual composition.** On the warming dawn surface: a centred real device frame showing
   the real Today screenshot, ringed by six small labelled signal nodes (mood, weather,
   season, time, calendar, health) connected to the device by fine hairline arcs, arranged
   as a loose constellation echoing the star field. Nodes are static, anchored, and
   labelled in live text with small line icons per the icon rules; they are a diagram, not
   floating objects. Each node has one supporting clause (for example, health: "only if you
   choose, only on your device").
4. **Real product evidence required.** Orchestrator `01-hero` or a dedicated Today shot;
   signal list must match the Privacy Policy §1.1 to 1.7 exactly (those are the only
   signals that exist; invent none).
5. **Desktop behaviour.** Constellation ring around the device, three nodes per side.
6. **Mobile behaviour.** Device frame first, then the six nodes as a two-column list with
   the same icons and clauses; the arcs are dropped (a diagram that cannot breathe at 390px
   becomes a list, deliberately).
7. **Motion behaviour.** On reveal, arcs draw in once (600ms, stroke-dashoffset) and nodes
   fade in staggered; then fully static.
8. **Reduced motion behaviour.** Arcs and nodes render complete immediately.
9. **Farsi RTL behaviour.** Node order mirrors; labels in Farsi; arcs mirror; the list
   variant reads right to left.
10. **Conversion action.** None direct; a quiet anchor link "See how it stays private"
    jumping to §8, reinforcing trust flow.
11. **Accessibility risks.** The constellation must be readable as structured content: an
    `ul` of six items with the diagram as presentation; arcs `aria-hidden`; never encode
    meaning in the arc geometry alone.
12. **Performance risks.** Arcs are inline SVG (external-file CSS per CSP); one screenshot
    image; negligible.
13. **Required assets.** Device frame `DV-01`; orchestrator Today shot; icon set `IC-01`.
14. **Acceptance criteria.** Exactly the six real signal families, each traceable to a
    Privacy Policy section; no invented signal; mobile list variant carries identical
    content; screen reader order is heading, intro, six items, device image alt.

---

## Section 6: Your Journey and the reflections record ("A private record that learns your seasons")

1. **Strategic purpose.** Show the product's memory: reflections are kept, revisitable, and
   give back insight over time. This converts "nice daily quote" into "companion worth
   keeping."
2. **Primary message.** "Every reflection is kept for you. Over the weeks, Hamdam shows you
   your own weather: your moods, your seasons, your journey."
3. **Visual composition.** A two-panel editorial composition on the dawn surface: real
   Reflections screenshot (orchestrator `02-reflect`) and real Your Journey insights
   screenshot (orchestrator `05-journey`) in device frames, gently offset in depth (the
   frontmost frame overlaps the rear by about 15%), with copy inline-start of the pair
   (inline-end in FA). Copy covers: the private journal, favourites, the gentle streak that
   forgives a missed day, and journey insights, in the approved App Store description's
   language register.
4. **Real product evidence required.** Orchestrator `02-reflect-en/fa` and `05-journey-en/fa`
   only. The insights chart shown is the app's real seeded render; never rebuild a chart
   in HTML pretending to be the app.
5. **Desktop behaviour.** Copy column 40%, device pair 60%; the pair swaps which frame is
   frontmost on hover of each (150ms, z and scale nudge), a small discoverable moment, not
   a carousel.
6. **Mobile behaviour.** Copy first, then the two frames as a horizontal scroll-snap pair.
7. **Motion behaviour.** Standard reveal stagger only, plus the hover swap on desktop.
8. **Reduced motion behaviour.** Instant reveal; hover swap replaced by a tap toggle with
   no scale animation.
9. **Farsi RTL behaviour.** Copy inline-start (visual right); FA screenshots; frame offset
   direction mirrored.
10. **Conversion action.** Mid-page compact CTA pill after this section (the page's single
    mid-scroll CTA; `15-conversion-specification.md` §4).
11. **Accessibility risks.** Screenshots carry descriptive alt text including that the
    chart shows a mood trend; the hover/tap swap must not hide content required for
    understanding (both frames' content is described in copy).
12. **Performance risks.** Two screenshots, lazy-loaded, 120KB budget each framed.
13. **Required assets.** `DV-01`; orchestrator `02-reflect`, `05-journey`, both locales.
14. **Acceptance criteria.** Screenshots are byte-derived from orchestrator output (no
    retouching beyond framing); streak copy uses the approved "forgives a missed day"
    framing; no invented metrics or user counts anywhere in this section.

---

## Section 7: Roots and region experience ("Your calendar remembers")

1. **Strategic purpose.** Show cultural depth as living function: the Iranian calendar runs
   beside the Gregorian one, and its moments arrive with poetry that belongs to them.
   Universal framing: an invitation into these seasons, not a diaspora gate.
2. **Primary message.** "Yalda, Norooz, Chaharshanbe Suri. Hamdam knows when they arrive,
   and greets them with poetry that belongs to them."
3. **Visual composition.** Three editorial moment cards on the deepening warm surface, each
   with its own commissioned photographic composition (Yalda: pomegranate and candlelight;
   Norooz: blossom and morning light; Chaharshanbe Suri: fire warmth), a live day countdown
   ("Yalda arrives in N days," computed at build/runtime exactly as the app computes it),
   and one sentence each. Mehregan and Sizdah Bedar named in a closing line beneath the
   cards. Beside the cards, one real Roots screenshot (orchestrator `04-roots`) in a device
   frame proving the feature. Fal e Hafez gets one respectful sentence in this section
   ("Ask, as generations have"), no gimmick treatment.
4. **Real product evidence required.** Orchestrator `04-roots-en/fa`; countdown logic must
   match the app's real dates; moment names spelled as the app spells them.
5. **Desktop behaviour.** Three cards in a row plus the device frame anchoring the
   inline-end; cards equal height.
6. **Mobile behaviour.** Cards stack full-width in calendar order of next arrival; device
   frame follows.
7. **Motion behaviour.** Reveal stagger; a once-per-load soft glow pulse on the nearest
   upcoming moment's countdown (2s, one time, subtle).
8. **Reduced motion behaviour.** No pulse; static emphasis via the card's border tone.
9. **Farsi RTL behaviour.** Card order mirrors; countdown phrasing from approved FA copy;
   Persian moment names dominant on the cards in both locales (live text on solid caption
   plates, never baked into imagery).
10. **Conversion action.** None direct.
11. **Accessibility risks.** Countdown must be text, not image; imagery contrast for
    caption plates verified per card; fire imagery (Chaharshanbe Suri) kept warm, not
    alarming, and decorative parts `aria-hidden`.
12. **Performance risks.** Three images at 80KB budget each, lazy; countdown JS is a pure
    date function (unit-testable, no timezone surprises: compute in Australia/Brisbane
    initially, document the choice).
13. **Required assets.** `CM-01` (Yalda), `CM-02` (Norooz), `CM-03` (Chaharshanbe Suri),
    device frame, orchestrator `04-roots`.
14. **Acceptance criteria.** Each of the three moments has distinct imagery and its own
    countdown; all five moments named in the section; countdown values match the app's for
    the same date; no cultural stereotype imagery (checked against the guardrails by
    review, not assumption).

---

## Section 8: Privacy ("Everything stays on your device")

1. **Strategic purpose.** Convert trust-sensitive visitors; privacy is a genuine product
   differentiator (no accounts, no analytics SDKs, on-device AI) and Hamdam's claims are
   unusually strong and true.
2. **Primary message.** "Hamdam does not use accounts. It does not collect emails. Your
   words never leave your device unless you turn on your own iCloud sync. Nobody at Hamdam
   can read a word you write."
3. **Visual composition.** The quietest section on the page, by design: near-morning
   surface, a short centred statement set large in the display serif, followed by a compact
   three-column trust row (No accounts / On your device / Your own iCloud only) with line
   icons, and one real Privacy screen screenshot (orchestrator `06-privacy`) small and
   inline-end. Links to the Privacy Policy and Terms, plainly visible. No padlock clip art,
   no shield theatrics.
4. **Real product evidence required.** Orchestrator `06-privacy-en/fa`; every claim
   traceable to the live Privacy Policy (§1 to §8), which is already accurate and strong.
5. **Desktop behaviour.** Statement centred at 60ch max; trust row beneath.
6. **Mobile behaviour.** Statement, then trust row stacked, then screenshot.
7. **Motion behaviour.** Reveal only. Stillness is the message.
8. **Reduced motion behaviour.** Identical minus reveal fade.
9. **Farsi RTL behaviour.** FA statement from approved copy (the FA privacy page is a
   native translation; reuse its language register); columns mirror.
10. **Conversion action.** None; trust cues feed the ceremony that follows.
11. **Accessibility risks.** Minimal; ensure the policy links are distinguishable from
    plain text without colour alone.
12. **Performance risks.** Negligible.
13. **Required assets.** Icon set `IC-01`; orchestrator `06-privacy`.
14. **Acceptance criteria.** Every sentence in this section exists in, or is directly
    supported by, the Privacy Policy or Terms; the "No analytics" wording is not repeated
    on the site until the Cloudflare dashboard question is resolved
    (`15-conversion-specification.md` §13); policy links present in both locales.

---

## Section 9: Plans and the Founding Companion ("The daily ritual is free, always")

1. **Strategic purpose.** Set honest expectations before the store does; present Plus as
   depth, not a paywall wall; give the Lifetime tier its earned ceremony as "Founding
   Companion."
2. **Primary message.** From the approved App Store description, verbatim register: "The
   daily ritual is free, always, including fifteen reflections every month. Hamdam Plus
   opens unlimited reflections, the full wisdom library of all five poets, the reflection
   archive, and more." Plus is monthly or yearly with a seven day free trial; the Founding
   Companion is a single purchase you can share with your family.
3. **Visual composition.** On the near-morning surface: a two-panel comparison (Free /
   Hamdam Plus) as calm editorial lists (no SaaS pricing-grid tells: no "MOST POPULAR"
   ribbon, no toggle billing switch). Beneath, a distinct full-width Founding Companion
   band styled after the app's own promo card language (deep saffron plate, shamseh relief
   motif, serif title), one sentence: a single purchase, yours for life, shareable with
   your family through Apple Family Sharing. **No dollar figures anywhere** (locked
   decision 2026-07-02: prices unpublished on the site; Apple displays pricing at the
   point of purchase). Where a price would appear, the copy says "Pricing is shown on the
   App Store."
4. **Real product evidence required.** Feature lists must match the approved App Store
   description and Terms §3 exactly; the Founding Companion band may reference the
   existing promo art direction (`hamdam-ios/marketing/app-store-promo/`).
5. **Desktop behaviour.** Two panels side by side; Founding band full content-width below.
6. **Mobile behaviour.** Free panel first, Plus second, band last; band remains full-bleed
   within the content column.
7. **Motion behaviour.** Reveal only; the band's shamseh relief may have a static warm
   sheen (no animation).
8. **Reduced motion behaviour.** Identical minus reveal.
9. **Farsi RTL behaviour.** Panels mirror; FA copy through the approved pipeline; "Hamdam
   Plus" and "Founding Companion" naming follows the app's own FA localisation
   (`L.paywallFoundingCompanion`), never a new coinage.
10. **Conversion action.** One text link: "Start on the App Store"; the pill CTA is
    reserved for the ceremony 
    one scroll below (avoid two adjacent pill CTAs).
11. **Accessibility risks.** Comparison must be two real lists with headings, not a table
    abused for layout; trial terms in text, not footnote-sized.
12. **Performance risks.** One decorative band texture, 60KB budget.
13. **Required assets.** `FC-01` (Founding Companion band texture, derived from the
    existing promo art family).
14. **Acceptance criteria.** Zero dollar figures; trial wording matches Terms §3.2 ("7-day
    free trial for new subscribers"); Family Sharing claim matches Terms §3.3 (Lifetime,
    up to six members); free tier states fifteen reflections monthly per the approved
    description; no invented Plus features.

---

## Section 10: Final dawn download ceremony

1. **Strategic purpose.** The page's emotional and conversion climax: the dawn the visitor
   has been scrolling toward completes, and the App Store action is the centre of it.
2. **Primary message.** "Sit with a verse. Reflect. Return tomorrow." then the download
   action. Pre-release: "Hamdam is coming to iPhone."
3. **Visual composition.** Third dimensional moment. The sky surface completes its arc to
   full warm morning (the brightest point of the page); a soft light bloom rises from the
   horizon line; the shamseh mark turns to its gold state; centred: the closing line, the
   primary CTA (official App Store badge post-release, with the capsule pill as secondary
   styled action; pre-release the coming-soon pill), and beneath it the App Store privacy
   nutrition cue ("No data collected" as reflected by the real App Store label, only once
   verified against the live listing). A single blossom-petal drift (five to seven petals,
   one 6-second pass, once per visit) crossing the upper sky is the ceremony's only
   ornament, echoing the app's reflection-completion bloom.
4. **Real product evidence required.** Real App Store badge assets per Apple's marketing
   guidelines; the privacy label line only after the live listing shows it.
5. **Desktop behaviour.** Full-viewport-height closing scene; CTA dead centre.
6. **Mobile behaviour.** Same scene; the sticky mobile CTA (which has been present) hides
   here because the section's own CTA is on screen (no doubled actions).
7. **Motion behaviour.** Sky completion is scroll-driven; the petal pass triggers once when
   the section becomes 60% visible; light bloom is a 1200ms one-time ease-out.
8. **Reduced motion behaviour.** Section renders in its completed morning state; no petals,
   no bloom animation; the static composition must be fully satisfying on its own (this is
   the acceptance bar for the whole ceremony design).
9. **Farsi RTL behaviour.** FA closing line from approved copy; badge in Apple's provided
   localisation or default English badge if Apple provides no FA variant (do not fabricate
   a Farsi badge); composition mirrors.
10. **Conversion action.** The primary App Store action of the entire page
    (`15-conversion-specification.md` §1, §5).
11. **Accessibility risks.** Petals `aria-hidden` and non-interactive; CTA contrast on the
    brightest surface verified (dark badge on cream passes); focus lands naturally on the
    CTA when skipping to it.
12. **Performance risks.** Petal sprites: one small sprite sheet or five tiny WebPs, 30KB
    total budget, loaded lazily only when the section approaches.
13. **Required assets.** `CY-01` (petal set), official Apple badge files, `HW-03` morning
    sky already in play.
14. **Acceptance criteria.** The dawn arc measurably completes here (background reaches its
    terminal token values); exactly one visible download action in this viewport; petals
    run once and never loop; pre-release build shows no App Store badge anywhere (Apple
    rule); post-release flip requires only the existing `APP_STORE.RELEASED` flag.

---

## Section 11: Footer

1. **Strategic purpose.** Legal, support and language housekeeping with the same care as
   the rest of the page; the last thing a careful visitor reads.
2. **Primary message.** Hamdam, made with love in Brisbane; privacy, terms, support,
   language.
3. **Visual composition.** Morning-cream surface, hairline top border; logotype and
   shamseh; nav row: Privacy, Terms, Support (mailto), language toggle (second placement);
   the existing trademark and copyright lines; Ganjoor.net attribution line ("Persian
   verses sourced from Ganjoor.net").
4. **Real product evidence required.** None; existing legal strings.
5. **Desktop behaviour.** Single row nav, generous padding.
6. **Mobile behaviour.** Stacked, 44px targets.
7. **Motion behaviour.** None.
8. **Reduced motion behaviour.** Identical.
9. **Farsi RTL behaviour.** Mirrored; FA legal links to `/fa/privacy`, `/fa/terms`.
10. **Conversion action.** None (ceremony sits directly above; the footer stays quiet).
11. **Accessibility risks.** Link contrast on cream (use `saffron-ink`, never raw saffron,
    per the existing token rationale).
12. **Performance risks.** None.
13. **Required assets.** None new.
14. **Acceptance criteria.** All existing legal lines preserved verbatim; Ganjoor
    attribution present in both locales; both language toggles (nav, footer) round-trip
    the current path.
