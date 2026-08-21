# The measurement gap, for Ealia

> **SUPERSEDED 2026-08-21. The gap this document describes is closed.**
>
> Everything below was written on 13 August and is preserved as the reasoning
> that led to the fix. It is no longer an accurate description of the world.
>
> **App Store Connect is connected.** `ealiaaziz/hamdam-analytics` runs a daily
> GitHub Actions workflow at 19:00 UTC that pulls Apple's sales and analytics
> reports with an ASC API key and commits the raw TSVs. Ealia built it; the
> four secrets it needs are documented in that repo's README. Downloads,
> product page views, source breakdown and conversion are all readable from
> the committed data without any credential.
>
> Option 2 in the list below, "the App Store Connect API, with a key you
> generate", is the one that happened.
>
> **Two claims below are now answerable and were answered on 2026-08-21.**
> "There is no way to know whether that produced three installs or three
> hundred" is no longer true: 64 first-time downloads between 19 July and
> 16 August, of which 8 came from App referrer and 1 from Web referrer. And
> the iOS floor question the document calls unsizeable is sizeable, because
> `Platform Version` is a column in the downloads report.
>
> **One recommendation below still stands and is still not done.** The bio
> link carries no campaign token. See `marketing/attribution.md` for the
> paste-ready URLs. Note the caveat found on 2026-08-21: Apple leaves the
> `Campaign` and `Source Info` columns entirely empty at current volume,
> redacting below a privacy threshold, so tagging will not produce visible
> campaign rows until volume rises. `Source Type` does populate, which is
> what separates social from search today.
>
> **The LinkedIn question below is still open.** Nobody has opened the URL.

Prepared 13 August 2026. **Report only. Nothing has been connected, and nothing should be until you have decided which of these you want.**

---

## The problem in one paragraph

App Store Connect is not connected to any tooling. Downloads, product page impressions and conversion rate are invisible. Every performance judgement anyone is currently making about Hamdam, including the ones in the analysis that produced this remediation pass, is inference from proxy metrics. Instagram reached 1,335 accounts and generated 178 profile visits between 14 July and 12 August. There is no way to know whether that produced three installs or three hundred.

This is the highest priority item in the remediation spec, and it is the only one that cannot be fixed in a repository. Everything else in this pass was a claim to correct or a line of code to write. This one is an account decision.

It is worth being concrete about what the gap costs, because "we lack analytics" sounds like a nice to have. Without conversion data:

- There is no way to tell a reel that reached 400 people and converted nobody from one that reached 400 people and converted forty. Both look identical in Instagram's numbers, and only one is worth making again.
- The iOS 26.5 floor is a real commercial question, since it excludes every phone not on a current iOS, and nobody can size it. Product page impressions against downloads is exactly the ratio that would show whether people are arriving and bouncing off the requirement.
- Any judgement about whether the launch worked is currently a vibe.

## Options for exposing App Store Connect data

Four, roughly in order of effort. **No recommendation is being made for you here beyond the observation that the first one is nearly free and answers most of the question.**

### 1. App Store Connect in a browser, on a schedule

The web console already shows units, product page views, and conversion rate, broken down by source, territory and device. No integration, no credentials to mint, no ongoing cost. Someone opens it once a week and writes the numbers into the weekly brief the marketing pipeline already produces at `marketing/briefs/`.

The obvious weakness is that it is manual and will be skipped. The obvious strength is that it can start this afternoon and needs nobody's permission. For a single app with weekly cadence, this may simply be the right answer, and the more automated options below are worth doing only if the weekly number turns out to be something you actually act on.

### 2. The App Store Connect API, with a key you generate

App Store Connect issues API keys under Users and Access, Integrations. A key gives programmatic access to sales and financial reports, which is where units and proceeds live, and to analytics reports for impressions and conversion. The reports arrive as scheduled files rather than as a live query endpoint, which is worth knowing before anyone imagines a real time dashboard.

This is the option that would let the weekly master task pull the numbers itself and put them in the brief without a human. It costs one key to generate, store as a secret, and rotate on some schedule nobody will remember to keep, which is a real ongoing liability and should be weighed rather than waved through.

### 3. A third party analytics service

Appfigures, Sensor Tower, App Radar and similar all connect to App Store Connect and present the data with trend lines and competitive comparison already built. They are quick to set up and they charge monthly.

Worth noting what you would be buying: mostly presentation, plus keyword and competitor tracking that the raw API does not give you. Whether that is worth a subscription for one app in its seventh week is a judgement about how much of your time the presentation saves.

### 4. Apple's own attribution, if you want to connect Instagram to installs

The gap that actually hurts is not "how many downloads" but "how many downloads came from Sima's reels". Answering that specifically needs campaign attribution rather than a total.

The cheap version is already partly in place: App Store links can carry a provider token and campaign parameters, and this repository already appends `ct=` to store links in places (`ct=web-schema` appears in the schema tests). Extending that convention to the link in the Instagram bio, with a distinct campaign token, would let App Store Connect's source breakdown separate social traffic from search traffic at no cost and no integration.

The expensive version is Apple's AdServices and AdAttributionKit, which is aimed at paid acquisition and is almost certainly more machinery than a five poet poetry app needs right now.

**If only one thing on this page gets done, the campaign token on the bio link is the one with the best ratio of effort to answer.** It is a link change, it needs no credentials, and it turns "1,335 accounts reached" into a number that can be divided by something.

---

## Secondary gap: LinkedIn

**Status: genuinely unresolved, and the ambiguity is the finding.**

The LinkedIn connector returned 403 on organisation ACLs. A 403 does not distinguish between the two possible causes:

1. No Hamdam company page exists, or
2. A page exists and the connector lacks the `r_organization_admin` scope.

These need opposite responses. The first means creating a page. The second means re authorising the connector with the right scope. Nobody should guess which.

**How to settle it in two minutes, without any tooling:** open `linkedin.com/company/hamdam` and variations in a browser while signed in as yourself. If a page exists you will see it. If it does not, LinkedIn will say so.

Two things wait on the answer:

- **The 10 August LinkedIn draft has nowhere to go.** It was generated, it passed both audit layers, and there is no destination for it. See the note on the stranded queue in the main report.
- **`sameAs` in the Organization schema has no LinkedIn entry.** The `seo-brand-entity` branch adds Instagram, X and the App Store listing and deliberately omits LinkedIn, because putting an unverified URL into structured data is precisely the failure the original no sameAs comment existed to prevent. Once the page is confirmed, it is a one line addition to `src/lib/schema.js` and one line in its test.

## Secondary gap: X

**Status: closed, no action available.**

Post analytics on X require an Enterprise plan. The account `Hamdam_au` is effectively unmeasurable at any tier Hamdam would plausibly pay for. Noted so that nobody spends another afternoon looking for the setting.

The only thing that can be measured about X, and it is not nothing, is referral traffic: links from X land on hamdam.com.au, and Search Console and any server side view of referrers will see them. That measures clicks through to the site, not impressions on the post, which is a much weaker signal but a real one.

---

## What this note is not

It is not a connection, a credential, or a recommendation to buy anything. Nothing has been connected and nothing has been signed up for. The remediation spec said to produce the options and stop, and that is what this is.
