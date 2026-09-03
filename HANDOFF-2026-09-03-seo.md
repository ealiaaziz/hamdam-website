# Handoff, 2026-09-03: act on the Search Console reading

For whoever picks up the website SEO work next. Everything here comes from one
Search Console reading taken 2026-09-03 and written into
`docs/seo/traffic-log.md`. **Read that entry first**; this file says what to do
about it, not what it says.

Nothing in here is started. No code has been written for any of it.

---

## Read these first, in this order

1. `CLAUDE.md` for process, `FACTS.md` for claims. If they disagree, `FACTS.md`
   wins on claims and `CLAUDE.md` wins on process.
2. `docs/seo/traffic-log.md`, the 2026-09-03 entry.
3. `HANDOFF-2026-08-21.md` for the five rules that cost the most when broken.

Four constraints that apply to every item below:

- **Never author, translate or hand-edit Persian.** `npm run check:persian`
  validates the Unicode range, not the grammar, so it passes wrong Persian
  happily. Farsi copy is Ealia's.
- **Pushing `main` deploys the site. Pushing any other branch does not.**
  Verify a deploy by fetching the live CSS hash, do not assume it.
- **`npm test`, `npm run check:persian` and `node scripts/check-dashes.mjs`
  must pass.** No em dashes or en dashes anywhere.
- **CSP is enforcing.** No inline styles or scripts.

---

## The one item with a deadline

### 1. `/moments/yalda/` is ranking months early, and Yalda is 21 December

The page draws 14 impressions at **average position 5.9**, and the query
`yalda 2026` sits at **position 5**, measured in early September. That is the
strongest position anything on this site holds, and it is holding it out of
season, before the searches that matter have started.

`/moments/norooz/` showed position 4 on a single impression, so the same shape
probably holds for Nowruz in March. Too little data to act on yet; worth
re-reading at the next reading.

**What to do.** Treat the Yalda page as the site's most valuable asset between
now and December and get it finished before the season, not during it. Concrete
work, in order:

- Read the page as a stranger arriving from `yalda 2026` in December. Does it
  answer what Yalda is, when it falls this year, and why this app belongs to
  that night? The verses on it should be the Yalda verses the app actually
  serves, sourced the same way as everything else.
- The title and meta description are the whole of what a searcher sees at
  position 5. They are the highest-leverage two lines on the site right now.
- Check internal linking into it. It is currently reachable from the moments
  index; from the homepage during the season would be better.

**This connects to two things outside the website.** The featuring nomination
draft in `marketing/featuring-nomination.md` is built around Yalda, and the
App Store in-app event slot is free after the Garden event ends. The search
data is independent evidence that the Yalda angle is the right one: the demand
is real and measurable now.

---

## The structural finding

### 2. The site wins `ganjoor <poet>` and loses every head term

What works, over 2026-08-19 to 09-01:

| Query | Impressions | Position |
| --- | --- | --- |
| `ganjoor rumi` | 19 | 6.0 |
| `ganjoor saadi` | 8 | 4.25 |
| `ganjoor khayyam` | 3 | 5.0, and the click |

What does not:

| Query | Impressions | Position |
| --- | --- | --- |
| `hafez` | 15 | 52.5 |
| `saadi poems` | 2 | 54 |
| `saadi poetry` | 2 | 57 |
| `the poems of hafez` | 1 | 64 |

The poet pages are being found by people who already know Ganjoor and are
looking for a source, and they are page one for that. They are invisible for
the terms that carry volume. The doubling in this reading is entirely the first
group.

**Note the correction in the log.** The 2026-08-20 entry called these queries
navigational, steady, and explicitly "not an opening". It was wrong on all
three counts. Do not re-derive that conclusion; read the 2026-09-03 entry.

**What to do.** Two options, and they are genuinely different bets:

- **Lean into what works.** The ganjoor cluster is small (about 30 impressions
  a fortnight) but the site owns it. `/poets/khayyam/` is the laggard at
  position 30.6 while its siblings sit at 4 to 6, and only `/fa/poets/saadi/`
  surfaces from the Farsi poet pages. Closing those two gaps is cheap and
  compounds an existing win.
- **Attack the head terms.** `/poets/hafez/` draws the most impressions on the
  site (50) at nearly the worst position (43.4). That is the largest single
  gap in the data. It is also the most competitive term in the space and the
  site has almost no authority, so this is a long bet, not a fix.

Recommendation: do the first, and do not start the second without a plan that
explains why this site would outrank established Hafez resources. Record the
choice in `docs/seo/` either way.

---

### 3. Impressions doubled and clicks did not move

272 impressions, 3 clicks, 1.1% CTR, against 2.2% the fortnight before. The
site became eligible for twice as much traffic and converted none of the
increase.

Pages that already rank well and still take almost nothing:

| URL | Impressions | Position | Clicks |
| --- | --- | --- | --- |
| `/` | 12 | 3.0 | 1 |
| `/fa/poets/saadi/` | 6 | 5.0 | 0 |
| `/moments/yalda/` | 14 | 5.9 | 0 |
| `/fa/privacy/` | 5 | 10.0 | 1 |

A page at position 3 to 6 taking zero clicks is a titles and descriptions
problem, not a ranking problem. **This is the cheapest work in this file**: no
new content, no new pages, just the two lines a searcher actually reads.

Do not guess at what is currently rendered. Read the actual `<title>` and
`<meta name="description">` for each page above from the built output, then
decide. Any new copy goes through `marketing/claim-audit/audit_lint.py` before
it is committed, and `FACTS.md` is the authority on what may be claimed.

---

### 4. Re-enable the monthly reading (needs Ealia, not code)

`.github/workflows/seo-log.yml` has had its schedule commented out since
2026-08-19 and `GSC_SERVICE_ACCOUNT_KEY` has never been set, so
`scripts/gsc-pull.mjs` has never run. Both readings in the log before this one,
and this one, were taken by hand.

This reading is the argument. Two weeks of the largest movement the site has
ever had sat unrecorded and surfaced only because somebody asked. Restarting is
two uncommented lines plus one repository secret; the workflow header documents
the service account steps.

**The code side is done and tested.** What is missing is the credential, which
is Ealia's to create. Flag it rather than working around it.

---

## What this reading cannot tell you

Search Console covers `hamdam.com.au` only. The window contains the 1.3 release,
1.3.1, the Garden in-app event going live and 1.3.2, and says nothing about any
of them. Over the same fortnight App Store first time downloads were flat at
zero to three a day. The two surfaces are telling different stories, and a
question of the form "did the app release help" cannot be answered from this
file or from Search Console at all. That data lives in `hamdam-analytics`.

## How to take the next reading

Search Console is connected through Composio as `google_search_console`, property
`sc-domain:hamdam.com.au`, owner level. `GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY`
with `data_state: "final"` is what produced everything above. Two traps, both
already recorded in the log and both easy to repeat:

- Take the headline total from a `dimensions: []` call. The query breakdown
  omits withheld queries and understates impressions by roughly half.
- Data lags two to three days. Ending a window on today gives a partial final
  day that reads as a collapse.
