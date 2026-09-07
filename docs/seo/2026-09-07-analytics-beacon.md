# The analytics beacon: what is wired, what is blocked, and what a token buys

Date: 2026-09-07. Asked for as "set up the analytics beacon".

The honest headline: **the beacon is not counting anything yet and this session
could not make it, because the one missing piece is a value only the Cloudflare
dashboard will hand out.** Everything on this side of that value is now built,
tested and proven against a real browser. What follows is the evidence, so the
next session does not spend the same hour re-establishing it.

## What was already true, and stayed true

`src/lib/analytics.js` has shipped with `PRODUCTION_BEACON_TOKEN = null` since
2026-08-07. Every branch resolves to null, no tag is emitted, and the site
counts nothing. The privacy policy has said since it was written that this site
uses Cloudflare Web Analytics to count page views, so the policy currently
describes something that is not happening. That is not a new finding; it is the
same one, still open, and it is the reason this is worth finishing.

## Three probes, all negative, all recorded

`docs/method-failures.md` has a rule about this: before telling a person to go
and do setup work, check what already exists. Checked, four ways.

1. **The deploy API token cannot create or read a Web Analytics site.**
   `GET /accounts/{id}/rum/site_info/list` returns 403 `Authentication error`.
   The token itself is fine: `/user/tokens/verify` returns 200 and `active`. So
   this is a missing scope, not a stale credential. The note in `analytics.js`
   claiming this was written weeks ago and has now been re-verified rather than
   quoted.
2. **The same token cannot read zone analytics either.** The GraphQL endpoint
   would have given zone-level request counts with no beacon at all, which
   would have been a partial answer. It refuses and names the missing
   permission outright: `zone.analytics.read`.
3. **No token exists anywhere to be copied.** `hamdam.com.au`, `/fa/` and
   `support.hamdam.com.au` were all fetched and searched for a
   `data-cf-beacon` attribute. Nothing on any of them. So nobody has switched
   on Cloudflare's automatic HTML injection either, and there is no site token
   sitting in the wild to reuse.
4. **There is no Cloudflare connection to borrow.** The Composio account has
   canva, elevenlabs, github, google_search_console, googledrive, instagram,
   linkedin, outlook, reddit, twitter and youtube connected. No Cloudflare.
   This is the path that produced the Search Console readings, and it does not
   reach this product.

## Two ways to finish it, and they are not equal

**Paste the token.** Cloudflare dashboard, Web Analytics, add a site for
`hamdam.com.au`, copy the 32 hex characters out of the snippet's
`data-cf-beacon` value, and replace the `null` in `src/lib/analytics.js`. One
line. This fixes the beacon and nothing else: readings afterwards still require
a dashboard visit, because nothing here can read the data either.

**Or widen the API token that already exists in the deploy environment.** Add
**Account Analytics (Edit)** and **Zone Analytics (Read)** to it. A session
could then create the Web Analytics site, read its token back, commit it, and
read the traffic afterwards without anyone opening a dashboard again. Read-only
for the traffic half; the Edit half is what creating the site needs.

Both are one dashboard trip. Only the second one is the last dashboard trip.
This is Ealia's call, not a build-time one, and there is a real argument for the
first: a narrower credential is a narrower blast radius.

## What was built this session, and what proves it

The token slot was already wired. Three things around it were not.

**The build-log line was lying, and it is the thing the design leans on.**
`astro.config.mjs` imports `analytics.js` as a plain Node module to print
`describeBeaconDecision()`, and in that context `import.meta.env` does not
exist, so the `PUBLIC_CF_BEACON_TOKEN` override read as unset every time.
Measured, not theorised: a build with the variable set printed `analytics:
beacon OFF, no production token committed yet` while shipping the beacon tag on
all 27 pages. `pickExplicitToken` now reads both contexts, and the line tells
the truth in both directions.

**A hand deploy would have silently dropped the beacon the day the token
landed.** `PRODUCTION_BEACON_TOKEN` only reaches a page on a Workers Builds
run, so `npm run deploy` from a container would publish 27 pages with no
analytics and report success. That is the `pt=` regression of 2026-09-05 in a
different costume. `scripts/predeploy-check.mjs` now refuses that deploy and
names the override that fixes it, and warns, without blocking, while no token
exists at all.

**The whole path was proven against a browser rather than assumed.** Built with
a placeholder token, served through `wrangler dev` so the real enforcing CSP
from `public/_headers` was applied, and loaded in Chromium:

- the tag renders on all 27 pages, both locales, with the token JSON-escaped
  into the attribute;
- `script-src` already allows `static.cloudflareinsights.com` and
  `connect-src` already allows `cloudflareinsights.com`, so **no CSP change is
  needed**, and the browser reported zero `securitypolicyviolation` events;
- the browser did request `beacon.min.js`. It failed to fetch it, and that is
  this container's egress, not the site: the same URL returns 200 from a curl
  here, and a CSP block would have raised a violation event rather than a
  connection reset.

Whether Cloudflare accepts the beacon's POST cannot be proven with a
placeholder token, and stops being a question the moment a real one is in.

## Reading the result afterwards

The build log is the first check, in the Workers Builds output:
`analytics: beacon enabled (token ...abcdef)`. The second is the page itself:

```
curl -sS https://hamdam.com.au/ | grep -c cloudflareinsights
```

`1` means it shipped. `0` means it did not, whatever any log said.
