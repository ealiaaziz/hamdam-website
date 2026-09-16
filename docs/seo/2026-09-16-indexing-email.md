# Search Console: "New reasons preventing your pages from being indexed"

**Date:** 2026-09-16. **Trigger:** a Search Console mail naming two new reasons,
`Excluded by 'noindex' tag` and `Alternative page with proper canonical tag`.

## Verdict: nothing on this site was broken

The mail is Google working correctly, twice. No page that should be indexed is
missing. All 26 sitemap URLs were inspected through the Search Console API and
**every one came back `Submitted and indexed`, verdict `PASS`, with
`googleCanonical` exactly equal to `userCanonical`.**

One code change ships alongside this note. It is hygiene found while looking, not
the cause of anything.

## Reason 1: `Excluded by 'noindex' tag` — support.hamdam.com.au

The property is `sc-domain:hamdam.com.au`. A **Domain property aggregates every
subdomain**, so the support desk is inside this report. URL inspection:

```
https://support.hamdam.com.au/
  coverageState  Excluded by 'noindex' tag
  indexingState  BLOCKED_BY_META_TAG
  robotsTxtState ALLOWED
  lastCrawlTime  2026-09-09T18:39:30Z
  referringUrls  https://apps.apple.com/tr/app/hamdam-reflection-companion/id6784461990
```

That is the whole story. `support/src/render/layout.ts` puts
`<meta name="robots" content="noindex">` in the shared head, so every rendered
desk page carries it, deliberately — a ticket desk with `/admin` behind
Cloudflare Access has no business in a search index. Google reached it from the
**support URL on the App Store listing**, crawled it, obeyed the tag, and filed
it. Working as designed, end to end.

### Do not "fix" this with robots.txt

`support.hamdam.com.au/robots.txt` 404s, so crawling is allowed. That is
**correct and must stay that way**. A `Disallow: /` there would stop Google
fetching the page, which would stop it seeing the `noindex`, and a blocked URL
can still be indexed URL-only from external links — of which there is at least
one, from the App Store. Crawlable + noindex is the configuration that actually
keeps a page out. Leave it.

## Reason 2: `Alternative page with proper canonical tag` — not identified, affects nothing

Not pinned down. The Search Console **API does not expose the Page Indexing
report's URL list** — that is UI-only — so the affected URLs cannot be read from
here. What can be said is what the inspections rule out: no page in the sitemap
is affected, `www` is `Page with redirect` rather than a canonical exclusion, and
the support desk emits no canonical at all. The likely remainder is query-string
variants (`?utm_*`, App Store and social links) resolving to their clean URLs,
which is correct behaviour needing no fix. If it ever matters, open the report in
the UI and read the list.

## The change that ships with this

`BaseLayout.astro` emitted `<link rel="canonical">` unconditionally, including on
the one page built with `noindex`. So every 404 response carried
`<link rel="canonical" href="https://hamdam.com.au/404">`, and `/404` answers
**200**, because Cloudflare serves `dist/404.html` as an ordinary static asset as
well as using it for `not_found_handling`. A canonical naming a crawlable 200 URL
is an invitation to crawl it.

A noindexed page now declares no canonical. `src/lib/__tests__/canonical.test.js`
holds both halves: every indexable page self-canonicalises with its trailing slash
intact, and a noindexed page declares none. The test was run against the bug
re-introduced into `dist/404.html` and fails on it.

## The part worth keeping: the first diagnosis was confidently wrong, twice

**First wrong answer, from reading config.** `wrangler.jsonc` declares both
`hamdam.com.au` and `www.hamdam.com.au` as custom domains with no redirect
anywhere in the file. That reads exactly like duplicate content on two hostnames
and would explain the canonical reason. Production says `www` answers **301** to
the apex. Ten seconds of `curl` beat a careful reading of the repo.

**Second wrong answer, from reading production.** Having found that `/404`
answers 200 with `noindex` and that every 404 response advertised it, the
conclusion "this is what the mail is about" was written up, committed, and put in
a commit message. Then URL inspection said:

```
https://hamdam.com.au/404
  coverageState  URL is unknown to Google
  verdict        NEUTRAL
```

Google has never fetched it. The tag was real, the reachability was real, the
causal claim was invented to join them. Both wrong answers were internally
consistent and both were available without ever asking the system that sent the
mail.

The rule this earns, alongside THE EVIDENCE RULE in the audit skill: **when the
report comes from an external system, query that system.** The site tells you
what it serves. Only Search Console knows what Google did with it, and it has an
API.

## Verified state, 2026-09-16

| Check | Result |
|---|---|
| 26 sitemap URLs | all `Submitted and indexed`, `googleCanonical` == `userCanonical` |
| `https://hamdam.com.au/404` | `URL is unknown to Google` |
| `https://support.hamdam.com.au/` | `Excluded by 'noindex' tag`, intentional |
| `https://www.hamdam.com.au/` | `Page with redirect` → apex |
| `http://hamdam.com.au/` | 301 → https apex |
| `/privacy` (no slash) | 307 → `/privacy/` |
| `/nonexistent` | 404, never a soft-404 |
| sitemap-index.xml | 26 submitted, 0 errors, 0 warnings |
