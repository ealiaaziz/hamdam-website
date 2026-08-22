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
- Instagram bio, corrected 2026-08-22, and a reading trap alongside it.
  - The bio read "Persian poetry, undiminished" over a Persian line meaning "a translation that does not diminish the verse". That is a translation-fidelity claim, blocked by "CONTESTED: translation quality" below, and it was live on the profile. It also read "Free." as a complete claim, which omits Hamdam Plus. Both gates were run over it: only "Free." was caught. Now reads the shipped `siteCopy.ts` tagline, "A verse and a reflection, chosen for how your day feels", the unchanged poet line, and "Free to download. No ads". Verified live through the Graph API, 149 of 150 characters, gate clean.
  - The miss is the point: FACTS.md blocks a class, "any claim about the quality, fidelity, richness or faithfulness", and marks its list non exhaustive, while both lints enumerate instances. A new phrasing of the same claim therefore ships. This is the "alongside" failure in a new vocabulary. Patterns were added, but enumerating harder is not the fix; a human reading the class is.
  - **`website` is not the bio link. Instagram has two fields.** `INSTAGRAM_GET_USER_INFO` returns `website`, the legacy single link, and it is `null` on this account. The links tab is `bio_links`, which that tool does not return and gives no `fields` parameter to request. A session read the null `website` and told Ealia there was no link at all; Ealia had put it in the links tab. Confirm through `INSTAGRAM_GET_USER_INSIGHTS` instead: `website_clicks` was 14 against 115 `profile_views` over the 30 days to 2026-08-22, so a link plainly existed. One null field is not an absent link.
- Current app version: never cite without checking the App Store listing at time of writing. 1.2 as of 2026-08-17, released that day; 1.1.1 before it. (iOS compatibility is resolved and moved to Product identity above.)
- Farsi site parity: Farsi legal pages incomplete as of last review; do not link Farsi legal pages in campaigns until confirmed complete.

## Standing rules (not claims — pipeline constraints)
- Persian-language copy is authored by Ealia only. Generation tasks produce English drafts and may propose Persian only as clearly marked placeholders for Ealia to replace.
- Instagram is Sima's channel: outputs are drafts to her queue, never direct posts.
- No dashes or hyphens in drafted outbound copy.
- Australian English throughout.
- Every generated draft must pass claim audit against this file before entering any review queue.
