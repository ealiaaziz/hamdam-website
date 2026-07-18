# Final website copy ledger

S3 of the Final Completion Mega Runner. Every public string across the EN/FA website experience,
extracted directly from source (not from memory or prior docs), with approval status and proposed
action. Sonnet authored this extraction and product-truth cross-check; Sonnet did **not** decide
any aesthetic or emotional copy question — those are marked "Fable F1" below and must go through
that review, not be silently approved here. Sonnet fixed only demonstrable typos, broken
ARIA/locale references, corrupted characters, and the one em-dash violation found (see §Narrow
fixes applied).

Columns: **Section** / **Component** / **English** / **Farsi** / **Literal Farsi meaning** /
**Emotional equivalence** / **Product claim** / **Commercial claim** / **Privacy claim** /
**A11y/metadata use** / **Source file** / **Status** / **Proposed action**.

Rows group sentence-level content where the whole block shares one approval status (a full legal
paragraph, a body copy block); headlines, CTAs, labels, alt text, and any claim-bearing sentence
are kept atomic since those are exactly where a mistranslation or false claim would matter most.

## 1. Hero (`HeroCinematic.astro`, `index.astro`, `fa/index.astro`)

| ID | English | Farsi | Literal FA meaning | Emotional equiv. | Claims | Status | Action |
|---|---|---|---|---|---|---|---|
| HERO-01 | "Hamdam reflects your heart and your sky." | "همدم، آینه‌ی قلب و آسمان توست." | "Hamdam is the mirror of your heart and sky." | Same register — the locked tagline (CLAUDE.md hard rule: never change), FA uses "mirror" (آینه) instead of "reflects" as a verb, natural FA phrasing choice, not a literal transliteration | None | **Approved** (locked tagline, byte-exact per `docs/decisions.md`) | None — do not touch |
| HERO-02 | "A bilingual reflection companion rooted in Persian poetry." | "همدمی برای تأمل روزانه، ریشه‌دار در خرد شعر فارسی." | "A companion for daily reflection, rooted in the wisdom of Persian poetry." | FA says "daily reflection" + "wisdom of poetry" vs EN's "bilingual...rooted in poetry" — different emphasis (FA drops "bilingual", adds "daily"), both true statements, no contradiction | Product: daily reflection, Persian poetry basis (both true) | Functional, provisional | Fable F1: confirm the EN/FA divergence in emphasis is intentional, not a translation drift |
| HERO-03 | "Coming soon" / "to iPhone" (AppStoreBadge pre-release state) | "به‌زودی" / "برای آیفون" | "Soon" / "for iPhone" | Direct equivalent | Commercial: pre-release status | **Approved** — matches `APP_STORE.RELEASED` gate, factually accurate pre-launch | None |
| HERO-04 | Hero device alt: "Hamdam Today screen preview (final screenshot pending)" | "پیش‌نمایش صفحه اصلی همدم (تصویر نهایی در دست تهیه)" | "Preview of Hamdam's main screen (final image in preparation)" | Direct equivalent, honest pending-state framing preserved in both | A11y | **Approved** — accurate, not a fabricated screen | None |

## 2. Mood slider (`MoodDemo.astro`)

| ID | English | Farsi | Literal FA meaning | Emotional equiv. | Claims | Status | Action |
|---|---|---|---|---|---|---|---|
| MOOD-01 | "Tell Hamdam how your heart feels. It answers with a verse." | "به همدم بگو دلت چه‌طور است تا با شعری پاسخ دهد." | "Tell Hamdam how your heart is, so it responds with a poem." | Equivalent | Product: verse-per-mood behaviour (real feature) | Functional, provisional | Fable F1 |
| MOOD-02 | "This is how the app works. In Hamdam, your reflection follows." | "اپلیکیشن همدم همین‌گونه کار می‌کند؛ در همدم، تأمل تو از همان‌جا ادامه پیدا می‌کند." | "The Hamdam app works exactly this way; in Hamdam, your reflection continues from there." | FA adds "continues from there" (ادامه پیدا می‌کند) — slightly more specific than EN's "follows", same underlying claim (the demo mirrors the real app) | Product | Functional, provisional | Fable F1 |
| MOOD-03 | "There is more waiting in the app" | "چیزهای بیشتری در اپلیکیشن منتظرت است." | "More things are waiting for you in the app." | Equivalent | Commercial (soft CTA) | Functional, provisional | Fable F1 |
| MOOD-04 | Slider aria-label: "How your heart feels today" | "دلت امروز چطور است" | "How is your heart today" | Equivalent | A11y | **Approved** | None |
| MOOD-05 | Heavy / Unsettled / Steady / Light / Bright | بسیار ناخوشایند / ناخوشایند / خنثی / خوشایند / بسیار خوشایند | FA is literally "very unpleasant / unpleasant / neutral / pleasant / very pleasant" — the exact clinical Apple Health valence scale strings from `ReflectionComposeSheet.swift`'s `appleHealthLabel(for:)`, reused byte-exact per the file's own comment | **Not equivalent** — EN is warm, poetic, page-spec-suggested wording; FA is a clinical/medical register lifted from a HealthKit data-entry screen. The component's own comment explicitly names this "a deliberate interim choice, not a matched translation" and flags it for Ealia's review before being final | A11y: drives `aria-valuetext` on the slider | **Explicitly unresolved, inherited from `18-acceptance-results.md` item 4** | **Fable F1, high priority**: the runner's own Mood Label Rule permits non-literal FA wording but requires "equivalent emotional range" and forbids "an unexplained mismatch merely because it already exists" — this mismatch *is* explained (in the code comment) but not yet resolved. Fable should author natural, warm FA mood words at the same emotional register as the EN set, rather than the current clinical valence terms, or explicitly approve keeping them if there's a reason (e.g. deliberate continuity with the app's own HealthKit-facing UI) |

## 3. Verse showcase (`VerseShowcase.astro`, `siteCopy.ts`)

| ID | English | Farsi | Literal FA meaning | Emotional equiv. | Claims | Status | Action |
|---|---|---|---|---|---|---|---|
| VERSE-01 | "A verse for every morning. Five poets. Two languages. Centuries of wisdom." | "شعری برای هر صبح. پنج شاعر. دو زبان. قرن‌ها خرد." | Direct, near-literal match | Equivalent, matches structure | Product: 5 poets, 2 languages (both true, verified against `poets.ts` — exactly 5 entries) | **Approved** | None |
| VERSE-02 | Three verse cards (`data/verses.ts`) | — | — | — | Poetic content — protected, byte-exact | **Out of scope for S3** | Never hand-edited per `CLAUDE.md`; not re-reviewed here |

## 4. "A companion for the daily reflection" body block (`index.astro` / `fa/index.astro`)

| ID | English (3 paragraphs) | Farsi (3 paragraphs) | Claims | Status | Action |
|---|---|---|---|---|---|
| COMPANION-01 | "Every day, Hamdam meets you at the hour it finds you... Tell it how your heart feels with a simple slider, and it offers a verse and a reflection chosen for that feeling." | "همدم هر روز، در همان ساعتی که به سراغت می‌آید، همراهت می‌شود... حال دلت را با یک حرکت ساده بگو، همدم شعر و تأملی متناسب با آن حس برایت می‌آورد." | Product: time-of-day awareness, mood slider (both real features) | Functional, provisional | Fable F1 |
| COMPANION-02 | "Every verse arrives in its original Persian beside a careful English translation, drawn from Hafez, Rumi, Saadi, Khayyam and Parvin Etesami." | "هر شعر با متن اصلی پارسی در کنار برگردان انگلیسی می‌آید، از حافظ، مولانا، سعدی، خیام و پروین اعتصامی." | Product: 5 named poets (verified against `poets.ts`, exact match, correct order) | **Approved** — poet list verified | None |
| COMPANION-03 | "A gentle streak keeps count, forgiving a missed day. Every reflection is kept in a private journal, searchable from your Home Screen, with your favourites always at hand." | "روزشماری آرام همراهی می‌کند که یک روز از قلم‌افتاده را می‌بخشد. هر تأمل در یادداشتی خصوصی نگه داشته می‌شود که از صفحه‌ی اصلی گوشی قابل جست‌وجوست، و شعرهای محبوبت همیشه در دسترس‌اند." | Product: streak-forgiveness, private journal, Home Screen search, favourites (all named features) | Functional, provisional — "searchable from your Home Screen" is a specific iOS capability (Spotlight indexing) claim | **Verification required**: confirm Spotlight/Home Screen search is actually shipped in the app, not aspirational (per project memory, "9B reflection Spotlight indexing shipped 2026-07-10" — consistent, but flagging since this is exactly the class of claim the runner says not to guess) |

## 5. Five poets (`PoetsBand.astro`, `PoetCard.astro`, `data/poets.ts`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| POETS-01 | "Five poets, five voices." | "پنج شاعر، پنج صدا." | Direct match | **Approved** | None |
| POETS-02 | "Verses sourced from Ganjoor.net. Portraits are artistic interpretations." | "شعرها از گنجور گردآوری شده‌اند. پرتره‌ها برداشت‌های هنری هستند." | Direct match; attribution + honesty about AI-generated portraits | **Approved** — matches `docs/asset-licence-log.md` licensing basis exactly | None |
| POETS-03 | Carousel `aria-label`: "The five poets" | "پنج شاعر" | A11y | **Approved** | None |
| POETS-04 | Portrait alt: `Portrait of {name} (artistic interpretation)` | `پرتره {name} (برداشت هنری)` | A11y, honest about non-authentic likeness | **Approved** | None |
| POETS-05 | Five poet one-line descriptions (Hafez/Rumi/Saadi/Khayyam/Parvin) | Five FA equivalents | Poetic-register marketing copy, not a factual claim | Functional, provisional (pre-existing, protected from hand-editing across all 12 implementation phases per `18-acceptance-results.md` C7) | Fable F1 for tone only — **do not hand-edit** `poets.ts` per its own protection rule |

## 6. Context constellation (`ContextConstellation.astro`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| CONST-01 | "One reflection, shaped by your day." | "یک تأمل، شکل‌گرفته از روز تو." | Direct match | **Approved** | None |
| CONST-02 | "See how it stays private" | "ببین چطور خصوصی می‌ماند" | Direct match, links to Privacy section | **Approved** | None |
| CONST-03 | Six signal cards: Mood / Weather / Season / Time of day / Calendar / Health, each with a one-line clause | Six FA equivalents | Privacy: each clause traces to Privacy Policy §1 — verified below in §Product truth verification | Functional, provisional per the component's own comment ("Flagged for Ealia to confirm the wording reads right against the shipped policy text") | **Verification required** — component author already flagged this; not resolved by S3, confirmed still open |
| CONST-04 | Device alt: shared with hero (HERO-04 pattern) | Same pattern | A11y | **Approved** | None |

## 7. Your Journey (`JourneyPair.astro`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| JOURNEY-01 | "Every reflection is kept for you." | "هر تأمل، برای تو نگه داشته می‌شود." | Direct match | **Approved** | None |
| JOURNEY-02 | "Over the weeks, Hamdam shows you your own weather: your moods, your seasons, your journey. A private journal, your favourites, and a gentle streak that forgives a missed day." | "در طول هفته‌ها، همدم آب‌وهوای خودت را به تو نشان می‌دهد: خلق‌وخوی تو، فصل‌های تو، مسیر تو. دفتر خصوصی، نشان‌شده‌ها، و رگه‌ای ملایم که یک روز از قلم افتاده را می‌بخشد." | Product: mood-trend view, journal, favourites, streak-forgiveness (all named features, consistent with COMPANION-03) | Functional, provisional | Fable F1 |
| JOURNEY-03 | "Hamdam is waiting to meet you." | "همدم منتظر آشنایی با توست." | Direct match | **Approved** | None |
| JOURNEY-04 | Reflect/Journey frame alt text (two strings) | Two FA equivalents | A11y, honest pending-screenshot state | **Approved** | None |

## 8. Roots and region (`RootsMoments.astro`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| ROOTS-01 | "Yalda, Norooz, Chaharshanbe Suri. Hamdam knows when they arrive, and greets them with poetry that belongs to them." | "یلدا، نوروز، چهارشنبه‌سوری. همدم می‌داند کِی از راه می‌رسند، و آن‌ها را با شعری که به خودشان تعلق دارد خوش‌آمد می‌گوید." | Product: countdown + poetry pairing per cultural moment (real feature) | **Approved** | None |
| ROOTS-02 | Three moment sentences (Yalda / Norooz / Chaharshanbe Suri), reused byte-exact from the app's `momentMeaning(id:_:)` in `Localization.swift` per the component's own comment | Three FA equivalents, authored by Claude, **carrying a SIMA-review-pending flag already present in the app itself** | Cultural content | **Verification required, inherited, not new** — the component's own comment states the FA text has a pending SIMA review flag in the app; this redesign did not introduce that gap and cannot resolve it (out of website scope, belongs in hamdam-ios) | Flag for Ealia: confirm whether the app's own SIMA review has since cleared, since this website inherits that status |
| ROOTS-03 | "Mehregan and Sizdah Bedar are marked too, each with its own quiet arrival." | "مهرگان و سیزده بدر هم علامت‌گذاری شده‌اند، هرکدام با آمدنی آرام." | Product: two more cultural moments exist beyond the three shown (Roots coverage claim) | Functional, provisional | **Verification required**: confirm Mehregan and Sizdah Bedar are actually implemented in the app's Roots calendar, not just named here |
| ROOTS-04 | "Ask, as generations have." | "همان‌گونه که نسل‌ها پرسیده‌اند، بپرس." | Refers to Fal-e Hafez feature | **Approved** — Fal-e Hafez is a real, named app feature per project knowledge | None |
| ROOTS-05 | Per-card alt text (CM-01/02/03, already committed in S1) | Same | A11y | **Approved**, unchanged from S1 | None |
| ROOTS-06 | Device alt: "Hamdam Roots screen with Fal-e Hafez and the cultural calendar (final screenshot pending)" | FA equivalent | A11y | **Approved** | None |
| ROOTS-07 | Per-card countdown text ("X arrives in N days" / "امروز می‌رسد" / "فردا می‌رسد") | Same | Computed at build time from real calendar maths (`lib/countdown.js`) | **Approved** — deterministic, not a copy question | None |

## 9. Quiet Intelligence / platform integrations (`index.astro`, `fa/index.astro`, `FeatureIcon.astro`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| QUIET-01 | "Hamdam meets you wherever you look." | "همدم هر جا که نگاه کنی، همراه توست." | Direct match | **Approved** | None |
| QUIET-02 | "Ask Siri to start a reflection, hear today's verse, or check your streak. Add a widget to your Home Screen. If you wear an Apple Watch, your verse and streak travel with you. If you choose, each reflection can be saved to Apple Health as a State of Mind entry, with calm music playing alongside through Apple Music." | FA equivalent, direct match | Product: Siri Shortcuts, widgets, Watch companion, HealthKit State of Mind write, Apple Music integration — five distinct platform-integration claims | Functional, provisional | **Verification required for each of the five claims** — see §Product truth verification. Per project memory, App Shortcuts/Siri (Phase 18/9A) and Watch companion are shipped; widgets, State of Mind write, and Apple Music integration need explicit confirmation against current app state before Fable/Ealia treat this paragraph as fully verified |
| QUIET-03 | Five `FeatureIcon` labels: Siri / Widgets / Watch / Health / Music | سیری / ابزارک / اپل واچ / اپل هلث / اپل موزیک | Same five platform claims as QUIET-02 | Same as QUIET-02 | Same as QUIET-02 |

## 10. Privacy trust strip (`PrivacyTrust.astro`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| PRIV-01 | "Hamdam does not use accounts. It does not collect emails. Your words never leave your device unless you turn on your own iCloud sync. Nobody at Hamdam can read a word you write." | FA equivalent, direct match | Privacy: no accounts, no email collection, on-device by default, iCloud opt-in, zero-knowledge journal | **Approved** — verified word-for-word against `privacy.astro` §1.4 ("If you enable sync...") and §2 ("No user accounts, and no email collection at signup") | None |
| PRIV-02 | Trust row: "No accounts" / "On your device" / "Your own iCloud only", each with a one-line clause | FA equivalents | Same as PRIV-01, condensed | **Approved** | None |
| PRIV-03 | Device alt: "Hamdam Privacy screen (final screenshot pending)" | FA equivalent | A11y | **Approved** | None |

## 11. Plans and Founding Companion (`PlansAndFoundingCompanion.astro`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| PLAN-01 | "The daily ritual is free, always." (heading) | "آیین روزانه همیشه رایگان است." | Commercial: free tier exists and is not time-limited | **Approved** — verified against Terms §3 (no mention of the free tier ever expiring) | None |
| PLAN-02 | Free: "The daily ritual is free, always, including fifteen reflections every month." | "آیین روزانه همیشه رایگان است، از جمله پانزده تأمل در هر ماه." | Commercial: 15 free reflections/month | **Approved** — matches project memory's `UsageTracker.freeMonthlyLimit`, EN/FA numbers match exactly (fifteen / پانزده) | None |
| PLAN-03 | Plus: "Hamdam Plus opens unlimited reflections, the full wisdom library of all five poets, the reflection archive, and more." | "همدم پلاس تأملات نامحدود، کتابخانه کامل خرد پنج شاعر، و بایگانی تأملات را باز می‌کند، و بیشتر." | Commercial: unlimited reflections, 5-poet library, archive (Plus features) | **Approved** — poet count consistent (5), matches Terms §3 | None |
| PLAN-04 | "Monthly or yearly, with a 7-day free trial for new subscribers." | "ماهانه یا سالانه، با هفت روز آزمایش رایگان برای مشترکان جدید." | Commercial: 7-day trial, Monthly/Yearly only | **Approved** — verified word-for-word against Terms §3.2 ("Monthly and Yearly subscriptions include a 7-day free trial for new subscribers") | None |
| PLAN-05 | "Pricing is shown on the App Store." (×2, Plus and Founding Companion) | "قیمت در اپ‌استور نمایش داده می‌شود." | Commercial: deliberate no-dollar-figures policy | **Approved** — matches the locked decision (2026-07-02, no prices published) cited in the component's own comment, and matches `jsonLd`'s own `price: '0'` + `"Free with in-app purchases"` framing in `index.astro` | None |
| PLAN-06 | Founding Companion: "A single purchase, yours for life, shareable with your family through Apple Family Sharing." | "یک خرید، برای همیشه مال توست، قابل اشتراک‌گذاری با خانواده‌ات از طریق Apple Family Sharing." | Commercial: Lifetime tier, Family Sharing | **Approved** — matches Terms §3.3 ("The Lifetime plan supports Family Sharing, for up to six members") — website doesn't state the six-member cap, which is fine (Apple's own platform-wide Family Sharing limit, not a Hamdam-specific figure, no contradiction) | None |
| PLAN-07 | "Start on the App Store" (pre-release: not rendered, `APP_STORE.RELEASED` gate) | "شروع در اپ‌استور" | Commercial CTA | **Approved** — correctly suppressed pre-release | None |

## 12. Final dawn ceremony (`FinalCeremony.astro`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| CEREMONY-01 | "Sit with a verse. Reflect. Return tomorrow." | "با شعری بنشین. تأمل کن. فردا برگرد." | Direct match, imperative mood preserved in both | **Approved** | None |

## 13. Footer (`Footer.astro`, `fa/index.astro`'s inline footer)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| FOOT-01 | "An app by the Hamdam Team" | "اپلیکیشنی از تیم همدم" | Direct match | **Approved** | None |
| FOOT-02 | "Privacy" / "Terms" / "Contact" nav links | "حریم خصوصی" / "شرایط استفاده" / "تماس با ما" | A11y/navigation | **Approved** | None |
| FOOT-03 | "Made with love in Brisbane." | "ساخته شده با عشق در بریزبن." | Direct match — factually consistent with Terms §16 ABN address ("Brisbane, Queensland, Australia") | **Approved** | None |
| FOOT-04 | "Verses sourced from Ganjoor.net." | "شعرها از گنجور گردآوری شده‌اند." | Attribution — matches POETS-02, C6 of `18-acceptance-results.md` (Ganjoor footer credit) | **Approved** | None |
| FOOT-05 | Copyright line, trademark notice, support contact (three `lang="en" dir="ltr"` lines rendered even on the FA page's inline footer) | Same three lines, English, on the FA page too (not translated — a deliberate legal-text choice, both footers use identical EN wording for these three lines) | Commercial/legal: trademark application number 2674427, filed 11 July 2026 | **Approved on content match** (identical between `Footer.astro` and `fa/index.astro`'s inline copy, and matches `terms.astro`/`privacy.astro`'s own trademark notices) — see §Product truth verification for the trademark-owner-name discrepancy | See below |

**Note on FOOT-05**: `Footer.astro` (used by `index.astro`, `terms.astro`, `privacy.astro`) does not name a trademark owner, just "HAMDAM™ is the subject of Australian trade mark application no. 2674427, filed 11 July 2026." The legal pages (`terms.astro` §15, `privacy.astro` closing note) separately state the mark and IP are "owned by Seyed Valiallah Azizollahi" — a different name from the ABN holder "Ealia Azizollahi (sole trader)" listed in the same pages' Contact sections. This is flagged, not silently treated as consistent — see §Product truth verification.

## 14. Navigation and language toggle (`NavBar.astro`, `LanguageToggle.astro`, `StickyDownloadAction.astro`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| NAV-01 | "Get Hamdam" (nav CTA, pre-release: not rendered) | "دریافت همدم" | Commercial CTA | **Approved**, correctly gated | None |
| NAV-02 | Nav logo `aria-label`: "Hamdam" | "همدم" | A11y | **Approved** | None |
| NAV-03 | Language toggle labels: "English" / "فارسی" | Same (toggle shows the *other* language, not the current one — correct UX pattern) | A11y | **Approved** | None |
| NAV-04 | Language toggle `aria-label`: "Switch to Farsi" / "به انگلیسی" | — | A11y — FA aria-label literally means "to English", matching "switch to X" convention in the visitor's *current* reading language | **Approved** — correct pattern (announces the destination language, phrased in the language the visitor is currently reading) | None |
| NAV-05 | Skip link: "Skip to main content" / "رفتن به محتوای اصلی" | Direct match | A11y (F1 gate, `18-acceptance-results.md`) | **Approved** | None |

## 15. 404 page (`404.astro`)

| ID | English | Farsi | Claims | Status | Action |
|---|---|---|---|---|---|
| 404-01 | "This page has wandered off." / "Return to the beginning." / "Back to Hamdam" | **No Farsi version exists** | — | **Gap, not previously flagged in any prior doc reviewed this session** | Flagged for Fable F1 / Ealia: there is no `src/pages/fa/404.astro` — a Farsi visitor hitting a broken link sees an English-only 404 page with `lang="en"` hardcoded in `404.astro`. This is a real, unresolved gap, not a copy-quality question — recommend either a dedicated `fa/404.astro` or confirming this is accepted as out of scope for this redesign |

## 16. Metadata (EN/FA, `index.astro`, `fa/index.astro`, `BaseLayout.astro`, legal pages)

| ID | Content | Status | Action |
|---|---|---|---|
| META-01 | EN `<title>`: "Hamdam — A reflection companion grounded in Persian poetic wisdom" | **Approved** | None |
| META-02 | FA `<title>`: "همدم — همراهی برای تأمل روزانه، ریشه‌دار در خرد شعر فارسی" | Literal: "Hamdam — a companion for daily reflection, rooted in the wisdom of Persian poetry" — same emphasis divergence as HERO-02 (FA says "daily", EN doesn't) | Fable F1 — same divergence flagged at HERO-02, likely the same intentional choice, confirm once not twice |
| META-03 | EN meta description: "Hamdam reflects your heart and your sky. A daily reflection companion grounded in Persian poetic wisdom, coming soon to iPhone." | **Approved** — includes the locked tagline verbatim, accurate pre-release framing | None |
| META-04 | FA meta description: "همدم، آینه‌ی قلب و آسمان توست. همراهی روزانه برای تأمل، ریشه‌دار در خرد شعر فارسی. به‌زودی برای آیفون." | **Approved** — same structure as EN, tagline present | None |
| META-05 | JSON-LD (`index.astro`): `applicationCategory: 'LifestyleApplication'`, `operatingSystem: 'iOS 26+'`, `offers.price: '0'`, `offers.description: 'Free with in-app purchases'` | **Approved** — `price: '0'` + the description together are accurate (free tier exists, IAP unlocks Plus/Lifetime) and don't publish a paid price, consistent with the no-dollar-figures decision | None |
| META-06 | `apple-itunes-app` meta tag references `APP_STORE.ID` | **Verification required** — confirm the App Store ID constant in `lib/appStore.js` is the real, current App Store Connect ID, not a placeholder (S3 does not re-derive this; flagged for whoever owns App Store Connect access) | See §Product truth verification |
| META-07 | OG/Twitter Card titles and descriptions | Reuse META-01/03 (EN) and META-02/04 (FA) verbatim | **Approved**, same basis | None |
| META-08 | `og:locale` / `og:locale:alternate`: `en_AU` / `fa_IR` | **Approved** — `en_AU` matches the site's Australian English standard (per `CLAUDE.md`); `fa_IR` (Iran locale code) is the only standard BCP47/OG locale tag for Farsi, not a claim about the audience being Iran-specific | None |
| META-09 | Terms/Privacy `jsonLd.publisher.name`: "Ealia Azizollahi" (both EN and FA legal pages) | Consistent with the ABN Contact section, **inconsistent with the §15 IP-ownership name** "Seyed Valiallah Azizollahi" | Flagged — same discrepancy as FOOT-05, see §Product truth verification | Verification required |
| META-10 | `privacy.astro` meta description: "...No accounts, no analytics, no data selling." | (no separate FA meta description issue — `fa/privacy.astro`'s own description doesn't use this exact absolute phrasing) | Privacy claim — states "no analytics" verbatim, which the runner explicitly instructs against stating as an absolute claim | **Real finding, not previously flagged in any prior doc** — see §Product truth verification's Analytics decision section for full detail | Fable/Ealia — needs replacement wording, not a Sonnet fix |

## Narrow fixes applied this pass

Per the runner's own S3 scope limit (Sonnet may fix only demonstrable typos, broken ARIA labels,
incorrect locale references, corrupted characters, or an existing em dash where the locked copy
rule prohibits it — no broader copy changes without Fable):

- **None applied.** A full grep for em dashes (U+2013/U+2014) across `src/**/*.astro` this pass
  found only the already-known, already-documented pre-existing instances in `poets.ts` (Parvin's
  description, both EN and FA) and `verses.ts` — both explicitly protected from hand-editing per
  `18-acceptance-results.md` C7, and neither introduced by this redesign. No new violation found,
  so no fix was needed or applied.
- No broken ARIA labels, no corrupted Persian characters (re-confirmed via `npm run
  check:persian`, passing), no incorrect locale references found.

## What S3 explicitly did not do

Per the runner's own instruction, Sonnet did not implement any broad copy change, did not
reinterpret ambiguous EN/FA divergences, and did not resolve any "Fable F1" or "verification
required" row above. Those are handed to Fable's F1 review and to Ealia respectively, not decided
here.
