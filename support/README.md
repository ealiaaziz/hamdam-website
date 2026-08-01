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
* **Hourly Routine**: the only thing that can reach Composio/Outlook. Reads
  new inbox mail, creates/updates tickets, sends the queued outbound email.
  Full design and the exact prompt: `docs/email-routine.md`. **Read that
  file's "Why a Routine, not a webhook" section before assuming this is a
  real-time pipeline -- it isn't, by construction.**

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

## Local development

```
npm install
npm run db:migrate:local
npx wrangler dev --local
```

Then visit `http://localhost:8787/` for the portal, or hit `/admin` with a
`Cf-Access-Authenticated-User-Email` header set (curl or a browser extension
-- there's no real Access locally, so this header is how you simulate it):

```
curl -H "Cf-Access-Authenticated-User-Email: you@hamdam.com.au" http://localhost:8787/admin
```

Run tests with `npm test` (vitest; `src/itil.ts` and the `scripts/*.mjs`
CLI wrappers are covered).

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

   This is a dashboard-only step -- there's no Terraform/API call for it in
   this repo, because it's a one-time policy decision, not something that
   should change on every deploy.

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
* **No per-agent accounts beyond Cloudflare Access identity.** Whoever
  Access lets in can act on any ticket; there's no role/permission system.
  Fine for a small IT desk, worth revisiting if the team grows.
