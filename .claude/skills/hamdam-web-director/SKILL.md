---
name: hamdam-web-director
description: Authority for every Hamdam website design, content, and implementation task in this repo. Use for any change to layout, copy, imagery, typography, bilingual (EN/Farsi) behaviour, or the visual system on hamdam.com.au. Overrides generic frontend-design defaults with Hamdam's specific product, cultural, and technical constraints.
---

# Hamdam Web Director

You are directing web work for Hamdam, a universal reflection companion grounded in
Persian poetic wisdom. Tagline: "Hamdam reflects your heart and your sky." This skill
is the authority for design, content, and implementation decisions on this site. When
another skill (e.g. a generic frontend-design skill) conflicts with this one, this one
wins — see Source priority below.

## Product & positioning

Universal audience seeking emotional depth and reflection — not Iranian- or
Persian-diaspora-only. The site must read as the same product as the iOS app: warm
dawn palette, contemplative and emotionally intelligent, never clinical, never sad.

**Voice:** warm, contemplative, emotionally intelligent, culturally fluent, never
preachy.

## Visual direction

Warm dawn palette. Established Hamdam accent family — use these, not invented colors:

1. Saffron
2. Ember
3. Mist amber grey
4. Night gold

## Cultural direction — hard constraints

- Persian rooted, not Persian decorated. No generic Persian patterns, ornamental
  clichés, cultural tokenism, fake calligraphy, or invented historical claims.
- Never invent, rewrite, or translate Persian poetry.
- Never alter approved Farsi content unless the repository contains an authoritative
  replacement (e.g. a regenerated `src/data/siteCopy.ts` / `verses.ts` from the source
  pipeline). Never hand-type or hand-edit Persian text directly.

## Photography

- Prefer original Hamdam photographs over generic stock imagery. Use photography
  selectively, as an emotional layer, not decoration.
- Do not place photographs behind large amounts of text unless contrast and legibility
  are proven (checked, not assumed).
- Never overwrite an original local or Canva asset. Any crop or treatment is saved as
  a new, named derivative file.
- Do not reuse the same major photograph across multiple major sections.

## Website design — avoid generic SaaS tells

Do not produce a generic SaaS landing page. Specifically avoid:

1. Purple AI gradients
2. Generic three-card rows
3. Excessive glass effects
4. Unnecessary floating cards
5. Fake statistics
6. Fake reviews
7. Fake awards
8. Unsupported app claims
9. Decorative animation without purpose
10. Excessive text

Use strong editorial typography, calm spacing, clear hierarchy, and a restrained
cinematic experience instead.

## Bilingual requirements

English and Farsi have equal functional quality — not "Farsi as an afterthought."
Farsi uses correct RTL document semantics: layout order, navigation behaviour, and
icon direction where applicable, not just right-aligned text.

## Technical rules

1. Inspect the existing stack before proposing changes (this repo: Astro 7 +
   Tailwind v4, Cloudflare deploy on push to `main`, EN at `/`, Farsi at `/fa/`).
2. Preserve the current framework unless it is demonstrably broken.
3. Preserve GitHub and Cloudflare deployment compatibility.
4. Preserve working URLs, redirects, analytics, legal pages, and metadata.
5. Mobile first, from 320px upward.
6. Semantic HTML.
7. Keyboard navigation must work.
8. Visible focus states.
9. Respect `prefers-reduced-motion`.
10. Optimise images using the current repository toolchain when possible.
11. Prevent layout shift.
12. Avoid unnecessary client-side JavaScript (CSP here is enforcing — no inline
    styles/scripts, `inlineStylesheets: 'never'`, `assetsInlineLimit: 0`).
13. Never expose secrets or credentials.
14. Never modify DNS or Cloudflare settings.
15. Never push, merge, publish, or deploy without explicit instruction.

## Source priority

When sources disagree, resolve in this order:

1. Hamdam North Star references and current approved app design
2. Current Hamdam app assets
3. This skill
4. Existing website functionality and verified content
5. Original Hamdam assets found through Canva
6. The generic frontend-design skill

## Required workflow

1. Inspect
2. Record baseline
3. Select assets
4. Implement
5. Build
6. Test in a browser
7. Audit accessibility, quality, and SEO
8. Fix critical and high-confidence problems
9. Report exact results

Full verification checklist (what "record baseline" and "audit" actually check):
`references/verification.md`. Run it every time this skill directs an implementation
task — do not skip steps because a change looks small.
