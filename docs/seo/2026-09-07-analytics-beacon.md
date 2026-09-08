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

## What that cost

Acting on the zero, a session created a Web Analytics site by API on
2026-09-07, committed its token, and deployed. For about an hour production
carried **two** beacons and every real page view was counted twice, into two
separate sites. Cloudflare's own guidance, quoted in this repository since the
beacon module was written, is "use one or the other, never both, or every page
view is counted twice." It was right.

Read from the RUM GraphQL API on 2026-09-08:

| Site tag | First data | Source |
|---|---|---|
| `fc0907d7213743e39c87fc821feee7ae` | 2026-08-29 | automatic injection, token `a3514c7052c648d985b8912603a2a7f8` |
| `aa50aecebb5643708676c003d943d076` | 2026-09-07 | created in error, now receiving nothing |

## The fix

`PRODUCTION_BEACON_TOKEN` is `null` again, so the build emits no tag and the
injected one is the only beacon on the page. That is a code-only change,
immediately reversible, and it keeps the site that has the history.

Two things could not be done from here, both because the API refuses them for
this token:

- `PATCH rum/site_info/{site_tag}` returns **405**, so automatic injection
  cannot be switched off from a session.
- `DELETE` on the duplicate site is likewise unavailable, so
  `aa50aecebb5643708676c003d943d076` has to be removed in the dashboard. It is
  inert in the meantime.

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
