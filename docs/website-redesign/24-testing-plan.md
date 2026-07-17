# Hamdam Website Redesign: Testing Plan

This plan does not reinvent a test checklist: `16-visual-acceptance-criteria.md` is already
the literal pass/fail definition of done (eight lettered gates, roughly fifty numbered
checks), and `.claude/skills/hamdam-web-director/SKILL.md`'s companion
`references/verification.md` already defines what "record baseline" and "audit" check in
this repo's workflow. This document says which tests run at which phase, in what tooling,
and how results are recorded, cross-referencing those two documents rather than duplicating
them.

## Test categories and tooling

| Category | Tooling | Automated / manual | Where results are recorded |
|---|---|---|---|
| Unit tests (pure functions) | Vitest, `src/lib/__tests__/` | Automated | Terminal output, checked in CI-equivalent (`npm test`) at every commit |
| Build integrity | `astro build` | Automated | Terminal output; zero warnings is the bar |
| Persian byte validation | `scripts/check-persian.mjs`, pre-commit-hooked | Automated | Terminal output; also gates every commit automatically |
| Visual/screenshot regression | Manual capture via the `webapp-testing` skill (Playwright, not an installed dependency) at the fixed viewport matrix | Semi-automated (scripted capture, human comparison) | `docs/website-redesign/baseline-screenshots/` pattern, extended per phase |
| Keyboard navigation | Manual, browser | Manual | Written pass/fail notes per phase, consolidated in `18-acceptance-results.md` |
| Screen reader | Manual, VoiceOver + Safari | Manual | Written pass/fail notes, consolidated in `18-acceptance-results.md` |
| Contrast | Manual measurement (DevTools contrast checker) at named thresholds | Manual | Numeric values recorded, not just pass/fail (matches the app's own `HamdamContrastRatio` precedent of recording measured ratios) |
| Reduced motion | Manual, OS-level `prefers-reduced-motion: reduce` toggle, full-page screenshot | Manual | Screenshot set, diffed against motion-enabled set |
| Performance | Lighthouse (ad hoc, no CI package installed per `22-dependency-decision.md`) | Manual | Report export, both locales |
| Regression (SEO/meta/legal) | `dist/` output diff against baseline for non-homepage routes | Semi-automated (diff), manual review | Diff output attached to `18-acceptance-results.md` |

No lint or typecheck tool exists in this repo and none is introduced for this redesign
(`22-dependency-decision.md`); TypeScript's implicit type generation during `astro build`
(`[types] Generated`) is the closest available signal and is checked for zero errors at
every build.

## Viewport matrix (fixed, matches the existing baseline audit)

390x844, 430x932, 768x1024, 1024x768, 1440x900, 1728x1117. Every visual test in this plan
uses this exact matrix unless a specific check states otherwise (for example, motion
acceptance criterion 1 requires full-page reduced-motion captures, which use the same
matrix). Synthetic viewport emulation (DevTools responsive mode, headless capture) covers
this matrix efficiently but does not substitute for the real-device Safari/iPhone pass
required at Phase 12 and Phase 13 (`25-performance-budget.md`, "Synthetic scores do not
replace device validation"); that pass is a distinct, additional testing category, not an
extension of this matrix.

## North Star conflict rule, as it governs testing (narrow, binding)

`20-implementation-plan.md`'s "North Star conflict rule" section is the authority; this
plan applies it rather than restating it. In practice, for Gate A (North Star fidelity)
testing specifically: every check under A1 through A6 is tested as a strict layout,
hierarchy, typography, spacing, and composition match against the two North Star PNGs,
**except** where the specific element under test is the sky/palette colour state driven by
`--sky-progress`, which is tested against the shipped app's dynamic per-scene palette
behaviour instead (the one approved, narrowly-scoped exception). A tester who finds any
other visual mismatch between the built page and the North Star mockups records it as a
Gate A finding, full stop; it is never waved through with "shipped behaviour probably wins"
reasoning during a test pass. If a genuinely new North Star-vs-shipped conflict is found
during testing (something neither of the two documented cases in `20-implementation-plan.md`
covers), it is logged in `18-acceptance-results.md` as an open question for Ealia, not
silently resolved by the tester.

## Per-phase testing (cross-referenced to `20-implementation-plan.md`)

Each phase in the implementation plan already states its own tests, screenshots, and
acceptance criteria in fields 7 through 14. This section adds only what is testing-specific
and would otherwise be scattered:

| Phase | New automated tests | New manual tests | Gate(s) it feeds |
|---|---|---|---|
| 0 | Re-run existing 60/60 + build + Persian check as a baseline reconfirmation | None | Establishes the "still passing" precondition for every later phase |
| 1 | None (token-only change, no logic) | Visual parity diff against baseline screenshots (expect zero difference) | Regression precondition for H1 |
| 2 | New: sticky-CTA state machine pure function | Keyboard trap check on the new fixed nav; 44px touch target measurement | Early contribution to F1, F7, E1 |
| 3 | None yet (no pure logic introduced) | Side-by-side hero vs North Star mockup (A1); alt text review | A1, B1 |
| 4 | New: sky ramp pure function (progress-to-colour, threshold flips, clamping) | `?dawn=N` deterministic state capture; 4x CPU throttle scroll performance check | D2, D3, H3 |
| 5 | New: mood-to-scene/verse mapping, settle-debounce | Keyboard-only slider operation end to end; screen reader announcement order (feeling then verse) | F1, F2, C1 (verse checksum) |
| 6 | None (static content) | Grep for "Forough" returns nothing; portrait alt text review | B4, C2 |
| 7 | None (presentation-only interactions) | Constellation screen-reader list structure check; journey alt text review | F2, F6 |
| 8 | New: countdown pure function, including year rollover | Countdown value cross-check against the app's own date logic for the same date | B2 (product truth), acceptance item 14 in page spec §7 |
| 9 | New: campaign-parameter mapper; sticky-CTA extension (mid/ceremony states) | Grep for dollar figures, dates against Terms §3.2/§3.3, pre-release badge-absence check | B3, B5, E3 |
| 10 | None new (uses existing `check:persian`) | Full EN/FA side-by-side comparison, every section, at 1440x900 and 390x844 | C1-C7 |
| 11 | None new | Full keyboard pass, VoiceOver pass, contrast measurement at both thresholds, forced-colours capture | F1-F7 |
| 12 | None new | Lighthouse both locales, image transfer audit, long-task recording | G1-G6, H1 |
| 13 | None new (final regression run of everything above) | Full acceptance checklist execution, recorded in `18-acceptance-results.md` | All gates, final sign-off |

## Cross-cutting checks that run at every phase, not just their "owning" phase

These are cheap enough to run continuously rather than saved for a dedicated phase:

1. `npm run test` — must stay green from Phase 0 onward; a phase that breaks an existing
   test blocks its own completion until fixed.
2. `npm run build` — zero warnings, every phase.
3. `npm run check:persian` — every phase, automatically enforced by the pre-commit hook, so
   this is closer to a tripwire than a scheduled check.
4. Em/en dash grep (`U+2013`, `U+2014`) across new copy — every phase that adds copy (this
   is check C7's grep, run early and often rather than saved for Phase 10/13, since a dash
   slipping into English copy is unrelated to the Farsi correction phase and cheaper to
   catch immediately).
5. Dollar-figure grep (`$`, `AUD`, digit-dot price patterns) — every phase that adds
   commerce-adjacent copy (mainly Phase 9, but the grep itself is cheap to run at every
   phase as a tripwire, matching B5's zero-tolerance bar).

## What this plan deliberately does not add

No new testing framework, no visual-regression-as-a-service tool (Percy, Chromatic), no
Lighthouse CI package, no ESLint. Every rejection and its reasoning is in
`22-dependency-decision.md`; this document does not repeat that reasoning, only confirms the
testing plan is achievable without any of them, using the ad hoc `webapp-testing` skill and
manual Lighthouse runs exactly as the prior 2026-07-14 external audit did.

## Recording results

Every phase's manual test results (screenshots, keyboard pass notes, contrast measurements,
Lighthouse exports) accumulate toward one final artefact: `18-acceptance-results.md`, created
in Phase 13, following the existing `06-screenshot-index.md` pattern for organisation. Phases
1 through 12 do not each need their own permanent results document; their screenshot sets are
working evidence for that phase's own review, not a separate deliverable, unless a phase
uncovers something Ealia needs to see before Phase 13 (for example, an asset-approval
checkpoint), in which case that specific evidence is called out in that phase's commit
message or a short note, not a new numbered doc.
