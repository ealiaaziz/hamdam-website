# Measurement: analytics, Search Console, Bing

Date: 2026-08-07. Raised because a day was spent growing traffic to a site that
had nothing counting it.

## The finding

`privacy.astro` §2.1 has always said:

> This website uses Cloudflare Web Analytics to count page views. It records
> aggregate, cookieless page counts only.

and `public/_headers` has always carried `static.cloudflareinsights.com` in
`script-src` and `cloudflareinsights.com` in `connect-src`. Both were written in
anticipation of a beacon that was never on the page. Checked on 2026-08-07
against production: zero occurrences on `/`, `/fa/`, `/poets/hafez/` and
`/privacy/`.

So the policy described something that was not happening, and there was no
measurement of any kind on the site.

## What changed in this repository

`src/lib/analytics.js` plus four lines in `BaseLayout.astro`. The beacon renders
on every page **only** when `PUBLIC_CF_BEACON_TOKEN` is set to a well-formed
token (32 hex characters). Unset or malformed emits nothing at all.

The shape check is not decoration. `appStore.js` records what happens when a
token does not fail closed: `[ASC_PROVIDER_TOKEN]` shipped as a literal string
in every App Store link on the site for weeks, on the reasoning that an
unresolved value would simply be ignored. It was rendered instead. Verified for
this token by building three ways: no token emits nothing, `[CF_BEACON_TOKEN]`
emits nothing, a valid token emits exactly one deferred tag on all 23 pages.

Scope is fixed by the privacy policy and must not be widened without changing
that policy first, which is Ealia's call: aggregate cookieless page counts, no
cookie, no cross-site tracking, no identification. The same section rules out
Firebase, Mixpanel, Amplitude and Google Analytics by name.

## Turning it on: one edit, then push

The token is committed rather than kept in an environment variable, because it
is not a secret: it ships in the HTML of every page and identifies a zone, not
an account. That removes the Workers Builds variable this document previously
asked for.

**It is not set yet.** `PRODUCTION_BEACON_TOKEN` in `src/lib/analytics.js` is
`null`, because reading or creating the token goes through Cloudflare's
`rum/site_info` API and the API token this repository deploys with is refused
there with a 403: it carries Workers and Zone scope but not Account Analytics.

To finish it:

1. Cloudflare dashboard, Web Analytics, add a site for `hamdam.com.au`.
2. Copy the 32-hex value out of the snippet's `data-cf-beacon` attribute. Ignore
   the rest of the snippet; the tag is already in the layout.
3. Replace the `null` in `src/lib/analytics.js` with that string, and push.
4. Confirm from the Workers Builds log, which prints one line per build:
   `analytics: beacon enabled (token ...abc123)`.
5. Then from the outside:
   `curl -sS https://hamdam.com.au/ | grep -c cloudflareinsights` returns 1.

### The WORKERS_CI gate

The committed token only applies when `WORKERS_CI` is set, which Cloudflare
injects into every Workers Builds run. Every push to this repository deploys, so
a CI build is a production build; a build on a laptop is not and must not write
page views into the production dataset. `PUBLIC_CF_BEACON_TOKEN` still overrides
everything, which is the escape hatch for testing the tag locally.

All four combinations are covered by tests and were verified against real
builds: no token off CI, no token on CI, token off CI, token on CI. Only the
last emits a tag, and it emits one on all 23 pages.

### Do not also enable the dashboard toggle

Cloudflare Web Analytics can inject the beacon itself by rewriting HTML in
transit. That is reliable for Pages and for a proxied origin; this site is a
Worker serving static assets, where that rewrite is not something to depend on,
which is why the tag is in the layout. Enabling both counts every page view
twice.

## Performance cost: not measured, and why

The beacon is `defer`, so it blocks neither parsing nor rendering, and the
script is about 31KB uncompressed.

Lighthouse was run against a build carrying a test token and scored the homepage
90 rather than 100. **That number is wrong and should not be quoted.** The
network log shows the beacon request finishing `status=-1`,
`ERR_CONNECTION_RESET`: the sandbox those runs happen in routes `curl` through a
proxy but not Lighthouse's own Chrome, so the run measured a failed request and
a console error rather than a working beacon. `curl` fetches the same URL at 200
from the same container.

The real cost is small but is not zero, and it has not been measured. Re-run
Lighthouse against production once the token is set, and if the homepage has
dropped below 100, that is a real trade to weigh rather than a surprise.

## Still to do, both outside this repository

### Google Search Console

The zone already has a verification record:

```
google-site-verification=6-rEEAs5vLNCtIFncqSKAu07aMDCaAi1RYVGKCgsNf4
```

so the property was set up at some point and may only need signing into. Submit
`https://hamdam.com.au/sitemap-index.xml`, then watch Coverage for the ten poet
pages and six moment pages entering the index.

Search Console is the only source for which *queries* bring people in, which is
what tells you whether the seasonal pages (Yalda in December, Norooz in March)
are working. Cloudflare Web Analytics counts visits; it does not know why.

### Bing Webmaster Tools

Verify the domain and submit the same sitemap. Worth doing for its own sake and
because Bing's index is what Copilot draws on.

## What each tool answers

| Question | Tool |
| --- | --- |
| How many people came, and to which pages | Cloudflare Web Analytics |
| What they searched to find us | Search Console |
| Which pages are indexed at all | Search Console, Bing Webmaster |
| Which AI crawlers fetched the site | Cloudflare AI Crawl Control |
