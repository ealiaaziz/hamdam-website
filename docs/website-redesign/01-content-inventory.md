# Hamdam Website — Content Inventory

Every visible copy string on the live site (English source; Farsi noted as native
translation, not re-typed here — see source files for the Persian text, which is never
retyped through chat per the hard constraint). Extracted from `src/pages/*.astro`,
`src/data/*.ts`, and shared components. Each entry tagged against the category list from the
audit brief. No copy was rewritten.

Legend for tags: **Position** = product positioning, **Capability** = product capability,
**Privacy**, **Health**, **Location**, **Weather**, **AI**, **Subscription**, **Free**,
**Plus**, **Lifetime**, **AppStore** = App Store availability, **Attribution** = cultural/
poetic attribution.

## Homepage (`/`, mirrored natively at `/fa/`)

| Section | English copy | Tags | Notes |
|---|---|---|---|
| Hero title | "Hamdam reflects your heart and your sky." | Position | Exact locked tagline — matches CLAUDE.md verbatim |
| Hero subhead | "A bilingual reflection companion rooted in Persian poetry." | Position | |
| Hero CTA | "Coming soon to iPhone" (pill, `APP_STORE.RELEASED=false`) | AppStore | Correctly avoids "Download now" language pre-release |
| Meta description | "Hamdam reflects your heart and your sky. A daily reflection companion grounded in Persian poetic wisdom, coming soon to iPhone." | Position, AppStore | |
| Verse showcase intro | "A verse for every morning. Five poets. Two languages. Centuries of wisdom." | Attribution, Capability | |
| Verse cards ×3 | Hafez (Divan-e Hafez, Ghazal 367), Rumi (Divan-e Shams, Ghazal 1000), Parvin (Mathnavis) — Persian + English translation + source citation each | Attribution | Byte-exact from iOS app verse bank per code comment; sourced from Ganjoor.net |
| "What Hamdam is" heading | "A companion for the daily reflection." | Position | |
| "What Hamdam is" body §1 | Describes time-of-day greeting, mood slider, verse+reflection matched to feeling | Capability | |
| "What Hamdam is" body §2 | "Every verse arrives in its original Persian beside a careful English translation, drawn from Hafez, Rumi, Saadi, Khayyam and Parvin Etesami." | Attribution, Capability | **Matches the locked five-poet list exactly; no Forough mention anywhere** — pass |
| "What Hamdam is" body §3 | Streak, private journal, Home Screen search, favourites | Capability | |
| "Five poets" heading | "Five poets, five voices." | Attribution | |
| Poet cards ×5 | Hafez, Rumi, Saadi, Khayyam, Parvin — Persian name, transliteration, one-line poetic description each | Attribution | Text-only, no portrait imagery (see `02-asset-inventory.md`) |
| "Iranian calendar" heading | "The Iranian calendar breathes through Hamdam." | Position, Capability | |
| "Iranian calendar" body | Names Yalda, Norooz, Chaharshanbe Suri, Mehregan, Sizdah Bedar; mentions Fal-e Hafez | Capability, Attribution | One undifferentiated paragraph — see gap analysis §3 |
| "Meets you wherever" heading | "Hamdam meets you wherever you look." | Capability | |
| "Meets you wherever" body | Siri, Home Screen widget, Apple Watch, **"each reflection can be saved to Apple Health as a State of Mind entry"** (opt-in language: "if you choose"), Apple Music | Capability, Health, AI-adjacent | Health claim is correctly hedged as opt-in |
| Feature icon row | Siri / Widgets / Watch / Health / Music | Capability | |
| "Privacy commitment" heading | "Everything stays on your device." | Privacy | |
| "Privacy commitment" body | "Hamdam does not use accounts. Does not collect emails. Does not send your data to anyone. Your journal entries sync only via your own iCloud account. No analytics. No advertising. No tracking. Just poetry, presence, and the space between." | Privacy | **"No analytics" — see flag below** |
| Final CTA copy | "Sit with a verse. Reflect. Return tomorrow." | Position | |
| Final CTA button | "Coming soon to iPhone" pill (same as hero) | AppStore | |
| Footer tagline | "An app by the Hamdam Team" | Position | |
| Footer nav | Privacy / Terms / Contact (`mailto:developer@hamdam.com.au`) | — | |
| Footer legal line | "Made with love in Brisbane." | Position | |
| Footer copyright | "© {year} Hamdam. All rights reserved." | — | |
| Footer trademark notice | "HAMDAM™ is the subject of Australian trade mark application no. 2674427, filed 11 July 2026." | — | |
| Footer support line | "For support, contact developer@hamdam.com.au." | — | |
| `theme-color` meta | `#E8B04B` (saffron) | — | |
| JSON-LD `SoftwareApplication` | `operatingSystem: "iOS 26+"`, `applicationCategory: "LifestyleApplication"`, `offers.price: "0"`, `offers.description: "Free with in-app purchases"` | AppStore, Free, Subscription | Prices deliberately unpublished (comment: "decision 2026-07-02") — pass |

### Flag: "No analytics" claim vs. CSP configuration

The homepage privacy section states plainly **"No analytics."** `public/_headers` CSP
explicitly permits `static.cloudflareinsights.com` / `cloudflareinsights.com`, and
`docs/progress.md` records Cloudflare Web Analytics as intentionally unblocked in Phase W1.
No beacon script exists in the source, so whether Cloudflare Web Analytics is actually
switched on at the Cloudflare dashboard (outside this repo) cannot be confirmed here. If it
is on, "No analytics" is an inaccurate claim about the website (the Privacy Policy is more
careful — see below); if it is off, the CSP allowance is dead configuration. **Needs a
dashboard check, not a code fix** — flagged, not resolved, per audit-only scope.

## Privacy Policy (`/privacy`, native translation at `/fa/privacy`)

Effective 3 July 2026. Full section list with tags:

| § | Heading | Tags |
|---|---|---|
| — | Intro: "Hamdam does not collect your data... covers the Hamdam app for iPhone and Apple Watch, and this website." | Privacy, Position |
| 1.1 | Health data (HealthKit): HR, RHR, HRV SDNN, sleep, wrist temp, blood oxygen, steps/exercise/active energy, menstrual flow (separate opt-in), writes State of Mind entries | Health, Privacy |
| 1.2 | Calendar data (EventKit): free/busy only, never titles/attendees/locations; writes prefixed "Hamdam:" events | Privacy |
| 1.3 | Location and weather: WeatherKit, not stored, not shared | Location, Weather, Privacy |
| 1.4 | iCloud sync via CloudKit Private Database | Privacy |
| 1.5 | Persian poetry content: CloudKit Public Database, Ganjoor.net-sourced, attributed | Attribution, Privacy |
| 1.6 | Discover recommendations via iTunes Search API, device-direct, no Hamdam server | Privacy |
| 1.7 | AI-generated reflections via Apple Intelligence/Foundation Models, on-device on iPhone 15 Pro+/iOS 26+, static fallback library on unsupported devices | AI, Privacy |
| 2 | No accounts, no third-party analytics (names Firebase/Mixpanel/Amplitude/Google Analytics), no dedicated crash SDK (Apple's built-in only), no ad SDKs, no selling, **"No cookies — this website is fully static"** | Privacy, Free |
| 3 | Data used only to shape today's reflection; never for ads/training/sharing/selling | Privacy, AI |
| 4 | SwiftData local, iCloud only if opted in, never Hamdam servers | Privacy |
| 5 | Third-party services: iCloud/HealthKit/EventKit/WeatherKit/StoreKit/Foundation Models, Ganjoor.net credited | Privacy, Attribution, Subscription |
| 6 | Australian Privacy Principles rights: access/correction/complaint/opt-out | Privacy |
| 7 | Account deletion via Settings, no account exists to delete | Privacy |
| 8 | iOS Data Protection, E2E iCloud encryption, HTTPS/TLS | Privacy |
| 9 | Not for under-13s | — |
| 10 | Policy changes notified via app update | — |
| 11 | Contact: developer@hamdam.com.au; **"Ealia Azizollahi (sole trader) · ABN 74 389 481 503 · Brisbane, Queensland, Australia"** | — |
| 12 | OAIC complaints contact | — |
| 13 | Governing law: Queensland/Privacy Act 1988 | — |
| footer | Trademark notice, owner named as **"Seyed Valiallah Azizollahi"** | — |

Note the §11 contact name ("Ealia Azizollahi") vs. the footer trademark owner ("Seyed
Valiallah Azizollahi") are two different names on the same page — both may be legitimate
(e.g. sole trader vs. trademark holder are different legal facts), but flagging the
discrepancy for Ealia to confirm intentional, since a reader could read it as an
inconsistency.

## Terms of Service (`/terms`, native translation at `/fa/terms`)

Effective 3 July 2026. Full section list with tags:

| § | Heading | Tags |
|---|---|---|
| — | Intro: reflection companion, not medical/mental health advice | Position, Health |
| 1 | Acceptance | — |
| 2 | Personal, non-transferable, revocable App Store licence | — |
| 3.1 | "Pricing is set and displayed by Apple at the point of purchase. Current pricing is available on the App Store" | Subscription | **No specific price named anywhere in this repo — consistent with the "prices deliberately unpublished" JSON-LD comment and matches the locked-decision pricing not being surfaced pre-launch. Cannot cross-check actual $3.99/$39.99/$229.99 AUD tiers against this page since none are stated; nothing to flag as wrong, just nothing to verify either.** |
| 3.2 | "Monthly and Yearly subscriptions include a 7-day free trial for new subscribers" | Subscription | Matches locked decision (Monthly/Yearly both 7-day trial) |
| 3.3 | "The Lifetime plan supports Family Sharing, for up to six members... Monthly and Yearly plans are single-user." | Lifetime, Subscription | Matches locked decision (Lifetime family shareable, no trial implied by omission) |
| 3.4 | Auto-renewal terms | Subscription | |
| 3.5 | Cancellation via Apple ID settings | Subscription | |
| 3.6 | Apple-initiated price changes | Subscription | |
| 4.1–4.7 | Health/wellness disclaimers: not medical advice, consult professionals, crisis line numbers (Lifeline 13 11 14, 000), body/fitness/cycle observations are "contextual, not medical" | Health, Position | Well-hedged; matches the "gentle observations, not scores" framing used elsewhere |
| 5.1–5.3 | Cultural content attribution: **"Verses from Hafez, Rumi, Saadi, Khayyam, and Parvin Etesami"** (again exactly the locked five, no Forough); Ganjoor.net sourcing; wine/love/mystical imagery framed as "historical Persian literary conventions, not endorsements of substance use" | Attribution, Position | |
| 6.1–6.2 | User owns journal entries, no sharing, no public feed | Privacy | |
| 7 | Prohibited uses | — |
| 8 | Termination | — |
| 9.1–9.2 | "As is" + Australian Consumer Law carve-out | — |
| 10.1–10.3 | Limitation of liability, ACL non-excludable rights, health-decision liability | Health | |
| 11 | Indemnification | — |
| 12 | Third-party services (same Apple framework list as Privacy §5) | Subscription | |
| 13–14 | Changes to terms; governing law (Queensland) | — |
| 15 | IP: HAMDAM™ + app + content owned by **"Seyed Valiallah Azizollahi"**; pending trade mark app. no. 2674427 (Classes 9 and 42, filed 11 July 2026); Persian text sourced from Ganjoor.net; "Reflections, curation, and English translations... are the original work of the Hamdam team" | Attribution | |
| 16 | Contact: developer@hamdam.com.au, same Ealia/ABN line as Privacy §11 | — |

## 404 page (`/404`)

"This page has wandered off." / "Return to the beginning." / "Back to Hamdam" button. No
claims, no tags applicable.

## Cross-cutting content checks against locked Hamdam facts

| Check | Result |
|---|---|
| Tagline matches "Hamdam reflects your heart and your sky." exactly | **Pass** (hero) |
| Only the five locked poets named anywhere (Hafez, Rumi, Saadi, Khayyam, Parvin Etesami) | **Pass** — checked homepage, Privacy, Terms; no Forough Farrokhzad mention found anywhere in `src/` |
| No specific StoreKit price ($3.99/$39.99/$229.99 AUD) stated publicly | **Pass** (consistent with the "prices deliberately unpublished" decision — nothing to contradict) |
| No email/account collection anywhere on the site | **Pass** — no forms exist in any `.astro` file |
| Health claims correctly hedged (not medical advice, opt-in, contextual) | **Pass** |
| "No analytics" claim | **Needs dashboard verification** — see flag above |
| Universal-audience framing (not Iranian-diaspora-only) | Reads as universal in English copy; not independently re-assessed for tone here (see `04-north-star-gap-analysis.md` for the visual-tone read) |
