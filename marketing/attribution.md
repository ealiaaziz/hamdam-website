# Campaign attribution, and the links to paste

Written 2026-08-21, acting on the 13 August measurement gap note, which said:
"If only one thing on this page gets done, the campaign token on the bio link
is the one with the best ratio of effort to answer."

Nothing here needs a credential, an integration, or App Store Connect access.
It is a set of URLs. Paste them and the numbers start separating themselves.

---

## The problem this solves

Between 22 July and 21 August, Instagram reached 2,167 accounts and drew 133
profile visits. Nobody can say whether that produced zero installs or fifty,
because every link out of every channel points at the same untagged App Store
URL. All traffic arrives at Apple as one undifferentiated blob.

The website already solves this for itself. Every store link the site renders
carries a `ct` token naming its placement, so `web-hero` and `web-footer` are
separable in App Store Connect's campaign breakdown. Social carries nothing.

## The scheme

`ct` is a free text campaign token, up to 40 characters. The convention here is
`<channel>-<placement>`, with `-fa` appended for the Farsi variant.

The site uses a hardcoded `web-` prefix (`campaignTokenFor` in
`src/lib/appStore.js`). **Do not reuse that helper for social**: it would label
Instagram traffic `web-`, which defeats the point. Social links are written by
hand from the table below.

| Channel | Token | Notes |
| --- | --- | --- |
| Instagram bio, English | `ig-bio` | The one that matters most; every post says "link in bio" |
| Instagram bio, Farsi | `ig-bio-fa` | If the bio link is localised |
| Instagram post or reel caption | `ig-post` | Only where a caption carries a raw URL |
| Instagram story | `ig-story` | |
| LinkedIn | `li-profile` | Pending the page question in the measurement gap note |
| YouTube description | `yt-desc` | |
| Reddit | `reddit` | |
| Email signature | `email-sig` | |

Existing website tokens, for reference and to avoid collisions: `web-nav`,
`web-hero`, `web-journey`, `web-pricing`, `web-footer`, `web-sticky`,
`web-poet`, `web-moment`, `web-fal`, `web-schema`, each with a `web-fa-`
counterpart.

## Paste these

**Instagram bio. This is the one to use:**

```
https://apps.apple.com/au/app/id6784461990?ppid=c17f1f9b-5632-49ee-a913-63e65c306ca9&ct=ig-bio
```

That `ppid` is the **Faal e Hafez, Instagram** custom product page, and it went
live at Apple between 2026-08-17 and 2026-08-21. Verified 2026-08-21 by
fetching it: both the AU and US storefronts serve the custom page rather than
the default one, and adding `ct` alongside `ppid` does not break it.

It is a better destination than the plain listing for three reasons. It opens on
the fal, which is what the Instagram audience arrives having just watched. It
carries its own promotional text, "Ask the Faal a question, and let Hafez answer
the way he has for centuries", instead of the generic one. And it deep links to
`hamdam://roots`, so anyone who already has the app lands on the feature rather
than the home screen.

It also gives a second, independent attribution path: Apple reports custom
product pages separately, so `ppid` traffic is identifiable even where the `ct`
campaign column is redacted. Use both.

**Farsi variant, if the bio link is localised:**

```
https://apps.apple.com/au/app/id6784461990?ppid=c17f1f9b-5632-49ee-a913-63e65c306ca9&l=fa&ct=ig-bio-fa
```

**Plain listing, if a link should not open on the fal:**

```
https://apps.apple.com/au/app/id6784461990?ct=ig-bio
```

The `l=fa` parameter asks Apple for the Farsi localisation of the product page.
Note that as of 2026-08-21 the listing has only `en-AU` and `en-US`
localisations, so `l=fa` currently changes nothing; it is harmless and will
start working if Persian-adjacent locales are ever added.

## Two things to know before trusting the numbers

**The provider token is set as of 2026-08-22.** `PUBLIC_ASC_PROVIDER_TOKEN` is now `127843867` in the Cloudflare build variables, added by Ealia as a plain text variable rather than a secret, which is right: the `PUBLIC_` prefix means the value is compiled into every page and is readable by anyone viewing source, it is already public in the YouTube channel link, and it grants no access. The paragraph below is kept because the reasoning still applies to anyone re-checking it.

**Previously, and for the record: the provider token was not set.** Checked in the built site on 2026-08-21:
every rendered store link carries `ct=` and none carries `pt=`, because
`PUBLIC_ASC_PROVIDER_TOKEN` is unset at build time. Apple's campaign reporting
generally expects the provider token alongside the campaign token, so tagging
may be incomplete until that value is supplied. It is an account specific value
only App Store Connect can issue.

**Corrected 2026-08-22: the value is already in use.** The YouTube channel's
App Store link carries `pt=127843867&ct=youtube_channel&mt=8`, so the provider
token has been issued and Ealia has it. This paragraph said it was a value only
App Store Connect can issue, which is true, and left the impression nobody had
it, which was not. Setting `PUBLIC_ASC_PROVIDER_TOKEN=127843867` in the build
environment would complete the site's tagging; that is a Cloudflare build
variable rather than a repository change, so it is Ealia's to set.

Corroborated in two independent places, which is worth more than one: the live
YouTube channel link, and `social/YOUTUBE-SHORT-TASK.md` line 139, which
records `?pt=127843867&ct=youtube_short&mt=8` for the Shorts task. Same value,
written down separately.

It cannot be set from a session. Workers Builds environment variables are not
exposed on any Cloudflare API path reachable with this account's token: the
Worker's `settings`, `services` and `versions` endpoints all return cleanly and
none of them carries build configuration, and `builds/triggers` answers 204
with an empty body. Confirmed 2026-08-22, and it matches what CLAUDE.md already
recorded about the Workers Builds connection being dashboard only. The route is
Workers and Pages, hamdam-website, Settings, Build, Variables and Secrets.

**Reporting still needs App Store Connect.** These tokens make the data
separable at Apple's end; they do not make it visible from here. Somebody still
has to open App Store Connect and look at the campaign breakdown. That remains
the open item, and this file does not close it. What it does is ensure that
when somebody finally looks, the number is divisible instead of a single total.

## The check that tells you it worked

Once the bio link is changed, the first person to open App Store Connect should
see `ig-bio` appear as a distinct campaign source. If it does not appear after a
week of posting, either the link was not changed, or the provider token problem
above is real, and both are worth knowing.
