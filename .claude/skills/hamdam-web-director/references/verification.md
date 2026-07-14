# Hamdam Web Director — Verification Checklist

Run every item below for any implementation task this skill directs, before
reporting results. Record actual observed output, not assumptions — "should work"
is not a pass.

## 1. Repository cleanliness check

- `git status` before starting: confirm no unexpected uncommitted changes are
  already present. If there are, stop and ask before building on top of them.
- `git status` again after changes: confirm the diff touches only the files the
  task intended.

## 2. Existing functionality inventory

- List routes/pages that exist before the change (`/`, `/fa/`, legal pages, any
  others under `src/pages/`).
- Note which of them the current task is expected to touch vs. leave untouched.

## 3. Mobile, tablet, and desktop verification

- Verify at minimum: 320px (mobile-first floor), ~768px (tablet), ~1440px
  (desktop) viewport widths.
- Check for horizontal scroll, overlap, clipped text, and broken image aspect
  ratios at each width.

## 4. English and Farsi verification

- Verify `/` (English) and `/fa/` (Farsi) both render correctly for the changed
  surface — not just one locale.
- Confirm Farsi copy source is the generated pipeline output (e.g.
  `src/data/siteCopy.ts` / `src/data/verses.ts`), not hand-typed text.

## 5. RTL semantic check

- Confirm `dir="rtl"` (or equivalent) is set at the document/section level for
  Farsi, not simulated with `text-align: right` alone.
- Confirm layout order (nav, header, content flow) mirrors correctly, not just
  text alignment.
- Confirm icon direction flips where meaning depends on direction (e.g. arrows,
  chevrons, back/forward affordances).

## 6. Keyboard check

- Tab through all interactive elements on the changed surface in source order.
- Confirm nothing is a keyboard trap and nothing is unreachable by keyboard.

## 7. Reduced motion check

- With `prefers-reduced-motion: reduce` simulated, confirm animated elements
  (e.g. the cinematic sunrise hero) fall back to their static/reduced state.

## 8. Missing image behaviour

- Confirm layout does not shift or break if an image fails to load (broken src
  test): reserved dimensions, sensible alt text, no collapsed containers.

## 9. Slow image behaviour

- Confirm perceived layout stability under throttled network — no visible
  content-jump when large images finish loading late.

## 10. Build and test results

- `npm run build` (or repo's actual build command) — report pass/fail and any
  warnings, not just exit code.
- `npm test` (Vitest) — report pass/fail counts.
- `npm run check:persian` — report pass/fail. This must pass; it is also a
  pre-commit hook.

## 11. Legal link check

- Confirm links to legal pages (privacy, terms, etc.) still resolve and were not
  incidentally moved, renamed, or broken by the change.

## 12. Metadata check

- Confirm `<title>`, meta description, and OG tags are still present and correct
  for any page touched. If OG images were affected, confirm
  `node scripts/generate-og.mjs` was re-run rather than stale images left in place.

## 13. Analytics preservation check

- Confirm any analytics script/tag present before the change is still present and
  unmodified after, unless the task explicitly targeted analytics.

## 14. Cloudflare and GitHub compatibility check

- Confirm `wrangler.jsonc` / `public/_headers` (CSP) were not broken by the
  change: no new inline styles/scripts given the enforcing CSP, no changes to
  routing/redirects that would conflict with Cloudflare config.
- Confirm the change is compatible with deploy-on-push-to-`main` (no assumptions
  about a build step Cloudflare won't run).

## 15. Before/after screenshot list

For every viewport in section 3, for every locale in section 4, capture:

- Before: current state of the changed surface.
- After: new state of the changed surface.

Minimum matrix: `{mobile, tablet, desktop} x {EN, FA}` = 6 before + 6 after,
more if the task touches multiple distinct surfaces (e.g. hero + footer are two
surfaces, not one).
