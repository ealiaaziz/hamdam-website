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
Requester ──(portal form)──► Worker ──► D1 ──► queued outbound_emails row
Requester ──(email)────────► Outlook inbox ──► [hourly Routine] ──► D1
Agent ──(dashboard reply)──► Worker ──► D1 ──► queued outbound_emails row
                                                        │
                              [hourly Routine, via Composio Outlook] ──► requester's inbox
```

* **Worker** (`src/`): Hono app. Public portal (`/`, `/tickets/:id`),
  admin console (`/admin/*`, Cloudflare-Access-gated), D1 reads/writes. It
  never sends email itself -- Workers cannot call Composio/MCP tools -- it
  only writes rows to `outbound_emails` for the Routine to pick up.
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
  `claude-sonnet-5` with the reviewed knowledge base articles as its only
  source for anything Hamdam-specific, and general computing knowledge
  allowed for everything else. Every model reply is validated before anyone
  reads it (`sanitiseModelReply`): an invented article id, a repeat of a
  question already asked, or wording that implies a person looked at the
  account all cause the reply to be thrown away and the keyword answer used
  instead. With no `ANTHROPIC_API_KEY` set, or on any API failure, or once
  the daily call budget is spent, the whole thing degrades to the keyword
  matcher. The desk gets plainer. It never goes silent.
* **Hourly Routine**: the only thing that can reach Composio/Outlook. Reads
  new inbox mail, creates/updates tickets, sends the queued outbound email.
  Full design and the exact prompt: `docs/email-routine.md`. **Read that
  file's "Why a Routine, not a webhook" section before assuming this is a
  real-time pipeline -- it isn't, by construction.**

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
| Access policy | Allow: `azizollahi@live.com`, `developer@hamdam.com.au` |
| Team domain | `wispy-art-3af8.cloudflareaccess.com` |

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

The assistant runs without a credential locally: with no `ANTHROPIC_API_KEY`
in `.dev.vars` it answers from the keyword matcher, which is also what CI
runs against. Add the key to `.dev.vars` only if you want to exercise the
model path, and remember that every local ticket then costs a real call.

## Turning the assistant on

The model-backed replies need one secret, and it is the only setup step:

```
npx wrangler secret put ANTHROPIC_API_KEY   # paste an Anthropic API key
npm run deploy
```

Until that is set the desk works exactly as it did before: tickets, SLAs,
console, email queue, and keyword-matched replies. Setting it changes what
the assistant *says*, not what it is *allowed* to do -- the P1/P2 gate, the
handover on request, and the three-turn limit are in `agentPolicy.ts` and
run before the model is consulted, so they hold either way.

Two knobs, both optional, both plain config in `wrangler.jsonc`:

* `ASSISTANT_DAILY_CALL_LIMIT` -- model calls per UTC day (default 200).
  Above it, replies come from the keyword matcher rather than stopping.

To turn the assistant's writing back off without redeploying code, delete
the secret (`npx wrangler secret delete ANTHROPIC_API_KEY`) and redeploy.

Run tests with `npm test` (vitest). Covered: the ITIL matrix and SLA policy,
the URL/HTTPS rules, Access JWT verification (against a generated keypair,
so the signature path is exercised for real rather than mocked), and the
`scripts/*.mjs` CLI wrappers.

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
