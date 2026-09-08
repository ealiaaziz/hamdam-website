# Analytics on hamdam.com.au: it was already on, and curl could not see it

Started 2026-09-07 as "set up the analytics beacon". Corrected 2026-09-08.
The correction is the document; the setup was never needed.

## The finding

**hamdam.com.au has had Cloudflare Web Analytics since at least 29 August
2026.** It runs through Cloudflare's automatic injection, which rewrites the
HTML at the edge rather than putting anything in this repository, and which
**only fires for a browser user agent**.

That last clause is the whole story. Every check this project had made used a
bare curl:

```
curl -sS https://hamdam.com.au/ | grep -c cloudflareinsights          # 0
curl -sS -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
  AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36" \
  https://hamdam.com.au/ | grep -c cloudflareinsights                 # 2
```

Zero versus two. Nothing about the site changed between those two commands.

## What that cost, and what it did not

Acting on the zero, a session created a Web Analytics site by API on
2026-09-07, committed its token, and deployed. Seeing the injected tag and the
new one side by side in a single response, the same session then concluded that
every page view was being counted twice, pulled the token back out, and told
Ealia so. **That second conclusion was also wrong**, and it was wrong for the
same reason as the first: acting on one observation without asking what the
data said.

The hourly counts, read afterwards:

| Hour (UTC) | `fc0907` injected | `aa50ae` in-code |
|---|---|---|
| 2026-09-07 10:00 | 4 | 0 |
| 2026-09-07 11:00 | 2 | 0 |
| 2026-09-07 12:00 | 0 | 1 |
| 2026-09-07 19:00 | 0 | 3 |
| 2026-09-08 11:00 | 0 | 3 |

The injected site went to zero in the same hour the in-code tag went live and
has recorded nothing since. Cloudflare stands its injection aside when the page
already carries a beacon. **There was no sustained double counting**, the two
tags in one response were a single edge-cached page caught mid-transition, and
removing the in-code tag briefly left the site depending on an injection that
fresh fetches showed was no longer happening.

So the token is back, and it stays. The choice between the two mechanisms is
settled on determinism: the in-code tag is in the repository, visible to a
plain curl, versioned, and guarded by `scripts/predeploy-check.mjs`. Injection
is a dashboard setting that nothing in this repository can see, verify or
protect, and its invisibility is what made a full day of work argue from a
blind probe.

One rule falls out of that and is worth stating on its own: **do not point this
constant at `a3514c...`, the injected site's token, to reunite the history.**
If injection ever does fire alongside the in-code tag, one shared site is
inflated while two separate sites are merely split. A split is recoverable; an
inflated number is not. The history before 2026-09-07 stays in the other site.

| Site tag | Data | Source |
|---|---|---|
| `fc0907d7213743e39c87fc821feee7ae` | 2026-08-29 to 2026-09-07 11:00Z | automatic injection, token `a3514c7052c648d985b8912603a2a7f8` |
| `aa50aecebb5643708676c003d943d076` | 2026-09-07 12:00Z onward | the in-code tag, this repository |

Neither should be deleted. The first holds ten days of history that cannot be
moved; the second is live.

## What this token CAN do, which is more than anyone had established

Measured, not assumed:

| Call | Result |
|---|---|
| `POST rum/site_info` | 200, creates a site and returns its token |
| `GET rum/site_info/list` | 403 |
| `GET rum/site_info/{site_tag}` | 403 |
| `PATCH rum/site_info/{site_tag}` | 405 |
| GraphQL `rumPageloadEventsAdaptiveGroups`, account-scoped | **200** |
| GraphQL zone analytics | refused, `zone.analytics.read` |

The GraphQL row is the useful one and it had been missed entirely. **The
traffic is readable from a session, with no dashboard and no new credential.**
This is the query:

```
POST https://api.cloudflare.com/client/v4/graphql
{"query":"query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){
  rumPageloadEventsAdaptiveGroups(limit:100,filter:{datetime_geq:$s,datetime_leq:$e},
  orderBy:[count_DESC]){count dimensions{siteTag date requestPath countryName userAgentBrowser}}}}}",
 "variables":{"a":"<CLOUDFLARE_ACCOUNT_ID>","s":"<ISO8601>","e":"<ISO8601>"}}
```

Counts come back sampled and scaled, which is why they arrive in round tens.

## First reading, 30 days to 2026-09-08

Both sites combined, so the recent days are inflated by the double counting
described above. Treat it as shape, not as measurement.

| Page | Views |
|---|---|
| `/` | 90 across NL, US, AU, DE, SE, CA |
| `/privacy/` | 30 |
| `/whats-new/` | 20, including one from IR |
| `/fa/` | 10 |
| `/poets/rumi/` | 10 |
| `/support` | 10 |

Small numbers, and the first this project has ever had from its own pages
rather than from Search Console impressions.

## What is left

1. **Delete the duplicate site** in the Cloudflare dashboard, Web Analytics,
   tag `aa50aecebb5643708676c003d943d076`. Cosmetic, not urgent.
2. **Decide whether to move to the in-code tag.** It is versioned, reviewable
   and guarded by `scripts/predeploy-check.mjs`; injection is invisible to the
   repository and to every terminal check. Moving means turning injection off
   in the dashboard first, then setting `PRODUCTION_BEACON_TOKEN` to
   `a3514c7052c648d985b8912603a2a7f8`, the existing site's token, so the
   history from 29 August continues. Not done, because what is running works
   and the swap buys tidiness rather than data.
3. **Nothing about the privacy policy.** `/privacy/` says this site uses
   Cloudflare Web Analytics to count page views. That was true on 29 August
   and is true now. The earlier claim in this repository that the policy
   described something which was not happening was itself a product of the
   blind probe.

## The machinery built along the way, which is still worth having

Two real defects were found and fixed while chasing this, and both stand
regardless of which beacon is used:

- **The build-log line was blind to `import.meta.env`.** `astro.config.mjs`
  imports `analytics.js` as a plain Node module, so a build with
  `PUBLIC_CF_BEACON_TOKEN` set printed "beacon OFF" while shipping the tag on
  all 27 pages. Fixed, with tests.
- **A hand deploy would silently drop an in-code beacon.** A committed token
  only reaches a page on a Workers Builds run, so `npm run deploy` from a
  container would publish 27 pages with no analytics and report success.
  `scripts/predeploy-check.mjs` refuses that now.
