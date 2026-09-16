# Audit: hamdam.com.au

Whole-site SEO audit and fix, all 26 pages, Wednesday 16 September 2026.
**Your next action: veto or keep the two title changes below.**
Two titles changed. Nothing committed, nothing pushed, nothing deployed.

---

## The one-line answer

Your site is in better shape than the first draft of this report said, and your
traffic problem is mostly not fixable with SEO mechanics.

90 days: **1134 impressions, 13 clicks, average position 17.7.** But the pages
that get seen are getting seen for questions Google answers itself, or for a
different website's name.

---

## Read this part first: I got three of six findings wrong

The first draft of this report listed six problems. Checking each against the
code before touching it, three did not survive. Recording them because a wrong
finding acted on is worse than no finding.

**Retracted: "poet pages have no Person schema."** They do. It is nested as
`WebPage.about` in `src/lib/schema.js`, with a stable `@id` per poet shared by
the English and Farsi pages and `sameAs` pointing at Ganjoor. My extractor only
read top-level `@graph` nodes, so it could not see it. The markup here is better
than the fix I was about to apply.

**Retracted: "the moments pages need H2 headings."** The absence is deliberate
and documented in `MomentArticle.astro`: each date line is already a whole
sentence in both languages, so no heading had to be invented. Adding H2s means
authoring Persian heading text, which this repo forbids. That is writing, not a
tag fix.

**Retracted: "/fa/privacy/ meta description is 190 characters, over the limit."**
The Farsi limit is 200, set deliberately in `metaDescription.test.js` because
Persian renders narrower per character. I applied the English limit to Farsi,
which is close to the byte-vs-character mistake that file exists to warn about.

Two more of my own errors, caught during the crawl: I reported 27 images missing
alt text (my regex missed the bare `alt` attribute; the real count is zero), and
an 8-character meta description on `/poets/rumi/` (my regex broke on the
apostrophe in "reed's"; the tag is complete).

**And two worse ones, caught only at the moment of pushing.**

My working copy of this repository was **49 commits behind `origin/main`**. Every
source file I read while writing the first draft was stale. The live crawl and
the Search Console pull were current, so the measurements held, but the code I
reasoned about was a week out of date. The retractions above were all
re-confirmed against the current tree after rebasing.

My headline number was wrong. I reported 517 impressions and 3 clicks, summed
from the `query` breakdown. That omits the queries Google withholds. The property
total is **1134 impressions and 13 clicks**. `docs/seo/traffic-log.md` states
this rule explicitly, in the entry for 2026-08-08, after the same mistake was
made and corrected once before:

> "Always take the headline number from a `dimensions: []` call, and treat the
> query breakdown as a subset."

I had not read that file when I wrote the number.

Seven false or wrong findings in total, all mine, none of them reaching the site.

---

## What was actually fixed

### [x] 1. `/fal-e-hafez/` title now contains the word people type

**Before:** `Fal-e Hafez: the Divan of Hafez, opened at random | Hamdam`
**After:** `Fal-e Hafez in English: the Divan, opened at random | Hamdam`

This is the best real opportunity on the site and the first draft under-ranked
it. Its measured queries are `fal-e hafez english` at position 8.3, `faal hafiz`
at 8.0, `faal e hafiz` at 10.8, `fale hafez english` at 41. The word driving the
traffic is "english" and the title did not contain it. 33 impressions, zero
clicks, all at page-one positions.

Those four named queries carry 33 impressions and zero clicks between them. The
page as a whole draws 142 impressions and 2 clicks at average position 12.4.

The intent matches your product exactly: somebody who wants to do a fal in
English. That is the one query on this site where the searcher wants the thing
you sell. "of Hafez" came out to make room, which costs nothing because Hafez is
already the second word.

### [x] 2. `/moments/chaharshanbe-suri/` title no longer truncates

**Before:** `Chaharshanbe Suri 2027: the last Tuesday night before Norooz | Hamdam` (69)
**After:** `Chaharshanbe Suri 2027: fire festival before Norooz | Hamdam` (60)

At 69 characters Google cut it mid-phrase and the searcher never saw "before
Norooz". The precise Tuesday-night definition is unchanged in the page body and
in the meta description, which carries the computed date.

**This is the one to veto if you disagree with me.** It trades precision for fit
and for search language.

Both verified at 60 characters in `dist/`, not assumed. 248 tests pass,
`check:persian` passes, `check-dashes` passes.

---

## What I could not fix, and why

### 3. Yalda ranks well and cannot be clicked

`/moments/yalda/` drew **255 impressions at position 6 and zero clicks.**

Its queries are `yalda 2026` (87), `when is yalda 2026` (27), `yalda night 2026`
(16), `yalda 2026 date` (13). Every one is a date lookup. Google answers those in
the results panel and nobody needs to click.

You already made the obvious fix. On 2026-09-05 you put the computed date into
the title and the meta description, with a comment in `moments/[moment].astro`
explaining exactly this reasoning. It shipped, and it produced zero clicks. That
is good evidence the ceiling here is the SERP, not the snippet. *Inference from
the query shapes, not a measured fact.*

The page is still worth finishing before December for the reasons your own
`HANDOFF-2026-09-03-seo.md` gives. Just do not expect clicks to be the payoff.

### 4. The poet pages rank for somebody else's brand

`/poets/hafez/` pulled 201 impressions at average position 34. Broken down:
`hafez` at position 55.5, and `ganjoor hafez` at position 6.7.

"Ganjoor" is ganjoor.net, the Persian poetry archive. A person typing `ganjoor
hafez` is navigating to that site to read the poem. You can hold position 6
forever and never earn that click. The bare term `hafez` at position 55 is page
six against Wikipedia and Poetry Foundation.

No title fixes either of these. This is a content strategy decision, not a
mechanical one, and I am not going to pretend otherwise.

### 5. Half the site is thin, and it is yours to fix

Nine of thirteen Farsi pages are under 150 words. The Farsi poet pages run 81 to
136 words against 440 to 520 for their English twins. Farsi titles run 11 to 13
characters: `سعدی | همدم` is a whole title.

This is not neglect. `poetPages.ts` and `MomentArticle.astro` both document the
choice: rather than ship machine-written Persian, the Farsi pages omit the body.
That is the honest call and it has a real SEO cost, and both things are true.

Your `CLAUDE.md` says never author, translate or hand-edit Persian. I wrote none.
The fields that are short, if you want to work them: `descriptionFa` in
`poets.ts` for all five poets, and the Farsi titles built in
`src/pages/fa/poets/[poet].astro`.

---

## What is already right

- **Alt text correct.** 11 real, 30 deliberate empty, zero missing.
- **Person schema present** on every poet page, with shared cross-locale `@id`.
- **Canonicals on every page, and Google agrees with all of them.**
- **hreflang on every page.**
- **All 26 pages indexed.** Verified by live URL inspection.
- **AI crawlers are not blocked.** GPTBot, ChatGPT-User, ClaudeBot,
  PerplexityBot and Googlebot all return 200. Your `robots.txt` warns Cloudflare
  might be blocking them at the edge. It is not. **That warning is stale and
  worth deleting.**
- **`llms.txt` is genuinely excellent.**
- **HTTP to HTTPS on a 301.** Sitemap submitted, downloaded, zero errors.

I also flagged the **307** on trailing-slash redirects as a minor item. Withdrawn:
`docs/seo/traffic-log.md` already reasoned about it on 2026-08-08 and concluded
there is nothing to fix, because every variant declares the same canonical. That
was another thing I would have known had I read the repository first.

---

## What this audit did NOT measure

- **Semrush, and therefore backlinks and keyword difficulty: not measured.** No
  account connected. That is 4 of 13 layers with nothing to grade, and it is why
  I cannot tell you which keywords are realistically winnable.
- **Competitor benchmark: not measured.** Needs Semrush or a live SERP pass.
- **Local and Google Business Profile: not applicable.** Worldwide App Store
  product, no location or service area.
- **Doorway pages: not applicable.** No templated city pages.

**Layers measured in full: 8 of 13. All 26 pages graded, none sampled.**

---

## The honest score

I am not restating the 62 and 48 from the first draft. Those were computed partly
from findings that turned out to be false, and a number built on retracted
evidence is worse than no number.

What I can say without inventing anything: **of the genuine on-page defects this
audit found, two existed and both are fixed.** The rest of the site's on-page
layer was already correct. Your traffic problem is a demand and positioning
problem, not a technical one, and no fix loop reaches it.

---

## State of the working tree

Two files changed, uncommitted:

- `src/data/momentContent.ts`
- `src/pages/fal-e-hafez.astro`

No commit, no push, no deploy. Pushing `main` deploys this site, so that is
yours to trigger.
