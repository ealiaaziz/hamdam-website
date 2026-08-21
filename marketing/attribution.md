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

**Instagram bio, English:**

```
https://apps.apple.com/au/app/id6784461990?ct=ig-bio
```

**Instagram bio, Farsi:**

```
https://apps.apple.com/au/app/id6784461990?l=fa&ct=ig-bio-fa
```

Both resolve to the same listing. The `l=fa` parameter asks Apple for the
Farsi localisation of the product page; the `ct` is what shows up in reporting.

## Two things to know before trusting the numbers

**The provider token is not set.** Checked in the built site on 2026-08-21:
every rendered store link carries `ct=` and none carries `pt=`, because
`PUBLIC_ASC_PROVIDER_TOKEN` is unset at build time. Apple's campaign reporting
generally expects the provider token alongside the campaign token, so tagging
may be incomplete until that value is supplied. It is an account specific value
only App Store Connect can issue. Worth confirming what Apple actually reports
with `ct` alone before concluding the tagging works.

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
