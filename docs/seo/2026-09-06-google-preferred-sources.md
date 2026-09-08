# Google preferred sources: what shipped, and an honest ceiling on it

Date: 2026-09-06. Asked for as "add google prefer option to website to improve
the website traffic". What shipped is one link in the English footer. What
follows is the part worth more than the link: why it will not, on its own,
improve traffic, and what it would take for it to matter at all.

## What the feature actually is

Google added a control to Search that lets a signed-in person name the sites
they want more of. Google then favours those sites for that one person in Top
Stories, in AI Mode and in AI Overviews. On 2026-08-20 Google added publisher
guidance inviting sites to link readers into that setting with the site
pre-filled.

Source: `https://developers.google.com/search/docs/appearance/preferred-sources`,
read 2026-09-06. Two implementation paths are documented, a script-backed button
and a plain deep link, and eligibility is domain or subdomain only, never a
subdirectory.

## What shipped

`src/lib/preferredSource.js`, ten unit tests, and one link in the English
footer reading "Make Hamdam a preferred source on Google". It points at
`https://www.google.com/preferences/source?q=hamdam.com.au`.

That is the whole change. No script, no new network request, no CSP edit, no
layout change, nothing above the fold.

## Three decisions, and why

**A link, not Google's button.** Google's standard implementation is a script
from `news.google.com` plus a div it fills in. It renders a translated, themed
button and would have solved the Farsi problem for free. It was refused. The
CSP in `public/_headers` is enforcing and currently names exactly one
third-party script origin; that script injects its own markup and styling, so
admitting it means widening `script-src` and, in all likelihood, `style-src`
and `frame-src` too. That is a permanent loosening of the site's security
posture, and the thing being bought with it is a footer link. The deep link
Google documents alongside the button costs nothing and does the same job.

**English only.** The repo bars authoring Persian, and there is no approved
Persian source for this string. The Farsi footer therefore does not carry it,
on exactly the precedent the canonical App Store link set in the same component
on 2026-08-16. This is a real gap and not a shrug: the Farsi audience is half
the point of the site. Ealia writes the Persian, or it stays English only.

**A kill switch, defaulted on.** Google's page says a site has to already
appear in the source preferences tool for any of this to work. That tool is
behind a Google sign-in and rendered client-side, so it cannot be read from a
build container, by fetch or by curl. **Nobody has confirmed hamdam.com.au is
listed**, and this document should not be read as claiming otherwise. If it is
not listed, the link lands a reader on a Google settings page that cannot find
us, which is worse than no link. `PREFERRED_SOURCE.ENABLED` turns it off in one
line.

## The honest ceiling

This cannot bring anyone to the site who is not already on it.

Every click comes from a visitor who has already arrived, is already reading the
footer, is signed into Google, and cares enough to change a search setting. The
mechanism is a return-visit lever, not an acquisition one. Publishers for whom
it pays are news publishers with daily repeat readers and a Top Stories
presence to be favoured within.

Hamdam is an app marketing site with fourteen indexed URLs about Persian poetry
and one product. It publishes nothing that competes in Top Stories, so the
largest of the three surfaces the setting affects is not one this site appears
in at all. AI Mode and AI Overviews are the plausible half, and even there the
setting only tilts results for the individual who set it.

So the expected traffic effect is somewhere between nothing and unmeasurable,
and `docs/seo/traffic-log.md` has no instrument that could distinguish the two.
It was still worth shipping, because the cost is four lines of markup and the
downside is bounded. It is not worth reporting as a traffic initiative, and it
should not displace anything on `docs/website-redesign/34-next-steps.md`.

## What would actually move traffic

Recorded here because the request was about traffic and this change is not the
answer to it. In rough order of expected return, from what the repo already
knows about itself:

1. **Cloudflare Web Analytics is still not running.** `src/lib/analytics.js`
   has shipped with `PRODUCTION_BEACON_TOKEN = null` since 2026-08-07, so no
   page view on this site is being counted by it. Every argument about what
   works is currently made without a meter.
2. **The Search Console reading is manual and irregular.** See
   `docs/seo/traffic-log.md`. The unattended path is one Cloudflare-side
   credential or a few clicks in the Routines interface, and both are open.
3. **Content depth on the pages that already draw impressions.** The
   2026-09-03 reading showed impressions doubling and average position
   improving fourteen places off content work, which is the one lever in this
   list with measured evidence behind it on this site.

Any of the three beats this change by a distance.

## Measured 2026-09-08, and it is worse than "unverified"

The direct check still needs a signed-in browser. `google.com/preferences/source`
returns 200 to a plain fetch but the body is an empty JS shell carrying a
`ServiceLogin` marker, with no occurrence of "hamdam" anywhere in it, and
headless Chromium cannot reach google.com through this container's proxy
(`ERR_CONNECTION_RESET`, a tunnel failure rather than a policy denial). So
whether hamdam.com.au is listed in that tool is still unknown.

An independent question could be answered, though, and it bears on the same
decision. Preferred sources applies mainly to **Top Stories**, which is a news
surface. Search Console, 10 June to 6 September 2026, `sc-domain:hamdam.com.au`:

| Search type | Impressions |
|---|---|
| `news` | **0** |
| `discover` | **0** |
| `googleNews` | **0** |
| `web` | 605 (11 clicks, average position 25.3) |

Zero across every news and Discover surface, for three months. The site has a
real web presence and no publisher presence at all.

That does not prove hamdam.com.au is absent from the source preferences tool.
It does something more useful: it makes the question mostly moot. Even a
visitor who successfully adds Hamdam as a preferred source is expressing a
preference about surfaces this site has never once appeared in.

**Recommendation: set `PREFERRED_SOURCE.ENABLED` to false.** Not because the
link is harmful, but because the honest expected value has gone from "close to
zero" to "zero on the evidence available", and the footer of a deliberately
calm page is not free. Left enabled pending Ealia's call, because he asked for
the feature and removing it is his decision rather than a build-time one.
