# The analytics beacon: set, and the wrong turn taken on the way

Date: 2026-09-07. Asked for as "set up the analytics beacon".

**Done in the repository, not yet live.** `PRODUCTION_BEACON_TOKEN` in
`src/lib/analytics.js` now holds a real Cloudflare Web Analytics site token,
and a Workers Builds run puts the tag on all 27 pages across both locales. It
starts counting when this reaches `main` and Workers Builds publishes it, and
not one moment before.

## The wrong turn, first, because it is the useful part

The first pass of this task concluded that no session could finish it: that the
token lived behind the Cloudflare dashboard, and that Ealia had to go and paste
it in. That conclusion was reported to him with what looked like solid
evidence, four probes deep.

It was wrong. One call was made against `rum/site_info/list`, it returned 403,
and the finding was generalised from that one endpoint to the whole product.
`POST /accounts/{id}/rum/site_info` succeeds with the same token. The site was
created from a shell in about four seconds.

The measured permission split, which is genuinely strange and is why nobody
should reason about this product from a single call:

| Call | Result |
|---|---|
| `POST rum/site_info` | 200, creates the site, returns the token |
| `GET rum/site_info/list` | 403 Authentication error |
| `GET rum/site_info/{site_tag}` | 403 Authentication error |
| GraphQL zone analytics | refused, names `zone.analytics.read` |

Create is permitted. Read is not. Recorded in `docs/method-failures.md` as
well, because the shape of the error is the point, not the endpoint.

## What now exists

A Web Analytics site on the Cloudflare account:

- host `hamdam.com.au`
- site tag `aa50aecebb5643708676c003d943d076`
- created 2026-09-07
- `auto_install: false`, deliberately. Cloudflare's automatic injection
  rewrites HTML in flight and BaseLayout already emits the tag. Use one or the
  other, never both, or every page view is counted twice.

Its site token is committed in `src/lib/analytics.js`. That is safe: the value
ships in the HTML of every page and identifies a zone rather than an account.
It is not safe to lose, though, because **read is 403.** No future session can
ask the API what the token is; it can only create another site. That constant
is the copy.

One caveat that cannot be resolved from here. With the list endpoint refused,
there was no way to confirm beforehand that no Web Analytics site already
existed for this host. Everything visible said none did: no `data-cf-beacon` on
hamdam.com.au, on `/fa/`, or on support.hamdam.com.au, and the constant had
been null since 2026-08-07. But everything visible is not verified. If a second
hamdam.com.au entry turns up in the dashboard, that is the reason, and the one
to keep is whichever tag matches the committed value.

## Two things around it that were broken

**The build-log line was lying, and the design leans on it.**
`astro.config.mjs` imports `analytics.js` as a plain Node module, where
`import.meta.env` does not exist, so the `PUBLIC_CF_BEACON_TOKEN` override read
as unset every time. Measured, not theorised: a build with the variable set
printed `analytics: beacon OFF, no production token committed yet` while
shipping the tag on all 27 pages. `pickExplicitToken` now reads both contexts.

**A hand deploy would have silently dropped the beacon.** A committed token
only reaches a page on a Workers Builds run, so `npm run deploy` from a
container would publish 27 pages with no analytics and report success. That is
the `pt=` regression of 2026-09-05 in different clothes.
`scripts/predeploy-check.mjs` refuses that deploy now and names the override
that fixes it.

## Proof, at each stage

- Local build: `analytics: beacon off, not a Workers Builds run (local builds
  do not report)`, and zero occurrences of `cloudflareinsights` in `dist`.
  Correct: a laptop build must not write into the production dataset.
- `WORKERS_CI=1` build: `analytics: beacon enabled (token ...ff0f19)`, and the
  tag present on 27 of 27 pages with the token JSON-escaped into the attribute.
- Served through `wrangler dev` so the real enforcing CSP from
  `public/_headers` applied, and loaded in Chromium: zero
  `securitypolicyviolation` events. **No CSP change was needed**, because
  `script-src` already allows `static.cloudflareinsights.com` and `connect-src`
  already allows `cloudflareinsights.com`. The browser's fetch of
  `beacon.min.js` failed on this container's egress rather than on the policy:
  the same URL returns 200 from curl here, and a blocked request raises a
  violation event rather than a connection reset.

## What is left, and it is not code

This branch has to reach `main` for Workers Builds to publish it. Until then
the live site still counts nothing, and `/privacy/` still tells visitors it
counts page views, which remains untrue for exactly as long as that takes.

After the deploy, two checks, in this order:

1. The Workers Builds log should carry `analytics: beacon enabled (token
   ...ff0f19)`.
2. The page itself, which outranks the log:

```
curl -sS https://hamdam.com.au/ | grep -c cloudflareinsights
```

`1` means it shipped. `0` means it did not, whatever the log said.

Data appears in the Cloudflare dashboard under Web Analytics within a few
minutes of the first real visit. It cannot be read back through the API with
this token, so that reading stays a dashboard trip until somebody adds
**Account Analytics (Read)** and **Zone Analytics (Read)** to it. That is the
open question now, and it is a much smaller one than the last version of this
document made it.
