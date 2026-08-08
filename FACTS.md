# FACTS.md — Hamdam Verified Claims Source
Last reviewed: 7 August 2026 by Ealia Azizollahi
Status legend: VERIFIED (source cited) | UNVERIFIED (check listed) | CONTESTED (do not use until resolved)

Rule for all generation tasks: a claim may appear in marketing output ONLY if it is listed here as VERIFIED. Anything not in this file does not exist for marketing purposes. CONTESTED claims are prohibited outright.

---

## Product identity — VERIFIED
- Name: Hamdam. Positioning: daily Persian poetry, reflection and journal app. (Source: hamdam.com.au, fetched 7 Aug 2026)
- Platform: iPhone, available now on the AU App Store, App Store ID 6784461990. (Source: hamdam.com.au meta tags and App Store links)
- Minimum iOS: 26.5. Confirmed by Ealia 2026-08-07, resolving the deployment target question that had been open since setup: 26.5 is the intended floor, not the 17.0 once assumed, and not a build mistake. Published as `operatingSystem: 'iOS 26.5+'` in src/lib/schema.js, which is pinned to that exact string by a test. Any change to the floor is made here first and in the schema second. Worth stating plainly in any campaign: this is a high floor, so the addressable audience is phones running a current iOS, and saying so up front costs less than a download that cannot install.
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

## Pricing structure — VERIFIED (structure only, not amounts)
- Free tier: 15 reflections per month. (Source: hamdam.com.au)
- Hamdam Plus subscription: unlimited reflections, archive and insights, iCloud sync, Health body signals, poet deep-dives beyond Hafez and Rumi. Monthly or yearly, 7-day free trial for new subscribers. (Source: hamdam.com.au)
- Founding Companion: one-time lifetime purchase, Family Sharing supported. (Source: hamdam.com.au)
- Do not state dollar amounts in marketing; site defers to App Store. Note: one pricing tier previously flagged internally as indefensible — pricing claims need Ealia's sign-off until resolved.

## CONTESTED — prohibited in all marketing output until resolved
- "Careful English translation" / any claim about translation quality or provenance. The site says this, but AI-generated translations remain in the app despite the public commitment to cited public domain translations (Nicholson, Whinfield, Bell). Amplifying this claim before the replacement ships repeats the original failure. HARD BLOCK.
- Any claim implying scholarly or human-translated English text.

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
