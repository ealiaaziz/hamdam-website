# Structured Data Audit — hamdam.com.au

Audited: 2026-09-05. Method: read the shared builder (`src/lib/schema.js`) and every
page that calls it (source of truth, since the site is a static Astro build), then
spot-verified the live `<script type="application/ld+json">` output on `/`,
`/moments/yalda/` and `/poets/hafez/` with `curl` to confirm deployed HTML matches
source. All 24 URLs use one of five schema shapes, so auditing the five builders
covers every page.

## What exists today (detection)

| Page(s) | Builder | Types emitted |
|---|---|---|
| `/`, `/fa/` | `homepageSchema()` in `src/lib/schema.js` | `SoftwareApplication` + `Organization`, in one `@graph` |
| `/poets/{slug}/`, `/fa/poets/{slug}/` (10 URLs) | `poetPageSchema()` | `WebPage` + `Person` (nested in `about`) + `BreadcrumbList` + `Organization` |
| `/moments/{slug}/`, `/fa/moments/{slug}/` (6 URLs) | `momentPageSchema()` | `WebPage` + `Thing` (nested in `about`) + `BreadcrumbList` + `Organization` |
| `/fal-e-hafez/`, `/fa/fal-e-hafez/` | `momentPageSchema()` (reused) | Same shape as moment pages |
| `/privacy/`, `/fa/privacy/`, `/terms/`, `/fa/terms/` | inline object per page (not the shared builder) | Bare `WebPage` |

No Microdata or RDFa anywhere; JSON-LD only, via one `<script>` tag injected by
`BaseLayout.astro:136`. `@context` is `https://schema.org` (HTTPS) everywhere. No
deprecated types anywhere: **no HowTo, no SpecialAnnouncement, no CourseInfo /
EstimatedSalary / LearningVideo, no FAQPage.** No `aggregateRating`, `ratingCount`
or `reviewCount` anywhere on the site.

## Validation, block by block

### `SoftwareApplication` (homepage, both locales) — PASS, with one deliberate omission worth confirming

- `@context`/`@type` valid, HTTPS context.
- Required-for-eligibility fields present: `name`, `operatingSystem`
  (`iOS 26+, iPadOS 26+`), `applicationCategory` (`LifestyleApplication`, a
  recognised value).
- `offers` present with a real `price`/`priceCurrency` (free app, IAP disclosed in
  `description`) — correctly not stating Plus pricing in structured data (a locked
  decision in this repo, `docs/decisions.md`).
- `author` (Person) and `publisher` (Organization by `@id`) both present and
  distinct, matching the real App Store credit.
- `sameAs` on both the app node and the `Organization` node points at the single
  canonical App Store URL (`APP_STORE_CANONICAL_URL`), not a `ct`-tagged marketing
  link — correct: `sameAs` must be a stable identity URL, not a tracked one.
- `downloadUrl`/`installUrl` are absolute and carry the App Store link (with campaign
  params, which is fine for an action URL).
- `screenshot` is an array of absolute URLs (only emitted when non-empty — verified
  in `schema.test.js`), no placeholder text anywhere.
- **`aggregateRating` is absent, and this is correct, not a gap.** Google's
  Software App rich result requires `aggregateRating` to *show* the star snippet,
  but the app currently has **one** App Store rating. Publishing `aggregateRating`
  built from a single rating (implicitly `ratingValue` = that one score,
  `ratingCount`/`reviewCount` = 1) would be technically parseable but would
  misrepresent a single data point as a rating distribution, and Google's own
  guidelines call out review/rating markup based on unrepresentative or
  self-selected samples as a policy risk. **Do not add `aggregateRating` until
  there is a real, growing rating count** (a defensible bar: several ratings, not
  one). This is flagged explicitly per your instruction, not because the current
  code did anything wrong — it is currently honest by omission.
- Minor: `inLanguage` is `['en','fa']` / `['fa','en']` on both homepages — technically
  correct (the app truly is bilingual) but means the two homepage nodes describe the
  same `@id` (`.../#app`) with a different field order and a different `name`/`url`/
  `description` each time Google crawls a locale. That's expected and fine for a
  single `@id` describing one real-world app from two localized pages; not a defect.

### `WebPage` + `Person` (poet pages, 10 URLs) — PASS, well-reasoned

- `Person` correctly avoids `birthDate`/`deathDate` given only approximate lifespans
  ("c. 1325") are known — a genuinely good call, not a gap to fill in with
  approximate dates schema.org expects to be exact.
- `sameAs` points each poet at their real Ganjoor.net author page (verified all
  five: Hafez, Rumi, Saadi, Khayyam, Parvin Etesami all resolve to distinct,
  correct Ganjoor URLs in `src/data/poetPages.ts`).
- `BreadcrumbList` present and correctly 2-level (Home → Poet).
- One real gap (see Missing Opportunities #3): the `Person` node has no stable
  `@id`, so the English node (`name: "Hafez"`) and the Farsi node
  (`name: "حافظ"`) are two separate anonymous entities that only imply "same
  person" via an identical `sameAs` URL, rather than being explicitly tied.

### `WebPage` + `Thing` (moment pages, 6 URLs + Fal-e Hafez pair) — PASS, appropriately modest

- Confirms the in-code reasoning is sound: these pages are one photo, one approved
  sentence, and a countdown — genuinely too thin for `Article`/`BlogPosting`
  (no byline, no real `datePublished` for the prose, word count in the low
  hundreds). **Do not add `CreativeWork`/`Article` here** — it would be marking up
  content that isn't there, the same failure this repo's schema comments already
  warn against for `FAQPage`.
- Correctly not `Event`: Yalda/Norooz/Chaharshanbe Suri are recurring cultural
  observances Hamdam did not organise and doesn't want to claim start/end times
  for. Right call.
- `about: { '@type': 'Thing', name }` is a legitimate, honest fallback — there is
  no better-fitting schema.org type for "a cultural night people observe" that
  isn't `Event` (rejected above) or `Article` (content too thin). No action needed.
- Fal-e Hafez reuses `momentPageSchema()` even though its English body copy
  (`FAL_HAFEZ_BODY_EN`, 3 headed sections, real explanatory prose) is
  meaningfully more substantial than the moment pages. It is *borderline*
  Article-worthy on content grounds, but there is no verified `datePublished`
  for that prose and no named author distinct from the Organization — so per the
  "no placeholder text" rule, I'm not generating an Article block for it. Flagging
  as a **future candidate only**, once a real publish date is picked.

### Bare `WebPage` (privacy, terms, 4 URLs) — PASS on validity, two real inconsistencies

- Correctly `WebPage`, not `PrivacyPolicy`/`TermsAndConditions` — those types don't
  exist in schema.org (the in-repo comment is right; both resolve 404 on
  schema.org and Google would silently ignore an unrecognised `@type`).
- `datePublished`/`dateModified` present in ISO 8601 (`2026-07-03` / `2026-08-13`) — pass.
- **Inconsistency #1**: `publisher` here is inlined as
  `{'@type': 'Person', name: 'Seyed Valiallah Azizollahi'}`, while every other page
  on the site (homepage, poet pages, moment pages) references the shared
  `Organization` node by `{'@id': 'https://hamdam.com.au/#organization'}`. Both are
  individually valid, but together they tell Google two different things about who
  publishes hamdam.com.au depending which of the 24 pages it crawls, which works
  against exactly the entity-consolidation goal the `Organization` node's own code
  comments describe (the "hamdam is a common word" reasoning). Low risk, easy fix,
  included below.
- **Inconsistency #2**: these four pages are the only ones with no `@graph`, no
  `BreadcrumbList`, and no `inLanguage`. Not wrong, just the least-decorated
  corner of an otherwise consistent site.

## Missing opportunities, prioritized

### 1. (Highest value / lowest risk) Add a `WebSite` entity, and point every page's `isPartOf` at it instead of the app

Every non-homepage page currently sets `isPartOf: { '@id': 'https://hamdam.com.au/#app' }`
— i.e. every poet/moment/fal page claims to be "part of" the `SoftwareApplication`
node. `SoftwareApplication` is technically a `CreativeWork` subtype so this doesn't
error, but it's the wrong entity: a *webpage* is part of a *website*, not part of
an iOS app. There is currently no `WebSite` node anywhere on the site at all, which
also means there's no single node tying the 24 URLs together as one site for
Google's entity graph, and no home for `inLanguage`/`name` at the site level
(separate from the app's own `inLanguage`).

**No `SearchAction`/sitelinks-searchbox recommended** — the site has no working
search feature (checked: no search input, no `/search` route, nothing in
`NavBar.astro`), and publishing a `SearchAction` with a fabricated `target` URL
template would be exactly the kind of markup that describes a feature that isn't
there.

Add to `src/lib/schema.js`:

```js
export const WEBSITE_ID = `${SITE}/#website`;

export const websiteSchema = Object.freeze({
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: 'Hamdam',
  url: `${SITE}/`,
  inLanguage: ['en', 'fa'],
  publisher: { '@id': ORGANIZATION_ID },
  about: { '@id': APPLICATION_ID },
});
```

Then:
- Add `websiteSchema` to the homepage `@graph` in `homepageSchema()`.
- Add it to the `@graph` in `poetPageSchema()` and `momentPageSchema()`.
- Change `isPartOf: { '@id': APPLICATION_ID }` to `isPartOf: { '@id': WEBSITE_ID }`
  in both of those builders (the `about` field already correctly names the topic —
  a poet or a moment — so nothing is lost by fixing `isPartOf`).

### 2. Fix the publisher inconsistency on the four legal pages

Replace the inline `Person` publisher with the shared `Organization` reference used
everywhere else, and wrap in a `@graph` so the `Organization` node (and the new
`WebSite` node) actually resolve rather than being an unresolvable `@id` reference
with nothing behind it on that page.

```js
// src/pages/privacy.astro (and fa/privacy.astro, terms.astro, fa/terms.astro
// with the locale-appropriate name/description/url already in the file)
import { organizationSchema, websiteSchema, ORGANIZATION_ID } from '../lib/schema';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://hamdam.com.au/privacy/',
      name: 'Hamdam Privacy Policy',
      description,
      url: 'https://hamdam.com.au/privacy/',
      inLanguage: 'en',
      datePublished: '2026-07-03',
      dateModified: '2026-08-13',
      publisher: { '@id': ORGANIZATION_ID },
    },
    organizationSchema,
    websiteSchema,
  ],
};
```

(Mirror for terms.astro and both Farsi pages, swapping `name`, `description`, `url`
and `inLanguage: 'fa'` for the Farsi pair — no new Persian text required, since
`name`/`description` are already authored in each file.)

### 3. Give each poet's `Person` node a stable `@id` shared by its EN/FA pair

Currently the English and Farsi pages for the same poet each emit an anonymous
`Person` node; the only signal tying "Hafez" to "حافظ" as one entity is an
identical `sameAs` URL. That's serviceable but implicit. An explicit shared `@id`
is a small, safe addition:

```js
// in poetPageSchema(), schema.js — add a slug param and an @id
about: {
  '@type': 'Person',
  '@id': `${SITE}/poets/${slug}/#person`,
  name,
  alternateName,
  description,
  sameAs,
},
```

Using the Latin slug (identical on both locales, per the existing
`switchLocalePath` comment in `momentPageSchema`'s caller) means both language
pages emit the exact same `@id` for the same poet without a new lookup table.

### 4. Not recommended right now: `Article`/`CreativeWork` on Fal-e Hafez, `FAQPage` anywhere

- Fal-e Hafez has real explanatory prose (see validation above) but no verified
  `datePublished` or distinct author — revisit once those exist rather than
  fabricating a date.
- `FAQPage` is not present and should stay that way under the current rule: Google
  retired FAQ rich results for all sites (May 2026), so there is no SERP benefit,
  and none of the current pages are written as genuine question-and-answer copy
  anyway (the Fal-e Hafez sections are headed prose, not Q&A pairs — they don't
  even fit `QAPage`, which is for user-submitted questions with an accepted
  answer). If this is ever revisited for AI/GEO visibility only, that should be a
  deliberate, separate call with the unconfirmed-benefit caveat attached, not a
  side effect of this audit.

## Summary for a quick read

- **No deprecated or misleading markup found.** No HowTo, SpecialAnnouncement,
  FAQPage, or aggregateRating anywhere — the last of these is a good, deliberate
  omission given the single App Store rating and should stay that way until the
  rating count is real.
- **Everything present validates.** All five schema shapes are syntactically and
  semantically sound JSON-LD, HTTPS context, absolute URLs, no placeholder text,
  ISO 8601 dates where dates appear.
- **Top fix**: add a `WebSite` node and repoint `isPartOf` at it instead of the
  `SoftwareApplication` node (opportunity #1) — this is the one place current
  markup asserts something structurally odd (a page being "part of" an app rather
  than a site), and it's a ten-line change in one shared file.
- **Second fix**: bring the four legal pages onto the same `Organization`
  reference as the rest of the site (opportunity #2) — cheap consistency win for
  entity resolution, relevant given the code's own noted struggle with "hamdam"
  being a generic word in search.
- **Nice-to-have**: shared `Person` `@id` across each poet's EN/FA pair
  (opportunity #3).
- **Deliberately not recommending**: `aggregateRating` (would misrepresent one
  rating), `FAQPage` (no SERP benefit, no genuine Q&A copy to mark up), `Article`
  on the moment pages (content too thin) or on Fal-e Hafez yet (no verified date/
  author), and `SearchAction` (no real search feature exists on the site).
