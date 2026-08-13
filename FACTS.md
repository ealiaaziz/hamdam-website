# FACTS.md — Hamdam Verified Claims Source
Last reviewed: 7 August 2026 by Ealia Azizollahi
Last amended: 13 August 2026 (platform, pricing, privacy and translation blocks; see the remediation spec of 14 August 2026)
Status legend: VERIFIED (source cited) | UNVERIFIED (check listed) | CONTESTED (do not use until resolved)

Rule for all generation tasks: a claim may appear in marketing output ONLY if it is listed here as VERIFIED. Anything not in this file does not exist for marketing purposes. CONTESTED claims are prohibited outright.

---

## Product identity — VERIFIED
- Name: Hamdam. Positioning: daily Persian poetry, reflection and journal app. (Source: hamdam.com.au, fetched 7 Aug 2026)
- Platform: iPhone. Apple Watch companion app available. Available now on the AU App Store, App Store ID 6784461990. (Source: hamdam.com.au meta tags and App Store links)
  - Supporting integrations, all optional: Siri, Home Screen widgets, Apple Music, Apple Health State of Mind logging. Family Sharing supported.
  - Source: hamdam-ios project targets, verified 2026-08-13. `Hamdam.xcodeproj` declares a `HamdamWatch Watch App` target (`com.apple.product-type.application`, `SDKROOT = watchos`, `WATCHOS_DEPLOYMENT_TARGET = 26.0`) and a `HamdamWatchComplicationsExtension`, and the iPhone target carries an `Embed Watch Content` build phase that embeds the watch app in the shipped product. Corroborated twice: the App Store listing's Compatibility section states "Apple Watch: Requires watchOS 26.5 or later", and the homepage JSON-LD `featureList` in src/lib/schema.js already carries the claim.
  - Approved marketing phrasing: "on iPhone and Apple Watch".
  - Not verified, do not claim: iPad, Mac and Vision. The App Store Compatibility section lists iPadOS 26.5 and macOS 26.5 (Apple M1 or later), but those are the automatic "iPhone app on iPad/Mac" entries, not designed targets, and the Xcode project has no iPad or Mac target. Marketing says iPhone and Apple Watch and stops there.
- Minimum iOS: 26.5. Confirmed by Ealia 2026-08-07, resolving the deployment target question that had been open since setup: 26.5 is the intended floor, not the 17.0 once assumed, and not a build mistake. Published as `operatingSystem: 'iOS 26.5+'` in src/lib/schema.js, which is pinned to that exact string by a test. Any change to the floor is made here first and in the schema second.
  - RE-VERIFIED 2026-08-13 and still correct for the shipped app, with one change already queued behind it. The App Store listing for the live version (1.1.1) states "Requires iOS 26.5 or later", so 26.5 is right for everything published today. The hamdam-ios working tree is ahead of the store: it is `MARKETING_VERSION = 1.2`, build 93, unreleased, and its `IPHONEOS_DEPLOYMENT_TARGET` is **26.0**, not 26.5. So the floor drops to 26.0 the moment 1.2 ships. Nothing needs changing yet and no current draft is wrong. The rule stands: when 1.2 is submitted, this line moves to 26.0 first, `APP_STORE.MINIMUM_IOS` in src/lib/appStore.js second, and the pinned schema test follows. Whoever ships 1.2 owns that edit. (Source: hamdam-ios `Hamdam.xcodeproj/project.pbxproj`, and the App Store listing, both read 2026-08-13.) Worth stating plainly in any campaign: this is a high floor, so the addressable audience is phones running a current iOS, and saying so up front costs less than a download that cannot install.
- Poets: Hafez, Rumi, Saadi, Khayyam, Parvin Etesami. Five poets, bilingual Persian/English. (Source: hamdam.com.au)
- Verses sourced from Ganjoor.net, credited on site. (Source: hamdam.com.au footer)
- Trade mark: HAMDAM™, Australian trade mark application no. 2674427, filed 11 July 2026. (Source: hamdam.com.au footer)
- Made in Brisbane. Copyright Seyed Valiallah Azizollahi. (Source: hamdam.com.au footer)
- Support contact: developer@hamdam.com.au. (Source: hamdam.com.au)

## Core features — VERIFIED (as described on live site)
- Daily verse plus reflection, selected by how the day feels via a mood slider (Heavy / Unsettled / Steady / Light / Bright). (Source: hamdam.com.au)
- Reflection context signals: mood (if logged), weather via Apple WeatherKit on device, season, time of day, cultural calendar moments, Health signals (opt-in, Plus). (Source: hamdam.com.au)
- Private journal, favourites, streak that forgives a missed day. (Source: hamdam.com.au)
- Integrations: Siri, Home Screen widgets, Apple Watch, Apple Health State of Mind (opt-in), Apple Music, Family Sharing, cultural calendar. All optional, off by default. (Source: hamdam.com.au)
- Cultural moments: Iranian (Yalda, Norooz, Chaharshanbe Suri, Mehregan, Sepandarmazgan, Tirgan, Sizdah Bedar), Afghan/Tajik heritage options, and Australian holidays by state. (Source: hamdam.com.au)
- UK, US, Netherlands, Germany regions marked "coming soon" — do not claim as available. (Source: hamdam.com.au)

## Privacy — VERIFIED (as claimed on live site; see audit note)
- No accounts, no sign-up, no email collection. (Source: hamdam.com.au)
- No analytics, no advertising, no tracking claimed on site. (Source: hamdam.com.au)
- Journal syncs only via user's own iCloud, opt-in, requires Hamdam Plus. (Source: hamdam.com.au)
- AUDIT NOTE: these are strong claims. Before amplifying in any campaign, confirm the shipped binary matches (no third-party SDKs phoning home, App Store privacy label consistent). UNVERIFIED against the binary as of 7 Aug 2026.
- App Store privacy nutrition label, read 2026-08-13: the listing's App Privacy section declares **"Data Not Collected"**, and nothing else. No "Data Used to Track You" category, no "Data Linked to You" category, no "Data Not Linked to You" category, and no data types under any heading. The label is a blanket no-collection declaration.
- Partial corroboration from source, 2026-08-13. The hamdam-ios project has **no Swift Package or other third-party dependency of any kind** (`project.pbxproj` contains no `XCRemoteSwiftPackageReference`), and a search of the Swift sources finds no analytics or attribution SDK (Firebase, Amplitude, Mixpanel, Segment, AppsFlyer, Adjust, Sentry, PostHog, OneSignal all absent; the apparent matches are the ordinary English words "segment" and "adjust"). On the question the label actually answers, no third-party SDK is collecting anything, the code agrees with the label.
- CONTRADICTED, and this is the part that matters: the published privacy policy's own list of outbound hosts is incomplete, so the site is not currently an accurate description of the app. See the outbound-host finding below.

## Outbound hosts — CONTESTED, site is out of date as of 2026-08-13
The privacy policy (`/privacy/` section 5, mirrored in `/terms/` section 12) presents itself as the exhaustive list of every host the app contacts, and AGENTS.md makes keeping it exhaustive a standing rule. It is not exhaustive. Read from the hamdam-ios Swift sources on 2026-08-13, the app makes network requests to:

| Host | In the policy? | Where in the app |
|---|---|---|
| `en.wikipedia.org` | yes | WikipediaPoetService, WikipediaSymbolNameService |
| `upload.wikimedia.org` | yes | portrait and symbol image bytes |
| `itunes.apple.com` | yes | DiscoverPicksRefreshService |
| `music.apple.com` | yes | MusicKit links |
| `date.nager.at` | yes | RegionHolidayService |
| `www.wikidata.org` | **no** | SymbolImageSources, P18 image claim lookup |
| `commons.wikimedia.org` | **no** | SymbolImageSources, licence and attribution lookup |
| `api.inaturalist.org` | **no** | SymbolImageService, second image source |
| `inaturalist-open-data.s3.amazonaws.com` | **no** | image bytes for iNaturalist results, prefetched by SymbolImageService |

**Method, and how complete this is.** The first pass read the hosts named in the Swift sources. A second, exhaustive pass on 2026-08-13 enumerated every network-capable call site in the app instead (`URLSession`, `dataTask`, `AsyncImage`, `WKWebView`, `NWConnection`, `openURL`, `UIApplication.shared.open`), which is nine non-test files, and read each one. **It found no fifth non-Apple host.** The four above are the complete set of undisclosed non-Apple traffic. Three things the second pass did settle, all of which would otherwise have gone into a policy fix wrong:

- **Apple media hosts are fetched, not just linked.** `MiniPlayerView` renders MusicKit artwork through `AsyncImage`, and `WeatherAttributionView` fetches the WeatherKit attribution marks the same way, with `developer.apple.com` as its fallback legal link. These are real outbound requests to Apple hosts. The policy's blanket sentence about Apple's frameworks covers them, but anyone rewriting section 5 should decide that deliberately rather than discover it later.
- **Discover fetches no artwork.** `DiscoverPick` uses a static SF Symbol for cover art, by design and with a comment saying so. Only the iTunes Search API call goes out. There is no `mzstatic` traffic from that feature, which is what a reasonable person would have assumed there was.
- **Ganjoor.net is genuinely not contacted at runtime**, so the policy's existing sentence about it is accurate. The only references in the app are comments describing an offline seeding pipeline. Bundled JSON does carry `podcasts.apple.com`, `books.apple.com` and `ganjoor.net` URLs, but those are destinations opened in the browser when a person taps them, not requests the app makes.

That last distinction is the one to hold on to while rewriting: a link a user taps, which hands off to Safari, is not the app contacting a host. `music.apple.com` search from the mini player and the source links under symbol photographs are both in that category. The four hosts in the table are not: the app requests those itself, without the user choosing to visit them.

Two consequences.

1. The policy states, in bold, that "**Nager.Date (date.nager.at)** is the only service Hamdam contacts that is not operated by Apple." That sentence is false. iNaturalist is not Apple and not Wikimedia, and Amazon S3 serves its image bytes. This is a factual error in a published legal document, not a marketing nicety.
2. Until it is fixed, whole-app privacy claims cannot be sourced to the site, because the site's own description of the app is known to be wrong on this point.

This is a defect in the website and the fix belongs in `src/pages/privacy.astro` and `src/pages/terms.astro` (and their Farsi mirrors, which need Ealia's Persian). It is recorded here rather than fixed here because the remediation spec that produced this entry did not authorise a legal-copy change, and legal copy is not a claim-audit edit. **Raised for Ealia, tracked in the caption remediation artefact.** Nothing in marketing may lean on privacy language until it is resolved.

## CONTESTED: privacy claims — prohibited in all marketing output until resolved
Until the App Store privacy nutrition label is verified to match the app's actual data practices, the following phrases are BLOCKED in all outbound copy:

    "no tracking", "we collect nothing", "nothing leaves your device", "no data collected"

ALLOWED, if and only if verified true against the app: "no account required", "no sign up", "no ads".

The journal is stored on device. State that specifically rather than making a whole-app privacy claim.

Note on the state of the evidence, so this block is not mistaken for a finding of wrongdoing. The nutrition label says "Data Not Collected" and the code carries no analytics SDK, which is the strongest version of this claim anyone could hope for. What is not established is the *whole-app* claim: the app does reach four hosts the published policy never mentions, and a claim like "nothing leaves your device" is plainly false for a feature that fetches images from Wikimedia and iNaturalist, whatever the nutrition label says about collection. The narrow, checkable statements survive. The sweeping ones do not.

## Pricing structure — VERIFIED (structure only, not amounts)
- Pricing: free to download. Optional in-app purchases. (Source: App Store listing, verified 2026-08-13. The listing's price line reads "Free" with an "In-App Purchases" marker, and names three products: Hamdam Plus Monthly, Hamdam Plus Yearly, Hamdam Lifetime.)
  - Approved marketing phrasing: "free to download, with optional extras".
  - BLOCKED phrasing: the bare word "Free" as a full-stop claim. It omits in-app purchases.
  - No dollar amounts in any marketing copy. The listing does show prices; that is not permission to repeat them.
- Free tier: 15 reflections per month. (Source: hamdam.com.au)
- Hamdam Plus subscription: unlimited reflections, archive and insights, iCloud sync, Health body signals, poet deep-dives beyond Hafez and Rumi. Monthly or yearly, 7-day free trial for new subscribers. (Source: hamdam.com.au)
- Founding Companion: one-time lifetime purchase, Family Sharing supported. (Source: hamdam.com.au)
- Do not state dollar amounts in marketing; site defers to App Store. Note: one pricing tier previously flagged internally as indefensible — pricing claims need Ealia's sign-off until resolved.

## CONTESTED — prohibited in all marketing output until resolved

### CONTESTED: translation quality
Hard blocked until AI translations are replaced with cited public domain translations (Nicholson, Whinfield, Bell).

The previous wording of this section said the same thing in general terms and did not stop the phrases below reaching production: four published Instagram posts carry them. So it is now explicit and quotable, and layer 1 of the claim-audit gate fails on the strings themselves rather than relying on a model to recognise the category.

BLOCKED phrasings, non exhaustive. Any claim about the quality, fidelity, richness or faithfulness of the English translation, including:

    "a translation that doesn't flatten it"
    "an English translation that doesn't flatten it"
    "most translations soften it"
    "doesn't flatten", "faithful", "uncompromising", "true to the original", "properly translated"

Also still blocked, from the original wording: "careful English translation", and any claim implying scholarly or human-translated English text.

ALLOWED: purely descriptive statements of presence, e.g. "in Persian, with an English translation alongside".

Rationale: a comparative claim about translation quality is a claim about competitors' work as well as our own, and the app cannot currently substantiate either half.

## UNVERIFIED — need a check before first use
- App Store rating, review count, download numbers: never cite without pulling current App Store data at time of writing.
- Current app version: never cite without checking the App Store listing at time of writing. (iOS compatibility is resolved and moved to Product identity above.)
- Farsi site parity: Farsi legal pages incomplete as of last review; do not link Farsi legal pages in campaigns until confirmed complete.

## Standing rules (not claims — pipeline constraints)
- Persian-language copy is authored by Ealia only. Generation tasks produce English drafts and may propose Persian only as clearly marked placeholders for Ealia to replace.
- Instagram is Sima's channel: outputs are drafts to her queue, never direct posts.
- No dashes or hyphens in drafted outbound copy.
- Australian English throughout.
- Every generated draft must pass claim audit against this file before entering any review queue.
