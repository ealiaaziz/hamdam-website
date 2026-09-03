# Traffic log

A running record of what Search Console actually reports, one reading a month.

It exists because the site spent a day being optimised against estimates. The
forecast in `2026-08-07-measurement.md` is a set of scenarios, and scenarios are
worth nothing unless something checks them against the meter. This is the meter.

`.github/workflows/seo-log.yml` runs `scripts/gsc-pull.mjs` and commits the
result. It is built and tested but **paused on 2026-08-19, having never run**:
its monthly schedule is commented out and `GSC_SERVICE_ACCOUNT_KEY` was never
set, so it only runs on demand from the Actions tab.

Paused on instruction, and the schedule was commented out rather than left live
because a monthly job with no credential does nothing every month except email
a failure. Both readings below were taken by hand instead, which is why the
cadence in the table is irregular.

The original argument for pausing was that nothing was moving, so a monthly
cadence would only report the same nothing. **The 2026-08-16 reading weakened
that argument** and it should be read before anyone decides to leave this off:
pages drawing impressions went from 4 to 11, named queries from 1 to 16, and
the site took its first two clicks. Something is now moving fast enough that a
regular cadence has a case it did not have on 2026-08-08. Re-enabling is two
uncommented lines and one secret; the workflow header says how.

The by-hand procedure at the bottom of this file needs no credential and is how
both existing readings were taken.

## Readings

The two HTML comments below are insertion points for `scripts/gsc-pull.mjs`.
Moving or deleting either one breaks the monthly job, which looks for them by
exact text. New rows and new notes go immediately above their marker, so the
newest reading is always the last one in each section.

| Taken | Window | Impressions | Clicks | Avg position | Named queries | Pages with impressions |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-08 | all data to date (2026-07-03 to 2026-08-05) | 25 | 0 | 15.1 | 1 | 4 |
| 2026-08-16 | since the last reading (2026-08-06 to 2026-08-13) | 70 | 2 | 36.8 | 16 | 11 |
| 2026-08-20 | since the last reading (2026-08-16 to 2026-08-18, final) | 42 | 1 | 46.7 | 6 | 11 |
| 2026-09-03 | since the last reading (2026-08-19 to 2026-09-01, final) | 272 | 3 | 27.2 | 33 | 13 |
<!-- readings:row -->

Trailing 28 days at the first reading (2026-07-09 to 2026-08-05): 23
impressions, 0 clicks, average position 16.0.

### 2026-08-08, the first reading

This is the baseline every later row is compared against, so it is written out
in full.

**Queries.** One query is named: `hamdam`, 13 impressions, average position
22.5. The other 12 impressions belong to queries Google withholds, which it does
for terms issued by very few people. So the site is being shown for a handful of
things nobody can see, and for its own name, badly.

**Pages.** Four URLs have ever drawn an impression:

| URL | Impressions | Avg position |
| --- | --- | --- |
| `https://hamdam.com.au/` | 10 | 23.3 |
| `http://hamdam.com.au/` | 6 | 2.2 |
| `https://hamdam.com.au/fa/terms/` | 5 | 21.0 |
| `https://hamdam.com.au/fa/terms` | 2 | 9.0 |

The http and unslashed forms are historical. Production returns 307 to the
canonical https slashed form and every variant declares the same canonical, so
there is nothing to fix; it is noise in the report, not a duplicate content
problem.

**Countries.** Australia 10, United States 4, Iran 3, then one each from the
United Kingdom, Germany, Canada, Ireland, Thailand and the United Arab Emirates.
Diaspora shaped already, on 25 impressions, which is the right shape and the
wrong magnitude.

**Two corrections this reading forced, both worth keeping in mind when reading
any later row.**

1. **Read totals with no dimension.** An earlier note recorded "13 impressions"
   as the site total. That was the total of the `query` breakdown, which omits
   the withheld queries, and it understated the real figure by roughly half. The
   property total is 25. Always take the headline number from a
   `dimensions: []` call, and treat the query breakdown as a subset.
2. **There is no 90 day history.** The property records nothing before
   2026-07-03. Every figure above covers about five weeks, not a quarter, and
   month-on-month comparisons only become meaningful from the second reading.

**Zero clicks.** Not a rounding artefact. No one has ever arrived at this site
from Google search.

### 2026-08-16, an off-schedule reading

Taken by hand, out of cycle, to put a boundary immediately before the canonical
App Store link and the claim corrections went live. **Everything in this row
predates that deploy** -- it shipped on 2026-08-16 and Search Console data was
final only to 2026-08-13 -- so this measures the content cluster, not the SEO
work, and the next reading is the first that can say anything about the latter.
The window is 8 days against the first reading's 34, so compare rates, not
totals.

**The site is not failing to be indexed. It is failing to rank.** That is a
different problem with different fixes, and this reading is the first evidence
for which one we have. 11 pages drew impressions, against 4; 16 queries are
named, against 1. Google is crawling, indexing and showing these pages. It is
showing them at an average position of 36.8.

**Impressions are up roughly twelvefold by rate.** 70 in 8 days is 8.8/day,
against 25 in 34 days, or 0.74/day. Cumulative to 2026-08-13 is 95 impressions,
2 clicks, average position 31.1.

**The first clicks the site has ever had.** Two, both United Kingdom, both
mobile, both at position 5, one on the homepage (position 1.25) and one on
`/poets/khayyam/` (6.8). At that position and CTR they are almost certainly
brand searches by someone who already knew the name. Two clicks is not a trend.
It is the zero ending, which is worth recording once and not over-reading.

**Average position got worse, 15.1 to 36.8, and that is the good outcome.** The
first reading's 15.1 was an impression-weighted average over essentially one
query, `hamdam`, the site's own name. The site now surfaces for sixteen, most
of them deep. Ranking 36.8 across sixteen real queries beats 15.1 across your
own brand name. Do not read this row as a regression.

**Pages, and what is drawing.** The poet cluster is the whole story:

| URL | Impressions | Avg position |
| --- | --- | --- |
| `/poets/hafez/` | 22 | 59.0 |
| `/fal-e-hafez/` | 14 | 27.1 |
| `/fa/privacy/` | 7 | 7.6 |
| `/poets/rumi/` | 7 | 49.6 |
| `/poets/khayyam/` | 5 | 6.8 (1 click) |
| `/` | 4 | 1.25 (1 click) |
| `/poets/saadi/` | 4 | 30.8 |
| `/fa/poets/khayyam/`, `/fa/poets/saadi/`, `/poets/parvin-etesami/` | 2 each | 70.5 / 63.0 / 30.5 |
| `/moments/yalda/` | 1 | 4.0 |

`/fa/terms/`, which was two of the four pages in the first reading, has dropped
out entirely. Legal pages surfacing was always an artefact of having nothing
else indexed.

**Queries worth naming.** `hafez` at 10 impressions, position 57.8, is the
biggest single term and the furthest from useful. The `ganjoor` queries are the
interesting ones: `ganjoor rumi` at position 8, `ganjoor khayyam` at 5,
`ganjoor saadi` at 7. We credit Ganjoor on every page and are being surfaced
next to it, near the top, on the one branded term in the space we are honestly
associated with. `fal e hafez english`, 2 impressions at 38, is the
highest-intent term here and is nowhere near where the fal page should sit.
One Farsi brand query appeared, `اپ همدم برای ایفون`, at position 10.

**Countries.** Iran 7 (mobile, position 8.3), Australia 7, United States 6,
Austria 6, Canada 5, Pakistan 6, United Kingdom 4, then a long tail. Still
diaspora shaped, and now with Iran itself at the top on mobile.

**What this says about the App Store indexing brief.** The premise was that the
listing is not being indexed and the site could help. This reading says the site
has almost no ranking authority to lend: two clicks, ever, and an average
position in the thirties. The canonical link closed a real gap and cost little,
but nobody should expect it to move the listing on its own. Next reading is the
one that tests it.

### 2026-08-20, the first reading that could show the SEO work

The reading the 2026-08-16 entry said would be the test. **It does not show an
effect, and the honest summary is that nothing detectable has changed.**

**Coverage.** Final data reaches 2026-08-18. The API returned
`firstIncompleteDate: 2026-08-19`, so the 19th is provisional and the 20th has
nothing at all. The row above is the three final days only. Including the
provisional 19th, the same window is 52 impressions, 1 click, average position
47.3. Do not quote that second set as settled.

**Daily.** 16th 13 impressions at 53.8, 17th 11 at 46.5 with the one click,
18th 18 at 41.7, and provisionally 19th 10 at 49.9.

**The rate did not move.** That is the finding. 42 impressions over three final
days is 14.0/day, against 13.3/day across 9 to 15 August. Within noise on these
numbers. The section headings went live on 16 August at about 13:00 UTC and the
hero screenshot on the 17th, so there are two full final days after the change,
and they look like the two before it. Average position went from 36.8 to 46.7,
which is the wrong direction, though see below on why that number is weak.

This is not yet evidence the changes failed. Headings do not create pages, they
modify pages already indexed, so the mechanism is re-crawl and re-evaluation
rather than first discovery. That is slower and quieter than the two-day
publish-to-surface lag the poet cluster showed on 7 to 9 August, and it is the
wrong benchmark to hold this against. What can be said is that after two days
there is no signal, and that the next reading needs a longer window to say
anything at all.

**Cumulative to 2026-08-18: 160 impressions, 3 clicks, average position 37.5.**

**`/fal-e-hafez/`, and why it is still not a win.** It sits at position 9,
against 27.1 in the previous reading. That looks like the result the headings
were for, and it should not be read that way yet, for a reason worth writing
down: **its impressions fell while its position improved**, 14 down to 4 (5 with
the provisional day). A page that ranks better on far fewer impressions is not
obviously winning. It may be matching a narrower and better-targeted set of
queries, or the earlier 14 may have been deep-position matches that have simply
gone. Four impressions cannot separate those. Position 9 has now held across two
consecutive windows, which is more than noise usually manages, so this is the
one thing here worth watching -- but the test is whether impressions recover to
the earlier volume while the position holds, and that has not happened.

**Pages.** `/poets/hafez/` is now the whole story: 14 impressions, position
59.5, more than a third of the window. Deep, and on the least winnable term.

| URL | Impressions | Avg position |
| --- | --- | --- |
| `/poets/hafez/` | 14 | 59.5 |
| `/poets/rumi/` | 7 | 60.0 |
| `/fal-e-hafez/` | 4 | 9.0 |
| `/privacy/` | 4 | 5.0 |
| `/fa/privacy/` | 3 | 8.3 (the one click) |
| `/poets/khayyam/` | 3 | 61.3 |
| `/` | 2 | 48.0 |
| `/poets/parvin-etesami/` | 2 | 53.0 |
| `/poets/saadi/` | 1 | 99.0 |
| `/moments/yalda/` | 1 | 6.0 |
| `/fa/` | 1 | 136.0 |

**Two things in that table need naming.**

First, **the legal pages are back**, and the previous entry's explanation for
them no longer holds. `/privacy/` at position 5 and `/fa/privacy/` at 8.3 are
the two best-ranking pages on the site, and the only click in this window came
from one of them. The 2026-08-16 note called legal pages surfacing "an artefact
of having nothing else indexed". Eleven pages are indexed now and the legal
pages rank better than any of them, so that explanation was wrong, or at least
incomplete. Worth understanding rather than dismissing twice.

Second, **`/fa/` appeared at position 136.** The Farsi homepage, on roughly page
fourteen of results. One impression, so it is not a measurement of anything, but
it is the first time the Farsi homepage has surfaced at all and 136 is a strange
place to do it.

**Queries.** Six are named, against sixteen last time, but the two are not
comparable: this window is three days against eight, and only 10 of the 42
impressions belong to named queries at all. The rest are withheld, which is the
trap the 2026-08-08 entry recorded. `hafez` is still the biggest single term at
5 impressions, position 63.8. New this window: `hafiz ghazal` at 57 and
`hafez famous poems` at 77, both the same deep long-tail as before.

`ganjoor rumi` at 6 and `ganjoor khayyam` at 10 are steady across every window
now, and still at zero clicks lifetime. That combination is the signature of
navigational intent: someone typing `ganjoor rumi` has named the site they want,
and it is not this one. Steady is the expected behaviour, not a promising one.
Recorded so nobody reads these positions as an opening.

**Average position, again.** 36.8 to 46.7 reads as a regression and mostly is
not one, for the same reason the last entry gave: the site keeps surfacing for
more and harder queries, and each deep one drags an impression-weighted mean
down. `/poets/saadi/` at 99 and `/fa/` at 136 alone account for much of the
move. The number to watch is not the mean but whether any page holds a
single-digit position on a query with real intent behind it.

**Countries.** Iran 4 (3 mobile, carrying the click, and 1 tablet), United
States 6, Vietnam 4, Austria 4, Australia 3, Mexico 3, then a long tail through
India, Turkey, Morocco, Algeria and others. Vietnam and Mexico are new and do
not fit the diaspora shape the first two readings had. On 42 impressions that is
as likely to be scraping or incidental as it is to be anything, and it is noted
rather than interpreted.

**What this reading cannot see, stated plainly.** Search Console covers
`hamdam.com.au` and nothing else. The iOS app 1.2 was released on 2026-08-17 at
10:03 UTC, and this reading says nothing whatsoever about it: not downloads, not
App Store impressions, not product page views, not conversion. Those live in App
Store Connect, which is not reachable from this repository. Any question of the
form "how are we doing since 1.2" cannot be answered from this file.

**A method correction that cost something.** On 2026-08-17 the Composio
`time_info` field reported the date as two days earlier than it was, and a
session took it at face value. That produced a report describing two-day-old
figures as "today, incomplete" and a release from two days earlier as "1.7 hours
ago". The date in this heading was verified against `date -u`, Apple's HTTP
`date:` header and Cloudflare's, all three agreeing on 2026-08-20 before
anything was written. Verify the date from the system clock, never from a tool's
own report of it.

**App Store localisations went from 2 to 10 on 2026-08-21, on the 1.3 draft.**
This is an App Store change, not a website one, so it will not show in any row
of this table. It is recorded here because it is the largest single marketing
intervention since launch and the next reading needs to know it happened: the
binding constraint was never conversion, it was that 2,325 App Store
impressions is a small number, and eight new storefronts each carry their own
100 character keyword field. Territories already sending unlocalised
impressions were DE, AE, GB, TR and NL. Added: en-GB, en-CA, de-DE, nl-NL,
fr-FR, sv, tr, ar-SA. Visible copy is the English copy verbatim in every one;
only the keyword fields differ, and no Persian or other language was authored.
Apple has no Farsi metadata locale, so a Persian listing is not available at
any effort. Effect is measurable only once 1.3 ships and only in App Store
analytics by territory, not in Search Console.

Two Apple behaviours worth not rediscovering, both in
`hamdam-analytics/scripts/add_localisations.py`. Creating an
`appInfoLocalization` makes Apple auto-create an empty matching
`appStoreVersionLocalization`, so a create-only script 409s against a row it
just caused and leaves the locale attached with no description: worse than
absent, because an empty localisation fails review. And Apple's metadata
locale codes are not BCP 47, so `de-DE` and `fr-FR` are right while `sv-SE`
and `tr-TR` are rejected in favour of bare `sv` and `tr`. Nothing lists the
valid set; the only way to learn one is to try it and read the error.

### 2026-09-03, the reading where something finally moved

Taken by hand, fourteen days after the last one, against a matched fourteen day
window so the comparison is like for like.

| | 2026-08-05 to 08-18 | 2026-08-19 to 09-01 |
| --- | --- | --- |
| Impressions | 135 | **272** |
| Clicks | 3 | 3 |
| CTR | 2.2% | 1.1% |
| Average position | 41.6 | **27.2** |
| Named queries | 26 | 33 |

**Impressions doubled and average position improved by fourteen places at the
same time.** Every previous entry in this file has had to explain why a falling
average position was not a regression. This one does not: the site is surfacing
for more queries *and* ranking better on them, which is the first time those two
have moved together.

**Clicks did not move.** Three, both windows, so CTR halved. Volume grew and
conversion did not. Nobody should read the doubling as traffic; it is
eligibility for traffic.

**The position trend is steep at the end of the window.**

| Date | Impressions | Avg position |
| --- | --- | --- |
| 2026-08-25 | 23 | 19.0 |
| 2026-08-29 | 27 | 32.3 |
| 2026-08-30 | 22 | 27.5 |
| 2026-08-31 | 22 | 10.5 |
| 2026-09-01 | 26 | 7.5 |

An average position of 7.5 across a whole day is a different kind of number from
anything in this file. It was checked rather than assumed: querying 31 August to
1 September by page gives `/poets/saadi/` 9 impressions at 4.4,
`/poets/rumi/` 12 at 5.7, `/fa/poets/saadi/` 6 at 5.0,
`/poets/parvin-etesami/` 4 at 7.3, `/fal-e-hafez/` 7 at 9.6 and
`/moments/yalda/` 1 at 2.0. It is several pages moving, not one lucky
impression dragging a mean.

**A correction to the 2026-08-20 entry, which got the ganjoor queries wrong.**
That entry recorded them as "steady across every window now, and still at zero
clicks lifetime", read that as navigational intent, and said in terms: "Steady
is the expected behaviour, not a promising one. Recorded so nobody reads these
positions as an opening." Both halves have since failed.

| Query | 08-05 to 08-18 | 08-19 to 09-01 |
| --- | --- | --- |
| `ganjoor rumi` | 4 impressions, pos 7.25 | 19 impressions, pos 6.0 |
| `ganjoor saadi` | 1 impression, pos 7.0 | 8 impressions, pos 4.25 |
| `ganjoor khayyam` | 2 impressions, pos 7.5 | 3 impressions, pos 5.0, **1 click** |

Not steady, and not zero clicks. The cluster is the single biggest contributor
to the doubling, and it produced the first click this site has ever taken on a
query that is not its own name. The caution the old entry was reaching for is
still worth keeping in a narrower form: this is a low volume niche, thirty
impressions in a fortnight, and owning it does not imply anything about the
terms that carry real volume.

**Which is the other half of the reading. The head terms are still nowhere.**
`hafez` drew 15 impressions at position 52. `saadi poems` 54, `saadi poetry` 57,
`the poems of hafez` 64, `rumi the great wagon` 79. That is where the searches
are and the site is not competitive for any of them. The doubling came from a
narrow branded cluster the site happens to own, plus the Farsi and moments
pages. Read as market share, nothing has changed.

**Pages with impressions, 13.**

| URL | Impressions | Avg position |
| --- | --- | --- |
| `/poets/rumi/` | 54 | 40.1 |
| `/poets/saadi/` | 52 | 22.3 |
| `/poets/hafez/` | 50 | 43.4 |
| `/fal-e-hafez/` | 31 | 16.7 |
| `/poets/parvin-etesami/` | 21 | 20.8 |
| `/poets/khayyam/` | 19 | 30.6 (1 click) |
| `/moments/yalda/` | 14 | 5.9 |
| `/` | 12 | 3.0 (1 click) |
| `/fa/` | 6 | 12.7 |
| `/fa/poets/saadi/` | 6 | 5.0 |
| `/fa/privacy/` | 5 | 10.0 (1 click) |
| `/moments/norooz/` | 1 | 4.0 |
| `/terms/` | 1 | 87.0 |

**`/moments/yalda/` is the finding with a deadline.** 14 impressions at position
5.9, and the query `yalda 2026` at position 5, in early September. Yalda is 21
December. The page is already ranking before the season it exists for has
started, which is the strongest position any content on this site holds. It
bears directly on the featuring nomination built around Yalda and on any Yalda
in-app event: the search demand is real and the page is already there for it.
`/moments/norooz/` at position 4 on one impression says the same shape may hold
for Nowruz in March.

**The legal pages have stopped dominating.** `/fa/privacy/` is 5 impressions and
`/terms/` is 1, against `/privacy/` and `/fa/privacy/` being the two best
ranking pages on the site in the previous reading. The poet cluster has
displaced them, which is the outcome the 2026-08-16 entry predicted and the
2026-08-20 entry could not yet see.

**Countries, 30 of them.** India 31, Australia 25, United Kingdom 20, Canada 17,
Iran 11, Austria 10. The three clicks came from Canada, Indonesia and Iran. The
diaspora shape holds; India at the top is new and is probably the `ganjoor` and
poetry long tail rather than anything about the product.

**What this reading still cannot see.** Same limit as every previous entry:
Search Console covers `hamdam.com.au` and says nothing about the App Store. The
window contains 1.3 on 27 August, 1.3.1 on 30 August, the Garden in-app event
going live on 31 August and 1.3.2 on 1 September, and none of that is visible
here. App Store first time downloads over the same fortnight were flat at zero
to three a day, so the two surfaces are telling different stories and neither
one answers for the other.

**The cadence argument is now settled, and the job is still paused.** This
reading found two weeks of the most movement the site has ever had, sitting
unrecorded because the last row was 2026-08-20 and
`.github/workflows/seo-log.yml` still has its schedule commented out and
`GSC_SERVICE_ACCOUNT_KEY` unset. The 2026-08-16 entry started this argument and
the log header repeats it. Impressions doubling and average position halving is
exactly what a monthly cadence exists to catch, and it was caught only because
somebody asked.

<!-- readings:notes -->

## What to watch, in priority order

The scenarios in `2026-08-07-measurement.md` turn on one variable, so the log is
read for that variable first. Figures below are the 2026-08-08 baseline and are
not updated as rows are added; compare against the newest row, not against these.

1. **Pages with impressions.** 4 at baseline, against 24 URLs in the sitemap.
   This is the leading indicator: Google showing a page at all means it crawled
   and indexed it. If the content published on 2026-08-07 works, this number
   climbs before anything else does.
2. **Named queries.** 1 at baseline. Growth here means the site is being shown
   for things other than its own name, which is the difference between a brand
   presence and search traffic.
3. **Clicks.** 0 at baseline. The only number that is actually visitors.
4. **Average position.** 15.1 at baseline, and the least trustworthy figure in
   the table: it is impression weighted across a tiny sample, so it swings on
   single impressions and should never be read as progress on its own.

Do not read impressions alone as success. Impressions rise when Google indexes
more pages regardless of whether anyone ever clicks, and at this volume a single
curious person moves the number by 10 percent.

## Credentials

The monthly job authenticates as a Google service account, not as a person, so
it keeps working when nobody is logged in anywhere. One repository secret,
`GSC_SERVICE_ACCOUNT_KEY`, holds the whole JSON key file.

Setting it up, once:

1. In the Google Cloud console, create a project (or reuse one) and enable the
   **Google Search Console API**.
2. Create a **service account**. It needs no IAM roles at all: its access comes
   from Search Console, not from Google Cloud.
3. Create a **JSON key** for that service account and download it.
4. In Search Console, open **Settings**, then **Users and permissions**, and add
   the service account's email address (it ends `.iam.gserviceaccount.com`) with
   **Full** permission. Full rather than Restricted, because the URL Inspection
   API refuses Restricted users.
5. In GitHub, **Settings**, **Secrets and variables**, **Actions**, add a new
   repository secret named `GSC_SERVICE_ACCOUNT_KEY` whose value is the entire
   contents of the JSON file, pasted unmodified.
6. Run the workflow once by hand to confirm: **Actions**, **SEO log**, **Run
   workflow**. Leave both date fields blank to read last calendar month.

The key is a credential and belongs nowhere except that secret. It is not in
this repository and must not be committed. If it leaks, delete the key in the
Google Cloud console; the service account survives and a new key can be issued.

Until the secret exists the workflow fails on its first step with a message
saying so, which is deliberate: a monthly job that quietly does nothing is worse
than one that complains.

## Taking a reading by hand

For backfills, or if the credential lapses. Search Console data lags two to
three days, so a reading on the 3rd covers the month before it cleanly. Use
`data_state: "final"`.

The easy path is `node scripts/gsc-pull.mjs` with `GSC_SERVICE_ACCOUNT_KEY` set
in the environment, and optionally `GSC_START` and `GSC_END` to override the
window. That does everything the workflow does except the commit.

Without the key, the property is also reachable through the Composio connection,
toolkit `google_search_console`, authorised at `siteOwner`. Four calls to
`GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY`, all on the same window:

| Call | `dimensions` | Gives |
| --- | --- | --- |
| 1 | `[]` | the headline row: impressions, clicks, CTR, position |
| 2 | `["query"]` | which terms, and how much is withheld |
| 3 | `["page"]` | which pages have surfaced at all |
| 4 | `["country", "device"]` | where the audience is |

Then append a row to the table above, and write a short paragraph on anything
that moved. A reading with no commentary is close to useless in six months.

Coverage is a separate question from impressions: a page can be indexed and
never shown. `GOOGLE_SEARCH_CONSOLE_INSPECT_URL` answers it per URL, and is
quota limited, so spend it on the same fixed sample the script uses rather than
the whole sitemap: `/`, `/fa/`, `/poets/hafez/`, `/fal-e-hafez/`,
`/moments/yalda/`. A fixed sample compared month to month is worth more than a
sweep whose shape changes every time.

Ignore the `indexed` counter on the sitemap record. Google no longer populates
it meaningfully, and it read `0` on 2026-08-08 while the homepage was demonstrably
indexed.
