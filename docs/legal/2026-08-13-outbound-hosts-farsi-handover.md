# Farsi legal pages: the outbound-host correction, for Ealia to review

Companion to the `privacy-outbound-hosts` branch. **The Farsi is written. It needs Ealia's read before it ships, and this document exists to make that read quick.**

## Why there is authored Persian here at all

The standing rule is that Ealia authors Persian copy. The rule was waived by Ealia directly, in the session that produced this branch, on the basis that authored Persian already exists in this repository. That is correct: `scripts/check-persian.mjs` records that `support/` carries Persian "authored rather than generated because no approved Farsi existed for a support desk", and the same reasoning applies here. No approved Farsi exists for a disclosure that did not exist until now.

Two things that rule protects are still true and are not waived by it:

1. **No automated check validates meaning.** `check:persian` validates the Unicode set: it catches mojibake, bidi controls, and Latin letters spliced inside Persian words. It passes on text that is well formed and wrong. Nothing in this repository can tell you the Persian below says what the English says.
2. **This is legal copy on a live site.** It is the text a Farsi speaking user is entitled to rely on.

So: read it. The branch is unpushed so that reading happens first.

## What to check, paragraph by paragraph

Five changes, mirroring the English exactly. The English wording each one is based on is in the same section of `/privacy/` and `/terms/` on this branch.

### 1. `/fa/privacy/` section 5, first paragraph: one sentence appended

> دو مورد از این فریم‌ورک‌ها هنگام نمایش، تصویر هم می‌گیرند: کاور آهنگ در پخش‌کننده‌ی کوچک اپل موزیک، و نشان منبع WeatherKit که کنار پیش‌بینی آب‌وهوا نشان داده می‌شود. هر دو از سرورهای خود اپل می‌آیند.

**English it mirrors:** two of these frameworks load images as they display them, Apple Music artwork in the mini player and the WeatherKit attribution mark beside a forecast, both from Apple's own servers.

**Worth checking:** whether «نشان منبع» is the right term for an attribution mark, and whether «کاور آهنگ» reads better than a more literal rendering of artwork.

### 2. `/fa/privacy/` section 5: a new paragraph before the Nager.Date one

The substantial addition. It describes the symbol photograph pipeline in the order the requests happen: Wikidata for which image is recorded, Commons for the licence and credit, upload.wikimedia for the picture, iNaturalist by scientific name as fallback, and the S3 bucket for the resulting bytes. It closes on the privacy point, that every value sent is a fixed identifier or a species name compiled into the app, with nothing about the person attached.

**Worth checking:**

- «پروانه» for licence. It is the standard legal term, but «مجوز» is more common in software contexts and may read more naturally here.
- «نام گونه» for species name.
- The closing clause listing what is not sent, which mirrors the existing Wikipedia paragraph's construction deliberately, so the two read as a pair.
- The five host names are Latin script and must stay exactly as written. They are the substance of the disclosure.

### 3. `/fa/privacy/` section 5, Nager.Date paragraph: the false clause deleted

It used to open by calling Nager.Date the only service Hamdam contacts that Apple does not operate: «تنها سرویسی است که همدم با آن تماس می‌گیرد و متعلق به اپل نیست». That clause is gone, and the paragraph now opens directly on what the service does.

**Everything else in that paragraph is untouched** and remains accurate, including the country code detail and the once per calendar year refresh.

### 4. `/fa/privacy/` section 5: a new closing paragraph

The exhaustive list of non-Apple hosts, grouped by operator, ending with «هیچ میزبان دیگری وجود ندارد».

Then the distinction that keeps the list honest rather than merely long:

> پیوندی که تو روی آن ضربه می‌زنی و در مرورگرت باز می‌شود، مانند جست‌وجو در اپل موزیک یا اعتبار منبع زیر یک عکس، صفحه‌ای است که خودت انتخاب کرده‌ای ببینی، نه درخواستی که همدم می‌فرستد.

**Worth checking:** this sentence carries the most weight of anything added, because it is what separates the seven listed hosts from the other addresses that appear in the app as tappable links. If any sentence here should be re-authored rather than corrected, it is this one.

### 5. `/fa/terms/` section 12, second paragraph: rewritten

Shorter, as it already was. Same hosts, a statement that these are the non-Apple services and there are no others, and the existing deferral of detail to section 5 of the privacy policy.

## Register

Matched to the surrounding pages rather than chosen fresh: informal second person («دستگاه تو»), ezafe with ی, ZWNJ throughout, and «ریشه‌ها» in guillemets for the Roots section, all consistent with the existing text.

## Dates

All four pages, English and Farsi, now read 13 August 2026, with JSON-LD `dateModified` at `2026-08-13`. The Farsi dates moved **with** the Farsi text, not ahead of it, which is why they were held back in the first version of this branch.

## Verification already run

```
npm run build                 25 pages
npm test                      186 cases
npm run check:persian         passed
node scripts/check-dashes.mjs passed
```

And on the built output, for both `/fa/privacy/` and `/fa/terms/`: all five host strings present, the old false clause absent, no bidi control characters, no U+FFFD replacement characters.

None of that tells you the Persian is *right*. Only you can do that.
