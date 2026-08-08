# Traffic log

A running record of what Search Console actually reports, one reading a month.

It exists because the site spent a day being optimised against estimates. The
forecast in `2026-08-07-measurement.md` is a set of scenarios, and scenarios are
worth nothing unless something checks them against the meter. This is the meter.

Readings are taken by the "Monthly Search Console pull" Routine on the 3rd of
each month, or by hand using the procedure at the bottom of this file.

## Readings

| Taken | Window | Impressions | Clicks | Avg position | Named queries | Pages with impressions |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-08-08 | all data to date (2026-07-03 to 2026-08-05) | 25 | 0 | 15.1 | 1 | 4 |

Trailing 28 days at the same reading (2026-07-09 to 2026-08-05): 23 impressions,
0 clicks, average position 16.0.

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

## What to watch, in priority order

The scenarios in `2026-08-07-measurement.md` turn on one variable, so the log is
read for that variable first.

1. **Pages with impressions.** Currently 4, against 24 URLs in the sitemap. This
   is the leading indicator: Google showing a page at all means it crawled and
   indexed it. If the content published on 2026-08-07 works, this number climbs
   before anything else does.
2. **Named queries.** Currently 1. Growth here means the site is being shown for
   things other than its own name, which is the difference between a brand
   presence and search traffic.
3. **Clicks.** Currently 0. The only number that is actually visitors.
4. **Average position.** Currently 15.1, and the least trustworthy figure in the
   table: it is impression weighted across a tiny sample, so it swings on single
   impressions and should never be read as progress on its own.

Do not read impressions alone as success. Impressions rise when Google indexes
more pages regardless of whether anyone ever clicks, and at this volume a single
curious person moves the number by 10 percent.

## Taking a reading by hand

Search Console data lags two to three days, so a reading on the 3rd covers the
month before it cleanly. Use `data_state: "final"`.

Property: `sc-domain:hamdam.com.au`. Reached through the Composio connection,
toolkit `google_search_console`, which is authorised at `siteOwner`.

Four calls to `GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY`, all on the same
window, which is the previous calendar month:

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
quota limited, so spend it on a fixed sample rather than the whole sitemap:
`/`, `/fa/`, `/poets/hafez/`, `/fal-e-hafez/`, `/moments/yalda/`.

Ignore the `indexed` counter on the sitemap record. Google no longer populates
it meaningfully, and it read `0` on 2026-08-08 while the homepage was demonstrably
indexed.
