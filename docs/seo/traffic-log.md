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
