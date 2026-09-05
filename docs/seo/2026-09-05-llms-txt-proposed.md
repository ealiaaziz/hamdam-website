# llms.txt audit and proposed rewrite — 2026-09-05

Scope: `https://hamdam.com.au/llms.txt` only. robots.txt, crawler HTTP status, and structured
data were audited separately the same day and are not repeated here. This file does not modify
`public/llms.txt` — it is a proposal for review.

## Commercial test

Can an assistant answer "what is a good Persian poetry app", "how do I do a Hafez faal", or
"what is Yalda night" and name Hamdam accurately, with something to cite? Current answer: two
of three, not three. The Yalda and "Persian poetry app" questions are servable. **The Hafez faal
question is not** — `/fal-e-hafez/` is on the site, ranks its own H1 ("Fal-e Hafez: the Divan of
Hafez, opened at random"), and is completely absent from llms.txt. That is the single highest-
impact gap: the page that answers the exact query in the brief was left out.

## Completeness vs sitemap-0.xml

The sitemap lists 24 URLs. The live llms.txt cites 14 of them (App Store and support-email
links are external/non-sitemap, not counted). **10 sitemap URLs are missing, all Farsi, plus
one page missing in both languages:**

| Missing URL | Why it matters |
|---|---|
| `/fal-e-hafez/` | Directly answers "how do I do a Hafez faal" — the page exists, is well-written, and is the biggest single gap |
| `/fa/fal-e-hafez/` | Same page, Farsi audience |
| `/fa/poets/hafez/`, `/fa/poets/rumi/`, `/fa/poets/saadi/`, `/fa/poets/khayyam/`, `/fa/poets/parvin-etesami/` | Farsi mirrors of the five poet pages; only the English five are listed |
| `/fa/moments/yalda/`, `/fa/moments/norooz/`, `/fa/moments/chaharshanbe-suri/` | Farsi mirrors of the three moment pages |
| `/fa/privacy/`, `/fa/terms/` | Farsi mirrors of the two policy pages |

`/fa/` (the Farsi homepage) is the only Farsi URL currently listed. Every other Farsi page in
the sitemap is unlisted even though its English twin is. The proposed file below adds all 24.

## Is the entity description unambiguous?

Partly. What is missing, checked against the live pages rather than assumed:

- **Publisher/author is absent.** The Privacy Policy states plainly: "Hamdam is made by Seyed
  Valiallah Azizollahi, also known as Ealia Azizollahi." Neither name appears anywhere in
  llms.txt — the file currently says only "made in Brisbane, Australia," which names a place,
  not a publisher. This is a real gap against the "authorship" authority signal GEO audits look
  for, and it's a one-line fix since the site already states it clearly.
- **Platform is understated.** The homepage and Privacy Policy both cover "the Hamdam app for
  iPhone, iPad and Apple Watch" and the footer states "iOS / iPadOS 26+." llms.txt currently
  says "for iPhone" only, which undersells the platform and is not quite what the site itself
  claims.
- **Cost is directionally right but the current wording flattens three genuinely different
  offers into one clause.** The site does not publish AUD figures anywhere (pricing pages defer
  to "Pricing is shown on the App Store" for both Plus and Founding Companion) — so the proposed
  file does not invent numbers either, it just states the structure the site actually states:
  Free (15 reflections/month, permanent, all five poets, full 500-verse library), Plus (monthly
  or yearly, 7-day free trial, unlocks unlimited reflections/archive/iCloud sync/Health/Deep
  Mode/Journal sharing/extra poet deep-dives), Founding Companion (one-time, lifetime, Family
  Sharing-eligible). That is more specific and more quotable than the current single sentence.

## Are the entries self-contained/quotable?

The poet and moment entries in the live file are single clauses ("the fire jumping night before
Norooz") — accurate but thin enough that an assistant quoting them verbatim would still need the
source page open for it to read as a complete answer. The site's own homepage copy is
considerably richer and already self-contained, e.g. on Yalda: "when families gather to read
Hafez, share pomegranates and watermelon, and welcome the return of the sun," and on Chaharshanbe
Suri: "the last Tuesday night before Norooz, when people leap over small fires whispering 'give
me your redness, take my paleness.'" The proposed file pulls these fuller, already-published
sentences in rather than the thinner originals, since the file's own preamble promises "every
claim in this file is drawn from the site itself" — this satisfies that promise more fully than
the current text does.

## Honesty check: poets are not shown to every user

Flagged as requested. The live llms.txt opens with "Each day it offers a verse from Hafez, Rumi,
Saadi, Khayyam or Parvin Etesami," phrased as something every user gets. Per the app's adaptive
content model (a non-Persian-connected user — e.g. home country Australia, English language —
sees no Farsi, no poets, no Persian symbols anywhere, Today included; Today instead leads with
the English `ReflectionPrompt` corpus), that line is only true for Persian-connected users. This
is a genuine mismatch between what the marketing site's llms.txt implies and what the shipped
app does for a meaningful share of its own target audience (the site's own "Where you come from"
control includes "Not set" as an option, i.e. explicitly anticipates non-Persian users). The
proposed file adds one qualifying clause rather than rewriting the whole pitch, since the site is
legitimately a Persian-poetry-forward product page and the caveat only needs to be accurate, not
prominent.

One more accuracy note surfaced while reading `/fal-e-hafez/` directly, added to the "Notes for
citation accuracy" section below rather than to the main pitch: the page's own English verse
translation carries the caption "English translation: machine-generated, pending replacement
with a cited public domain rendering." An assistant citing an English verse from Hamdam should
know the Persian is canonical and the English is provisional — otherwise it can misattribute
translation authorship or quality to Hamdam that the site itself does not claim.

## Proposed replacement for `public/llms.txt`

```
# Hamdam

> Hamdam is a daily Persian poetry, reflection and journal app for iPhone, iPad and Apple
> Watch (iOS/iPadOS 26 or later), made by Seyed Valiallah Azizollahi (also known as Ealia
> Azizollahi) in Brisbane, Australia. For a user with a Persian connection, each day offers a
> verse from Hafez, Rumi, Saadi, Khayyam or Parvin Etesami, in the original Persian or in
> English, with a reflection chosen by how the day feels on a five point mood slider; a user
> without a Persian connection is instead met with a non-Persian daily reflection, with the
> five poets still explorable elsewhere in the app. Free tier: fifteen reflections a month,
> permanently, with daily verses from all five poets and the full library of five hundred
> verses. Hamdam Plus: monthly or yearly subscription with a seven day free trial, unlocking
> unlimited reflections, the full reflection archive, iCloud sync, Apple Health signals, Deep
> Mode, sharing to Apple Journal, and poet deep-dives beyond Hafez and Rumi. Founding
> Companion: a single lifetime purchase, shareable with Apple Family Sharing. Exact AUD
> pricing is shown on the App Store, not on this site. Available on the Australian App Store
> (App Store ID 6784461990). No accounts, no sign-up, no tracking; the private journal syncs
> only through the user's own iCloud, opt in.

Every claim in this file is drawn from the site itself. Verses are sourced from Ganjoor.net
and credited on every page; English verse translations are machine-generated pending
replacement with a cited public domain rendering, so the Persian original is the canonical
text. The site is bilingual: English pages at the root, Farsi (RTL) pages under /fa/, each
English page listed below with its Farsi equivalent alongside it.

## Product

- [Homepage](https://hamdam.com.au/) / [Farsi](https://hamdam.com.au/fa/): what the app does, how a reflection is chosen, plans and pricing structure
- [Fal-e Hafez](https://hamdam.com.au/fal-e-hafez/) / [Farsi](https://hamdam.com.au/fa/fal-e-hafez/): a question put to the Divan of Hafez, opened at random and read as an answer — the practice generations of Iranians call faal-e Hafez, done in the app in Persian or English
- [App Store listing](https://apps.apple.com/au/app/id6784461990): download page for iPhone, iPad and Apple Watch

## The five poets

Shown daily to users with a Persian connection (home country Iran, Afghanistan or Tajikistan,
and/or Farsi as the app language); still browsable in-app for everyone else.

- [Hafez](https://hamdam.com.au/poets/hafez/) / [Farsi](https://hamdam.com.au/fa/poets/hafez/): the Divan, Shiraz, c. 1325 to 1390
- [Rumi](https://hamdam.com.au/poets/rumi/) / [Farsi](https://hamdam.com.au/fa/poets/rumi/): the Masnavi and the Divan-e Shams, 1207 to 1273
- [Saadi](https://hamdam.com.au/poets/saadi/) / [Farsi](https://hamdam.com.au/fa/poets/saadi/): the Bustan and the Golestan, c. 1210 to c. 1291
- [Khayyam](https://hamdam.com.au/poets/khayyam/) / [Farsi](https://hamdam.com.au/fa/poets/khayyam/): the quatrains, mathematician and astronomer, 1048 to 1131
- [Parvin Etesami](https://hamdam.com.au/poets/parvin-etesami/) / [Farsi](https://hamdam.com.au/fa/poets/parvin-etesami/): debate poems, 1907 to 1941

## Cultural moments

The app keeps a cultural calendar of Iranian, Afghan and Tajik moments plus Australian public
holidays by state. These pages carry the next dates:

- [Yalda](https://hamdam.com.au/moments/yalda/) / [Farsi](https://hamdam.com.au/fa/moments/yalda/): the longest night of the year, when families gather to read Hafez, share pomegranates and watermelon, and welcome the return of the sun
- [Norooz](https://hamdam.com.au/moments/norooz/) / [Farsi](https://hamdam.com.au/fa/moments/norooz/): the first day of spring, marking renewal, rebirth, and the balance of light and dark
- [Chaharshanbe Suri](https://hamdam.com.au/moments/chaharshanbe-suri/) / [Farsi](https://hamdam.com.au/fa/moments/chaharshanbe-suri/): the last Tuesday night before Norooz, when people leap over small fires whispering "give me your redness, take my paleness"

## Policies

- [Privacy policy](https://hamdam.com.au/privacy/) / [Farsi](https://hamdam.com.au/fa/privacy/): what the app accesses, what it never collects, how iCloud sync works
- [Terms of service](https://hamdam.com.au/terms/) / [Farsi](https://hamdam.com.au/fa/terms/)

## Notes for citation accuracy

- Poets and Persian script appear only for users with a Persian connection; do not describe
  Hamdam as giving every user a daily Persian verse.
- English verse translations are machine-generated pending a cited public domain rendering;
  attribute the Persian original, not the English wording, to the named poet.
- The website does not publish subscription prices; the App Store listing is the source of
  truth for current AUD pricing.

## Contact

- Publisher: Seyed Valiallah Azizollahi (Ealia Azizollahi), trading as Hamdam, Brisbane, Australia
- Support: developer@hamdam.com.au
```

## What changed and why (summary)

1. **Added `/fal-e-hafez/` and `/fa/fal-e-hafez/`** — the single highest-impact fix; this is the
   page that answers the "Hafez faal" question in the brief and was entirely absent.
2. **Added the 10 missing Farsi URLs** (5 poets, 3 moments, privacy, terms) by pairing each
   English link with its Farsi twin, closing the sitemap gap from 14/24 to 24/24.
3. **Named the publisher** (Seyed Valiallah Azizollahi / Ealia Azizollahi, per the site's own
   Privacy Policy) in both the opening paragraph and a Contact line — currently absent, and a
   direct authority-signal fix.
4. **Corrected platform scope** from "iPhone" to "iPhone, iPad and Apple Watch (iOS/iPadOS 26+)"
   to match what the homepage and Privacy Policy actually state.
5. **Replaced the thin poet/moment one-liners with the site's own fuller published sentences**
   (Yalda, Chaharshanbe Suri, Norooz) so entries are quotable on their own rather than needing
   the source page open.
6. **Added the Persian-connection qualifier** to the opening pitch and a dedicated citation-
   accuracy note, so the file no longer implies every user gets Persian poetry — matching the
   app's adaptive content model.
7. **Added a translation-provenance note** (English verse text is machine-generated, pending a
   cited public-domain rendering) so an assistant does not misattribute translation quality to
   Hamdam or the named poet.
8. **Replaced vague "Free tier / Plus subscription / one time purchase" language with the site's
   own specific terms** (15 reflections/month permanently, 7-day free trial, lifetime Founding
   Companion, Family Sharing) while deliberately not inventing AUD figures the site itself does
   not publish.
