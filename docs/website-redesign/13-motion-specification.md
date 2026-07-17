# Hamdam Website Redesign: Motion Specification

Binding motion behaviour for the redesign. Durations and easings are the tokens in
`12-design-system.md` §15 and §16. The purpose test for every motion: it must communicate
reflection, transition, context or discovery. Motion that fails the test does not ship.

## 1. Motion principles

1. **Three dimensional moments only:** the hero, the mood demonstration, the final dawn
   ceremony. Everything else is editorial reveal or micro-feedback.
2. **Motion responds; it never performs.** Every animation is caused by scroll position, a
   deliberate input (slider, hover, focus, tap), or a one-time section arrival. Nothing
   loops, nothing idles, nothing chases the pointer, nothing autoplays with sound.
3. **Reduced motion is a first-class rendering,** not a degraded one. Under
   `prefers-reduced-motion: reduce`, every composition must be complete, legible and
   emotionally whole as a still. The substitution table in `12-design-system.md` §20 is
   binding.
4. **Paint-safe properties only:** `opacity`, `transform`, and custom-property-driven
   `background-color`/`background-position` on the sky surface. No animated layout
   properties, no animated `filter` except the one ceremony bloom, no `will-change`
   sprinkling (apply only where DevTools proves a win).
5. **No animation libraries.** The repo's existing pattern (pure functions in `src/lib/`
   plus small vanilla modules writing CSS custom properties inside rAF) covers everything
   here. This is a hard technical-restraint decision, not a preference.

## 2. Global sky choreography (the dawn arc)

- One page-level module (evolving the existing `cinematic.js`) computes
  `--sky-progress` (0 at page top, 1 when the final ceremony section is fully in view)
  from scroll position, rAF-throttled with the existing `ticking` pattern.
- The fixed sky surface maps `--sky-progress` onto the colour ramp
  (`--surface-night` through `--surface-morning`) via a pre-defined gradient stop table
  (pure function, unit tested exactly like the current hero timeline).
- Section text-token flips (light text on dark sky, dark text on morning sky) occur at
  two named thresholds (`--sky-progress` 0.45 and 0.8), implemented as class or
  data-attribute switches on `<main>`, never per-element listeners.
- The mapping function is shared with the hero's `?dawn=N` review parameter so any arc
  state is deterministically screenshotable, preserving the repo's established
  design-review workflow.
- Scrolling up reverses the arc naturally (it is a pure function of position, stateless).
- Reduced motion: identical mapping, but the CSS transitions between stop values are
  removed (state changes are instant). Because the arc is position-driven, reduced-motion
  visitors still experience night at the top and morning at the ceremony, which is the
  concept working exactly as intended without any time-based animation.

## 3. Dimensional moment 1: hero

| Event | Behaviour | Duration / ease |
|---|---|---|
| Load | Content stack (mark, headline, support, CTA, device) rises 12px and fades in, staggered 80ms per element, once | 600ms, `--ease-settle` |
| Scroll 0 to 1 viewport | Sky brightens night to first light (via `--sky-progress`); horizon plate drifts down at 8% of scroll delta; foreground blossom plate drifts at 12%; device frame rises to fully visible | Scroll-linked, no duration |
| Star field | Static SVG; opacity eases to 0 across the first half viewport of scroll | Scroll-linked |

No idle motion whatsoever after settle-in. Reduced motion: no settle-in, page presents at
first-light state, plates static, stars static until their scroll threshold removes them
instantly.

## 4. Dimensional moment 2: mood demonstration

| Event | Behaviour | Duration / ease |
|---|---|---|
| Slider input | Panel sky crossfades to the mapped state | 400ms `--motion-scene`, `--ease-cross` |
| Input settle (150ms without further change) | Verse card fades in and rises 8px; `aria-live="polite"` announces | 300ms, `--ease-settle` |
| Scrubbing rapidly | Sky tracks continuously; verse card waits for settle (no card churn) | n/a |
| Keyboard operation | Identical to pointer; focus ring per `12-design-system.md` §18 | n/a |

The panel is inert until the visitor touches the slider: on section reveal it shows a
default "steady" state with an inviting caption. Reduced motion: instant sky swap, instant
verse swap, zero translation.

## 5. Editorial reveals (all non-dimensional sections)

The existing `[data-reveal]` IntersectionObserver system is retained as-is (it is built,
tested, and already reduced-motion-correct). Parameters: elements rise 16px and fade in,
300ms `--ease-settle`, sibling stagger 80ms, each fires once. Two additions:

- **Constellation arc draw (§5 of the page spec):** stroke-dashoffset draw-in, 600ms,
  `--ease-cross`, fired once on reveal; arcs are `aria-hidden` presentation.
- **Roots countdown pulse:** one 2s soft glow pulse (`--glow-warm`) on the nearest
  upcoming moment's countdown, once per page load, on reveal.

## 6. Micro-feedback

| Target | Behaviour |
|---|---|
| CTA pills | Hover/focus: rise 2px, `--shadow-lift`, 150ms; active: return to rest. No colour strobe |
| Poet cards | Hover: rise 4px plus warm edge glow, 150ms |
| Journey device pair | Hover (desktop) or tap (mobile): frontmost frame swaps via z-order and a 2% scale nudge, 150ms |
| Links | Underline thickens on hover/focus; no movement |

## 7. Dimensional moment 3: final dawn ceremony

| Event | Behaviour | Duration / ease |
|---|---|---|
| Approach (section 60% visible, once) | Light bloom rises from horizon (radial gradient opacity 0 to 1) | 1200ms `--motion-ceremony`, `--ease-settle` |
| Same trigger | Petal drift: five to seven petal sprites cross the upper sky on gentle arcs, one pass, then done | 6s total, linear paths with `--ease-cross` opacity in/out |
| Shamseh mark | Crossfades to gold state | 400ms |
| Scroll | Sky reaches `--sky-progress: 1` (full morning) exactly as the CTA centres in the viewport | Scroll-linked |

Petals never loop, never repeat on re-scroll (session-once via in-memory flag), are
`aria-hidden`, `pointer-events: none`, and load lazily only when the section approaches.
Reduced motion: completed morning composition, gold mark, no bloom animation, no petals.

## 8. Performance guardrails

- One scroll listener, one IntersectionObserver instance set, page-wide. No per-section
  listeners.
- Total motion JavaScript budget: 12KB minified across all modules (current site's pattern
  suggests this is comfortable).
- Every scroll-linked effect must hold 60fps on a mid-tier phone (test at 4x CPU throttle
  in DevTools); if a plate drift janks, the plate becomes static before ship (the
  design survives: drift is depth cueing, not load-bearing).
- No animation may block interaction or delay LCP; settle-in animates already-painted
  content only.

## 9. Motion acceptance criteria

1. With `prefers-reduced-motion: reduce`, a full-page screenshot pass shows every section
   complete and legible, and the only visual differences from the motion-enabled final
   states are the absence of petals and transitional effects.
2. No element on the page animates without a cause (scroll, input, one-time reveal).
3. The `?dawn=N` parameter reproduces any sky state deterministically for review.
4. DevTools performance recording of a full scroll shows no long task over 50ms
   attributable to motion code.
5. Zero cumulative layout shift attributable to any animation.
