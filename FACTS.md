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
  - **iPad: CORRECTED 2026-08-28, the 2026-08-13 reading was wrong.** That entry said the project "has no iPad or Mac target" and filed iPadOS under the automatic "iPhone app on iPad" entry. `Hamdam.xcodeproj/project.pbxproj` sets `TARGETED_DEVICE_FAMILY = "1,2"` in all eight configurations, and family 2 is a native iPad build, not compatibility mode. Corroborated by Apple: the 1.3 product page publishes four iPad panels at 2048x2732 whose layout is genuinely wide-adaptive (two-column card grids, a row of three coach tiles), which a scaled iPhone binary cannot produce. The trap worth naming is that `itunes.apple.com/lookup` returns only the iPhone set, so a check that used the API alone would never see them; the product page HTML carries both.
  - **iPad is APPROVED MARKETING WORDING as of 2026-08-28**, on Ealia's instruction, and the site now says so throughout. This line was written earlier the same day saying the opposite; it was true for about an hour and is replaced rather than deleted so the sequence is legible.
  - Approved phrasing: **"iPhone and iPad"**, and **"iPhone, iPad and Apple Watch"** where the watch belongs. Farsi: «آیفون و آی‌پد» and «آیفون، آی‌پد و اپل واچ». **`آی‌پد` carries a ZWNJ and `آیفون` does not, and that is correct, not an inconsistency.** Checked on fa.wikipedia 2026-08-28: the canonical title is `آی‌پد` and the solid `آیپد` is a redirect to it, while `آیفون` is canonical solid with no redirect the other way. The first version shipped `آیپد`, reasoning by analogy from the app's own `آیفون`; the analogy was wrong, because these two words differ in standard orthography. The app has no `آیپد` of its own, so there was no in-house precedent to follow, only a guess -- and a direct authority on the exact word beats an analogy from a neighbouring one. This is still the only Persian in the repo not copied from something Ealia wrote.
  - The evidence, all four legs, so nobody re-derives it: `TARGETED_DEVICE_FAMILY = "1,2"` in all eight configurations; `INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad` set explicitly, which a default project does not do; fifteen views branching on a regular `horizontalSizeClass` across Today, Roots, Calendar and the Divan; and Apple publishing four iPad-native panels at 2048x2732. The listing states the floor as "iPadOS 26.0 or later", the same 26 as iOS, which is why `APP_STORE.MINIMUM_IOS` still has one value.
  - **On-device generation is not gated on a device model.** Every call site checks `SystemLanguageModel.default.availability` (`AppleIntelligenceReflectionProvider.swift:117`, `AIPatternInsightsService.swift:52`, `HealthInsightProvider.swift:78`, `CoachRephraser.swift:50`). The privacy policy said "On supported hardware (iPhone 15 Pro and later, iOS 26+)", which told an iPad reader their device falls back to static content -- false on any iPad with Apple Intelligence. The enumeration is deleted in both locales, leaving "on supported hardware", which is exactly what the code tests. Do not restore a device list here; if one is ever wanted it has to name the iPad hardware too, and that is a claim nobody has verified.
  - Mac and Vision are unchanged: not verified, do not claim.
- Minimum iOS: 26. Lowered from 26.5 on 2026-08-15, when Ealia confirmed Hamdam 1.2 is live on the App Store. 1.2 carries `IPHONEOS_DEPLOYMENT_TARGET = 26.0`, which the 2026-08-13 entry below had already read out of the project file and queued against this exact event. Published as `operatingSystem: 'iOS 26+'` in src/lib/schema.js, which is pinned to that exact string by a test. Any change to the floor is made here first and in the schema second.
  - RESOLVED 2026-08-15: 1.2 shipped, so the floor is 26.0 and this line moved with it. Kept for the trail, because the string now published, `iOS 26+`, is character-for-character the one removed on 2026-08-07 as unverified, and the two are not the same claim. The old one was a number inherited from a suspected build mistake that nobody had checked. This one is the deployment target of the shipping build, read from `Hamdam.xcodeproj/project.pbxproj` on 2026-08-13 and confirmed live by Ealia on 2026-08-15. Anyone reading git history and thinking the old defect came back should read this line instead.
  - CLOSED 2026-08-17. The listing is now `version 1.2`, `minimumOsVersion 26.0`, released `2026-08-17T10:03:06Z`, and the AU product page renders "Requires iOS 26.0". The published `iOS 26+` is correct against the live listing, and no string changed to make it so. `MINIMUM_IOS` has been `26` throughout.
    - The gap was real for about a day and is worth one line so nobody re-derives it: for 2026-08-15 to 2026-08-17 the site published a floor half a point below the listing's, so a reader on iOS 26.0-26.4 was told the app would run and could not have installed it. Ealia's 2026-08-15 confirmation was about 1.2 being approved, not released. The call taken on 2026-08-16 was to record the gap rather than churn the floor down and back up, on the grounds that 1.2 was imminent. It was: the release landed inside the day.
    - **The cache lesson cuts both ways, and this is the part to keep.** On 2026-08-16 three storefronts and the rendered page all said 1.1.1, and that was recorded as "not a cache artefact of one endpoint" -- which was sound. On 2026-08-17 the same check disagreed *with itself*: six consecutive AU lookups returned 1.2 five times and 1.1.1 once, while US and GB were consistently 1.2 and the rendered AU page was 3/3 on 26.0. So agreement across routes is evidence and not proof, and a single stale response mid-propagation is not evidence of anything. Sample more than once, and weight the human-facing product page, which flushed first both times.
  - Written `26`, not `26.0`. Same floor either way, and it is what an App Store listing and every reader would write. `APP_STORE.MINIMUM_IOS` is the bare number and the `+` is added by its two consumers, so the badge and the JSON-LD cannot disagree.
  - History, 2026-08-13: the App Store listing for 1.1.1 stated "Requires iOS 26.5 or later", so 26.5 was right for everything published then, while the hamdam-ios working tree was already at `MARKETING_VERSION = 1.2`, build 93, unreleased, targeting 26.0. The rule that governed the handover held: this line moved first, `APP_STORE.MINIMUM_IOS` in src/lib/appStore.js second, and the pinned schema test third. Worth stating plainly in any campaign: this is still a high floor, so the addressable audience is phones running a current iOS, and saying so up front costs less than a download that cannot install.
- Verse display: **one language at a time.** The app shows the verse in whichever language the app is set to, Persian or English, not both together. There is no per-verse toggle, no tap-to-reveal and no "show translation" preference; the only control is the app-wide language row in Settings.
  - Source: hamdam-ios @ `820270c`, read 2026-08-16. `Roots/Divan/DivanLeafView.swift:108-138` gates on `showsPersianScript` and carries Ealia's own note from 2026-07-27, "I don't need English translation at all, add tafsir instead". `Seasonal/HafezFaalView.swift:94-104`, `Features/DailyVerse/TodayView.swift:506-519`, `Notifications/NotificationContentBuilder.swift:104`, `Sharing/VerseImageRenderer.swift:179-197`, `HamdamWidgets/VerseOfDayWidget.swift:222`, `HamdamWatch Watch App/ContentView.swift:294` are all the same single-language branch on `hamdam.language`. `RootsTabView.swift:21-22` states the rule in prose: "not both together". Corroborated by `docs/design/north-star/phase-1a-audit.md:76`.
  - Approved marketing phrasing: "in the original Persian, or in English". BLOCKED: "beside", "alongside", "side by side", "next to", "with an English translation alongside", and anything else asserting the two are shown together.
  - The `Verse` model does carry both fields (`Features/DailyVerse/TodayView.swift:23-32`), so showing both is available and is deliberately not used on the primary surfaces. Do not read "the data has both" as "the app shows both".
  - NUANCE, do not over-correct: a few secondary surfaces do stack both, so "the app never shows both" is also false. Reading Mode (`Features/Wisdom/ReadingModeView.swift:118-136`) and the Favourites verse sheet (`Features/Wisdom/VerseDetailSheet.swift:37-50`) render Persian then English unconditionally; `Roots/MomentDetailSheet.swift:223-232` likewise; medium and large home-screen widgets (`HamdamWidgets/VerseOfDayWidget.swift:134-151`, `:186-197`) show both regardless of language; `Features/Wisdom/VerseCardWisdomView.swift:21-31` is asymmetric, so FA users see both and EN users see English only. None of these is the daily verse, which is what the marketing sentences describe. Claim the default, not the exceptions.
  - History: until 2026-08-16 the site said "in its original Persian beside an English translation" in five places, and `src/pages/index.astro` carried a code comment asserting "the presentation claim ... is true today". Nobody had checked it against the app. The claim-audit gate's own ALLOWED example said it too, which is how it spread. Corrected on Ealia's instruction after reading the app source.
- Poets: Hafez, Rumi, Saadi, Khayyam, Parvin Etesami. Five poets, available in Persian and in English. (Source: hamdam.com.au)
  - "bilingual Persian/English" until 2026-08-16. Not false, but ambiguous in the direction of the presentation claim above, so it was made explicit rather than left to be read either way.
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

## Version 1.3 — VERIFIED 2026-08-27
- Shipped version is **1.3**, released 2026-08-27. (Sources: iTunes Lookup API for id 6784461990, fetched 2026-08-27 — `version: 1.3`, `currentVersionReleaseDate: 2026-08-27T14:18:59Z`; and hamdam-ios at `d75f379`, `MARKETING_VERSION = 1.3`, `CURRENT_PROJECT_VERSION = 110`.)
- Minimum iOS is still **26.0**, unchanged by this release, so `iOS 26+` on the site remains correct and needs no edit. (Source: `IPHONEOS_DEPLOYMENT_TARGET = 26.0` in the 1.3 project file; the listing reports `minimumOsVersion: 26.0`.) watchOS deployment target is also 26.0.

## Verse library — VERIFIED 2026-08-27, corrects an earlier number
- The bundled library is **500 verses**, one hundred from each of the five poets. Counted directly: `Hamdam/Hamdam/Content/Verses/Verses_{Hafez,Rumi,Saadi,Khayyam,Parvin}.json` hold 100 entries each. Corroborated by six independent statements of "500 verses" in the Swift sources and by the App Store description ("Five hundred verses from the five poets, yours from day one").
- **This corrects "235 bundled verses"**, which was stated in `/terms/` section 3 and `/fa/terms/` and is now wrong. The number grew with the library; nothing about it was ever a claim anyone checked again. Fixed on the site 2026-08-27.

## The Garden — VERIFIED 2026-08-27
The largest change in 1.3, and the feature the marketing site had no mention of at all. What was called Discover is now the Garden.
- **Three coaches — Mind, Move and Sleep** — turn the day's line into a plan, reading from Health, the calendar and the weather. (Source: `Hamdam/Hamdam/Garden/Coaches/` with `Engine/`, `Health/`, `Sessions/`, `UI/`; release notes for 1.3.)
- **A garden bed for habits**: plant one small thing, say when it happens and what you will do on the day it does not. (Source: `Hamdam/Hamdam/Garden/Habits/`, `GardenHabit.swift`, `GardenHabitCueSidecar.swift`.)
- **A daily riddle**, alongside the existing picks. (Source: `Hamdam/Hamdam/Garden/Riddle/`, `RiddleEngine.swift`, `RiddleCorpus.swift`.)
- The Garden makes **no network requests of its own** — checked across `Garden/`, `MentalCompanion/` and `FitnessCompanion/` for `URLSession`/`URLRequest`, none present. It reads Health, calendar and WeatherKit through Apple frameworks on device. That matters because it means the Garden adds no host to the outbound list.

## Homepage screenshots — VERIFIED 2026-08-27
The English hero and the Garden section both use assets from the **published 1.3 App Store listing** (`id6784461990`), pulled from `itunes.apple.com/lookup` at 1290x2796 and byte-identical to what the store serves. They are screens Ealia has already approved and published, which is the strongest provenance available from this repo: no macOS or Xcode is reachable here, so the ScreenshotOrchestrator cannot be run.
- **The App Store filenames do not describe their contents.** Their `05-journey-en.png` is the Today screen; their `08-today-fa.png` is the English Garden screen; their `01-today-en.png` is the launch splash. Match on what the image shows, never on what it is called.
- The hero screenshot **must show the current tab bar**. 1.3 renamed Discover to the Garden and the hero sat on the old name for the whole of the day the site was updated to describe 1.3. It was the first image on the page, and Ealia found it, not any check here. Any release that renames or moves a tab invalidates this asset.
- **The Farsi hero is the store's `07-garden-fa.png`, cropped.** That capture is mid-scroll: a cream card fragment floats over the status bar in the top 103px, with the status bar's own glyphs drawn across it down to 121px, so the two cannot be separated. It is cropped to `left 29, top 124, 1233x2672`, which removes the fragment and the status bar together and restores the frame's exact 1290/2796 aspect. A crop, and nothing else: no repainting, no compositing, no content moved or relabelled. The consequence to know is that the Farsi phone has no status bar where the English one does.
- **There is no Farsi capture of the Garden screen on iPhone**, in the listing or in `hamdam-ios/marketing` (newest set 2026-07-26, still says Discover). The only one anywhere is Apple's iPad panel `03-garden-fa` at 2048x2732, and the Farsi Garden section uses it, cropped to `left 247, top 505, 1553x2227` so the device fills the panel and its Persian is readable at the width the column allows. See the iPad note under Product identity for what that does and does not license.
- **The lookup API is not the whole listing.** `itunes.apple.com/lookup` returned 8 screenshots; the product page HTML returns 12, and the 4 it adds are the iPad set. Fetch the page with a browser User-Agent and read the `{w}x{h}{c}.{f}` template URLs; `?l=fa` changes nothing, because the App Store has no Persian interface language and falls back to the English locale's screenshots everywhere.
- **The store's Farsi-named iPhone files are swapped.** `07-garden-fa.png` is the Farsi *Today* screen and `08-today-fa.png` is the *English Garden* screen. Harmless to the listing, since Apple shows the images and not the names, but it is why matching on filename gets the wrong asset every time.
- Claims are taken from the **1.3 release notes**, which Apple publishes in both languages, so the Persian half is Ealia's own authored text and can be quoted byte-exact rather than translated here. The Farsi Garden copy in `src/data/siteCopy.ts` was split out of it by script, never retyped.

## Reading mode and recitation — VERIFIED 2026-08-27
- **Reading mode opens the whole poem for all five poets**, not Hafez alone as in earlier versions, in Persian and English with the themes named beneath. (Source: 1.3 release notes; `Hamdam/Hamdam/Core/Localization.swift` discusses the whole-ghazal wording.)
- **Recitation: 368 of the 500 verses can be heard**, across 266 whole poems, with one named reciter per poet, credited on the verse. Coverage is deliberately partial and depends on whether a volunteer recorded that poem. (Source: `Hamdam/Hamdam/Audio/VerseRecitation.swift`, which states all three numbers.)
- **No synthetic speech anywhere** — the same source file records this as a standing rule, since iOS ships no Persian voice.
- Marketing phrasing must not imply every verse can be heard. "Many verses can be heard" (the App Store's own wording) is safe; "every verse" is false.

## Fal-e Hafez in 1.3 — VERIFIED 2026-08-27
- The faal now **explains itself and asks you to type nothing**, and answers with a full ghazal. Earlier versions asked for a typed question. (Source: 1.3 release notes; App Store description, "It explains itself, and asks you to type nothing.")

## Privacy — VERIFIED (as claimed on live site; see audit note)
- No accounts, no sign-up, no email collection. (Source: hamdam.com.au)
- No analytics, no advertising, no tracking claimed on site. (Source: hamdam.com.au)
- Journal syncs only via user's own iCloud, opt-in, requires Hamdam Plus. (Source: hamdam.com.au)
- AUDIT NOTE: these are strong claims. Before amplifying in any campaign, confirm the shipped binary matches (no third-party SDKs phoning home, App Store privacy label consistent). UNVERIFIED against the binary as of 7 Aug 2026.
- App Store privacy nutrition label, read 2026-08-13: the listing's App Privacy section declares **"Data Not Collected"**, and nothing else. No "Data Used to Track You" category, no "Data Linked to You" category, no "Data Not Linked to You" category, and no data types under any heading. The label is a blanket no-collection declaration.
- Partial corroboration from source, 2026-08-13. The hamdam-ios project has **no Swift Package or other third-party dependency of any kind** (`project.pbxproj` contains no `XCRemoteSwiftPackageReference`), and a search of the Swift sources finds no analytics or attribution SDK (Firebase, Amplitude, Mixpanel, Segment, AppsFlyer, Adjust, Sentry, PostHog, OneSignal all absent; the apparent matches are the ordinary English words "segment" and "adjust"). On the question the label actually answers, no third-party SDK is collecting anything, the code agrees with the label.
- CONTRADICTED, and this is the part that matters: the published privacy policy's own list of outbound hosts is incomplete, so the site is not currently an accurate description of the app. See the outbound-host finding below.

## Outbound hosts — RESOLVED 2026-08-27, site is accurate and matches 1.3
**Re-checked against version 1.3 on 2026-08-27 and the site is now correct.** All seven non-Apple hosts are disclosed in `/privacy/` section 5 and `/terms/` section 12, in both locales — verified by reading all four documents, not one. The 1.3 sources contact the same seven and no others: the four once missing (`www.wikidata.org`, `commons.wikimedia.org`, `api.inaturalist.org`, `inaturalist-open-data.s3.amazonaws.com`) are still live in `Roots/SymbolImageSources.swift`, and are now named in the policy. The Garden, the coaches and the habit bed add nothing, since none of them makes a network request.

One trap worth keeping. Grepping only files that contain `URLSession` misses these four, because they are built in `SymbolImageSources.swift` and fetched elsewhere. Enumerate call sites (`URLSession`, `dataTask`, `AsyncImage`, `WKWebView`, `NWConnection`, `openURL`) as the 2026-08-13 pass did, or read every host literal in the sources and rule them out one by one. A first pass on 2026-08-27 made exactly this mistake and reported the set unchanged and complete before the second pass found the file.

The original finding is kept below for the trail.

## Outbound hosts — original finding, 2026-08-13 (now resolved above)
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

ALLOWED: purely descriptive statements of presence, e.g. "in Persian, or in English".

Corrected 2026-08-16. This line previously offered "in Persian, with an English translation alongside" as its approved example, which is a presentation claim the app does not support -- see "Verse display" under Product identity. That made this gate issue an inaccurate claim as its own model answer, so anything generated against FACTS.md reproduced it and layer 1 passed it every time. Five published strings traced back to this line.

Also BLOCKED, for presentation rather than quality: "alongside", "beside", "side by side", "next to", and any other construction asserting the two languages are shown together. The app shows one at a time on every primary surface.

Rationale: a comparative claim about translation quality is a claim about competitors' work as well as our own, and the app cannot currently substantiate either half. The presentation block is separate and simpler: the app does not do it.

## UNVERIFIED — need a check before first use
- **RESOLVED 2026-08-16, same day: the hero screenshot showed a screen the app cannot display, and has been replaced.** Kept in full because the failure mode is reusable, not because the image is still live. It was `01-hero-en.png` / `01-hero-fa.png`, the hero in `HeroCinematic.astro` and reused by `ContextConstellation.astro` and by both homepages' `schema.org/screenshot` arrays, captioned "Hamdam Today screen showing a morning verse by Hafez".
  - Replaced with `01-today-en.png` / `01-today-fa.png`, the 2026-07-26 capture of the real Today screen at 1320x2868, a matched EN/FA pair verified against the production view: no streak pill, no Apple Health row, no stacked bilingual text. The four old files are deleted so they cannot be picked up again; the record is here and in git.
  - **It has no verse on it, and that was the trade.** No screenshot in hamdam-ios is both a real app screen and a screen with a verse: Today has no verse card outside a notification tap, and the fal shows one only after the reader taps "Receive Verse". The only genuine artefacts that show a verse are the `design-samples/` share cards, which are correctly single-language but are not app screens. So the poetry claim now rests entirely on the h1 and the copy, which can carry it honestly, rather than on a picture that could not. If a hero with a verse is wanted, it needs a new capture of a state the app can actually reach -- the revealed Hafez Faal result is the obvious candidate.
  - The Farsi alt text lost "با شعری صبحگاهی از حافظ" and gained nothing: deletion only, because the new image has no verse and this repo bars authoring Persian.
  - It is a real SwiftUI render, but of a DEBUG-only composition rather than of Today. `DebugTools/ScreenshotOrchestrator/ScreenshotViewFactory.swift:355-423` defines `TodayScreenshotView`, which assembles its own verse card (`:406-422`) with **no language check at all**, so it stacks Persian over English in both locales. It never calls `TodayView`. The file is inside `#if DEBUG` (`:34`), and `:24-28` gives the reason: the real Today view calls Apple Intelligence and reads live Health, Calendar, Location and Music, so the harness rebuilt an approximation instead of rendering it.
  - Four of the six things in that image are not on the production Today screen: the Persian couplet (Today shows Persian only in FA mode), the two languages together (Today's card is an if/else, `TodayView.swift:506-519`), the streak pill (`HamdamTodayHeaderStrip` has no production call sites; removed from Today 2026-07-23 per `TodayView.swift:1216-1223`), and the Apple Health row (`HealthIndicatorRow`'s only production use is `ReflectionsTabView.swift:380`, a different tab). The reflection card is genuine.
  - `ScreenshotViewFactory.swift:29-31` asserts the previews are "assembled entirely from real, shared production components ... never a hand-drawn mock". True of the components, false of the arrangement, and nothing in that repo flags the difference. That sentence is why this went unnoticed.
  - Note this is the same claim the prose carried until 2026-08-16, so correcting the words while the hero picture still shows it is half a correction. It is the most-seen instance of the claim on the site.
  - Source: hamdam-ios @ `820270c`, read 2026-08-16. The clone was shallow, so whether this arrangement ever shipped in some pre-2026-07-23 build could not be checked; nothing in the tree suggests the Health row or a bilingual verse card was ever on Today.
  - **The other five screenshots on the site are fine.** `docs/app-store/phase-3-screenshot-orchestrator.md:106-113` lists which of the twelve are harness renders, and only `01-hero` is: `02-reflect` is the real `ReflectionsTabView`, `03-wisdom` the real `DiscoverTabView`, `04-roots` the real `RootsTabView`, `05-journey` the real `ReflectionInsightsView`, `06-privacy` the real `PrivacyScreen`. Checked rather than assumed, because "one of them was synthetic" is a reason to check the rest.
  - **CONFIRMED AND STILL OPEN 2026-08-17: the App Store listing now carries it, as screenshot number one.** Not this repo's to fix -- the fix is in App Store Connect. The 1.2 release, live 2026-08-17T10:03:06Z, replaced the listing's previous screenshots with the orchestrator set, and its first image is `01-hero-en.png`, the same synthetic composition just removed from this site. Fetched from the listing and opened to be sure: Persian stacked over English, the streak pill removed on 2026-07-23, the Apple Health row. Its burned-in caption reads "Hamdam reflects your heart and your sky / Daily reflection grounded in timeless wisdom".
    - This is a regression, not a longstanding state. The 1.1.1 listing used genuine device captures -- `Today.png`, `Root.png`, `امروز.png`, `IMG_7908.PNG` and two raw simulator screenshots. 1.2 swapped those for the composed set. So the store page got less accurate at the moment the app got more so.
    - The whole 1.2 set, in order: `01-hero-en`, `07-faal-en`, `03-wisdom-en`, `02-reflect-en`, `05-journey-en`, `04-roots-en`, `06-privacy-en`. Only `01-hero` is synthetic; the orchestrator runbook clears the other five, and `07-faal-en` is new in 1.2 and looks genuine -- the Roots Hafez Faal card, "HOLD TO OPEN", captioned "Open the Faal and receive a verse in answer", which is an accurate description of what the tap does.
    - Also worth fixing while in there: `03-wisdom`'s caption promises "Wisdom from five masters ... Hafez, Rumi, Saadi, Khayyam and Parvin Etesami" over a Discover screen that shows no poet and no verse.
    - Note for whoever replaces it: `07-faal-en` is the closest the listing gets to poetry, and it is the screen *before* the verse. The revealed faal result is the one state that shows a verse and can be captured honestly.
  - The upstream cause is one sentence in `ScreenshotViewFactory.swift:29-31`, which calls the previews "assembled entirely from real, shared production components ... never a hand-drawn mock". True of the components, false of the arrangement, and it reads as a guarantee. Anyone adding a screenshot to this site should treat it as a claim to verify, not one to rely on.
- App Store rating, review count, download numbers: never cite without pulling current App Store data at time of writing.
  - **There is a source, and it is not this repo: `ealiaaziz/hamdam-analytics`.** A working App Store Connect pipeline, built and running. A daily GitHub Actions workflow at 19:00 UTC pulls Apple's sales and analytics reports with an ASC API key and commits the raw TSVs, so downloads, product page views, source breakdown and conversion are all readable without any credential at read time. `data/REPORT.md` is the generated summary, `data/STATUS.md` the last run.
  - Recorded here because two sessions in a row concluded App Store data was unreachable and said so to Ealia. Both were wrong. The mistake was checking the repositories attached to the session and stopping there; `list_repos` shows six Hamdam repositories and the answer was in one nobody had attached. **Before asserting that any data is unavailable, list the repositories.**
  - Reading it: the reports are **tab separated**, not comma separated, despite the `.csv` extension on the analytics files. A few rows carry a repeated header and must be skipped. `ONE_TIME_SNAPSHOT` holds history to 2026-08-13 and `ONGOING` the days after, so deduplicate across the two before summing or the overlap double counts.
  - **Take first-time downloads from `Download Type`, not the file total.** The totals in `data/REPORT.md` sum every download type, so auto-updates and re-downloads inflate them. Measured 2026-08-21: 152 total downloads against 64 first-time, over 2026-07-19 to 2026-08-16. Quoting the larger number as installs overstates by more than double, and one analysis already did.
  - The `Source Info` and `Campaign` columns in the Detailed reports are present but **entirely empty** at current volume: Apple redacts them below a privacy threshold. So campaign level attribution is not yet visible even where links are tagged. `Source Type` in the Standard reports does populate, and separates App Store search, App Store browse, App referrer and Web referrer, which is the breakdown marketing questions actually need.
- **A connector's stored account snapshot is not live data (2026-08-22).** Composio's `toolkit_connection_statuses[].accounts[].user_info` carries a copy of the account profile taken when the connection was *created*. For the YouTube connection that was 2026-08-01. A session read the channel description out of that block, found "In original Persian beside careful English", and reported it to Ealia as a live claim needing correction. It was three weeks stale. The live description, read through `YOUTUBE_GET_CHANNEL_STATISTICS` with `part=brandingSettings`, says "in Persian or English, your choice, all the way through", is claim-clean, and its App Store link is already tagged. Nothing needed changing.
  - The rule: search results and connection metadata describe the *connection*. To describe the *account*, call a read tool. The same block also carries `user_info` for Instagram and LinkedIn and is equally stale there.
  - Worth keeping the by-product: the phantom string was run through both gates and both passed it, because the presentation pattern allowed only an article between "beside" and the language word and the contested pattern required the noun "translat". Those were real holes in live code, found by a false alarm, and they are fixed.
- Instagram bio, corrected 2026-08-22, and a reading trap alongside it.
  - The bio read "Persian poetry, undiminished" over a Persian line meaning "a translation that does not diminish the verse". That is a translation-fidelity claim, blocked by "CONTESTED: translation quality" below, and it was live on the profile. It also read "Free." as a complete claim, which omits Hamdam Plus. Both gates were run over it: only "Free." was caught. Now reads the shipped `siteCopy.ts` tagline, "A verse and a reflection, chosen for how your day feels", the unchanged poet line, and "Free to download. No ads". Verified live through the Graph API, 149 of 150 characters, gate clean.
  - The miss is the point: FACTS.md blocks a class, "any claim about the quality, fidelity, richness or faithfulness", and marks its list non exhaustive, while both lints enumerate instances. A new phrasing of the same claim therefore ships. This is the "alongside" failure in a new vocabulary. Patterns were added, but enumerating harder is not the fix; a human reading the class is.
  - **`website` is not the bio link. Instagram has two fields.** `INSTAGRAM_GET_USER_INFO` returns `website`, the legacy single link, and it is `null` on this account. The links tab is `bio_links`, which that tool does not return and gives no `fields` parameter to request. A session read the null `website` and told Ealia there was no link at all; Ealia had put it in the links tab. Confirm through `INSTAGRAM_GET_USER_INSIGHTS` instead: `website_clicks` was 14 against 115 `profile_views` over the 30 days to 2026-08-22, so a link plainly existed. One null field is not an absent link.
- **Subscribers, snapshot 2026-08-26 (the newest day Apple had finalised).** One paying subscriber: Hamdam Plus Monthly, $3.99, AU/QLD. Eight free: all Hamdam Plus **Yearly**, all at $0.00 under an offer named "Yearly Promo", counted by Apple in `Free Trial Offer Code Subscriptions`, so they are **redeemed promo codes and not organic trials**. Territories: 7 AU (VIC and QLD), 1 GB.
  - Monthly is 0 free / 1 paying; yearly is 8 free / 0 paying. Anyone asked "how many trials" should say which plan, because the totals hide that completely.
  - **Corrected same day: this entry first said "there are zero monthly trials, and there never have been". The second half was false.** The snapshot counts what is ACTIVE on one day; it says nothing about what was ever started. **Two monthly trials have been activated**, both `hamdam.plus.monthly.v2`, `New / 7 Days`, price 0.00: CA on 2026-08-05 and AU on 2026-08-13. The AU one converted, renewing 2026-08-20 at $3.99, and is the single paying subscriber above. The CA one lapsed and so is absent from the snapshot. A snapshot and a history answer different questions and the words for them are nearly identical.
  - Do not read the eight as demand. They are comped, they sit in one offer, and seven of eight are in two Australian states, which is the shape of people the founder knows rather than a market.
  - Source: `hamdam-analytics`, `mode=subscriptions`, raw TSV kept at `data/subscriptions/2026-08-26.tsv`. Re-run for a current figure; the snapshot moves daily and Apple finalises about two days back, so "today" is never available.
  - **The two reports answer different questions and neither substitutes for the other.** `data/sales/*.tsv` records transactions, so `IAY / New / 7 Days` counts trial *starts*; the SUBSCRIPTION report counts what is *running* on a day. Use starts for "how many have ever tried it" and the snapshot for "how many are on it now".
  - **Trial starts over the full history, 2026-06-14 to 2026-08-27: 12.** Ten on yearly, two on monthly. Yearly starts: 2026-07-20 (AU, GB), 07-21 (AU), 07-23 (AU), 08-03 (AU), 08-05 (AU x2), 08-06 (AU), 08-13 (AU), 08-17 (AU). Monthly starts: 08-05 (CA), 08-13 (AU). Renewals: yearly 8 at $0.00, monthly 1 at $3.99. **One transaction on this app has ever produced revenue.**
  - **The local sales history was incomplete until 2026-08-28 and the gap was invisible.** The daily job looks back ten days, so nothing older than its first run existed: the oldest file was 2026-08-03 while the app went live 2026-07-19, losing the launch fortnight. An answer computed from it looked complete and undercounted yearly starts by four. Caught because 6 starts in the window could not produce 8 active in the snapshot. Backfilled with `mode=backfill-sales`, now from 2026-06-14. **Check the earliest file in `data/sales/` before computing anything historical.**
  - Trap, and it produced a wrong answer before it was caught: the first version of the fetch script summed only the introductory and promotional free columns, printed "free trial 0" for a day with eight running, and looked entirely clean doing it. Apple counts offer-code redemptions in their own column. The script now enumerates every counting column in the header and prints any it does not recognise.
- **In-app events, checked 2026-08-28.** One was PUBLISHED in 175 territories: "The Living Sky", badged MAJOR_UPDATE, describing **version 1.1's** feature while 1.3 was live. Its window was 2026-08-02 to **2026-08-31T13:30Z**, so the slot emptied three days after it was found, with nothing behind it. The machinery works and is proven worldwide; it had simply not been succeeded.
  - Successor created 2026-08-28 as a DRAFT: event `6806252674`, "The Garden", same 175 territories read off the live event rather than re-typed. **Retuned the same day against the cultural calendar:** window **2026-09-03 to 2026-09-30**, priority HIGH, copy on en-AU plus en-US, en-GB and en-CA.
  - **The retune is the part worth remembering.** The first window ran to 5 October, straight through **Mehregan, which is Mehr 10, about 2 October** (`hamdam-ios` `Calendar/CulturalMoment.swift:135`; Yalda is Azar 30, about 21 December). Only one event can hold the product page at a time, so a feature announcement running into October would have cost the seasonal event that should replace it. **Check the Persian calendar before scheduling anything on this product.** Priority went HIGH because Apple caps how many events an app may mark high and this app has exactly one, so the cap cannot bind. The three extra English locales carry identical copy and no translation: the predecessor ran on en-AU alone across 175 territories, which is evidence Apple falls back to the primary locale but not proof, since nobody ever checked it displayed outside Australia. **It cannot be submitted until somebody uploads event card artwork (1920x1080), which no session can produce.** Apple reviews events separately from the app, so allow days.
  - Its deep link is `hamdam://discover`, not the `hamdam://event/<slug>` shape `docs/app-store/in-app-event-deep-links.md` establishes. Deliberate: an unknown event slug opens the app and navigates nowhere, which suited Living Sky, but the Garden **is** the Discover tab and `HamdamDeepLink` already routes `discover`. The documented alternative, `eventTabOverrides`, needs a build shipped before the event goes live.
- **Featuring nominations have no API.** `/v1/apps/{id}/nominations` 404s and `/v1/nominations` 400s, checked 2026-08-28. App Store Connect only, by hand. Draft text ready at `marketing/featuring-nomination.md`.
- **A finished A/B test exists whose result nobody has read, and it may no longer be readable.** "Reflection First Screenshot Test", product page optimisation, 50% traffic, 2026-07-27 to 2026-08-13, then STOPPED. It tested a different first screenshot, which is the still-open `01-hero` question. It is attached to version **1.1.1**, now superseded twice, and 404s on direct fetch: `/v1/appStoreVersionExperimentsV2/{id}` and every metrics shape tried all return 404, while the same id still appears in the app-scoped list. If the numbers survive they are in the App Store Connect dashboard. **Look there before commissioning new screenshots; the answer may already be paid for.**
- **Version 1.3 is live, released 2026-08-27**, `READY_FOR_SALE`, in all ten storefronts (au, us, gb, de, nl, fr, se, tr, sa, ca). It passed review with no rejection. Release notes lead with "The Garden". This was the release that took the listing from two localisations to ten.
  - Screenshot counts on the live listing: iPhone 6.7 has 7, iPad 6, iPhone 6.5 has 5, Apple Watch 5. Apple allows 10 of each.
  - **The Apple Watch set is five raw simulator captures from 2026-07-12** with untouched filenames (`incoming-A5164568-...PNG`, `Simulator Screenshot - Apple Watch Series 11 (42mm) - 2026-07-12 at 18.13.41.png`). They predate the redesign and have never been through the orchestrator. Oldest assets on the listing.
  - **`01-hero-en.png` shipped with it and is still screenshot number one**, now in ten storefronts rather than one. See the hero screenshot entry above: it is a synthetic composition of a screen the app cannot display. Still open.
- Current app version: never cite without checking the App Store listing at time of writing. 1.2 as of 2026-08-17, released that day; 1.1.1 before it. (iOS compatibility is resolved and moved to Product identity above.)
- Farsi site parity: Farsi legal pages incomplete as of last review; do not link Farsi legal pages in campaigns until confirmed complete.

## Standing rules (not claims — pipeline constraints)
- Persian-language copy is authored by Ealia only. Generation tasks produce English drafts and may propose Persian only as clearly marked placeholders for Ealia to replace.
- Instagram is Sima's channel: outputs are drafts to her queue, never direct posts.
- No dashes or hyphens in drafted outbound copy.
- Australian English throughout.
- Every generated draft must pass claim audit against this file before entering any review queue.

## App Store Connect commercial state — VERIFIED 2026-08-28

Source: `ealiaaziz/hamdam-analytics`, `data/analytics/ONGOING/`, read 2026-08-28. Latest daily
file is `App_Downloads_Standard/DAILY_2026-08-27.csv`. These are ASC report exports committed by
the scheduled pipeline, not a live API read, so treat everything here as accurate to 27 August.

**Hamdam has paying subscribers. Any statement that it has none is false.**
- `App_Store_Purchases_Standard/DAILY_2026-08-22.csv`: one in-app purchase of Hamdam Plus Monthly
  on 2026-08-20, territory AU, one paying user. Source type App referrer, page type Product page.
  App download date 2026-08-13, so a seven day gap between install and purchase.
- `App_Store_Subscription_State_Report_Standard/DAILY_2026-08-26.csv`: one Full price Hamdam Plus
  Monthly on 2026-08-24, AU, again App referrer into Product page.

**The free trial population is promo seeded, not organic demand.**
- Same file: seven free trials on 2026-08-24 (AU) and one on 2026-08-25 (GB), all Hamdam Plus
  Yearly, all carrying Offer Type "Offer code", offer name "Yearly Promo", vanity code
  `FRIENDSYEARLY`. These are codes handed out, not conversions won.
- Voluntary churn of two on 2026-08-25 (AU), cancellation reason "Turned off auto-renew".
- **Marketing consequence:** trial counts must never be presented as traction, adoption, demand or
  popularity. The only defensible statement is that Hamdam Plus has full price subscribers, and
  even that is a small number that should not be quantified in outbound copy.

**An App Store in-app event is already live.**
- `App_Store_Discovery_and_Engagement_Standard/DAILY_2026-08-26.csv` records impressions with page
  type "In-app event" arriving from App Store search (AU, 2026-08-25). Any plan proposing to
  "start using in-app events" is describing something already running and should check the
  existing event first.

**Download data still reports version 1.2.**
- `App_Downloads_Standard/DAILY_2026-08-26.csv` and `DAILY_2026-08-27.csv` both record App Version
  1.2 for first-time downloads, redownloads and manual updates. As of the last committed report,
  1.3 does not yet appear in download data. Do not claim 1.3 adoption from these files.

**Listing state, from `data/listing/current.json`.**
- App state READY_FOR_SALE / READY_FOR_DISTRIBUTION. A second appInfo record sits in
  PREPARE_FOR_SUBMISSION.
- Localisations present: `en-AU` and `en-US` only. There is no Farsi App Store locale, which is why
  Persian copy is carried inside the English description field rather than its own localisation.
- Name `Hamdam: Daily Persian Poetry`, subtitle `Hafez fal, ghazal and journal`, both locales
  identical. Privacy policy URL points at `www.hamdam.com.au/privacy`.
- **Note the `www.` prefix.** The site canonical is bare-domain. Worth confirming the redirect
  holds, since this URL is what Apple shows on the product page.

**Amounts deliberately omitted.** The purchases report carries proceeds and sales figures. They are
not reproduced here, consistent with the existing pricing entry recording structure only, and with
the standing rule against dollar amounts in copy.
