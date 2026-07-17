# Hamdam Website Redesign: Conversion Specification

Binding specification for how the page converts. The single conversion goal is an App Store
download (post-release) or informed anticipation (pre-release). There is no email capture,
no waitlist, no account: those are hard product constraints, not omissions.

## 1. Primary App Store action

- Post-release (`APP_STORE.RELEASED = true` in `src/lib/appStore.js`): the official Apple
  "Download on the App Store" badge, linking via the existing `appStoreUrl(lang)` builder
  (`https://apps.apple.com/au/app/id6784461990`, `?l=fa` appended for Farsi), opening in
  the same tab on iOS (Smart App Banner and universal link behaviour take over) and a new
  tab on desktop.
- Pre-release: the "Coming soon to iPhone" capsule pill. No badge, no store link, anywhere
  (Apple's badge rules for unreleased apps; the current site already does this correctly
  and the flag-flip mechanism is retained unchanged).
- The primary action appears exactly three times on the page: hero, mid-page (after §6),
  final ceremony. The ceremony instance is the canonical one.

## 2. Sticky mobile download action

- Mobile only (<768px). A compact capsule pill ("Get Hamdam" / approved FA equivalent)
  docked bottom-centre inside the safe-area inset, appearing only after the visitor
  scrolls past the hero CTA, hiding whenever any other App Store action is in the
  viewport (hero, mid-page, ceremony) so exactly one action is ever visible.
- 44px minimum height, `--radius-pill`, night-gold on night surfaces flipping to
  indigo-on-cream past the 0.8 sky threshold.
- Pre-release: the sticky action is suppressed entirely (a sticky "coming soon" would be
  noise without a conversion to serve).
- Never overlaps the footer or the ceremony (hidden in both).

## 3. Hero CTA behaviour

- One capsule pill, centred under the support line, above the fold at every required
  viewport, both locales.
- Post-release label: "Download on the App Store" (badge inside a capsule treatment per
  §12); pre-release: "Coming soon to iPhone" with the shamseh mark.
- The hero CTA is never obscured by the 2.5D plates at any viewport (acceptance-tested),
  and the hero communicates the product in text before any animation plays.

## 4. Mid page CTA behaviour

- Exactly one mid-page CTA, placed after §6 (journey and reflections): the visitor has by
  then seen the mechanism (§3), the voices (§4), the intelligence (§5) and the memory
  (§6), which is the natural first "convinced" point.
- Compact capsule pill plus one quiet line ("Hamdam is waiting to meet you" register,
  final copy from the approved pipeline). Additionally, §3 carries a text-link anchor to
  the ceremony ("There is more waiting in the app"), which is a scroll action, not a
  store action, and is not counted as a CTA.

## 5. Final CTA behaviour

- The ceremony (page spec §10) is the conversion climax: full morning sky, official badge
  (post-release) centred, closing line above it, privacy trust cue beneath.
- The dawn arc completing at exactly this point is the page's persuasive argument; the
  CTA is the destination of the whole scroll, and nothing else interactive lives in the
  ceremony viewport.

## 6. Language control placement

- Nav bar inline-end position (both locales), plus a second instance in the footer.
- Toggle preserves the current path across locales (existing `switchLocalePath`
  behaviour, keep) and therefore preserves query strings, including campaign parameters
  (§11).
- Label always names the target language in its own script ("فارسی" on EN pages,
  "English" on FA pages), with a matching `aria-label`; 44px target.

## 7. Privacy trust cues

- §8 of the page spec is the trust centre; the conversion-relevant cues are:
  1. One line under the final CTA: "No accounts. No tracking. Your words stay on your
     device." (each clause already supported by the live Privacy Policy).
  2. The App Store privacy nutrition line ("No Data Collected") appears only after the
     live listing is verified to display it (§13).
  3. Plain links to Privacy and Terms in the footer directly below the ceremony.
- Trust cues are text, not badges; no invented certification marks.

## 8. Subscription explanation

- Page spec §9 carries the whole story in the approved App Store description's register:
  free daily ritual with fifteen reflections monthly, always; Plus opens unlimited
  reflections, the full wisdom library, the reflection archive; monthly or yearly with a
  7-day free trial for new subscribers; auto-renewal and cancellation are handled by
  Apple.
- No dollar figures on the site (locked decision 2026-07-02). Where pricing is implied:
  "Pricing is shown on the App Store." Trial and Family Sharing wording must match Terms
  §3.2 and §3.3 exactly.

## 9. Lifetime Founding Companion treatment

- Named exactly "Founding Companion" (the app's own `L.paywallFoundingCompanion`
  localisation is the naming authority in both languages; never coin a new FA term).
- One elevated band (page spec §9): a single purchase, yours for life, shareable with up
  to six family members through Apple Family Sharing (Terms §3.3), no trial implied.
- Register: belonging and permanence ("founding" as being present at the beginning), not
  scarcity. No countdown timers, no "limited spots," no urgency theatre: nothing in the
  repository establishes a limited offer, so none may be claimed.
- No price named (placeholder rule above applies).

## 10. Analytics events required

Constraint first: the homepage currently claims "No analytics," the Privacy Policy says
"no third-party analytics" (naming app SDKs) and "No cookies," and the CSP permits
Cloudflare Web Analytics, whose live dashboard state is unverified (audit flag). Custom
event scripting would contradict the published claims as written. Therefore:

- **Specified now (no code, no contradiction):** page-level measurement only, via
  Cloudflare Web Analytics (cookieless, no cross-site tracking) **if and only if** Ealia
  confirms it is on and the homepage privacy copy is reworded to match reality (for
  example "No tracking. No cookies. Only anonymous, cookieless page counts."), in both
  languages. If Ealia prefers the copy as-is, analytics stays off and this section is
  moot.
- **Named for a future decision (not to be implemented without the copy fix):** the five
  events that would matter, in priority order: `cta_hero`, `cta_midpage`, `cta_ceremony`,
  `cta_sticky`, `mood_demo_used`. Outbound-click beacons to the App Store are the only
  genuinely decision-useful data this site could collect.
- App-side install attribution belongs to App Store Connect (see §11), not to this site.

## 11. Campaign parameter preservation

- All inbound query parameters are preserved across the language toggle and internal
  anchor navigation (no parameter-stripping redirects).
- Outbound App Store links append Apple campaign parameters (`ct`, `pt` provider token)
  when present inbound, mapping `utm_campaign` to `ct` with a documented fallback default
  (`website`). Implemented as a pure function beside `appStoreUrl()` with unit tests, so
  attribution survives without any client-side storage (no cookies, consistent with the
  privacy claims).
- The provider token value is a placeholder until read from App Store Connect:
  `[ASC_PROVIDER_TOKEN]`.

## 12. App Store badge treatment

- Official Apple badge artwork only (`public/badges/app-store-badge.svg` exists), never
  redrawn, recoloured, distorted or animated; minimum clear space and minimum size per
  Apple's marketing guidelines; black badge variant on cream morning surface.
- Badge appears only post-release (flag-gated, existing mechanism).
- Apple provides no Farsi badge localisation: FA pages use the English badge with a
  Farsi `aria-label`, never a fabricated translated badge.
- The "Coming soon" pill is visually distinct from the badge (capsule, brand typography)
  so it can never be mistaken for an official mark.

## 13. Claims requiring verification before publication

| # | Claim / item | Verification needed |
|---|---|---|
| 1 | "No analytics" homepage copy vs Cloudflare Web Analytics CSP allowance | Ealia checks the Cloudflare dashboard; then either keep copy and disable analytics, or soften copy per §10 |
| 2 | "No Data Collected" privacy-label line under the final CTA | Only after the live App Store listing displays it |
| 3 | Free tier "fifteen reflections every month" | Confirm against the shipped build's actual entitlement before publishing (source: approved listing draft) |
| 4 | 7-day free trial wording | Already in Terms §3.2; re-verify against ASC subscription configuration at flip time |
| 5 | Family Sharing up to six members on Lifetime | Terms §3.3; re-verify in ASC |
| 6 | App Store URL and ID `6784461990` | Verify live at release-flag flip |
| 7 | `[ASC_PROVIDER_TOKEN]` campaign value | Read from App Store Connect |
| 8 | Trademark line (application no. 2674427) and the two different owner names on legal pages (Ealia Azizollahi in contact, Seyed Valiallah Azizollahi as IP owner) | Ealia confirms both names are intentional before the redesign republishes them |
| 9 | Poet portrait treatment (artistic interpretations) and cultural moment imagery | Ealia's explicit cultural approval, per asset brief |
| 10 | Countdown dates for Yalda, Norooz, Chaharshanbe Suri | Cross-check against the app's own date logic for the same dates |
| 11 | "iOS 26+" requirement in structured data | Re-verify against the shipped binary's deployment target at launch |

No price, trial, or App Store term may be published beyond what items 3 to 5 verify.
