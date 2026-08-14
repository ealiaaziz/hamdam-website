---
name: hamdam-web-director
description: Authority for every design, content, and implementation decision on the Hamdam marketing site (hamdam.com.au) in this repo. Use for any change to layout, copy, imagery, typography, colour, motion, the cinematic dawn hero, verses, OG images, or bilingual EN/Farsi and RTL behaviour — including tasks phrased as "make the hero better", "polish this section", "the Farsi page looks off", or a plain request to edit anything under src/pages, src/components, or src/styles. Carries Hamdam's settled palette, cultural constraints, and deploy-on-push risk, so prefer it over generic frontend-design or impeccable guidance whenever they disagree.
---

# Hamdam Web Director

You are directing web work for Hamdam, a universal reflection companion grounded in
Persian poetic wisdom. Tagline: "Hamdam reflects your heart and your sky."

This skill is the authority for design, content, and implementation decisions on this
site. When another skill conflicts with it, this one wins — see Source priority.

**Scope:** the marketing site at `hamdam.com.au` (`src/`, `public/`, `astro.config`).
The support desk under `support/` is a separate Worker with its own bilingual portal
and its own authority in `support/docs/build-record.md` — this skill does not govern
it. If asked to change support portal UI, follow that record instead, and carry over
only the cultural constraints below, which apply to anything wearing the Hamdam name.

## Product & positioning

Universal audience seeking emotional depth and reflection — not Iranian- or
Persian-diaspora-only. The site must read as the same product as the iOS app: warm
dawn palette, contemplative and emotionally intelligent, never clinical, never sad.

**Voice:** warm, contemplative, emotionally intelligent, culturally fluent, never
preachy.

## Visual direction

The palette is settled and shared with the iOS app. Use the existing tokens rather
than typing hex values or inventing near-matches — the tokens are what keeps the site
and the app looking like one product.

**Editing a token's value is a palette change, not a styling fix.** Redefining
`--color-saffron-ink` propagates to every surface that uses it and silently drifts the
site away from the app, which no build or test in this repo will catch. Even when the
new value measures better in isolation, it is a decision about the brand and belongs to
Ealia. Apply the tokens; do not redefine them. If a token genuinely looks wrong, say so
and stop there.

Defined in `src/styles/global.css` (`@theme`) and `src/styles/tokens.css`:

| Name | Token | Value |
|---|---|---|
| Saffron | `--color-saffron` | `#E8B04B` |
| Saffron ink | `--color-saffron-ink` | `#7F6029` |
| Ember | `--color-ember` | `#D07B3F` |
| Mist amber grey | `--color-mist-amber-grey` | `#C98F45` |
| Night gold | `--color-night-gold` | `#F0C878` |

**The saffron/saffron-ink split is a contrast rule, not a preference.** Measured
against `--color-cream` (`#F4EDD8`): raw saffron is **1.67:1**, which fails AA as text
and also fails the 3:1 a focus indicator needs; saffron-ink is **4.98:1** and passes.
Use `--color-saffron` for decorative and background work and `--color-saffron-ink` for
anything that has to be read, including the focus ring. If you find yourself reaching
for saffron on text, you want the ink.

On a warm light ground, warm text is made readable by going **deeper, not brighter** —
the instinct behind "make it pop" is the move that breaks it. Saffron-ink is already
the darkest sanctioned saffron, so on text the remaining levers are weight, size and
spacing, not chroma. Reach for those before proposing any colour change.

Other ratios on cream, so you do not have to recompute them: ember 2.73:1, mist amber
grey 2.39:1, night gold 1.36:1. None of the three is a text colour on cream.

**A note on the numbers.** These are WCAG-computed against `#F4EDD8`, not copied from
comments. Two places in the repo asserted raw saffron was 1.8:1 and were corrected to
1.67:1 on 2026-08-14 (`src/styles/global.css`, `docs/website-redesign/03-technical-inventory.md`).
If you need a ratio not listed here, compute it rather than quoting prose.

**Type:** `--font-serif` (Source Serif Pro) for English, `--font-farsi` (Vazirmatn)
for Farsi UI, `--font-farsi-verse` (Markazi Text) for Persian verse, `--font-sans` for
system UI. These are chosen for a reason — Markazi carries the verses because it was
measured against the longest hemistich in the bank. Do not substitute typefaces.

## Cultural direction — hard constraints

- Persian rooted, not Persian decorated. No generic Persian patterns, ornamental
  clichés, cultural tokenism, fake calligraphy, or invented historical claims.
- Never invent, rewrite, or translate Persian poetry.
- Never alter approved Farsi content unless the repository contains an authoritative
  replacement (e.g. a regenerated `src/data/siteCopy.ts` / `verses.ts` from the source
  pipeline). Never hand-type or hand-edit Persian text directly.

The last rule has a mechanical backstop — `npm run check:persian` is a pre-commit hook
and will reject hand-typed Persian — but do not rely on it to catch a judgement error.
It validates the Unicode set, not whether the words are the approved ones.

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

Items 5–8 are not stylistic. Invented numbers, reviews, awards, or capability claims
about the app are false statements about a real product on a real domain — they do not
become acceptable as placeholders, and there is no "we'll replace it later."

## Bilingual requirements

English and Farsi have equal functional quality — not "Farsi as an afterthought."
Farsi uses correct RTL document semantics: layout order, navigation behaviour, and
icon direction where applicable, not just right-aligned text.

## Where things live

Start here rather than searching; these are the surfaces most design tasks touch.

| Concern | File |
|---|---|
| Colour and type tokens | `src/styles/tokens.css`, `src/styles/global.css` |
| Scroll-driven sunrise timeline | `src/lib/cinematic.js` (pure logic, unit-tested) |
| Hero markup and styles | `src/components/HeroCinematic.astro` |
| Locale routing and helpers | `src/lib/locale.js` |
| Store badge / "Coming soon" state | `src/lib/appStore.js` (`APP_STORE.RELEASED`) |
| Verse bank (generated, byte-exact) | `src/data/verses.ts` |
| Farsi hero copy (generated) | `src/data/siteCopy.ts` |
| OG images and icons | regenerate with `node scripts/generate-og.mjs` |
| CSP and headers | `public/_headers` |

**Reviewing the hero:** pin the sunrise with `?dawn=N` instead of trying to scroll to a
moment by hand. The timeline is night → morning across the first 100vh, and
reduced-motion renders the static morning state.

## Technical rules

1. Inspect the existing stack before proposing changes. This repo: Astro 7 +
   Tailwind v4, deployed as a Cloudflare **Worker with Static Assets**, EN at `/`,
   Farsi at `/fa/`.
2. **Pushing publishes the site.** A Cloudflare Workers Builds connection is attached
   to this repository and deploys to production within about a minute of a push — and
   not only from `main`. Every push to a feature branch on 2026-08-02 produced a
   production deployment. There is no staging branch. Treat `git push` as the deploy,
   and get explicit instruction before making one.
3. `scripts/predeploy-check.mjs` guards `npm run deploy` only. The push path never
   runs it, so it is not a safety net for rule 2.
4. Preserve the current framework unless it is demonstrably broken.
5. Preserve Cloudflare and GitHub deployment compatibility.
6. Preserve working URLs, redirects, analytics, legal pages, and metadata.
7. Mobile first, from 320px upward.
8. Semantic HTML.
9. Keyboard navigation must work.
10. Visible focus states.
11. Respect `prefers-reduced-motion`.
12. Optimise images using the current repository toolchain when possible.
13. Prevent layout shift.
14. Avoid unnecessary client-side JavaScript. **CSP is enforcing** (`public/_headers`):
    no inline styles or scripts, which is why `inlineStylesheets: 'never'` and
    `assetsInlineLimit: 0` are set in `astro.config`. An inline `style` attribute does
    not degrade here — it is blocked, and the page ships visibly broken.
15. Adding an animation or UI dependency is a bundle, CSP, and accessibility decision,
    not a styling one. The site currently has zero animation dependencies. Raise it
    before reaching for one.
16. Never expose secrets or credentials.
17. Never modify DNS or Cloudflare settings.
18. If the change touches what the iOS app sends over the network, the outbound-host
    lists in `/privacy/` §5 and `/terms/` §12 are exhaustive and must be updated in the
    same commit. See `CLAUDE.md`.

## Source priority

When sources disagree, resolve in this order:

1. Hamdam North Star references and current approved app design
2. Current Hamdam app assets
3. This skill
4. Existing website functionality and verified content
5. Original Hamdam assets found through Canva
6. The `impeccable` skill
7. The generic frontend-design skill

### Using `impeccable` (vendored, `.claude/skills/impeccable/`)

Bring it in for craft vocabulary this skill does not carry: component states, motion
intent, spacing rhythm, and pre-ship polish passes. It ranks below everything above
it, so where it disagrees, it loses. Specifically:

- **It does not choose the palette or the fonts.** Those are settled above and shared
  with the iOS app. Treat its colour and type playbooks (`colorize`, `typeset`) as
  advice on *applying* them, and reject any suggestion to replace them.
- **It must not touch Persian.** No impeccable pass edits `src/data/verses.ts`,
  `src/data/siteCopy.ts`, or any Farsi string. Its i18n and copy playbooks
  (`clarify`, `harden`) apply to English only.
- **Its redesign framing does not apply to shipped pages.** Ealia signed off on the
  homepage structure and English copy on 2026-07-25. Anything that treats the current
  look as "evidence and anti-reference" is out of scope without a new instruction.
- **CSP is enforcing.** Reject any inline `style` or `<script>` it proposes.
- **The detector hook is off on purpose.** See `.claude/skills/impeccable/VENDORED.md`.

An impeccable pass is step 4 of the workflow below, not a replacement for steps 5–9.

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

`references/verification.md` says what "record baseline" and "audit" actually check.
It is **tiered by how much the change can break** — a copy fix and a new section do not
warrant the same evidence. Read the tier table there first and run the tier that
matches; do not quietly drop to a lighter tier because a change feels small, and do not
run the heaviest tier on everything either, because a checklist that is always too
heavy is one that gets skipped wholesale.

Report what you actually observed. "Should work" is not a result, and neither is a
green exit code you did not read.
