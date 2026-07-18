# Hamdam Website Redesign: Analytics Plan

## The blocking contradiction (restated, not resolved here)

Three facts, all independently verified against the current repository at commit `ce98883`,
sit in unresolved tension:

1. The homepage copy states "No analytics" (English) and its Farsi equivalent.
2. The Privacy Policy states "no third-party analytics," naming specific SDKs (Firebase,
   Mixpanel, Amplitude, Google Analytics) and is silent on Cloudflare specifically.
3. `public/_headers` CSP allows `script-src ... https://static.cloudflareinsights.com` and
   `connect-src ... https://cloudflareinsights.com`. `docs/progress.md`'s Phase W1 entry
   records "Cloudflare Web Analytics unblocked in CSP (Option B, no custom events)" as an
   intentional decision at the time. A repository-wide grep confirms zero beacon script
   exists anywhere in `src/` today, and Cloudflare Web Analytics (if enabled) is toggled and
   injected at the Cloudflare dashboard/edge level, not visible in source at all, so its
   live on/off state cannot be confirmed by reading code.

This has already been flagged, independently, in three separate documents
(`00-current-state-audit.md`, `docs/progress.md`, and `15-conversion-specification.md` §10
and §13 item 1) across at least two audit passes. `15-conversion-specification.md` already
states the correct handling: do not silently resolve it. This plan does the same, and adds
nothing beyond specifying what happens once Ealia decides.

## The explicit claim rule (this correction)

**The public website must not claim "No analytics" unless repository and Cloudflare
evidence establish that no analytics or traffic measurement is active.** Today, neither
source of evidence establishes that: the CSP allows Cloudflare Insights (repository
evidence pointing toward "possibly active"), and the live Cloudflare dashboard toggle state
is unverified (no evidence either way). "No analytics" is therefore not currently a
substantiated claim; it is either true (if Ealia confirms the toggle is off) or false (if
it is on), and the website must not assert it without that confirmation. This is a stricter
framing than "pick Option A or B for convenience": the current published copy is a claim
that needs verifying, not a default that stays unless someone objects.

### Five categories, distinguished where factually applicable

The current "No analytics"/"no third-party analytics" wording collapses several distinct
things into one blanket claim. The final wording (not chosen in this correction) should
distinguish between them wherever they are factually different, rather than repeat one
undifferentiated phrase:

1. **Advertising tracking.** No evidence of any advertising pixel, remarketing tag, or
   cross-site ad tracking exists anywhere in this repository. This claim, specifically, is
   substantiated today regardless of the Cloudflare Insights question.
2. **Sale of personal data.** No accounts, no email capture, no backend exists on this
   static site; there is no personal data collected to sell. This claim is also
   substantiated today, independent of the analytics question.
3. **Product analytics** (session replay, feature-usage tracking, funnels, cohort
   analysis, any SDK that profiles individual visitor behaviour across a session). No such
   SDK exists in this repository (`22-dependency-decision.md` confirms zero analytics npm
   dependencies). This claim is substantiated.
4. **Privacy-preserving aggregate website traffic measurement** (Cloudflare Web
   Analytics specifically: cookieless, no cross-site identifier, dashboard-toggled). This is
   the one category whose truth value is genuinely unknown from repository evidence alone
   and depends on the Cloudflare dashboard's live toggle state, per the contradiction above.
5. **App Store CTA measurement** (the five named events in this document, `cta_hero`
   through `mood_demo_used`). None of these exist in code today; whether they ship at all
   is downstream of category 4's resolution, per this document's existing Option A/B
   framing below.

**No final wording is chosen or published in this correction.** The above is a
classification framework for whoever drafts the final copy (Ealia, or Claude with Ealia's
explicit sign-off, through the approved Farsi pipeline for any FA copy), not a drafted
replacement sentence. The suggested register quoted later in this document ("No tracking.
No cookies. Only anonymous, cookieless page counts.") remains a suggestion, not an approved
final string, exactly as before this correction.

## Decision required from Ealia, stated as two clean options

**Option A: keep analytics off, keep the copy.** Ealia confirms the Cloudflare dashboard
toggle is off (or turns it off if currently on) and the current "No analytics" copy stays
exactly as published, now substantiated by that confirmation rather than merely
unchallenged. No implementation work follows from this plan; this document becomes moot
until a future decision reopens it.

**Option B: turn analytics on, fix the copy.** Ealia confirms the Cloudflare dashboard
toggle for Web Analytics is (or will be) on, and approves reworded homepage/privacy copy that
accurately describes it, in both languages, before the redesign ships. Suggested register
(from `15-conversion-specification.md` §10, not yet Ealia-approved wording): "No tracking. No
cookies. Only anonymous, cookieless page counts." Any such copy change, in either language,
still goes through the approved Farsi pipeline (never hand-typed) and still passes
`npm run check:persian`.

There is no Option C where custom event scripting ships while the "No analytics" claim
stands unchanged: that would make the published claim false, which this plan will not do
regardless of implementation convenience.

## If Option B is chosen: what actually gets built

Cloudflare Web Analytics itself requires no code change (it is a dashboard-toggled,
edge-injected beacon, not an npm dependency or a script tag this repository controls
directly — see `22-dependency-decision.md`). The only redesign-scoped work is the five named
events, if and when Ealia wants outbound-click measurement beyond Cloudflare's own default
page-view counting:

| Event | Fires when | Priority | Data captured |
|---|---|---|---|
| `cta_hero` | Hero App Store action clicked/tapped | 1 (highest) | Locale, `APP_STORE.RELEASED` state at click time |
| `cta_midpage` | Mid-page App Store action (after §6) clicked/tapped | 2 | Locale |
| `cta_ceremony` | Final ceremony App Store action clicked/tapped | 3 | Locale |
| `cta_sticky` | Mobile sticky App Store action clicked/tapped | 4 | Locale, viewport width bucket |
| `mood_demo_used` | Mood slider moved past its default state for the first time in a session | 5 | Locale, selected feeling stop (not free-text, not a value that could identify an individual visitor) |

These map directly to the mega-prompt's required event list (hero, sticky, mid-page, and
final App Store actions; language change; poet interaction; mood demonstration interaction;
privacy link; subscription information; Lifetime Founding Companion information) with two
differences, stated explicitly rather than silently narrowed:

- **Outbound App Store clicks are the only genuinely decision-useful data this static,
  no-account, no-backend site can collect** (`15-conversion-specification.md` §10's own
  framing). Language-change, poet-interaction, privacy-link, subscription-info, and Founding
  Companion-info events are listed below as a secondary tier, not dropped, but not
  prioritised, because none of them measures the site's one conversion goal directly.
- App-side install attribution belongs to App Store Connect via the campaign parameters in
  `appStoreUrl()` (see `22-dependency-decision.md` and Phase 9 in `20-implementation-plan.md`
  for the `ct`/`pt` mapping), not to this site's own event log.

### Secondary tier (only if Ealia wants engagement depth beyond conversion clicks)

| Event | Fires when | Data captured |
|---|---|---|
| `language_change` | Language toggle used (nav or footer instance) | From locale, to locale |
| `poet_interaction` | A poet card is focused/tapped/hovered past a threshold dwell (avoid firing on every incidental hover) | Poet name (one of the five locked names only) |
| `privacy_link_click` | Privacy Policy link clicked, anywhere on the page | Section of page it was clicked from (footer vs §8 inline) |
| `subscription_info_view` | Plans section (§9) scrolled into view past a dwell threshold, or its comparison list expanded/interacted with | Locale |
| `founding_companion_info_view` | Founding Companion band scrolled into view past a dwell threshold | Locale |

No event in either tier captures free text, IP address beyond what Cloudflare's own
cookieless aggregate counting already does, device fingerprint, or any identifier that could
re-associate a visitor across sessions. This is a hard constraint independent of Ealia's
Option A/B choice: whatever ships must remain consistent with "no accounts, no cookies, no
cross-site tracking," the same standard the app itself holds to.

## Personally invasive tracking: explicitly excluded

Per the mega-prompt's own instruction ("do not add personally invasive tracking"), the
following are out of scope regardless of which option Ealia picks: session replay tools,
heatmaps, fingerprinting-based analytics, any analytics SDK that sets a cookie, cross-site
retargeting pixels (Meta Pixel, Google Ads remarketing tag), and any event schema that could
reconstruct an individual visitor's reading path through the page in enough detail to
identify them.

## Implementation gating

No analytics code (beyond the CSP allowance already present) ships in Phases 1 through 11 of
`20-implementation-plan.md`. Phase 12 is where the decision gate lives, and Phase 12's own
definition of done states this explicitly: "analytics decision either resolved with Ealia's
explicit sign-off or explicitly deferred (never silently implemented)." If Phase 12 arrives
and Ealia has not yet decided, Phase 13's acceptance pass proceeds without analytics
(Option A's outcome by default, not by silent choice) and this document is revisited in a
later, separate decision.

## What this plan does not do

It does not turn analytics on. It does not change the CSP. It does not touch the homepage or
Privacy Policy copy. It does not add any script tag, npm dependency, or Cloudflare dashboard
setting. It records the decision that needs to be made and the exact, scoped work that
follows each branch of that decision, so that whichever way Ealia decides, implementation is
a single, small, already-specified change rather than a fresh design exercise.
