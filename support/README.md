# Hamdam Support

A small, self-contained IT service desk for `support.hamdam.com.au` --
public ticket submission, email-in/email-out via `developer@hamdam.com.au`,
ITIL-style P1-P4 priority + SLA tracking, and a Cloudflare-Access-gated
agent dashboard. Everything -- schema, application code, email copy, deploy
tooling -- lives in this repo; the only things that live outside it are the
Cloudflare account resources (D1 database, DNS route, Access policy) and the
Composio Outlook connection, none of which git can hold.

This is a **separate Cloudflare Worker** from the main `hamdam-website`
site, deployed independently, so it never touches the main site's strict
CSP / static-asset / predeploy guarantees documented in the repo root
`AGENTS.md`. Same deploy discipline as that site, though: `npm run deploy`
here runs its own `scripts/predeploy-check.mjs` first and refuses a dirty
tree or an unpushed branch, for the same reason the root one exists (see
that script's header comment).

## Architecture

```
Requester ──(portal form)──► Worker ──► D1 ──► Graph ──► requester's inbox
Requester ──(email)────────► Outlook inbox ──► [cron, every minute] ──► Worker ──► D1
Agent ──(console reply)────► Worker ──► D1 ──► Graph ──► requester's inbox
```

* **Worker** (`src/`): Hono app. Public portal (`/`, `/tickets/:id`),
  admin console (`/admin/*`, Cloudflare-Access-gated), D1 reads/writes. It
  sends mail itself through Microsoft Graph, as `developer@hamdam.com.au`,
  and reads that mailbox on a one-minute cron. `outbound_emails` is still
  written first and only marked sent once Graph accepts it, so the queue
  remains the record and a failed send is visible rather than lost.
* **D1** (`migrations/0001_init.sql`): tickets, comments, requesters, the
  outbound send queue, and the inbound dedupe/checkpoint ledger. See that
  file's header comments for the reasoning behind each design choice.
* **ITIL engine** (`src/itil.ts`): impact x urgency -> P1-P4, plus the SLA
  policy table. Fully unit tested (`test/itil.test.ts`).
* **Assistant** (`src/agentPolicy.ts`, `src/assistantModel.ts`,
  `src/assistantReply.ts`): what the desk says back, in two halves that are
  deliberately not mixed. The *policy* half decides whether the assistant may
  answer at all -- never a P1 or P2, never after a request for a person,
  never past three turns -- and it is ordinary code with tests beside it, not
  a paragraph in a prompt. The *model* half decides the words, calling
  Cloudflare Workers AI (`llama-3.3-70b-instruct-fp8-fast`) with the reviewed
  knowledge base articles as its only source for anything Hamdam-specific,
  and general computing knowledge allowed for everything else. Answers that
  did not come from an article say so to the requester, because a reviewed
  answer and a model's confidence read identically on screen unless one of
  them admits which it is. Every model reply is validated before anyone
  reads it (`sanitiseModelReply`): an invented article id, a repeat of a
  question already asked, or wording that implies a person looked at the
  account all cause the reply to be thrown away and the keyword answer used
  instead. With no `AI` binding, on any inference failure, or once the daily
  call budget is spent, the whole thing degrades to the keyword matcher. The
  desk gets plainer. It never goes silent.
* **Mail** (`src/mailer.ts`, `src/inbound.ts`, `src/ingest.ts`): Graph
  app-only, both directions, with the ingestion logic kept pure so the
  interesting cases are testable without a mailbox. See "Reading the inbox"
  below. The hourly Claude Code Routine that used to do this is retired;
  `docs/email-routine.md` describes it and opens with a superseded banner.
* **Bilingual** (`src/i18n.ts`): the portal serves English at `/` and Persian
  at `/fa`, right to left. Language is a property of the ticket, decided once
  and followed by every later email.

## Deployed state (2026-08-01)

Live at **https://support.hamdam.com.au**. What exists on the Cloudflare
account, so the runbook below reads as history rather than pending work:

| Thing | Value |
|---|---|
| Worker | `hamdam-support` (separate from `hamdam-website`) |
| D1 database | `hamdam-support-db` / `0d2a8372-cf55-47d1-8491-e9398cfc0d14` |
| Custom domain | `support.hamdam.com.au` |
| Zone TLS | Always Use HTTPS **on**, min TLS **1.2**, SSL mode `full` |
| Access app | `Hamdam Support Admin` on `support.hamdam.com.au/admin`, 24h sessions |
| Access policy | Allow: a named list of individual addresses, set in Zero Trust. Not written down here: this repository is public, and a list of exactly which accounts open the console is a shopping list. Read it from the Access application. |
| Team domain | `wispy-art-3af8.cloudflareaccess.com` |

## Two queues, one desk

The desk answers questions about the Hamdam app and general computing
questions, and it does not owe them the same speed.

`detectTopic` in `src/itil.ts` reads which one a ticket is. A Hamdam ticket
cannot fall below **P3** however mildly it was described, because someone
hitting a problem with the product may be a day from deleting it. The floor
only ever raises: a Hamdam ticket the impact/urgency matrix already rated P1
or P2 keeps that rating. General questions keep whatever the matrix gave them
and are answered properly, not brushed off. They are a courtesy, and a
courtesy done badly is worse than one declined.

Topic is stored on the ticket rather than re-derived, because it sets an SLA
clock at creation. Re-deriving it later would let an edit to the term list
silently retime a promise already made.

## When email goes out

The portal is instant. Email is not, and the two are used for different
things.

* **On creation**: the acknowledgement, automatically.
* **On every portal reply**: nothing. The requester is watching the page and
  already has their answer. An email per turn produces a pile of
  half-finished threads about a problem that has since moved on.
* **When the state settles**: one email carrying the conversation. That is
  when they mark it solved, when a person takes the ticket over, or when they
  press "Email me this conversation" on the ticket page.

The settled-state email sends without anyone approving it, which is a
deliberate departure from draft-first and worth understanding. It contains
only the thread the requester has already read on their own screen. Nothing
in it is new, so there is nothing for a reviewer to catch that they have not
already seen. Assistant replies drafted for *email-originated* tickets, via
the console button, are still drafts: those go to someone who never chose to
talk to a machine.

### Reading the inbox

A cron trigger runs every minute and reads `developer@hamdam.com.au` through
Graph. New mail becomes a ticket with an acknowledgement and an assistant
reply inside that minute; a reply on an existing thread becomes a comment and
gets answered the same way. Same guards as the portal, because it is the same
function: P1 and P2 never reach the model, a Hamdam answer must cite a
source, closure requests are carried out rather than described.

This replaces the hourly Routine, and the reason is not only speed. The
Routine was a Claude session holding database credentials and a mailbox,
reading text written by strangers. That is the one place in this system where
attacker-authored input met tools, and it is now a function that reads a
sender, a subject and a body and cannot be argued into anything else.

Three things make a re-run safe, which matters because Cloudflare retries a
failed scheduled handler:

* `inbound_emails` is keyed on Outlook's `internetMessageId`, so a message is
  only ever processed once.
* The checkpoint advances only after a clean pass, and only as far as the
  newest message actually handled. Advancing it optimistically turns one bad
  run into permanently unread mail, which nobody notices until a requester
  asks why they were ignored.
* Mail from the desk's own address is skipped before anything else. Without
  that the desk emails a requester, reads its own message, files it as a
  ticket, and acknowledges it, forever.

Quoted history is stripped from replies, conservatively: cutting too little
leaves untidy text on a ticket, cutting too much loses what the person
actually wrote.

A message is marked read once the desk has finished with it, skips included:
a bounce has been dealt with as much as a real ticket has, and leaving those
unread fills the mailbox with exactly the traffic nobody needs to look at.
Marking happens *after* processing on purpose, so an unread message means one
thing only, "not handled yet", and the inbox is a second view of the queue
for free.

That write needs **`Mail.ReadWrite`** on the app registration, not
`Mail.Read`. With only read access everything else still works and the flag
silently will not stick, so a failure to mark is counted into the run summary
and written to `sync_state.last_ingest_error` rather than logged and lost.

Without the Graph secrets the cron does nothing at all.

### Delivery

The Worker sends directly, through Microsoft Graph, as
`developer@hamdam.com.au`. That is the real mailbox sending: the message
lands in its Sent Items next to anything a person sends by hand, and replies
come back to the same inbox the Routine already reads. Nothing about
receiving mail changed.

The queue is still the record. A row is written first and only marked `sent`
once Graph accepts it, so a failed send leaves an ordinary pending row that
the hourly Routine picks up exactly as it always did. Immediate delivery is
an improvement on the queue, not a replacement, and the failure mode is the
old behaviour rather than a lost email. Failures are marked `failed` with the
reason from Graph, because a row with no explanation is what wastes an
afternoon.

Three secrets turn it on. Without them every row simply waits for the
Routine, which is what CI and local development do:

```
npx wrangler secret put GRAPH_TENANT_ID
npx wrangler secret put GRAPH_CLIENT_ID
npx wrangler secret put GRAPH_CLIENT_SECRET
npm run deploy
```

They come from an app registration in Entra ID (Azure portal, Microsoft Entra
ID, App registrations, New registration; then API permissions, Microsoft
Graph, **Application** permissions, `Mail.Send` and `Mail.ReadWrite`, and
Grant admin consent;
then Certificates and secrets for the value). `Mail.Send` as an application
permission grants send-as rights for *every* mailbox in the tenant, so scope
it down to this one with an application access policy:

```
New-ApplicationAccessPolicy -AppId <client-id> -PolicyScopeGroupId developer@hamdam.com.au `
  -AccessRight RestrictAccess -Description "Hamdam support desk"
```

**Not applied. Reviewed and set aside on 2026-08-02.** The credential in use
can therefore send as any mailbox in the tenant, from a Worker reachable on
the public internet. That is a known and accepted position, not an oversight;
see the closing section of `docs/build-record.md`.

### The domain's mail security, and the one bit of it this Worker serves

The `hamdam.com.au` zone was hardened on 2026-08-02: SPF `-all`, Exchange
DKIM, DMARC `p=reject` with reports to `dmarc@hamdam.com.au`, CAA, TLS-RPT.
All of that is DNS and none of it is in this repository. The record of what
was applied and why is in `docs/build-record.md`.

One piece is not DNS and therefore lives here. **MTA-STS** tells sending mail
servers to require validated TLS to this domain, and RFC 8461 deliberately
does not let a domain say that in DNS alone, because DNS without DNSSEC is
forgeable by the same attacker the policy is defending against. The DNS
record carries only a version and an id; the policy itself is fetched over
HTTPS from a fixed hostname, and the certificate is what proves it is
genuine.

So this Worker answers on a second custom domain:

```
https://mta-sts.hamdam.com.au/.well-known/mta-sts.txt
```

and nothing else on that hostname: every other path is a 404, so the portal
never appears at a second address. The handler is mounted **above the country
check**, because the servers that read this file are wherever the sender's
mail happens to be hosted, and refusing them the policy would refuse the
mail. See `src/mtaSts.ts`.

The DNS half, which `wrangler deploy` does not manage:

```
_mta-sts.hamdam.com.au   TXT   "v=STSv1; id=20260802a;"
```

**The id is a cache key, and it is the thing that gets forgotten.** A sender
re-reads the cheap TXT record often and refetches the policy only when the id
changes. Edit the policy without changing the id and the edit reaches nobody
until every cached copy expires, up to `max_age` away. Changing the policy is
always three edits together: `src/mtaSts.ts`, `MTA_STS_POLICY_ID`, and the
TXT record.

**The policy is in `testing` mode.** A sender that cannot make a validated
TLS connection still delivers, and files a TLS-RPT report about it. `enforce`
is the destination and the reports are already coming to
`dmarc@hamdam.com.au`; promoting is `MTA_STS_MODE`, a new id, the TXT record,
and a deploy. Do not promote without reading the reports first: an MTA-STS
policy in enforce mode with a wrong MX pattern stops inbound mail reaching
the desk, and nothing arriving looks exactly like a quiet day.

### Knowing whether the desk is still reading its mail

`ingestInbox` writes `last_ingest_at` into `sync_state` after every pass where
Graph answered, including passes that found nothing. Including those is the
entire point: before this, a quiet mailbox and a dead cron left the same
trace, which was none, and the difference between them is the difference
between a slow week and customers being ignored.

Two things read it, and they fail in different directions on purpose.

**The console** shows a banner when the last pass is more than ten minutes
old. That reaches the person who can act, and it is the one that works when
the cron is fine and Graph is not.

**`GET /health`** answers `ok` with 200, or `stale` with 503, and nothing
else: no counts, no timestamps, no error text. It is public, cached for
thirty seconds, and served above the country check, because an uptime monitor
runs wherever its provider runs and a health check reachable from seven
countries reports an outage every time the monitor moves.

Point a free external monitor at it. That is the half that still works when
the Worker is what broke, and nothing inside this system can cover that case:
if the cron is dead, the cron cannot tell you the cron is dead.

Ten minutes is chosen from both ends. The cron fires every minute, so ten
missed passes is a stopped one rather than a slow one, and it absorbs the
occasional skipped invocation that Cloudflare does not promise against.

The older `last_run_status`, `last_run_started` and similar keys in
`sync_state` were written by the hourly Routine, which was retired on
2026-08-02. They have been frozen since and are not health. Read
`last_ingest_at` and `last_ingest_error`.

### Smoke-testing against production

Use `@example.com` for the requester address. Never a real mailbox, and
never the desk owner's.

That domain is reserved by RFC 2606 and undeliverable, so the acknowledgement
queues, the routine tries to send it, and it goes nowhere. Everything else
about the test is identical.

This is written down because the alternative was tried. Testing the assistant
on 2026-08-02 used the owner's real address for the requester, the hourly
routine drained the queue mid-test, and four acknowledgement emails for
tickets that no longer existed arrived in their inbox. Deleting the ticket
rows afterwards did not recall them: the queue is a queue, and once a row is
marked sent the mail is gone.

Requesters are keyed on email, so reusing a real address also overwrites that
person's name with whatever the test form said. Check the `requesters` table
after any test that used one.

Delete test tickets when finished, child rows first, or the foreign keys
refuse:

```
npx wrangler d1 execute hamdam-support-db --remote --command \
  "DELETE FROM outbound_emails WHERE ticket_id = N; \
   DELETE FROM comments WHERE ticket_id = N; \
   DELETE FROM ticket_agent_state WHERE ticket_id = N; \
   DELETE FROM tickets WHERE id = N;"
```

Assistant verified against production on 2026-08-02: a Windows 11 password
question answered from general knowledge with the "this is general advice"
line attached, a sign-in ticket answered from the reviewed article and
recorded as such, and a P1 escalated by the priority gate without a model
call being spent. Test tickets removed afterwards.

Verified against production: HTTPS 200, HSTS/CSP/XFO/nosniff all present,
a submitted ticket classified P1 from high impact + high urgency, a wrong
tracking token 404s, the public portal reachable, and `/admin` 302s to the
Access login for anonymous visitors, for a forged
`Cf-Access-Authenticated-User-Email` header, and for a forged
`Cf-Access-Jwt-Assertion` alike -- none of which reach the Worker at all,
since Access rejects them at the edge before the Worker's own JWT check
gets a turn.

**Still outstanding:** no email flows yet. Acknowledgements queue in
`outbound_emails` with `status='pending'` and stay there until the Routine
runs; ticket HAM-1 already has one waiting, which makes it a ready-made
first test. See `docs/email-routine.md`, including the connector-grant gap
that is the last genuinely manual step in this whole build.

SSL mode is `full` rather than `full (strict)`. For this zone the
distinction is academic: every hostname is Worker-backed, so requests
terminate at the edge and no origin certificate is ever validated. Worth
flipping only if a real origin server is ever added to the zone.

## HTTPS

Enforced in two independent places, because the tracking token in
`/tickets/:id?token=...` is the only credential guarding a ticket and it
travels in the query string. One plaintext request leaks a working
credential, so this is worth more than the usual belt-and-braces.

* **At the edge**: Cloudflare's "Always Use HTTPS" plus Universal SSL,
  configured once in the dashboard (step 5 of the deploy runbook).
* **In the Worker**: `src/index.ts` 301s any plaintext request before a
  handler runs, and `src/urls.ts` forces `https://` into every emailed
  tracking link regardless of the scheme of the request that generated it.
  A downgraded request is a reason to hand back a secure link, not to
  propagate the downgrade.

HSTS is sent on every response but is not load-bearing on its own: browsers
ignore `Strict-Transport-Security` when it arrives over plaintext, and it
does nothing on a first-ever visit. The redirect is what makes that first
request safe. (The main site sets HSTS with `includeSubDomains` on the
apex, so once that's preloaded, browsers force https here too -- a third
layer, but only for visitors whose browser already knows the apex.)

One trap worth knowing before changing any of this: **`wrangler dev`
reports the custom domain from `wrangler.jsonc` as the request Host**, so
`http://localhost:8787/` arrives at the Worker looking like
`http://support.hamdam.com.au/`. Detecting local dev by hostname therefore
silently never fires and 301s your dev server to production. The redirect
keys off the presence of Cloudflare's `CF-Ray` header instead, which the
edge always sets and overwrites, and which wrangler dev never sends.

## Agent console authentication

`/admin/*` verifies the **signed** Cloudflare Access assertion
(`Cf-Access-Jwt-Assertion`): RS256 signature checked against the team's
published keys, plus `aud`, `iss` and expiry. It does not trust
`Cf-Access-Authenticated-User-Email`.

That distinction is the whole point. Cloudflare sets and overwrites the
email header for paths an Access policy actually protects, but for any path
it does not protect, a client-supplied
`Cf-Access-Authenticated-User-Email: anyone@example.com` passes straight
through to the Worker. Trusting it would leave the console open in exactly
the situations you least want: between deploying and configuring Access,
and any time the policy is later removed, renamed, or scoped to the wrong
path. The queue holds requesters' names, addresses, and whatever they
pasted into a ticket, so it should not be one dashboard mistake away from
public.

Two consequences worth knowing:

* **Unconfigured means closed.** With `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD`
  unset the console returns 503, not a weaker check. A fallback is exactly
  the state an attacker would try to induce.
* **Local development needs an escape hatch**, since there's no Access in
  front of `wrangler dev`. Copy `.dev.vars.example` to `.dev.vars` and set
  `DEV_ADMIN_EMAIL`. That bypass is honoured only for requests with no
  `CF-Ray` header, which every real edge request carries, so it cannot open
  the console on the deployed site. `.dev.vars` is gitignored.

## Where the portal answers from

Set in `ALLOWED_COUNTRIES` in `wrangler.jsonc`. Currently Australia, New
Zealand, Iran, the UAE, the United Kingdom, the United States and the
Netherlands: Hamdam is a Persian poetry app sold from Brisbane, so the
audience is the diaspora as much as the local market.

The portal is the one unauthenticated, internet-facing part of this system.
Everywhere outside that list is refused, not because those visitors are
suspect but because serving a country nobody is selling to is exposure bought
for nothing.

Two locks, deliberately:

1. **A Cloudflare WAF custom rule**, which stops the request at the edge
   before a Worker runs. This is the one that actually saves anything, and it
   also covers the Cloudflare Access login page, which the Worker never sees.
2. **The same list in `src/geo.ts`**, checked in middleware. A WAF rule is one
   dashboard click from being deleted by someone tidying up, and that failure
   is silent. Same reasoning as the HTTPS redirect living in the Worker
   despite the zone setting.

The WAF rule, in **Security, WAF, Custom rules, Create rule** on the
`hamdam.com.au` zone:

```
Field       Hostname          equals  support.hamdam.com.au
  and
Field       Country       not in     Australia, New Zealand, Iran,
                                       United Arab Emirates, United Kingdom,
                                       United States, Netherlands
Action      Block
```

Expression form, if editing as text:

```
(http.host eq "support.hamdam.com.au" and not ip.src.country in {"AU" "NZ" "IR" "AE" "GB" "US" "NL"})
```

### The rate limiting rule (not yet created)

The country rule above is the only custom rule on this zone, and it answers a
different question. Everything else is counted *inside* the Worker, in
`src/rateLimit.ts`, which means every attempt, including every attempt the
limiter refuses, still costs a Worker invocation and a write to the
`rate_limits` table. The counter is a real control sitting on the wrong side
of the wall from the things it protects.

Create this in **Security, WAF, Rate limiting rules**:

```
If incoming requests match:
  (http.host eq "support.hamdam.com.au" and http.request.method eq "POST")

Characteristics:  IP
Period:           1 minute
Requests:         30
Then:             Block
Duration:         1 minute
```

Thirty a minute is far above anything a person does. Submitting a ticket is
one POST; a fast back-and-forth on the tracking page is a handful. It is also
far below what makes a flood worth running, and it costs the attacker at the
edge rather than costing us a Worker and a database write each time.

Deliberately scoped by hostname, the same as the country rule and for the same
reason: `hamdam.com.au` and `mta-sts.hamdam.com.au` are different Workers with
different jobs, and a rule that quietly covered the marketing site would be
found the hard way. Deliberately POST-only, because the expensive paths all
write, spend a model call, or send mail, and a GET flood on a static portal
page is Cloudflare's problem rather than ours.

On a free zone plan only one rate limiting rule is allowed, so create this one
first. If a second becomes available, `(http.host eq
"support.hamdam.com.au")` at 300 requests a minute per IP catches the
remaining shape, which is a GET flood spending Worker invocations.

This does not replace the in-Worker counters and is not meant to. Those
enforce the policy that matters, five tickets an hour to one recipient, and
they keep working if the rule is ever deleted. The same two-locks argument as
everywhere else in this file.

Unknown origins are refused, not waved through. Cloudflare reports `XX` when
it cannot place an address and `T1` for Tor, and treating "we do not know" as
"probably fine" would make the whole rule decorative.

**Email is not restricted, on purpose.** A customer travelling overseas still
reaches the desk at `developer@hamdam.com.au`, the cron opens their ticket
within the minute, and the blocked page says exactly that. A refusal with no
route through is just a wall.

Two consequences worth knowing before this bites:

* An agent travelling outside the list cannot open `/admin`, even signed in
  through Access. Widen `ALLOWED_COUNTRIES` and the WAF rule for the trip, or
  work the queue by email.
* A customer outside the list cannot open their own tracking link. They get the
  blocked page, which tells them to email, and their ticket continues in that
  thread.

## Known residual risks

Fixed and covered by tests: Access identity forgery, plaintext tracking
links, reflected HTML injection in the queue filters, and CSRF on the
console's state-changing posts. What is *not* addressed in v1:

* **The public ticket form is unauthenticated and unthrottled.** Anyone can
  submit unlimited tickets, and each one queues an outbound email, so it
  doubles as a way to flood the desk or bounce mail at a forged address.
  There is no in-Worker rate limiting (that needs KV or a Durable Object).
  The cheap fix is a Cloudflare **Rate Limiting rule** on `POST /tickets` in
  the dashboard -- worth adding before publicising the URL. Since the same
  endpoint now spends money on a model call, there is a crude second control
  in the meantime: `assistant_usage` caps model calls per UTC day
  (`ASSISTANT_DAILY_CALL_LIMIT`, default 200), above which replies come from
  the keyword matcher. That bounds the bill. It does not bound the mail, so
  the edge rule is still the fix.
* **The routine reads attacker-authored text with tools attached.** Inbound
  email is fed to a Claude session holding database and send-mail tools, so
  a crafted message is a prompt-injection attempt by construction. The
  prompt now opens with a standing rule that mail is data and never
  instructions, and the SQL it may run is enumerated. That reduces the risk;
  it does not eliminate it. Keep the D1 token scoped to D1 alone, and read
  the routine's run summaries rather than assuming they are boring.
* **Tracking tokens are compared with `!==`.** Not constant-time. With 122
  bits of entropy from `crypto.randomUUID()` and network jitter swamping the
  timing signal, this is theoretical, but it is a real difference from a
  constant-time compare if the threat model ever changes.
* **No audit log of agent actions.** Replies are attributed to the verified
  Access email, but status and priority changes are not recorded anywhere
  with an actor. Fine at one agent; add an audit table before adding a team.

## Local development

```
cp .dev.vars.example .dev.vars   # gives /admin a local identity
npm install
npm run db:migrate:local
npx wrangler dev --local
```

Then visit `http://localhost:8787/` for the portal and `/admin` for the
console, which uses the `DEV_ADMIN_EMAIL` identity from `.dev.vars`. Without
that file `/admin` returns 503, which is the same fail-closed behaviour the
deployed Worker has before Access is configured.

The assistant runs without inference locally: `wrangler dev --local` has no
`AI` binding, so replies come from the keyword matcher, which is also what
CI runs against. Use `npx wrangler dev --remote` to exercise the model path,
and remember that local tickets then spend the same daily allocation
production does.

## The assistant, and what it costs

Nothing. Workers AI is included in the free Workers plan this Worker already
runs on: **10,000 neurons per day, reset at 00:00 UTC**, no card and no API
key. A support reply costs roughly 80 neurons, so the free allocation is
about **120 assisted replies a day**. Past that, Cloudflare returns an error
and the desk answers from the keyword matcher instead, which is also what
`ASSISTANT_DAILY_CALL_LIMIT` (default 200) is there to keep bounded.

There is nothing to turn on. The `ai` binding in `wrangler.jsonc` is the
whole configuration, and `npm run deploy` is the whole install.

One wart worth knowing before you touch `assistantModel.ts`: Cloudflare
documents JSON mode as supported on this model and rejects every such
request with `4009: an internal server error occured`, whatever the schema.
So the call asks twice: once with `response_format`, and once in plain text
with the shape described in the final turn. Only the second attempt has ever
succeeded in production. Both are kept because the first costs nothing when
it fails and will start working the day Cloudflare fixes it. The format
instruction lives in the *last* turn on purpose: in the system prompt it was
ignored on exactly the tickets that mattered, where the model had articles to
work from and wrote an excellent support answer in prose and no JSON.

What this buys, and what it does not:

* It answers questions no article covers. That was the point: "how does
  Windows 11 password reset work" used to come back as "outside what I have
  written down", which is honest and useless.
* It is a smaller model than a frontier one, so the writing is plainer and
  it will occasionally be clumsy. The prompt is written for that: shorter
  rules, and a standing instruction to escalate when it is between an answer
  and a handover rather than to reason its way to one.
* It is not a source of truth about the app. Reviewed articles are, and the
  model may not add Hamdam-specific steps that are not in one. Anything
  needing a look at the requester's account is an escalation by rule, in
  code, because the model cannot see an account and should not imply it can.

To turn the writing off without touching code, delete the `ai` block from
`wrangler.jsonc` and redeploy. Every reply then comes from the keyword
matcher, which is the state the desk shipped in and is fully tested.

## First deploy, step by step

1. **Authenticate wrangler** (once, interactively):
   ```
   npx wrangler login
   ```

2. **Create the D1 database:**
   ```
   npx wrangler d1 create hamdam-support-db
   ```
   Copy the `database_id` it prints into `wrangler.jsonc`'s
   `d1_databases[0].database_id`, replacing the `REPLACE_WITH_D1_DATABASE_ID`
   placeholder. Commit that change.

3. **Apply the schema to the real database:**
   ```
   npm run db:migrate:remote
   ```

4. **Point DNS at this Worker.** `wrangler.jsonc` already declares the
   `support.hamdam.com.au` custom domain route; if `hamdam.com.au`'s zone is
   on this Cloudflare account (it is, per the main site's setup), deploying
   (step 7) will provision the DNS record automatically. If it errors
   asking you to add the domain to the zone first, do that in the
   Cloudflare dashboard, then redeploy.

5. **Confirm HTTPS is on at the edge.** The Worker already refuses to serve
   plaintext (see "HTTPS" below), but these zone settings are what stop an
   http request from ever reaching it, and they're one dashboard toggle
   away from being off. In the Cloudflare dashboard for the `hamdam.com.au`
   zone:
   * **SSL/TLS -> Overview**: encryption mode **Full (strict)**. The
     certificate itself needs no work: Universal SSL covers one level of
     subdomain, so `support.hamdam.com.au` is issued automatically when the
     custom domain is created in step 4.
   * **SSL/TLS -> Edge Certificates -> Always Use HTTPS**: **on**. This is
     the edge-level http-to-https redirect.
   * **SSL/TLS -> Edge Certificates -> Minimum TLS Version**: **1.2**.

   The settings can be applied now, but **verification has to wait until
   after the deploy in step 7**, and the real deploy is the only place it
   can happen: `wrangler dev` rewrites both the Host and the `Location`
   header, so a local check proves nothing. Once step 7 is done:
   ```
   curl -sI http://support.hamdam.com.au/ | grep -i "^HTTP/\|^location"
   curl -sI https://support.hamdam.com.au/ | grep -i "strict-transport-security"
   ```
   Expect a 301 to the `https://` URL, and an HSTS header on the https
   response.

6. **Protect `/admin/*` with Cloudflare Access**, in the Cloudflare
   dashboard (Zero Trust -> Access -> Applications -> Add an application ->
   Self-hosted):
   * Application domain: `support.hamdam.com.au`, path `/admin*`
   * Policy: Allow, include -- Emails: list the people who should have
     agent access (you, any teammates)
   * Identity provider: whatever you already use for Cloudflare Access
     (Google/GitHub/one-time PIN all work)

   Then tell the Worker which application to trust, or it will keep
   returning 503 (by design -- see "Agent console authentication" above).
   From the application's page copy its **AUD tag**, and from Zero Trust ->
   Settings copy your **team domain**, then fill both into
   `wrangler.jsonc`'s `vars`:
   ```jsonc
   "vars": {
     "ACCESS_TEAM_DOMAIN": "yourteam.cloudflareaccess.com",
     "ACCESS_AUD": "<the application's AUD tag>"
   }
   ```
   Commit and push that (the pre-deploy check requires it), then deploy in
   step 7. Neither value is a secret: the AUD identifies the application, it
   does not authorise anything by itself.

   The policy itself is a dashboard-only step -- there's no Terraform/API
   call for it in this repo, because it's a one-time decision, not something
   that should change on every deploy.

7. **Deploy:**
   ```
   npm run deploy
   ```

8. **Create a D1-scoped API token** for the email Routine (dashboard ->
   My Profile -> API Tokens -> Create Token -> Custom token):
   * Permissions: Account -> D1 -> Edit
   * Account Resources: restrict to this one account
   * (Optionally restrict by IP if the Routine's environment has a stable
     egress range)

   Set `CLOUDFLARE_API_TOKEN` (this token) and `CLOUDFLARE_ACCOUNT_ID`
   (visible on any Cloudflare dashboard page's URL or the API Tokens page)
   as environment variables on whichever Claude Code Remote environment the
   email Routine fires into. `scripts/db-query.mjs` reads both.

9. **Fix the Routine's connector access, then enable it.** A placeholder
   Routine (`trig_01NfRL7j2y8h7LeYz6AuVBBc`) exists but currently has **no
   Composio connector grant** -- a platform limitation hit while building
   this, not a step you skipped. Read "Known gap" in
   `docs/email-routine.md` for the fix (recreate it from the claude.ai
   Routines UI, which supports picking connectors at creation time). Once a
   working Routine exists, enable its schedule:
   ```
   update_trigger(trigger_id: "<the working trigger's id>", cron_expression: "0 * * * *")
   ```
   (`0 * * * *` = top of every hour, the Cloudflare Routines floor.) Fire it
   once manually first with `fire_trigger` and check the results (see
   "Testing a run manually" in `docs/email-routine.md`) before trusting the
   schedule.

## Known simplifications (v1, intentional)

* **SLA clocks are wall-clock, not business-hours-aware.** A P3 opened at
  11pm Friday is "due" mid-Monday by the wall clock, not by a business-hours
  calendar. Documented in `src/itil.ts`; upgrading to a real business-hours
  calendar is a fast-follow, not a bug.
* **The email side polls hourly, not real-time.** See
  `docs/email-routine.md`. This is the direct consequence of using the
  Composio/Outlook connection (agentic, tool-call-driven) instead of
  Cloudflare Email Routing + Workers (real-time, webhook-driven) for
  inbound mail -- a deliberate choice for this v1, not an oversight.
* **English only.** The main site is bilingual (EN/FA, RTL); this desk
  isn't yet. Bilingual ticketing (Farsi-speaking requesters, RTL layout in
  the portal and dashboard) is a real fast-follow, scoped out of v1 to keep
  the first version shippable.
* **No file attachments.** Requesters can't attach screenshots yet, on the
  portal or via email. `OUTLOOK_ADD_MAIL_ATTACHMENT` exists on the Outlook
  side if this becomes a priority.
* **Failed outbound emails aren't surfaced in the dashboard.** They're
  recorded (`outbound_emails.status = 'failed'`, with a reason), but nothing
  currently alerts on them -- check that table's contents periodically until
  this gets a dashboard view.
* **No per-agent roles.** Identity is real (the Access JWT is verified, and
  the verified email is what gets attributed on replies), but there are no
  permissions on top of it: whoever Access lets in can act on any ticket.
  Fine for a small IT desk, worth revisiting if the team grows.
