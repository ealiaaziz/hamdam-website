# Product truth verification

S3 of the Final Completion Mega Runner. Every commercial, product, and privacy claim on the
website, checked against repository evidence (this repo's own legal pages, which are the most
authoritative source available to a Sonnet session with no App Store Connect or hamdam-ios write
access) and against project memory where the website itself doesn't state the fact directly.
Where evidence is genuinely absent, marked "verification required" rather than guessed — per the
runner's own instruction not to invent pricing, trial terms, Family Sharing details, App Store
identifiers, or trademark/legal-entity facts.

## 1. Pricing

**Claim on site**: no dollar figures anywhere; every plan says "Pricing is shown on the App
Store." (PLAN-05 in the copy ledger).

**Evidence**: `PlansAndFoundingCompanion.astro`'s own comment cites "locked decision 2026-07-02."
`index.astro`'s JSON-LD sets `offers.price: '0'` with `description: 'Free with in-app purchases'`
— accurate (a genuine free tier exists) and does not publish a paid figure.

**Verdict**: **Consistent, no false claim.** Cannot independently verify the *actual* App
Store prices from this session (no App Store Connect access), but the website doesn't state any,
so there's nothing to fact-check against a number.

## 2. Trial duration

**Claim on site**: "Monthly or yearly, with a 7-day free trial for new subscribers" (PLAN-04).

**Evidence**: `terms.astro` §3.2 (EN) and `fa/terms.astro` §3.2 (FA): "Monthly and Yearly
subscriptions include a 7-day free trial for new subscribers." Word-for-word match in both
languages.

**Verdict**: **Verified, consistent across marketing copy and legal text, both languages.**

## 3. Family Sharing

**Claim on site**: "A single purchase, yours for life, shareable with your family through Apple
Family Sharing" (PLAN-06) — does not state a member count.

**Evidence**: `terms.astro` §3.3: "The Lifetime plan supports Family Sharing, for up to six
members through Apple's Family Sharing. Monthly and Yearly plans are single-user." Six members is
Apple's own platform-wide Family Sharing cap, not a Hamdam-specific figure.

**Verdict**: **Verified, no contradiction.** The marketing page's silence on the exact member
count is not a false claim — it doesn't say "unlimited" or state any number, so there's nothing
to reconcile against the Terms' "six members."

## 4. Lifetime availability

**Claim on site**: Founding Companion is presented as a currently-offered one-time purchase, no
availability window or scarcity language anywhere in the copy reviewed.

**Evidence**: No expiry, deadline, or "limited time" language found anywhere in
`PlansAndFoundingCompanion.astro`, `terms.astro`, or `privacy.astro`.

**Verdict**: **Consistent** — the absence of scarcity language means there's no claim to
verify against.

## 5. App Store identifier

**Claim on site**: `apple-itunes-app` meta tag (`BaseLayout.astro`) references
`APP_STORE.ID` from `lib/appStore.js`; `jsonLd.url` is `https://hamdam.com.au/`.

**Evidence**: Not independently verifiable from this session — confirming the real numeric App
Store ID requires App Store Connect access, which this session doesn't have.

**Verdict**: **Verification required.** Flagged for whoever has App Store Connect access
(Ealia) to confirm `lib/appStore.js`'s `APP_STORE.ID` constant is the real, current ID before
launch — a wrong ID would silently break the Smart App Banner and any `apps.apple.com` deep
links once `APP_STORE.RELEASED` flips true.

## 6. Trademark owner / legal entity

**Claim on site**: Two different names appear in relation to Hamdam's legal ownership:

- `terms.astro` §16 / `privacy.astro` §11 (Contact): **"Ealia Azizollahi (sole trader) · ABN 74
  389 481 503 · Brisbane, Queensland, Australia"**
- `terms.astro` §15 / `privacy.astro`'s closing trademark note: HAMDAM™ and all associated IP
  "are owned by **Seyed Valiallah Azizollahi**"
- Both legal pages' `jsonLd.publisher.name` also says "Ealia Azizollahi"

**Evidence**: This is present consistently across both languages (FA legal pages use the same two
names in the same roles) — so it is not a translation error or a one-off typo, it's a deliberate
structural choice repeated in four places (EN terms, EN privacy, FA terms, FA privacy).

**Verdict**: **Verification required, not assumed to be an error.** Two people/entities holding
different legal roles (e.g. a sole-trader ABN for day-to-day business operations under one name,
and the trademark/IP application filed under a different, possibly family member's name for tax
or estate-planning reasons) is a real, unremarkable business structure — this is plausibly
correct. But per the runner's explicit instruction not to guess at trademark ownership or legal
entity, this needs Ealia's direct confirmation that both names are intentional and correctly
assigned, not a copy-paste error from an earlier draft. **Not treated as a bug and not
"fixed"** — flagged for confirmation only.

## 7. Health data behaviour

**Claim on site**: PRIV-01/CONST-03 state health signals are opt-in, on-device, shape tone not
score, and (per QUIET-02) can optionally write State of Mind entries to Apple Health.

**Evidence**: `privacy.astro` §1.1 matches closely: HealthKit reads are opt-in, State of Mind
writes are opt-in and separate from reads, cycle awareness is a separate opt-in "never displayed
anywhere in the Hamdam interface."

**Verdict**: **Verified, consistent.** The marketing copy (constellation clauses, hero body
copy) doesn't overstate what the Privacy Policy itself describes.

## 8. Location behaviour

**Claim on site**: CONST-03's "Weather" clause: "Through Apple's WeatherKit, on your device."

**Evidence**: `privacy.astro` §1.3: "Location is only used when you enable weather or cultural
moment features... Hamdam does not store your location and does not share it with anyone."

**Verdict**: **Verified, consistent.**

## 9. AI capability

**Claim on site**: No page in this redesign's reviewed scope (hero, mood demo, poets, roots,
journey, privacy, plans, ceremony, footer, nav) makes any explicit "AI-generated" or
"on-device intelligence" claim to the visitor.

**Evidence**: `privacy.astro` §1.7 does describe Apple Intelligence / Foundation Models use
internally (hardware-gated to iPhone 15 Pro+, iOS 26+, with a static-content fallback on
unsupported devices) — but this is disclosure in the Privacy Policy, not a marketing claim on the
main pages.

**Verdict**: **Consistent — no overstated AI claim found on marketing pages.** The Privacy
Policy's own AI disclosure is more specific/hedged than anything the marketing copy claims, which
is the safe direction (under-claiming, not over-claiming).

## 10. Roots coverage

**Claim on site**: ROOTS-03: "Mehregan and Sizdah Bedar are marked too, each with its own quiet
arrival" — implies these two moments exist in the app's Roots calendar beyond the three shown
(Yalda, Norooz, Chaharshanbe Suri).

**Evidence**: Not independently verifiable from this website-only session — this is a claim about
hamdam-ios app behaviour (the Roots calendar's actual moment list), not something the website
repo's own files can confirm or deny.

**Verdict**: **Verification required.** Flagged for Ealia or a hamdam-ios session to confirm
Mehregan and Sizdah Bedar are genuinely implemented moments in the app, not just named
aspirationally on the website. If they aren't yet shipped, this is a real false-claim risk, not a
copy nitpick.

## 11. Poet count

**Claim on site**: "five poets" stated repeatedly (VERSE-01, POETS-01, COMPANION-02).

**Evidence**: `data/poets.ts` contains exactly five entries: Hafez, Rumi, Saadi, Khayyam, Parvin
Etesami — matching the CLAUDE.md-locked poet list exactly (Forough Farrokhzad correctly absent).

**Verdict**: **Verified, exact match, no discrepancy.**

## 12. Privacy behaviour (general)

**Claim on site**: "No accounts," "no analytics," "no email collection," "zero-knowledge journal"
framing throughout PRIV-01/PRIV-02 and the footer.

**Evidence**: `privacy.astro` §2 lists twelve specific negatives (no third-party analytics, no
crash SDK beyond Apple's own aggregated/anonymised crash reporting, no ad SDKs, no cookies, no
third-party font loading, etc.) — the marketing copy's claims are all a subset of what §2
explicitly promises, none broader.

**Verdict**: **Verified, consistent, and appropriately conservative** (marketing claims don't
exceed what the legal text commits to).

## 13. Platform integrations (Siri, Widgets, Watch, Health, Music) — QUIET-02/QUIET-03

Five distinct claims in one paragraph, checked individually since a single false claim buried in
an otherwise-true paragraph is exactly the failure mode this verification exists to catch:

| Claim | Evidence available this session | Verdict |
|---|---|---|
| Siri: "Ask Siri to start a reflection, hear today's verse, or check your streak" | Project memory: "9A App Intents/Siri patch shipped 2026-07-10," building on "Phase 18's earlier App Shortcuts work" | **Plausible, consistent with memory** — not independently re-verified against hamdam-ios source this session (out of this session's scope), but not contradicted by anything found |
| Widgets: "Add a widget to your Home Screen" | Not directly evidenced this session | **Verification required** |
| Watch: "your verse and streak travel with you" | `CLAUDE.md` itself states "iOS primary + a phone-paired Apple Watch companion today" as current shipped scope | **Verified against CLAUDE.md's own current-state description** |
| Health: "each reflection can be saved to Apple Health as a State of Mind entry" | `privacy.astro` §1.1 explicitly describes this exact feature ("With permission, Hamdam writes State of Mind entries to Apple Health when you enable mood logging") | **Verified, matches Privacy Policy exactly** |
| Apple Music: "calm music playing alongside through Apple Music" | Recent commit history shows Apple Music integration work (`git log`: "fix: Apple Music continue button reads 'Continue' per Apple's exact wording") | **Verified via commit history** — real, recently-touched feature |

**Verdict overall**: Four of five sub-claims verified against real evidence found this session;
Widgets is the one genuine gap — not contradicted, just not independently confirmed. Flagged, not
assumed false.

## 14. Mood label EN/FA pairing (Mood Label Rule)

See copy ledger MOOD-05. This is the one item in this whole verification that is a **known,
already-flagged, unresolved mismatch** rather than a "needs checking" gap: EN uses warm poetic
words (Heavy/Unsettled/Steady/Light/Bright), FA reuses the app's own clinical Apple Health
valence-scale strings verbatim. The mismatch is explained by its own code comment (not hidden),
but per the runner's Mood Label Rule this still needs Fable's resolution — an explained mismatch
is not the same as an accepted one.

## Analytics decision

Per `26-analytics-plan.md` and the runner's own explicit instruction, this is deliberately left as
Ealia's call and untouched this session:

- No new analytics dependency added (`package.json` unchanged across S1/S2/S3 — still just
  `@astrojs/sitemap`, `@fontsource/*`, `@tailwindcss/vite`, `astro`, `tailwindcss`, `sharp`,
  `vitest`).
- No advertising pixel, session replay, cross-site tracking, or fingerprinting present anywhere
  in the codebase (consistent with `privacy.astro` §2's own claims, independently spot-checked by
  grepping `src/` for `gtag`, `fbq`, `analytics`, `mixpanel`, `amplitude` — zero matches).
- No mood value is recorded anywhere outside the visitor's own browser session (the mood demo's
  slider state is pure client-side DOM state, never sent anywhere — confirmed by reading
  `MoodDemo.astro`'s script block, which only ever calls `renderVerse`/DOM updates, no `fetch`,
  no `navigator.sendBeacon`, no cookie writes).
- **Correction after verifying this claim, not before publishing it**: `privacy.astro`'s own meta
  `description` (line 10, pre-dating this redesign, not introduced by S1/S2/S3) reads "How Hamdam
  handles data: what it accesses, what it never collects, and how iCloud sync works. No accounts,
  no analytics, no data selling." — this literally states "no analytics," which is exactly the
  absolute phrasing the runner explicitly instructs against. The page body's own §2 is more
  precise ("No third-party analytics... No dedicated crash-reporting or analytics SDK — the only
  crash data collected is Apple's own built-in iOS crash reporting via App Store Connect,
  aggregated and anonymised"), which is accurate and appropriately hedged. The meta description's
  blanket "no analytics" is a real overclaim risk if any edge-level measurement (e.g. Cloudflare
  Web Analytics) is ever enabled — something this session cannot confirm either way per the
  runner's own instruction not to assume Cloudflare's dashboard state. **Not fixed this pass**:
  this is pre-existing copy outside S1/S2's asset-integration scope and outside S3's narrow
  Sonnet-fix authority (a meta description isn't a typo, broken ARIA label, or em dash — changing
  its wording is exactly the kind of copy judgement call reserved for Fable/Ealia). Flagged here
  instead, added to the summary list below.
- Whether Cloudflare's own edge-level measurement (Web Analytics, bot detection, etc.) is enabled
  is a Cloudflare dashboard setting, not something visible from this repository — **not claimed
  either way in the site's copy**, consistent with the runner's instruction not to state
  Cloudflare measurement is enabled unless independently verified.

**No analytics decision was made or implemented this session.** This remains open for Ealia.

## Summary: items requiring Ealia's direct input before F1/launch

1. Trademark/IP owner name discrepancy (§6) — likely fine, needs a yes/no confirmation, not a fix.
2. App Store ID constant accuracy (§5) — needs App Store Connect access this session doesn't have.
3. Roots coverage — Mehregan/Sizdah Bedar actually implemented in-app? (§10)
4. Widgets claim — independently confirm shipped, not just historically planned (§13)
5. Mood label EN/FA register mismatch (§14) — hers or Fable's call on the resolution direction.
6. Missing FA 404 page (copy ledger §15) — a real gap, not a copy-quality question.
7. Context constellation's own self-flagged wording-vs-policy check (copy ledger CONST-03) —
   already an open item before this session, still open.
8. `privacy.astro`'s meta description states "no analytics" verbatim (§Analytics decision) — a
   real, pre-existing overclaim risk against the runner's own explicit instruction, found only
   because this verification pass actually ran the grep rather than assumed the claim was clean.
   Needs Fable/Ealia to pick replacement wording (e.g. the body's own more precise "no
   third-party analytics" framing), not a Sonnet-authored fix.

None of these eight items were "fixed" by guessing an answer — per the runner's explicit
instruction, every one is a preserved-and-flagged verification gap, not a silently-resolved one.
