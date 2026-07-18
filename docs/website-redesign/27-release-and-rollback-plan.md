# Hamdam Website Redesign: Release and Rollback Plan

## Deploy mechanism (as it exists today, unchanged by this redesign)

Cloudflare Pages, connected to this repository's Git history, builds on push (per
`AGENTS.md`/`.claude/skills/hamdam-web-director/SKILL.md`, technical rule 3: "Preserve
GitHub and Cloudflare deployment compatibility"). No `.github/workflows` directory exists,
so there is no repository-hosted CI gate before Cloudflare's own build; the Cloudflare Pages
Git integration is the entire deploy pipeline. `wrangler.jsonc` configures the asset
directory (`./dist`) and the two custom domains (`hamdam.com.au`, `www.hamdam.com.au`),
`workers_dev: false`. **This correction does not change any Cloudflare configuration and
this response does not deploy anything.**

## Branch and deployment strategy (corrected)

**The implementation branch is `feature/hamdam-web-redesign`. `main` is the production
branch.** This supersedes the prior version of this document, which recommended committing
redesign phases directly to `main` on precedent grounds. That precedent held for docs-only
work (specification documents `00` through `17`); it does not hold for source-code
implementation, where a mid-redesign commit landing directly on the production branch would
be a live production change. The corrected rule:

1. **All fourteen phases (0 through 13) are implemented and committed on
   `feature/hamdam-web-redesign`.** No phase's implementation commits land on `main` at any
   point during Phases 0 through 13.
2. **Phase commits must remain isolated from `main`.** `main` is not merged into, rebased
   onto, or otherwise touched by any commit from this branch until the explicit final-merge
   step (§7 below). This branch is not created or switched to in this correction response;
   branch creation happens at the start of actual Phase 1 implementation work, in a future
   session, per Ealia's go-ahead.
3. **Whether pushing `feature/hamdam-web-redesign` creates only a Cloudflare preview
   deployment (not a production deployment) — determined from available repository
   configuration:** `wrangler.jsonc` binds the two custom domains (`hamdam.com.au`,
   `www.hamdam.com.au`) as routes without specifying a distinct preview-environment binding,
   and no `.github/workflows` or other repo-visible CI config exists to confirm which
   branch Cloudflare Pages treats as its "production branch" versus which branches get
   isolated preview URLs. Cloudflare Pages' documented default behaviour for a Git-connected
   project is that only the configured production branch (ordinarily `main`, consistent with
   the custom-domain routes here targeting production) triggers a deployment to the custom
   domain, while other branches receive an isolated `<hash>.<project>.pages.dev`-style
   preview URL, not the custom domain, provided "Preview deployments" is enabled and no
   branch-specific custom-domain override exists.
4. **This cannot be fully verified from repository evidence alone and remains externally
   verifiable.** The production-branch designation, the "Preview deployments" toggle, and
   any per-branch custom-domain attachment are Cloudflare Pages *project dashboard* settings,
   not committed files, and are therefore outside what this repository's source can confirm.
   Ealia should confirm directly in the Cloudflare Pages dashboard (Settings → Builds &
   deployments, and the Custom domains tab) that `main` alone is bound to
   `hamdam.com.au`/`www.hamdam.com.au` and that pushing `feature/hamdam-web-redesign` would
   only ever produce a preview URL, before relying on branch pushes as a safe intermediate
   step. Until that confirmation exists, treat every push (including to the feature branch)
   as potentially production-adjacent and get Ealia's sign-off before any push happens.
5. **No Cloudflare configuration is changed by this plan or this correction.** No new
   environment binding, no custom-domain change, no preview-deployment toggle change.
6. **No deployment happens as part of this plan.** Building the branch, running it locally
   (`npm run dev`, `npm run preview`), and committing to `feature/hamdam-web-redesign` are
   all local/repository actions; none of them is a deploy, and none happens without
   Ealia's explicit instruction regardless.
7. **Final merge to `main` requires explicit Ealia approval, after final visual,
   accessibility, performance, English, and Farsi review.** Concretely, this means Phase 13's
   full acceptance pass (`16-visual-acceptance-criteria.md` gates A through H, recorded in
   `18-acceptance-results.md`) is complete and every gate is PASS or explicitly waived in
   writing by Ealia, covering: visual (Gate A, North Star fidelity, per the narrow conflict
   rule below), accessibility (Gate F), performance (Gate G), and both English and Farsi
   review specifically (Gate C for Farsi correctness, plus the side-by-side EN/FA comparison
   from Phase 10). Only after that full review, and Ealia's explicit go-ahead, does the
   merge to `main` happen.
8. **A production rollback must identify the previous known good `main` commit.** Because
   `main` is untouched throughout Phases 0-13, the "previous known good commit" for rollback
   purposes is simply whatever `main`'s `HEAD` was immediately before the redesign's merge
   commit landed. As of this document, that would be `ce98883` if no other commits land on
   `main` before the merge; this value must be re-confirmed at merge time (`git log -1
   main` immediately before merging), not assumed to still be `ce98883`, since `main` may
   advance with unrelated work (bug fixes, other content updates) while the redesign branch
   is in progress. The rollback action itself, if ever needed post-merge, is `git revert` of
   the merge commit on `main`, pushed to trigger a new production build from the reverted
   state.
9. If a section's required asset is late (poet portraits, cultural moment imagery, both
   gated on Ealia's cultural approval per `14-canva-asset-brief.md`), that section ships
   behind a single, clearly labelled `SHOW_REDESIGN_SECTION_X` build-time flag rather than a
   half-finished visible section (`17-sonnet-implementation-handoff.md` §4). This applies on
   the feature branch exactly as before; it is no longer a mitigation for "what if this
   lands on `main` mid-redesign" (that risk is now structurally closed by point 1-2 above),
   but it remains the correct mechanism for keeping the feature branch itself always in a
   reviewable, non-misleading state.

### North Star conflict rule, as it governs final merge review

The final visual review required in point 7 above is tested against
`20-implementation-plan.md`'s narrow North Star conflict rule, not a general "shipped
behaviour wins" standard: layout, hierarchy, typography, spacing, composition, and default
presentation are checked against the North Star mockups directly; only the sky/palette
colour state is checked against the shipped app's dynamic per-scene behaviour instead (the
one approved, scoped exception). If Ealia's final review surfaces any other North
Star-versus-built-page mismatch, that is a merge blocker, recorded and resolved (or
explicitly waived by Ealia in writing) before merge, not waved through under a general
shipped-behaviour argument.

## Rollback points, by phase

Every phase in `20-implementation-plan.md` states its own rollback point (field 15). This
table consolidates them as a release-planning view: which files a `git revert` of that
phase's commit(s) touches, and what remains standing if that revert happens. **All reverts
in this table happen on `feature/hamdam-web-redesign`, not on `main`** — these are
implementation-branch corrections, not production rollbacks. Production rollback is a
separate, single mechanism (see "Emergency rollback" below), used only after the final merge
described in point 7 above.

| Phase | Revert touches | What survives a revert of this phase alone |
|---|---|---|
| 0 | `docs/website-redesign/20-27` only | Entire codebase untouched; trivial revert |
| 1 | `src/styles/tokens.css`, `global.css` | Existing site renders exactly as before the redesign began |
| 2 | New nav/sticky-CTA components, `BaseLayout.astro` diff | Phase 1 tokens remain; existing pre-redesign nav returns |
| 3 | `HeroCinematic.astro`, hero markup in both homepage files | Phases 1-2 remain; existing pre-redesign hero returns |
| 4 | `cinematic.js` evolution, sky CSS | Phase 3's static hero remains functional on its own (this is the entire reason Phase 3 and 4 are separate: Phase 3 is independently shippable) |
| 5 | `MoodDemo.astro`, `moodDemo.js` | All prior phases remain; that section's insertion point reverts cleanly |
| 6 | `PoetsBand.astro`, `PoetCard.astro` diff | `poets.ts` untouched throughout, so no data loss risk from this revert |
| 7 | `ContextConstellation.astro`, `JourneyPair.astro` | Independent of each other; either can revert without affecting the other |
| 8 | `RootsMoments.astro`, `countdown.js` | Independent of Phase 7 |
| 9 | `PrivacyTrust.astro`, `PlansAndFoundingCompanion.astro`, `FinalCeremony.astro`, `stickyCta.js` extension | Phase 2's original hero-only sticky CTA remains functional if this phase alone reverts |
| 10 | Targeted fixes only, no structural files | Nothing structural to lose; a bad fix reverts cleanly |
| 11 | Targeted fixes only | Same |
| 12 | Performance/SEO fixes; analytics change (if any) isolated to one file per `26-analytics-plan.md` | Analytics decision reverts independently of any visual work |
| 13 | Fixes plus `18-acceptance-results.md` | This phase does not introduce features, so a revert here is corrective, not destructive |

## Emergency rollback (post-merge, production only)

This section applies only after the redesign has been merged to `main` per point 7 above;
during Phases 0-13, `main` is untouched and there is nothing on it to roll back. Post-merge,
if the deployed redesign causes a live regression Ealia wants reverted immediately: identify
the previous known good `main` commit (point 8 above: `main`'s `HEAD` immediately before the
redesign merge commit, re-confirmed at merge time rather than assumed), then `git revert` of
the merge commit, pushed to `main`, triggers a new Cloudflare Pages production build from the
reverted state (standard Git-integration behaviour; no separate Cloudflare rollback action
needed beyond the push itself, assuming Cloudflare Pages redeploys on every push to the
production branch, which is the existing configuration, subject to the same
externally-verifiable caveat as point 3-4 above). If Cloudflare Pages additionally offers a
dashboard-level "roll back to previous deployment" action independent of Git history, that is
faster for a true emergency and does not require a code revert first, but this plan does not
assume its availability or configuration state since that is a Cloudflare dashboard setting
outside this repository's own source (and outside this plan's authority to touch per the
architecture rule "never modify DNS or Cloudflare settings" — using an existing dashboard
rollback feature, if present, is not the same as modifying settings, but its presence should
be confirmed by Ealia rather than assumed by this plan).

## Launch-day flag: explicitly out of this plan's scope

`APP_STORE.RELEASED` in `src/lib/appStore.js` is flipped only on Ealia's explicit
instruction, independent of this redesign's own phase completion. The redesign can be fully
built, tested, and acceptance-passed while `RELEASED` stays `false` throughout (every
pre-release acceptance check, for example E3, is written to hold in that state). Flipping the
flag is a separate, later decision tied to App Store release readiness (per
`hamdam-ios`'s own pre-launch tracking, memory: launch-day flip is a known, tracked, separate
event), not a step in this plan's Phase 0 through 13 sequence. No phase in
`20-implementation-plan.md` touches this constant.

## Definition of "safe to begin implementation" for this release plan's purposes

This plan does not authorise implementation to begin, and this correction response does not
either. Before Phase 1 begins in a future session: `feature/hamdam-web-redesign` is created
off current `main`, Ealia ideally confirms the Cloudflare preview-vs-production branch
behaviour described in point 3-4 above (not strictly blocking, since no push happens without
separate explicit instruction regardless, but worth confirming early rather than discovering
it at the first push), whichever missing product facts are still open are resolved or
explicitly accepted as still-open (see the final response's "remaining decisions" for the
current list), and this document set is reviewed for anything that misreads the approved
specification.
