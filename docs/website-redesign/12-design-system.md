# Hamdam Website Redesign: Design System

Binding token and rule reference. This system extends the app-aligned tokens already
reconciled in this repo (`src/styles/global.css` `@theme` and `src/styles/tokens.css`); it
does not overwrite the established palette. New tokens exist only where the redesign's
night-to-morning arc requires surfaces the current always-light site never needed, and each
addition states why.

## 1. Colour tokens (semantic names)

### Retained brand tokens (unchanged, already app-reconciled)

| Token | Value | Role |
|---|---|---|
| `--color-cream` | `#F4EDD8` | Morning surface, light text on dark surfaces |
| `--color-indigo` | `#1B1B3A` | Night anchor, primary text on light surfaces |
| `--color-saffron` | `#E8B04B` | Brand accent, marks, decorative only on light surfaces |
| `--color-saffron-ink` | `#7F6029` | Accessible saffron for text and focus on cream (4.98:1) |
| `--color-ember` | `#D07B3F` | Dusk accent, warm emphasis |
| `--color-peach` | `#F4C6A8` | First-light accent, soft fills |
| `--color-night-gold` | `#F0C878` | Accent text and glow on night surfaces |
| `--color-mist-amber-grey` | `#C98F45` | Muted warm midtone |

### New semantic surface tokens (the reason: the page now has a night-to-morning arc; the
current site has one light surface only)

| Token | Value | Role |
|---|---|---|
| `--surface-night` | `#141430` | Page-top sky, hero base (deepened indigo, app North Star night register) |
| `--surface-dusk` | `#2A2140` | Early-scroll surface under the poets band |
| `--surface-firstlight` | `#5A3A4A` warm gradient stop | Transitional stop, never a resting surface |
| `--surface-dawn` | `#C77E4E` gradient stop | Mid-page warmth stop |
| `--surface-morning` | `#F4EDD8` | Terminal surface (equals cream; the arc resolves into the brand) |
| `--text-on-night` | `#F4EDD8` at 92% | Body text on night and dusk |
| `--text-on-night-muted` | `#F4EDD8` at 68% | Secondary text on night and dusk (still passes 4.5:1 on `--surface-night`) |
| `--glow-warm` | `#F0C878` at 24% | The only permitted glow colour |

Rule: gradient stop values above are starting points for the graded sky ramp and must be
finalised in-browser against contrast checks; the ramp is defined once as a custom-property
scale (`--sky-progress` 0 to 1) and consumed everywhere. No section may introduce a colour
outside this table plus the retained brand tokens.

## 2. Typography roles

| Role | Face | Usage |
|---|---|---|
| Display | Source Serif Pro (EN) / Vazirmatn (FA) | Hero headline, section leads, ceremony line |
| Heading | Same pair | Section headings, card titles |
| Verse | Same pair, Persian always dominant size | Poetry only; never used for UI copy |
| Body | Same pair | Paragraphs, lists |
| Meta | System sans stack (`--font-sans`) | Eyebrows, countdown labels, legal fine print |

The existing faces are retained deliberately: the gap analysis found typography the smallest
gap against the North Star. The change is scale and weight, not family.

## 3. English typography

Source Serif Pro, self-hosted via `@fontsource` (existing pipeline, preload pattern kept).
Display weight 600, headings 600, body 400, italic reserved for translations of verse and
short editorial asides. Line heights: display 1.05, heading 1.15, body 1.7. Maximum measure
64ch body, 20ch display.

## 4. Farsi typography

Vazirmatn, self-hosted via `@fontsource` (existing). Farsi display and body sizes run 6%
larger than the EN equivalent at every scale step (Vazirmatn's Persian forms read smaller at
equal em size); line heights: display 1.25, body 1.9 (Persian script needs taller leading;
this matches the current site's proven `leading-[1.9]`). Never letterspace Farsi. Never
justify Farsi body text. Persian verse text is always visually dominant over its English
translation in both locales. All Persian strings pass `npm run check:persian` before commit.

## 5. Fluid type rules

All sizes are `clamp()` scales between the 390px floor and 1440px ceiling:

| Step | Floor | Ceiling |
|---|---|---|
| `display` | 40px | 76px |
| `h2` | 28px | 44px |
| `h3` | 20px | 26px |
| `verse-fa` | 22px | 30px |
| `verse-en` | 16px | 19px |
| `body` | 16px | 18px |
| `meta` | 13px | 14px |

FA applies its 6% multiplier to floor and ceiling. No type below 13px anywhere. Users'
browser font-size settings must scale everything (rem-based, never px-locked).

## 6. Spacing system

Base unit 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 140. Section rhythm keeps the
existing tokens (`--spacing-section-desktop: 140px`, `--spacing-section-mobile: 90px`) but
the perceived emptiness the audit flagged is solved by the continuous sky surface and
in-section density, not by shrinking rhythm. Card internal padding: 24 mobile, 32 desktop.

## 7. Layout grid

12-column fluid grid, 24px gutters, max content width 1200px, page padding 20px (mobile) /
48px (desktop). Copy columns cap at 64ch regardless of grid width. The hero and final
ceremony are full-viewport compositions that ignore the grid; everything else sits on it.

## 8. Border radius system

| Token | Value | Use |
|---|---|---|
| `--radius-card` | 16px | Cards (existing, keep) |
| `--radius-panel` | 24px | The mood demonstration sky panel, moment cards |
| `--radius-pill` | 999px | Every CTA. This replaces the current 12px button radius: the North Star CTA is a full capsule and the audit logged the mismatch (gap §6) |
| `--radius-device` | matches `DV-01` frame | Device frame corners |

## 9. Surface hierarchy

Three planes, strictly ordered: (1) the sky surface (fixed, gradient, owns the arc),
(2) content planes (solid or near-solid cards and caption plates sitting on the sky; text
lives here), (3) accents (marks, icons, arcs, glow). Text is never placed directly on
photographic imagery; it always sits on a solid caption plate or on the sky gradient within
a contrast-verified zone. No glassmorphism stacks; at most one soft-blur plate style exists
(the nav backing) and nothing else blurs.

## 10. Light and glow rules

Glow is light from the world, not UI chrome: permitted only as (a) the horizon warmth in
sky surfaces, (b) `--glow-warm` halo on the shamseh mark in its gold state, (c) the
countdown pulse in Roots (one time), (d) card hover edge on the poets band. Glow radius
never exceeds 48px; glow never animates in a loop; no coloured drop shadows elsewhere.

## 11. Shadow rules

Two elevations only. `--shadow-rest`: 0 2px 8px rgba(20,20,48,0.10). `--shadow-lift`:
0 8px 28px rgba(20,20,48,0.18). Device frames use `--shadow-lift` permanently. On night
surfaces shadows are nearly invisible by design; separation there comes from surface tone
difference, not shadow inflation.

## 12. Icon rules

Single family: 1.5px stroke line icons, rounded caps, drawn on a 24px grid, monochrome
(inherit `currentColor`). Sourced as project SVGs (`IC-01`), inline `<svg>` with
`aria-hidden="true"` when decorative. No emoji as UI, no filled/duotone mixing, no icon
ever substitutes for a text label (labels always present). Directional icons flip in RTL;
symmetrical icons do not.

## 13. Image treatment

Warm grade family across all photography: lifted warm shadows, no crushed blacks, highlight
temperature toward saffron, consistent with the three existing scene JPGs and the North
Star. Every image ships AVIF/WebP with explicit width/height (zero CLS), lazy-loaded unless
above the fold, per-image budget from `11-page-design-specification.md`, processed through
the existing `astro:assets` pipeline. Photography appears only inside controlled
compositions (cards, plates, framed panels, the hero's two plates); never as a repeated
full-bleed page background. No image contains rendered text in either language.

## 14. Device mockup treatment

One neutral frame (`DV-01`): near-black warm-grey body, thin bezel, matching the app's own
`ScreenshotComposerView` marketing frame so web and App Store present the same object.
Real orchestrator screenshots only; screen corners clipped to the frame radius;
`--shadow-lift`; never tilted more than 0 degrees (no perspective skew: flat, frontal,
honest), size differences and 15% overlaps create depth instead.

## 15. Motion durations

| Token | Value | Use |
|---|---|---|
| `--motion-fast` | 150ms | Hovers, focus rings |
| `--motion-standard` | 300ms | Reveals, card rises |
| `--motion-scene` | 400ms | Mood panel sky crossfade |
| `--motion-ceremony` | 1200ms | Final bloom, one-time moments |

Nothing exceeds 1200ms except the one 6s petal pass (which is a one-time ambient event, not
an interaction response). Full choreography: `13-motion-specification.md`.

## 16. Motion easing

| Token | Curve | Use |
|---|---|---|
| `--ease-settle` | cubic-bezier(0.22, 1, 0.36, 1) | Entrances, reveals (decelerate) |
| `--ease-cross` | cubic-bezier(0.4, 0, 0.2, 1) | Crossfades, state changes |
| `--ease-exit` | cubic-bezier(0.4, 0, 1, 1) | The rare exit |

No bounce, no spring overshoot, no elastic. Ever.

## 17. Scroll behaviour

Native scrolling only: no scroll hijacking, no snap-scrolled full-page sections (the two
carousels use inline `scroll-snap-type: x mandatory` only). `scroll-behavior: smooth`
retained for anchor jumps, disabled under reduced motion. The sky arc reads scroll position
via one shared rAF-throttled listener (the existing `cinematic.js` pattern, promoted to a
page-level module). Scroll never triggers layout-affecting changes, only paint-safe custom
properties (colour, opacity, transform).

## 18. Focus state design

`:focus-visible` outline 2px solid, offset 3px: `--color-saffron-ink` on light surfaces,
`--color-night-gold` on night and dusk surfaces (the existing single-token approach cannot
survive the dark arc; this is the one accessibility token the redesign must add). Focus is
never removed, never colour-only (outline plus offset), and the skip link remains first.

## 19. High contrast behaviour

Under `prefers-contrast: more`: caption plates go fully opaque, text tokens jump to pure
`#FFFFFF`/`#141430` pairings, hairlines thicken to 2px, and the sky ramp compresses toward
its darkest and lightest ends (mid-ramp text situations are eliminated). Verify with forced
colours (Windows High Contrast): borders on all cards so structure survives backplate
removal.

## 20. Reduced motion substitutions

Governing rule (inherited from the site's existing, proven pattern): reduced motion changes
how states are reached, never which content exists. Substitution table:

| Full motion | Reduced substitution |
|---|---|
| Hero settle-in stagger | Render complete at first-light state |
| Sky arc crossfades | Instant threshold state changes |
| Mood panel 400ms crossfade | Instant swap |
| Reveal stagger | Immediate opacity 1 (existing behaviour) |
| Constellation arc draw | Arcs render complete |
| Countdown pulse | Static border emphasis |
| Ceremony bloom and petals | Completed morning composition, no petals |
| Hover lifts | Border/tone emphasis |
