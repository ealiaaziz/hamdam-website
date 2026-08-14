# Hamdam Web Director — Verification Checklist

Record actual observed output, not assumptions — "should work" is not a pass, and an
exit code you did not read is not a result.

## Choosing a tier

The old version of this file demanded all fifteen checks — including twelve
screenshots — for every implementation task regardless of size. That is the wrong
shape: a checklist that is always too heavy for the change in front of you is one that
gets abandoned entirely, and then nothing gets verified. So it is tiered by how much
the change can actually break.

Pick the **highest** tier the change touches. When genuinely unsure between two, take
the higher one — the cost of an extra viewport pass is minutes, and the cost of
shipping a broken RTL layout is a live marketing site in a language most reviewers
here cannot read.

| Tier | The change is | Run |
|---|---|---|
| 1 | English copy, metadata, alt text, a legal-page edit — nothing that moves a box | Always + §A |
| 2 | Visual change to an existing surface: spacing, colour, type, a component's states | Always + §A + §B |
| 3 | A new surface, structural or layout change, or anything touching the dawn hero, `src/lib/cinematic.js`, motion, `src/styles/tokens.css`, `global.css`, or images | Everything |

Anything touching Farsi output or the verse data is Tier 3 regardless of how small the
diff looks, because the failure mode there is silent and nobody reviewing the PR may
read the language.

Editing a colour or type **token** is Tier 3 even though the diff is one line: the
change reaches every surface using it, and nothing in the build or the test suite will
tell you it happened.

**Shared bilingual components need a second look before you call something Tier 1.**
`src/components/Footer.astro` is the clearest example: the Farsi branch and the English
branch live in one ternary in one file, and the component renders on 12 built pages. So
an "English-only copy fix" is a change inside a file `check:persian` covers, landing on
a dozen routes. It is still Tier 1 if the diff genuinely stayed on the English side —
confirm that from the diff rather than from intent, and check both a homepage and a
legal page rather than only the one you were looking at.

---

## Always — every tier, no exceptions

### 1. Repository cleanliness

- `git status` before starting: confirm no unexpected uncommitted changes are already
  present. If there are, stop and ask before building on top of them.
- `git status` after: confirm the diff touches only the files the task intended.

### 2. Build, tests, and content checks

Report pass/fail and counts, plus any warnings — not just exit codes.

- `npm run build` — and read the warnings, not only the final line.
- `npm test` (Vitest) — report the pass/fail counts you actually saw.
- `npm run check:persian` — must pass; also a pre-commit hook.
- `node scripts/check-dashes.mjs` — must pass. It rejects em and en dashes in content
  files, so it catches typographic drift in copy work specifically.

### 3. CSP and deploy compatibility

- No new inline styles or scripts. The CSP in `public/_headers` is enforcing, so an
  inline style does not degrade gracefully — it is blocked and the page ships broken.
- `wrangler.jsonc` and `public/_headers` not broken by the change; no routing or
  redirect change that conflicts with the Worker config.
- Remember that pushing publishes. There is no staging branch, and a push from any
  branch reaches production in about a minute.

---

## §A — Content-facing checks (Tier 1 and up)

### 4. Both locales render

- Verify `/` (English) and `/fa/` (Farsi) both render correctly for the changed
  surface — not just the one you edited.
- Confirm Farsi copy comes from the generated pipeline output (`src/data/siteCopy.ts`,
  `src/data/verses.ts`), not hand-typed text.

### 5. Legal links

- Confirm links to legal pages (privacy, terms) still resolve and were not incidentally
  moved, renamed, or broken.

### 6. Metadata

- Confirm `<title>`, meta description, and OG tags are present and correct for any page
  touched.
- If OG images were affected, confirm `node scripts/generate-og.mjs` was re-run rather
  than stale images left in place.

---

## §B — Visual and interaction checks (Tier 2 and up)

### 7. Existing functionality inventory

- List routes under `src/pages/` that exist before the change.
- Note which the task is expected to touch versus leave untouched.

### 8. Viewport verification

- Verify at minimum 320px (mobile-first floor), ~768px (tablet), ~1440px (desktop).
- Check for horizontal scroll, overlap, clipped text, and broken image aspect ratios at
  each width.

### 9. RTL semantics

- Confirm `dir="rtl"` (or equivalent) is set at the document/section level for Farsi,
  not simulated with `text-align: right` alone.
- Confirm layout order (nav, header, content flow) mirrors correctly, not just text
  alignment.
- Confirm icon direction flips where meaning depends on direction — arrows, chevrons,
  back/forward affordances.

### 10. Keyboard

- Tab through all interactive elements on the changed surface in source order.
- Confirm nothing is a keyboard trap and nothing is unreachable.
- Confirm the focus ring is visible against its background. It uses
  `--color-saffron-ink`, not raw saffron, because raw saffron does not reach AA.

### 11. Before/after screenshots

For the **changed surface only**, capture `{mobile, desktop} x {EN, FA}` before and
after. Add tablet at Tier 3, or whenever the change is responsive-layout-specific.

Two distinct surfaces (hero and footer, say) are two matrices, not one. If the change
is genuinely invisible at a given viewport, say so rather than padding the set with
identical images.

---

## §C — Robustness checks (Tier 3 only)

### 12. Reduced motion

- With `prefers-reduced-motion: reduce` simulated, confirm animated elements — the
  cinematic sunrise hero above all — fall back to their static state.
- Pin intermediate states with `?dawn=N` rather than trying to scroll to a moment.

### 13. Missing image behaviour

- Confirm layout does not shift or break if an image fails to load: reserved
  dimensions, sensible alt text, no collapsed containers.

### 14. Slow image behaviour

- Confirm perceived layout stability under throttled network — no content-jump when
  large images finish loading late.

### 15. Analytics preservation

- Confirm any analytics script or tag present before the change is still present and
  unmodified after, unless the task explicitly targeted analytics.
