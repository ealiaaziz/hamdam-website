## Current state (Phase W1, shipped 2026-07-13)

Cinematic warm-dawn bilingual landing site for the 2 August 2026 app launch.
Astro 7 + Tailwind v4, deployed to hamdam.com.au as a **Cloudflare Worker with
Static Assets** (corrected 2026-07-21 -- this line previously said "Pages" and
"on push to main"; both were wrong. There is no CI/CD: every deploy is a
manual `npm run deploy`, and pushing to `main` alone deploys nothing. Deploy
via that npm script, never a bare `wrangler deploy` -- it runs
`scripts/predeploy-check.mjs` first, which blocks deploying a dirty tree or an
unpushed branch. Added 2026-07-25 after a deploy shipped four unpushed commits
to production). EN at `/`, Farsi (RTL, Vazirmatn) at `/fa/`. Scroll-driven sunrise
hero: pure timeline logic in `src/lib/cinematic.js`, night → morning over the
first 100vh, reduced-motion renders static morning; pin with `?dawn=N` for
review. Locale logic in `src/lib/locale.js`; store link state in
`src/lib/appStore.js` — `APP_STORE.RELEASED` is the launch-day flip that swaps
the "Coming soon" pill for the official badge. Verses come byte-exact from the
iOS app's verse bank via generated `src/data/verses.ts`; Farsi hero copy from
generated `src/data/siteCopy.ts`. Never hand-type Persian — regenerate.
`npm test` (Vitest, 60 cases) and `npm run check:persian` (also a pre-commit
hook) must pass. OG images/icons regenerate via `node scripts/generate-og.mjs`.
CSP is enforcing (`public/_headers`): no inline styles or scripts, so keep
`inlineStylesheets: 'never'` and `assetsInlineLimit: 0` in astro.config.

**Outbound-host rule (added 2026-07-28):** the privacy policy's third-party
services section (`/privacy/` §5, mirrored in `/terms/` §12) is an exhaustive
list of every host the iOS app contacts. Any new outbound host in the app
updates both sections in the same commit that introduces it. As of 2026-07-28
the set is: `en.wikipedia.org`, `upload.wikimedia.org`, `itunes.apple.com`,
`music.apple.com`, `date.nager.at`, plus Apple framework traffic (iCloud,
HealthKit, EventKit, WeatherKit, StoreKit, MusicKit, Foundation Models).
`date.nager.at` is the only non-Apple service.
History and verification matrix: `docs/progress.md`.

**Continuing the redesign:** everything in `docs/website-redesign/33-universal-roots-and-homepage-handoff.md`
shipped 2026-07-25 and is live. What remains is in
`docs/website-redesign/34-next-steps.md` — read that first. Deploy with
`npm run deploy`, never a bare wrangler call; see `.claude/hooks/README.md`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Support desk (`support/`, shipped 2026-08-02)

A **separate Worker** (`hamdam-support`) and D1 database on
support.hamdam.com.au. It shares this repo and nothing else: the marketing
site is untouched by it, and the two deploy independently. `cd support &&
npm run deploy`, never from the repo root.

Bilingual IT ticketing: portal at `/` and `/fa`, email in and out through
Microsoft Graph as developer@hamdam.com.au, an assistant on Cloudflare
Workers AI, ITIL P1-P4 with a P3 floor for anything about the app.

Read `support/docs/build-record.md` before changing it. Three rules from
there are worth repeating here because breaking them is expensive:

1. **Rules go in code, not the prompt.** The P1/P2 gate, the handover on
   request, the turn limit and the refusal to answer a Hamdam question
   without a source are all checked before the model is consulted. That is
   what made swapping the model a one-line change.
2. **Never state a fact about the app you cannot cite.** `support/kb/reference/`
   files carry a `source:` field pointing at a reviewed page in this repo.
   The knowledge base this replaced invented a sign-in screen and told people
   bundled verses needed the internet, and both reached real requesters.
3. **Smoke-test with `@example.com`.** Using a real address once sent four
   acknowledgements for tickets that no longer existed. Deleting the row does
   not recall the mail.

`npm test` (334 cases), `npm run check:persian` and `node
scripts/check-dashes.mjs` all cover `support/` and must pass.

**Inbound email is not an identity (added 2026-08-02, completed the same
day).** A message may only be appended to an existing ticket when Exchange
authenticated the sender's address *and* that address matches the ticket's
requester. Both halves are needed and the first was missing at first:
matching a `From` header proves nothing on its own, because `From` is a line
of text the sending client writes. `src/authResults.ts` reads the
`Authentication-Results` header Exchange stamps on delivery, and consults
only the header Exchange itself produced, because a sender can put one in the
message they compose. The `[HAM-N]` subject tag is a routing hint, never a
credential: ids are sequential and printed in every email the desk sends, so
before this check anyone could write onto, and close, a stranger's ticket by
guessing a number. A tag from a non-owner, or from a sender Exchange could not
authenticate, creates a new ticket instead.

**Metering folds addresses; authorisation never does.** `meteringSubject` in
`src/rateLimit.ts` strips plus-tags and folds Google's dots, and IPv6 counts
per /64, because otherwise one inbox is unlimited buckets and one caller is
unlimited addresses. `sameAddress` in `src/inbound.ts` and the `ADMIN_EMAILS`
check stay literal for the opposite reason: folding widens a set, which is
right for counting and wrong for deciding who somebody is. One ceiling,
`outbound_recipient`, caps mail to any one address at the act of sending,
which is the single point the portal, the mailbox and anything added later
all cross. Escalation is exempt by address.

**The console has two locks, and the second one is off until a secret is
set.** `ADMIN_EMAILS` is checked in the Worker after the Access assertion
verifies, so widening the Cloudflare Access policy does not silently widen
the console. Unset admits whoever Access admits and the console says so on
every page. Set it with `npx wrangler secret put ADMIN_EMAILS`.

**`/fa` is not an alias for `/admin`, however the path is spelled.**
Cloudflare Access is scoped to the path `/admin`, so a locale-prefixed alias
reached the console without Access seeing it. `localePrefixTarget` in
`src/urls.ts` holds the exclusion list and anything under `/admin` inherits
it. The comparison runs on a **canonical** path, not the raw one: the first
version of this fix compared the raw pathname while the router matches the
decoded one, so `/fa/%61dmin` walked straight past it and reached the console
in production. Decode once, collapse slashes, resolve dot segments,
lowercase, then compare.

**Anything a stranger types is validated and metered (added 2026-08-02).**
The portal is the only surface anyone on the internet can reach, and every
submission makes developer@hamdam.com.au deliver mail to an address the
submitter chose. So: `src/validation.ts` checks the address shape and caps
every field, and `src/rateLimit.ts` counts submissions per caller *and per
recipient* against the `rate_limits` table. A new public route that stores
text, spends a model call or sends an email goes through both. The limiter counts
`CF-Connecting-IP` but *gates* on `CF-Ray`: it limits nothing when CF-Ray is
absent, because `wrangler dev` supplies CF-Connecting-IP as 127.0.0.1 and
counting it would throttle local development. Two different headers doing two
different jobs, and this file said the wrong one until an audit read the code
on 2026-08-02.

**DMARC is `p=reject` (applied 2026-08-02).** The `hamdam.com.au` zone was
hardened the same day: `p=reject` with relaxed alignment and reports coming
to `dmarc@hamdam.com.au`, ten CAA records, TLS-RPT, and five stale Skype and
GoDaddy-marketing records deleted. That means anything sending as this
domain which is not Exchange Online is now refused rather than junked, so a
new sender needs SPF or DKIM arranged before its first message, not after.
MTA-STS is live too, and it is the one piece that is code rather than DNS:
RFC 8461 requires the policy be fetched over HTTPS, so the support Worker
serves it on a second custom domain, `mta-sts.hamdam.com.au`, above the
country check and 404ing every other path there. It is in `testing` mode; the
mode, `MTA_STS_POLICY_ID` in `support/src/mtaSts.ts` and the `_mta-sts` TXT
record change together or not at all, because that id is the cache key
senders use to decide whether to refetch. The full record, including what is
still open, is in `support/docs/build-record.md`.

Four follow-ups were raised at handover and all four were reviewed and closed
without action on 2026-08-02. Two matter before you touch the mail path: the
Graph client secret has not been rotated since setup, and `Mail.Send` is
unscoped, so it grants send-as for every mailbox in the tenant. Both are
deliberate and recorded in the closing section of
`support/docs/build-record.md`. A security review the same day is recorded in
the section below it: read that before deciding a control is missing, because
some of them are there now and some were weighed and left alone.
