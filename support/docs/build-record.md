# The support desk: what was built, and what it taught us

Built 2026-08-01 and 2026-08-02, on `claude/it-ticketing-platform-krbwoi`.
Live at **https://support.hamdam.com.au**.

This is the record of decisions and of the things that went wrong, because
the second list is the one worth keeping. `../README.md` is the operational
manual: how to deploy it, what the secrets are, how to test it safely. This
file is why it is shaped the way it is.

---

## What it does

A small IT service desk for Hamdam, in two languages, with an assistant that
answers what it can and hands over what it cannot.

**Two front doors.** The portal at `/` (English) and `/fa` (Persian, RTL),
and the mailbox `developer@hamdam.com.au`. They produce the same thing: a
ticket, an acknowledgement, and an answer. Nothing is a second-class channel.

**ITIL classification.** Impact x urgency sets P1 to P4, with SLA targets per
priority. A ticket about the Hamdam app cannot fall below **P3** however
mildly it was described, because someone hitting a problem with the product
may be a day from deleting it. The floor only raises: a P1 app outage stays
P1. General computing questions keep whatever the matrix gave them and are
answered properly, because a courtesy done badly is worse than one declined.

**An assistant, on Cloudflare Workers AI.** Free on the existing Workers
plan: 10,000 neurons a day, roughly 120 assisted replies. It answers from
reviewed knowledge base articles, from an app reference built out of the
site's own privacy policy and terms, and from general computing knowledge for
questions that are not about Hamdam.

**Everything immediate.** The portal answers in about three seconds. Email is
read by a cron every minute, and outbound mail is sent by the Worker through
Microsoft Graph as the real mailbox, so it lands in Sent Items next to
anything a person sends by hand.

**Escalation reaches a person.** When the assistant hands over, both people
covering the desk get an email written to be answerable from a phone.

---

## The decisions that mattered

### Rules live in code, not in the prompt

The P1/P2 gate, the handover when someone asks for a person, the three-turn
limit, the refusal to answer a Hamdam question without a source: all of these
are `if` statements in `agentPolicy.ts` and `assistantReply.ts`, checked
*before* the model is consulted. A prompt can be talked out of a rule.

This is also what made the model swappable. The assistant ran on Sonnet, then
on Workers AI, and the change was one constant and one call site because
nothing important lived in the prompt.

### The knowledge base must cite its sources

The starter articles described a sign-in screen, a password and being locked
out. Hamdam has no accounts and collects no email address. Another told
people a blank verse meant checking their internet, when the core 235 verses
are bundled and work offline. Both had been offered to real requesters and
both had been grounding every model reply since the assistant shipped.

An assistant grounded in wrong facts is worse than one grounded in nothing,
because it is wrong with a straight face. So `kb/reference/` holds sixteen
files, every one citing the reviewed page it came from, and its README says
the rule plainly: **if you cannot cite it, do not write it.** "The team will
need to check that" is a legitimate thing for a support desk to say.

### Degrade, never go silent

Every layer falls back rather than failing. No `AI` binding, an inference
error, a spent daily budget, a reply that fails validation: all of them land
on the keyword matcher, which needs no network and always returns something.
No Graph credentials means mail queues instead of sending. The desk gets
plainer. It never goes quiet, which was the original bug that started all of
this.

### Say why, on the ticket

Worker logs need a websocket to tail, which is unavailable in exactly the
situation where you want them. A silently degraded desk looks identical to a
working one. So every fallback records its reason in the ticket's agent
state, where the console shows it: `model call failed: ...`, `today's model
budget is spent`, `body claims a person acted`. Two of the bugs below were
only findable because of this.

### Language is a property of the ticket

Decided once, when the ticket opens, and every later email follows it. A
one-word reply cannot flip a conversation into the wrong language halfway
through. Email carries no locale at all, so inbound mail is read by script
*proportion*: an English message quoting one Persian word is still English.

---

## What went wrong, in production

Every one of these was found by testing against the live system. None would
have been caught by the test suite as it stood.

### A mail loop, running once a minute

An outbound reply to a dead test address bounced. Exchange returned
`Undeliverable: [HAM-27] Testing workflow`, which carries the ticket tag, so
it was filed as a reply on that ticket, so the assistant answered it, so that
answer bounced. Every minute, each cycle spending a model call.

The desk-address guard could never catch this: a bounce genuinely comes from
somewhere else. What identifies it is that no person wrote it, which is
equally true of out-of-office replies. Those would have looped identically
against a real customer rather than a test address. Automated mail is now
detected *before* the ticket tag is read, because the tag is precisely what
makes a bounce dangerous.

### A 500 on the live ticket form

Adding the `topic` column meant editing a prepared statement and its `bind()`
together. The bind edit landed and the SQL edit silently did not: thirteen
placeholders, fourteen values. TypeScript cannot see it, 144 tests passed,
and the first thing that noticed was a 500 on the public form.

Nothing in the suite talks to D1, so nothing was going to notice.
`test/sqlBindings.test.ts` now checks that both halves of each prepared
statement agree on how many parameters exist. It was confirmed to fail
against the actual bug before being committed.

### JSON mode that does not work

Cloudflare documents JSON mode as supported on
`llama-3.3-70b-instruct-fp8-fast` and rejects every such request with
`4009: an internal server error occured`, whatever the schema. Every model
call was failing and falling back to keywords, so the assistant *looked* like
it was working.

The schema is gone rather than kept as a disabled first attempt: an attempt
that has never succeeded is not a fallback, it is a guaranteed wasted round
trip, and two sequential inference calls is what timed out a request with a
person waiting. The shape is described in words in the final turn instead.
Putting it in the system prompt did not work either: given articles to work
from, the model wrote an excellent support answer in prose and no JSON, and a
good answer in the wrong shape is discarded the same as a bad one.

### The desk disclaiming itself

A verbatim correct answer about iCloud sync, straight out of the app
reference, carried "that is general advice rather than something from our own
notes" underneath it. The disclaimer keyed on `articleId` being empty, and
reference answers legitimately have no article. Replies now distinguish
three sources; only general knowledge gets a hedge.

### Claiming an action it could not take

A requester wrote "close this ticket". The assistant replied "This ticket is
being closed as requested" and left it open. It has no way to change a
status, so it described one instead. That is the worst kind of support reply:
it reads as done, so the person stops chasing. Closure requests are now
handled before the model sees them.

### A Persian ticket in the English queue

Topic detection was English-only, so a Persian speaker asking how iCloud sync
works in Hamdam was classified general IT and lost the P3 floor. The app's
own audience was getting the slower queue, which is precisely backwards. It
took a Persian test ticket to see it.

### Four stray emails

Testing used the owner's real address as the requester. The hourly Routine
drained the queue mid-test and sent four acknowledgements for tickets that,
by the time they arrived, had been deleted. Deleting a row does not recall
mail already sent. Smoke tests now use `@example.com`, which is reserved and
undeliverable, and the rule is written down in the README.

---

## The retired Routine

Inbound mail was originally read by an hourly Claude Code Routine holding
database credentials and a mailbox. It worked. It was replaced anyway, for
two reasons.

Speed was the visible one: someone emailing the desk waited up to an hour to
learn their message had arrived, with no page to reassure them the way the
portal has.

The other reason is better. That Routine was the one place in this system
where attacker-authored text met tools, and it had already been talked into
something once: a documentation file's "Known gap" section told the reader to
recreate the Routine, and the Routine obeyed it three times. Reading the
inbox is now a function that takes a sender, a subject and a body, and cannot
be argued into anything by the contents of an email.

`email-routine.md` in this directory describes the retired design and is kept
for history only.

---

## Numbers

| | |
|---|---|
| Tests | 278 (Vitest) |
| Migrations | 9 |
| Knowledge base | 3 articles, 16 reference files |
| Languages | English, Persian |
| Assistant | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` on Workers AI |
| Model cost | Free tier, 10,000 neurons/day, ~120 replies |
| Portal response | ~3 seconds |
| Inbox poll | every minute |

---

## Known and deliberate

* **`POST /tickets` is unauthenticated.** Someone who needs help should not
  need an account first. It is no longer unthrottled: see the security review
  below.
* **The console is English only.** An internal tool with two users who both
  read English. A half-translated admin surface is worse than an untranslated
  one.
* **No audit log of agent actions.** Replies carry the verified Access email;
  status and priority changes do not. Fine at one agent, not at three.
* **The Farsi was authored by a session, not translated from an approved
  bank.** The repo's convention is that Persian copy is Ealia's call, and it
  was, but `src/i18n.ts` has still not been read by a second Persian speaker.
  `check-persian.mjs` covers it for corruption; it cannot judge tone.

## Closed without action, 2026-08-02

Four items were raised at handover and all four were reviewed and closed by
Ealia the same day. Recorded as decided against rather than done, because
they were not done, and a record that says otherwise is worse than no record.

1. **Rotate the Graph client secret.** Not rotated. The secret currently in
   `wrangler secret` was pasted into a working transcript during setup, so it
   exists outside the systems that hold it. If it is ever rotated, all that
   changes is one command: `npx wrangler secret put GRAPH_CLIENT_SECRET`.

2. **Scope `Mail.Send` to one mailbox.** Not scoped. As an application
   permission it grants send-as rights for every mailbox in the tenant, and
   the credential lives in a Worker reachable from the public internet. The
   one-liner, if it is ever wanted:
   ```powershell
   New-ApplicationAccessPolicy -AppId <client-id> `
     -PolicyScopeGroupId developer@hamdam.com.au `
     -AccessRight RestrictAccess -Description "Hamdam support desk"
   ```

3. **Add the WAF rule.** Not added, and the least consequential of the four:
   the country allow-list is enforced in the Worker and tested, so the
   behaviour is live. What the edge rule would add is stopping the traffic
   before it reaches a Worker, and covering the Cloudflare Access login page,
   which the Worker never sees. Host-scoped, or it takes the marketing site
   with it:
   ```
   (http.host eq "support.hamdam.com.au" and not ip.src.country in {"AU" "NZ" "IR" "AE" "GB" "US" "NL"})
   ```

4. **Have the Farsi reviewed.** Not reviewed. `src/i18n.ts` was authored
   in-session because no support-desk vocabulary existed in the app's copy
   bank to draw from. It passes `check-persian.mjs`, which catches mojibake,
   stray bidi controls and Latin letters spliced into Persian words, and a
   test asserts no Arabic yeh or kaf slipped in. None of that judges tone.
   This is the cheapest of the four to revisit and the only one a customer
   would notice.

Nothing here blocks anything. It is written down so that whoever reads this
in six months knows which of these were done and which were weighed and set
aside, rather than having to guess.

---

## Security review, 2026-08-02

A review of both `hamdam.com.au` and this desk, code and deployed behaviour.
What it confirmed is worth recording as plainly as what it changed: D1 access
is parameterised throughout, the Access JWT path pins RS256 and verifies
issuer, audience and expiry rather than trusting
`Cf-Access-Authenticated-User-Email`, the console's CSRF check holds, and
every stored string reaching a page goes through `escapeHtml` or
`textToSafeHtml`. Probing the live console with a forged identity header, a
forged `CF_Authorization` cookie and a forged `CF-Ray` was refused in all
three cases.

Six things changed.

1. **The portal would send mail anywhere, as often as asked.** This was the
   one finding that mattered. `POST /tickets` checked its fields for
   emptiness and nothing else, then handed the address to Graph and asked
   `developer@hamdam.com.au` to deliver a message carrying the submitter's
   subject line. No format check, no length cap, no rate. The daily model
   budget bounded the inference spend and nothing bounded the mail, so the
   asset at risk was never the database: it was the deliverability of every
   real reply the desk sends. `src/validation.ts` now checks the address
   shape and caps every field; `src/rateLimit.ts` counts submissions per
   caller *and per recipient*, because a caller with a pool of addresses
   defeats the first limit and cannot defeat both.

2. **The rate limiter's first draft throttled local development.** Keyed on
   `CF-Connecting-IP`, which reads correctly in production and which
   `wrangler dev` also supplies, as `127.0.0.1`, for every local request. The
   sixth ticket of a dev session was refused. The gate is now `CF-Ray`, which
   is what the HTTPS redirect and the country check already use to mean "this
   came through the edge". Caught by running it, not by reading it.

3. **Tracking tokens were compared with `!==`.** Now `tokensMatch`, which
   compares every character. 122 bits of entropy makes the timing attack
   theoretical; the fix is two lines and the token is the only credential
   guarding a ticket.

4. **Ticket and console pages were cacheable.** No `Cache-Control` at all, on
   pages carrying a requester's name, address and description, reached by a
   URL with the credential in its query string. A shared cache keyed on that
   URL is keyed on the credential. Now `private, no-store`, set only where a
   route has not spoken, so `/static/app.css` keeps its lifetime.

5. **The console wrote a stored column into the page as markup.**
   `${d.body_html}`, the one unescaped interpolation left. Safe today, because
   the only thing writing that column assembles it from escaped pieces, but
   that is a property of the current callers rather than of the renderer. Now
   rendered as text. The CSP would have stopped a script; it would not have
   stopped a convincing fake button on the approve-and-send page.

6. **`stripHtml` removed tags but kept what they contained.** A marketing
   email's `<style>` block became four hundred lines of CSS in a ticket
   comment and in the model's context. Script and comment contents went the
   same way. Now dropped whole.

Two smaller things went with them: the feedback endpoint accepted any string
as an article id and wrote it into a system comment, so it is now checked
against the published set, and `X-Hamdam-Locale` is stripped from inbound
requests so the path is the only thing that decides a locale.

Dependencies: `npm audit` reported three advisories on the marketing site
(astro, postcss, svgo), all build-time for a fully static site. Upgraded
anyway, site rebuilt clean. The desk reported none.

**What was deliberately not changed.** The tracking token still travels in a
query string. Moving it to a cookie would improve the referrer and history
story and would break the thing the desk is built around, which is that the
link in the acknowledgement email opens the ticket. `Referrer-Policy:
strict-origin-when-cross-origin` covers the leak that matters. And the portal
still emails an address the submitter typed without proving they own it,
which is inherent to a support desk that does not want an account first; the
rate limits bound the damage rather than removing it.

---

## Red team pass, 2026-08-02

A second review, run adversarially rather than as a diff read: DNS and mail
posture, TLS and zone settings, Cloudflare Access configuration, content
discovery against both hosts, and a fresh look at the trust boundaries in
code. It found one thing that was genuinely serious and one that was
genuinely embarrassing, plus a set of infrastructure gaps that are not the
Worker's fault and are still the domain's problem.

### Anyone could write on anyone's ticket

The inbound email path routed a message onto an existing ticket on the
strength of the `[HAM-N]` tag in its subject, and checked nothing else. Not
who sent it. Ticket ids are sequential and every requester sees their own in
every email the desk sends, so `HAM-41` and `HAM-43` were free guesses.

Sending `Subject: RE: [HAM-42] hello` to developer@hamdam.com.au was enough
to file your text as a *requester* comment on a stranger's ticket. From
there the desk did the rest of the work unprompted: if the message contained
one of the closure phrases it closed their ticket, and otherwise it ran the
assistant over a thread that now contained your words and emailed the result
to the real requester, from an address that passes SPF and DKIM for this
domain. No spoofing was required at any point. The tag was the credential,
and the tag was printed on everything.

What it could not do is read. The assistant's reply goes to the ticket's
requester, never to the sender, so this was a write and a nuisance rather
than a disclosure. That is the only reason it is written up as serious
rather than as an emergency.

`planInbound` now takes the owning address of each candidate thread and
appends only when the sender matches it. A tag from someone else is not an
error, because a stranger quoting a ticket number is far more likely to have
been forwarded a thread than to be an attacker: their message simply becomes
its own ticket. Nothing is lost and nothing is written where it should not
be. The conversation id path got the same check, on the principle that
"harder to guess" is not "proves who you are".

### The console had a second front door

Cloudflare Access is scoped to the path `support.hamdam.com.au/admin`. The
locale prefix made `/fa/<anything>` an alias for `/<anything>`, the console
included. So `/admin` was stopped at the edge with a redirect to the Access
login, and `/fa/admin` went straight past Access to the console handler.

The Worker's own JWT verification refused it, which is exactly why that check
was written instead of trusting the proxy, and it is the reason this is a
defence in depth finding rather than an authentication bypass. But it was an
entrance Access could not log, could not rate limit and could not attach a
policy to, and one control silently doing the work of two is how the next
change breaks something nobody is watching. `/fa/admin` is now a 404.

### The mailbox had no limits while the portal had them

The morning's work metered the portal and left the email channel open, which
put the ceiling on the more expensive door and none on the cheaper one.
Every emailed ticket produces an acknowledgement, an assistant reply, and,
for anything with a P1 word in the subject, an alert to the team. Crossing
the new per-sender limit does not drop mail: everything is still read, filed
and queued, and what stops is the desk answering by itself until a person
looks. A system note on the ticket says so, because a ticket that looks like
the assistant simply failed is worse than one that explains itself.

### Two personal addresses were published

`src/escalation.ts` hardcoded a private Gmail and a private Outlook address
as the escalation recipients. This repository is public. That published two
personal addresses, attached to a named product, in a file whose surrounding
comment explains that these are the people who read the security alerts: a
spearphishing target list, assembled and hosted at no cost to whoever wanted
it. The README named the console's Access account for the same reason and
with the same effect.

The real list is now the `ESCALATION_RECIPIENTS` secret, and the fallback in
source is the desk's own monitored mailbox, which is printed on every page
anyway. Note what this does not do: git history still contains the
addresses, and rewriting a public repository's history is a bigger and
noisier operation than the exposure warrants. Treat both addresses as
public, because they have been.

### Smaller

`CF-IPCountry` was a fallback for the country check. Cloudflare only adds
that header when the visitor-location transform is enabled, and where it is
not added a client-supplied one arrives untouched, so the fallback could
only ever fire in exactly the configuration where it was attacker
controlled. Removed; `request.cf.country` is populated by the runtime and
cannot be set from outside. A `.well-known/security.txt` was added, because
the previous answer to "how do I report something" was to guess.

### What held

Worth writing down, because a review that only lists failures reads as
though nothing was built right. Content discovery found no source, config,
`.git`, `.env` or `.dev.vars` on either host. Access is scoped to three
named addresses with no wildcard. The Worker's JWT verification pins RS256
and checks issuer, audience and expiry. Every admin path variant tried
(`/Admin`, `//admin`, `/admin/../admin`, `/admin%2f`) was refused. SPF is
`-all`, DKIM selectors are published, min TLS is 1.2 and TLS 1.3 is on.

### The DNS findings, and what was done about them

The review raised these as recorded rather than applied, on the grounds that
changing a live mail domain's DNS without watching what it does to delivery
is how a support desk stops receiving support requests. The owner then
decided each one individually and the zone was changed the same day, on
2026-08-02. What follows is the finding, the decision, and the record of the
change. The state of the zone described below is the state it is in.

**Applied.**

* **DMARC moved from `p=quarantine` to `p=reject`,** and the reports were
  brought home. `_dmarc.hamdam.com.au` is now
  `v=DMARC1; p=reject; adkim=r; aspf=r; fo=1; rua=mailto:dmarc@hamdam.com.au; ruf=mailto:dmarc@hamdam.com.au;`
  The old record sent aggregate reports to `dmarc_rua@onsecureserver.net`,
  which is the registrar: the owner of the domain could not see who was
  spoofing it. `dmarc@hamdam.com.au` is a shared mailbox in the tenant.
  Alignment is relaxed (`adkim=r`, `aspf=r`) deliberately, because Exchange
  Online signs with the subdomain selector CNAMEs, and strict alignment is the
  setting that turns a correct DKIM signature into a failure. DKIM was
  confirmed switched on in the Microsoft admin centre before the move, which
  was the review's precondition.

  `p=reject` is the one change here that can lose real mail rather than
  merely fail closed, and it went live without a warm-up period. Watch the
  aggregate reports for the first week; anything legitimate sending as this
  domain that is not Exchange Online will now be refused outright rather
  than junked.

* **CAA records added,** ten of them, all flags `0`: an `issue` and an
  `issuewild` pair for each of `letsencrypt.org`, `pki.goog`, `ssl.com`,
  `comodoca.com` and `digicert.com`. That is the set Cloudflare actually
  issues from, so the constraint is real without being a constraint on
  ourselves. Before this, any certificate authority in the world could issue
  for `hamdam.com.au`.

* **TLS-RPT added.** `_smtp._tls.hamdam.com.au` TXT
  `v=TLSRPTv1; rua=mailto:dmarc@hamdam.com.au`, so a sender that fails to
  negotiate TLS to Exchange has somewhere to say so.

* **Five stale records deleted.** `sip`, `lyncdiscover`, `_sip._tls` and
  `_sipfederationtls._tcp` are Skype for Business, retired in 2021.
  `email.hamdam.com.au` pointed at GoDaddy email marketing and resolved to a
  host that did not claim the name; the owner does not use it and does not
  intend to. None were known to be takeoverable. All were attack surface
  kept for nothing.

  `_domainconnect.hamdam.com.au` was left in place. It was not in the
  review's stale list and it is what lets the registrar's setup flow write
  records; removing it breaks that and fixes nothing.

The full zone was read and written to a backup before any of this, and read
back afterwards to confirm each change landed. Unchanged and verified still
correct: SPF `v=spf1 include:spf.protection.outlook.com -all`, both DKIM
selector CNAMEs to Microsoft, and the MX to
`hamdam-com-au.mail.protection.outlook.com`.

**MTA-STS, which turned out not to be a DNS change at all.**

Applied later the same day, and worth its own section because the reason it
could not go in with the others is the interesting part.

The finding was that inbound mail can be downgraded by an active network
attacker between a sending server and Exchange Online. SMTP's STARTTLS is
opportunistic by design: strip the capability from the server's greeting and
a well-behaved sender delivers in plaintext without complaint. There is
nothing in the protocol that lets the receiving domain say "always encrypt".

MTA-STS (RFC 8461) is that statement, and it deliberately is not a DNS
record. DNS without DNSSEC is forgeable by the same attacker, so a policy
published only in DNS could be forged by them too. The DNS record carries
only a version and an id; the policy itself is fetched over HTTPS from
`mta-sts.<domain>`, and the certificate is what proves it came from the
domain's owner. The whole security property is the TLS connection. So a TXT
record alone does not half-solve this, it mis-solves it: a sender that finds
the record and cannot fetch the policy has been told to look and found
nothing.

That made it code. It is served by the support Worker rather than a third
one, because this is the codebase that owns the mail path and a third deploy
target is a third thing to remember. `src/mtaSts.ts` answers the one path on
the one hostname and 404s everything else there, so the portal does not gain
a second address that nobody audits. `/admin` on that hostname was checked
live and is a 404: the Access application is scoped to
`support.hamdam.com.au/admin`, so a second hostname reaching the console
would have been the `/fa/admin` finding again, from a different direction.

The handler is mounted **above the country check**, which is the detail most
likely to be undone by accident. Everything below that line is the portal,
served only where Hamdam is sold. This is not the portal. It is read by mail
servers sitting wherever the sender's mail happens to be hosted, and this
desk's own documentation promises that email is the one channel never
restricted by country, precisely so someone outside the list can still reach
a person. Geo-blocking the policy would be geo-blocking the mail.

**It is in `testing` mode, not `enforce`.** A sender that cannot make a
validated TLS connection still delivers, and files a TLS-RPT report about it.
This is the discipline the DMARC change did not get, and the asymmetry is the
reason: `p=reject` can only ever affect mail claiming to be *from* this
domain, while a wrong MTA-STS policy in enforce mode stops mail arriving *at*
the desk. That is the failure this whole document warns about, in its worst
form, because nothing arriving looks exactly like a quiet day. TLS-RPT is
already reporting to `dmarc@hamdam.com.au`, so the evidence for promoting is
being collected now. A test asserts the mode, so flipping it is a change
somebody has to look at rather than one that rides along in an unrelated
commit.

The MX pattern covers both the exact host from the MX record and
`*.mail.protection.outlook.com`. Too generous on purpose: the wildcard still
says "Exchange Online, with a certificate proving it", which the attacker in
the threat model cannot satisfy, and it is what stops this becoming an outage
the day Microsoft moves the tenant to a different host under the same suffix.

The DNS half is `_mta-sts.hamdam.com.au` TXT `v=STSv1; id=20260802a;`. **That
id is a cache key and it is the thing that will get forgotten.** Senders
re-read the cheap TXT record often and refetch the policy only when the id
changes, so an edited policy under an unchanged id reaches nobody until every
cached copy expires. Policy, `MTA_STS_POLICY_ID`, TXT record: three edits,
always together, and only two of them are in this repository.

Verified live after deploying: the policy serves over HTTPS with a valid
certificate, every other path on that hostname 404s, and the support portal
and its own `.well-known` are unaffected.

**Still open.**

* **Zone SSL mode is `full`, not `full (strict)`.** Attempted on 2026-08-02
  and not applied: the write was refused by the tooling's own guard and was
  left for the owner rather than worked around. It is inert today in any
  case. All four proxied records are Worker custom domains pointing at
  `100::`, and a Worker custom domain never opens a connection to an origin,
  so there is no origin certificate for either mode to validate. It becomes
  real the moment one of those records points at a server, which is exactly
  when nobody will think to check it.
* **Access has no MFA requirement** and a 24 hour session, on a console that
  shows every requester's name, address and ticket text. Deliberately not
  attempted here. Access is currently three named addresses on one-time PIN,
  which is single-factor whatever the login page implies, and the fix is not
  a setting: it is putting an identity provider in front of it. The tenant
  already has Entra ID with MFA, so the material is there, but wiring an IdP
  into Access is a change that can lock the only two people out of the
  console, and that is the owner's call to make deliberately rather than
  something to slip into a hardening pass.

---

## Audit of the red team pass, 2026-08-02

The morning's review, reviewed. Not a re-run of the same checks: the question
here was narrower and less comfortable, which is whether the fixes actually
fixed anything and what the reviewer took on trust from himself.

One of them did not.

### The console's second front door was never closed

`/fa/admin` was found reaching the console handler without Cloudflare Access
seeing the request, and was fixed by excluding `/admin` from the paths the
`/fa` prefix may reach. That fix was verified by requesting `/fa/admin` and
observing a 404, and there the checking stopped.

`/fa/%61dmin` returned the console's own refusal.

The exclusion list compared the **raw** pathname. Nothing downstream routes on
the raw pathname: the router decodes first. So `/fa/%61dmin` is not the string
`/fa/admin`, the exclusion never applied, the path was rewritten to
`/%61dmin`, and the router then decoded it and matched `/admin`. The list was
intact and correct and was simply never consulted about the request that
mattered. `/fa/adm%69n`, `/fa/%61%64%6d%69%6e` and the whole `/admin/*` tree
behaved the same way.

The consequence is exactly the one written up in the morning, unchanged: an
address for the console that Access cannot see, log, rate limit or attach a
policy to, held shut only by the Worker's own JWT check. Which held, again.

Two things about this are worth more than the bug.

The first is that the same pass, on the same day, tested `/Admin`, `//admin`,
`/admin/../admin` and `/admin%2f` against the *unprefixed* console and
recorded them as refused. The encoding trick was in the reviewer's hands. It
was applied to the path that was already safe and not to the path being
fixed, because that one had just been written and felt understood. A fix is
the least tested code in any change and it is the code most worth attacking.

The second is that "verified" meant one request. The finding said the prefix
made `/fa` an alias for every route; the verification checked one spelling of
one route. Confirming a fix means trying to defeat it, not observing it work
once.

The comparison now runs on a canonical form: decoded once to mirror the
router, then slashes collapsed, dot segments resolved, and lowercased. The
last three are stricter than the router is known to be, deliberately. A check
that is correct only while Hono keeps matching case-sensitively is a check a
dependency upgrade can turn back into a bypass, and this door has now been
found open twice. Undecodable input fails closed. The rewrite still targets
the original path and never the canonical one, because normalising the
request itself would smuggle one route into another, which is the bug rather
than the fix.

Fixed, deployed, and re-verified against production across twelve spellings.

### The documentation described a control that does not exist

Three files said the rate limiter "keys on `CF-Ray`, not on
`CF-Connecting-IP`". It does not. It *counts* CF-Connecting-IP and *gates* on
CF-Ray, limiting nothing when CF-Ray is absent so that local development is
not throttled. Two headers, two jobs.

The code is right and the prose was wrong, which is the more dangerous way
round: the next person reasoning about whether the limiter can be defeated
would have reasoned about the wrong key. Corrected in `AGENTS.md` and here.

### Open, and not fixed here

These are design decisions rather than defects, and each one costs something
real to close. They are the owner's to prioritise.

* **The inbound ownership check is only as strong as the sender's own
  domain.** The morning's fix routes a reply onto a ticket only when the
  sender's address matches the requester's. That address is the `From`
  header, which is authenticated only when the sender's domain publishes an
  enforcing DMARC policy and Exchange honours it. For a requester on a domain
  without one, `From:` is a claim. This repository says out loud that inbound
  email is not an identity, and then uses it as one. Graph exposes the
  received `Authentication-Results`; requiring `dmarc=pass` or `dkim=pass`
  before treating a sender as a ticket's owner would make the check mean what
  the document already says it means.
* **The rate limit keys are literal.** `victim+1@gmail.com` and
  `victim+2@gmail.com` are separate buckets that share one inbox, and an IPv6
  caller gets a fresh bucket per address out of a /64 they already own. The
  refusal to fold plus-tags is *correct* where it came from, which is
  deciding who owns a ticket; carrying the same literal comparison into
  metering means the per-recipient ceiling is a speed bump. Metering should
  fold; authorisation should not.
* **The two doors have inconsistent ceilings, and the wrong one is looser.**
  The portal allows 5 tickets per recipient per hour. The mailbox has no
  per-recipient limit at all, only 20 per sender, and since the
  acknowledgement goes to the `From` address that is 20 tickets and roughly
  40 pieces of mail per hour into an address of the sender's choosing, from a
  domain that now passes SPF, DKIM and DMARC. The email path was described as
  the gentler one. To a stranger's inbox it is the more permissive one.
* **The console has no allowlist in the Worker.** The JWT check proves the
  assertion is genuine and issued for this application, and then trusts
  whoever it names. Who counts as an agent lives entirely in one Access
  policy, so widening that policy widens the console silently. Everywhere
  else this codebase argues for two locks: the WAF rule *and* `geo.ts`, the
  Access proxy *and* the JWT check. An `ADMIN_EMAILS` check is the missing
  second lock on the one surface that shows every requester's name, address
  and ticket text.
* **`CF-Ray` is now load-bearing four times over**: the HTTPS redirect, the
  country check, the rate limiter's gate, and the local-development console
  bypass. Each use is individually sound and they share a single assumption.
  Any future path where this Worker runs without CF-Ray, a service binding or
  a test harness among them, opens all four at once.
* **Bidirectional and zero-width characters are not stripped.** `cleanText`
  removes C0 controls and leaves U+202E and friends. On a desk that is
  deliberately bilingual and renders RTL, a subject line can be made to
  display in an order that is not the order it is stored in, in the console
  and in the escalation email, both read by the people deciding what a ticket
  is.
* **The processed-message ledger is keyed on a value the sender chooses.**
  `internetMessageId` is the sender's `Message-ID`. Rows can be inserted
  freely, and a message whose id has already been recorded is skipped.
  Exchange's ids are not predictable enough to make that a suppression attack
  today; it is still an attacker-controlled primary key.
* **Two more stale DNS records, and one kept for a wrong reason.**
  `msoid.hamdam.com.au` is a retired Office 365 client-configuration record
  and was not in the morning's stale list. `_domainconnect` was deliberately
  kept, on the reasoning that removing it breaks the registrar's setup flow.
  That reasoning is wrong: this zone is served by Cloudflare nameservers, so
  GoDaddy's Domain Connect flow does not apply to it.

### What held under a second look

Worth recording, because the point of an audit is not to manufacture a
finding. Every rendering path escapes: the layout escapes the page title, the
thread escapes both author and body, and the emails, which have no CSP to
fall back on, escape as carefully as the pages do. Tracking tokens are 122
bits from `crypto.randomUUID` and compared in constant time. The Access JWT
check pins RS256, verifies issuer, audience, expiry and not-before, requires
an email claim, and verifies the signature against the published keys. The
ingest checkpoint advances only on a clean pass. And the workers.dev
subdomain and version preview URLs were both confirmed disabled on the
deployed Worker, which matters more than it sounds: either one would have
been a hostname serving this desk with no WAF rule and no Access application
in front of it.

---

## Closing the audit's findings, 2026-08-02

Everything the audit left open, closed, except the parts that are not in this
repository. Seven code changes, two DNS deletions and a zone setting. The
common shape: almost none of these were things that were broken. They were
controls that existed and did less than the documentation around them
claimed.

### The From header is no longer an identity

Appending to a ticket now requires that Exchange authenticated the sender's
address, not merely that the address matches. `authResults.ts` reads the
`Authentication-Results` header Exchange stamps on delivery and accepts three
things, which are the three ways DMARC can be satisfied: `dmarc=pass`, a
`dkim=pass` whose `header.d` aligns with the From domain, or an `spf=pass`
whose envelope aligns with it. Anything else, including the absence of a
verdict, is unauthenticated.

The part that had to be right is *which* header to believe.
`Authentication-Results` is an ordinary header and the sender can put one in
the message they compose, saying whatever they like; a check that scanned all
of them for a pass would be asking the attacker whether the attacker is
authentic. The receiving server prepends its own, so the genuine verdict is
above any the sender wrote, and Microsoft always includes `compauth=` in
theirs while nothing else does. Taking the first header carrying `compauth=`
lands on Exchange's own even if the ordering assumption is ever wrong, and on
nothing at all if Exchange did not stamp one.

Failing the check loses nothing: the message becomes its own ticket, in front
of a person, exactly as a tag from a non-owner already did.

The header is fetched per message rather than added to the batch query's
`$select`, and only for messages that would otherwise write to an existing
thread. The cheap reason is cost. The real reason is that if
`internetMessageHeaders` is ever unavailable in a list projection, folding it
into the batch would make every message in the mailbox fail at once, and a
graceful degradation applied to one message is a mess applied to all of them.

**This is the change most likely to be noticed in ordinary use.** A reply from
a requester whose mail cannot be authenticated now opens a new ticket instead
of continuing the old one. That is the intended behaviour and it is still a
behaviour change, so the first real reply after this deploy is worth watching.

### The rate limit keys stopped being literal

`victim+1@example.com` and `victim+2@example.com` are one inbox and were two
buckets. An IPv6 caller sources traffic from a /64 they were delegated, which
is eighteen quintillion addresses, so the per-caller ceiling counted nothing
at all for anyone on a modern connection.

Metering now folds: plus-tags stripped for everyone, dots folded for Google's
domains only, IPv6 counted per /64. Authorisation still does not fold and
must not. `sameAddress` in `inbound.ts` stays literal, because folding widens
a set, and a wider set is right for counting how much mail one person can be
sent and wrong for deciding who somebody is. The same two lines of code were
doing both jobs and only one of them wanted this.

### One ceiling on mail to any one address

The portal metered its own submissions and the mailbox metered its own
senders, and neither counted the thing that matters to a stranger, which is
their own inbox. The mailbox in particular had no recipient ceiling at all,
so the door described as the gentler one would push roughly forty pieces of
mail an hour into an address of the sender's choosing.

`outbound_recipient` is checked at the act of sending, which is the single
point every path crosses, so a route added later inherits it without having
to remember it. The row is still written and still visible in the console
when the limit is hit; what stops is delivery, with a reason attached.
Escalation is exempt by address, because an alert to the team is the one
message whose entire purpose is to arrive.

### The console has a second lock

`ADMIN_EMAILS`, checked in the Worker after the Access assertion verifies.
Who counted as an agent lived entirely in one Cloudflare Access policy, so
widening that policy widened this console silently, from somewhere that
leaves no line in a diff. This is the argument the country check already won,
applied at last to the surface that actually holds people's data.

Unset admits everyone, which is how the desk has been running, and the
console says so on every page instead of pretending. Failing closed is the
right instinct and it was the wrong trade here: the deploy introducing the
file would have locked the only two people out of the console they would
then need in order to fix it.

**The secret is set.** The three addresses were read from the Access policy
itself through the Cloudflare API rather than guessed, which is the only way
to set this without risking a lockout: an allowlist assembled from memory is
a lockout with extra steps. They are `azizollahi@live.com`,
`developer@hamdam.com.au` and the account's Apple private relay address. The
two lists now agree, and the point is that they can now *disagree*: widening
the Access policy no longer widens the console on its own, and the console
stops showing its warning banner.

Keep them in step the way the country list is kept in step between the WAF
rule and `geo.ts`. Adding somebody to Access without adding them here gives
them a 403 from the Worker, which is the safe direction and still a
confusing ten minutes for whoever hits it.

### Smaller, and one of them is not small

The four separate readings of `CF-Ray` are now one named function in
`edge.ts`. Naming a shared assumption does not remove it. It makes it greppable,
so the person adding a fifth caller meets the comment, and a change of signal
is one edit instead of four.

Bidirectional and zero-width characters are stripped. U+202E reorders the
text after it without appearing, so a subject can be stored as one string and
displayed as another in the console and in the escalation email, which are
what a person reads when deciding what a ticket is. Escaping cannot help
because these are text, not markup. **U+200C is deliberately kept**: in
Persian it is orthography rather than decoration, and removing it would
corrupt ordinary text on a desk that is half Persian, to defend against a
spoof it cannot perform.

The processed-message ledger is scoped to the sender. Its key is
`internetMessageId`, which is the sender's own `Message-ID`, so an unscoped
ledger let anyone insert a row under an id a later message would carry and
have that message skipped without trace. Not practical against Exchange's
ids; still an attacker-controlled primary key doing an integrity job, and
pairing it with the address was free.

Observability is on, which was the audit's lowest score by a distance. Every
finding so far was found by somebody deliberately looking, and nothing in the
system would have raised its hand. `preview_urls: false` and
`workers_dev: false` are both pinned in `wrangler.jsonc` now: they were
already off on the deployed Worker, and either one would publish this desk on
a `*.workers.dev` address where the WAF rule does not match and the Access
application does not apply.

### Infrastructure

`msoid` (a retired Office 365 client-configuration record the earlier pass
missed) and `_domainconnect` are deleted. `_domainconnect` had been kept
deliberately, on the reasoning that removing it breaks the registrar's setup
flow; that reasoning was wrong, because this zone is served by Cloudflare
nameservers and GoDaddy's Domain Connect flow does not apply to it. Twenty
four records remain.

The zone SSL mode is `full (strict)`. It is inert today, since all four
proxied records are Worker custom domains with no origin behind them, and it
is correct the moment one of them points at a real server, which is exactly
when nobody would think to check it.

### Still not done, and not doable from here

Both are in the Microsoft tenant and both were on the accepted-risk list
before the audit raised them again:

* **`Mail.Send` is unscoped**, so the credential can send as every mailbox in
  the tenant, from a Worker on the public internet. `New-ApplicationAccessPolicy`
  in Exchange Online scopes it to the one mailbox; the command is in
  `../README.md`. This is the largest single risk in the system.
* **The Graph client secret has never been rotated**, and it has been quoted
  in a chat transcript.
* **Cloudflare Access still has no MFA** and a 24 hour session. Both are
  dashboard changes: the API token this work used can read the Access
  application and its policy, which is how the allowlist above was set
  accurately, and Cloudflare refuses writes to Access for this
  authentication scheme.

  The session duration is the easy half, in the application's own settings,
  and eight hours is a working day rather than a day and a night.

  MFA is not a setting. Access currently authenticates three addresses by
  one-time PIN, which is possession of an inbox and is single-factor whatever
  the login page implies. The fix is to add Entra ID as the identity
  provider, which the tenant already has with MFA enforced. It is also the
  change that can lock both agents out of the console, so it wants doing
  deliberately, with the one-time PIN policy left in place until the new one
  is proven.

---

## Availability pass, 2026-08-02

A third scan, from the position of somebody who wants this desk off the air
rather than somebody who wants its data. Every earlier round asked what could
be read or written that should not be. This one asked what could be stopped,
and the answer was better than an attacker deserves: one email, sent once, at
no cost, permanently.

### One message could stop all messages

`stripHtml` is the first thing to touch an email body, and an email body is
the only input to this desk that arrives without passing a form, a length cap
or a browser. Its tag pattern was `/<[^>]+>/g`.

`[^>]` matches `<`. So against a body that is nothing but `<` characters, the
class ran to the end of the string at every start position, failed to find
`>`, and backtracked the whole way. Quadratic, on input a stranger chooses.
Two hundred kilobytes of `<`, which is a rounding error in an email,
measured at **forty seconds of CPU**, past what a Worker is allowed to spend.

That on its own is a slow function. What made it an outage is what happens
next:

1. The message throws.
2. The ingest checkpoint advances only after a pass with no failures, which
   is deliberate and correct, because a message that failed transiently must
   be seen again rather than skipped.
3. The batch is fetched oldest first *from that checkpoint*, twenty five at a
   time.

So the poison message is in every batch, forever, and nothing behind it is
ever processed. Every customer who emails the desk after that point is never
seen. The mailbox looks entirely normal: mail arrives, it simply sits unread,
and the one signal a person might notice, an inbox filling up, is the same
thing an ordinary busy week looks like.

Both halves are fixed, because either alone leaves the other standing.

Excluding `<` from the class, `/<[^<>]*>/g`, means a run of them cannot be
consumed: the match fails at the first character instead of the last. Real
HTML is unaffected, since a `<` inside a tag is invalid anyway. The input is
also capped at 64KB before any pattern runs, which bounds the lazy scan in
the script and style pattern too. The same body now measures at about a
millisecond, and a megabyte at six.

And separately from the regex: a message that fails three times is now given
up on, loudly, recorded in `inbound_failures` with its reason, left unread in
the mailbox, and stepped over so the queue moves. That is the part that
matters beyond this bug. Any future exception in this path, from any cause,
would have wedged the entire channel the same way; now it costs three minutes
and a line in `last_ingest_error`.

`test/htmlBudget.test.ts` asserts the time budget rather than the output,
because the output was never wrong.

### A control that muted the defenders

The outbound-recipient ceiling added earlier the same day was applying to the
desk's own mailbox. The "requester replied" notice goes there, the ceiling is
ten an hour shared across every ticket, and anyone could spend it on their own
ticket in about two minutes and silence those notices for everybody else.

Worth remembering as a shape rather than as a bug: a limit that bounds an
attacker's reach usually bounds the defender's too, and the defender is the
one who finds out later. `unmeteredRecipients` now covers the desk's own
address alongside the escalation list.

### Open, and cheaper for an attacker than it should be

None of these stop the desk. All of them degrade it for less effort than the
result is worth.

* **The assistant's day can be spent by two IP addresses.** The daily model
  budget is 200 calls and ticket creation is capped at five an hour per
  caller, so one address can spend 120 in a day and two can exhaust it. After
  that every reply, for everybody, falls back to the keyword matcher until
  midnight UTC. The degradation is graceful by design and it is still the
  product's main feature turned off for a day, at the cost of two addresses.
  Raising the budget makes it more expensive to spend; a Cloudflare rate
  limiting rule at the edge makes it harder to reach.
* **There is no edge rate limiting.** The WAF has one custom rule and it is
  the country check. Everything else is counted inside the Worker, which
  means every attempt, including every refused attempt, costs a Worker
  invocation and a D1 write to the counter table. The counter is a real
  control and it is on the wrong side of the wall to protect the things
  underneath it.
* **Escalation is exempt from the recipient ceiling, deliberately.** An alert
  to the team is the one message whose purpose is to arrive, so it is not
  metered. The other side of that decision is that tickets whose subject
  reads as P1 each produce two unmetered emails to two personal inboxes, and
  ticket creation is only capped per caller. Named here rather than fixed,
  because metering the alert is worse than the flood.
* **MTA-STS now couples the domain's mail policy to this Worker's
  availability.** The policy is served by the support Worker. In `testing`
  mode a failed fetch costs nothing. Before promoting to `enforce`, note that
  the coupling becomes real: senders holding a cached enforcing policy behave
  differently from senders who can reach the current one.
* **Mailbox capacity is Exchange's problem and nobody has looked at it.**
  Nothing in this system limits how much mail can be *sent to*
  developer@hamdam.com.au, and a full mailbox is a deaf desk.

## Ownership, 2026-08-06

Two changes, and they are one change. Escalation now allocates, and a
scheduled sweep reports what is still allocated to nobody.

### The handover had no name on it

`assigned_to` has been in the schema since the first migration and nothing
ever wrote to it. Escalation was an alert to a list, which is to say it was
addressed to whoever felt like it, and `escalation.ts` said as much in its own
header: the requester was told "a person will pick this up" and that was,
strictly, a hope.

`notifyEscalation` now allocates the ticket to `L3_ENGINEER_EMAIL` before it
sends anything, names that person in the email, and writes a system note
saying it happened. Only into an empty slot: a ticket somebody has already
taken stays theirs, because a requester can reopen a handled ticket and
escalate it a second time, and overwriting there would quietly take the work
off the person holding it.

`L3_ENGINEER_EMAIL` unset is a configured state, not a failure. Escalations
still alert and still go to `ESCALATION_RECIPIENTS`; they are simply not
allocated, the console carries a banner on every page while that is true, and
the tickets land on the sweep below. The same shape as `ADMIN_EMAILS`: refuse
quietly to nobody and loudly to everybody.

There is no default in the source. Two personal addresses were published from
this repository once already (see "Two personal addresses were published",
2026-08-02) and the fix was to move the list into a secret. Writing one back
into `assignment.ts` as a fallback would have undone that fix while quoting
it.

### An allocated ticket can be worked from a phone

Allocation on its own would have been a label. The engineer receives the whole
conversation by email and, until now, the only thing they could do with it was
read it: answering meant finding a laptop and signing in through Access, and
replying to the handover would have opened a second ticket with the engineer
as its requester.

So `planInbound` gained a second writer. A message may now be appended to a
ticket as an **agent** when Exchange authenticated the sender and that address
matches the ticket's `assigned_to`. Their words are added under their own
name, emailed on to the requester, and "close this ticket" closes it. The
assistant does not run on an agent's message: the ticket has a person on it.

The bar is the same bar, not a softer one, and the reason to be careful here
is the reason from 2026-08-02: the `[HAM-N]` tag is a routing hint printed in
every email the desk sends, never a credential. What makes this an authority
rather than a claim is that `assigned_to` can only ever hold an address from
`assignableAddresses`, which is `L3_ENGINEER_EMAIL` plus `ADMIN_EMAILS`.
Nothing arriving in a request can put an address there. The console's assign
route checks `mayBeAssigned` before writing, and the one address it accepts
outside that list is the agent's own verified Access identity, which is not a
submitted field.

The comparison stays literal, like `sameAddress` and the `ADMIN_EMAILS` check
and unlike `meteringSubject`. Folding widens a set. That is right for counting
mail and wrong for deciding who somebody is.

One consequence worth stating: the L3 address can now answer as the desk, to
requesters, over this domain. It is a credential in everything but name, and
rotating who holds it is a permission change rather than a config edit.

### The sweep, and when it stays quiet

A second cron, `0 */2 * * *`, counts open tickets with no assignee and emails
`UNASSIGNED_ALERT_RECIPIENTS`. Cloudflare invokes `scheduled` once per matching
expression, so the two-hourly pass arrives as its own invocation and
`event.cron` picks the job. Anything unrecognised reads the inbox: the sweep is
a report and can miss a cycle, the inbox pass is why people get answered.

The query was never the hard part. When to send was, and it is a pure function
with tests on it. Nothing unassigned sends nothing, because an "all clear"
heartbeat every two hours is the fastest way to teach two people to filter
this sender, and the one email that mattered goes with it. A ticket that was
not in the last digest sends immediately. Everything else waits for the daily
reminder, so a backlog that has stopped changing is mentioned once a day
rather than twelve times, and never not at all.

`sentAt` advances only when Graph accepted a copy, so a mail outage retries in
two hours instead of recording an alert nobody received. The id list is
rewritten every pass either way, which is what makes a ticket that is assigned
and later unassigned count as new again.

### Smaller

* The queue table has an "Assigned to" column. The question that table is
  opened to answer is what is not being dealt with, and it could not
  distinguish a ticket with an engineer on it from one nobody had looked at.
* The ticket page has an assignment control, with the email consequence
  written next to it. Somebody granting that authority should be able to see
  that they are granting it.
* The owner is emailed when their requester replies, on both the portal and
  the email path. Without it, allocation is a one-off announcement and every
  message after it is visible only in the console the engineer was
  specifically given a way to avoid. Not metered at the recipient, for the
  same reason the handover is not; what bounds it is the caller's own reply
  limit upstream.
* `last_inbound_message_id` is deliberately not moved by an agent's inbound
  message. It exists so mail to the requester threads into the conversation
  the requester is reading.

Removing an address from `L3_ENGINEER_EMAIL` or `ADMIN_EMAILS` revokes this
everywhere at once. `knownThread` passes the assignee to the router only while
that address is still on the configured list, so authority is the intersection
of "was given this ticket" and "is still on the list", evaluated now rather
than when the row was written. Without that, taking somebody off the list
would close the console to them and leave the mailbox open on every ticket
they ever held. The console still shows them as the owner, because that is
what happened.

### Two things the audit changed

The sweep compared ticket ids and nothing else. The list is capped at
twenty-five and ordered worst first, so on a queue longer than that the new
arrivals sit below the cut: every visible id would look familiar and the digest
would go quiet exactly when the backlog was growing fastest. The stored state
carries the total now, and a total that has grown is its own reason to send. A
state row written before that field existed reads its total as the number of
ids rather than as zero, so the first pass after an upgrade does not report a
jump that did not happen.

And `notifyAssignedAgent` returns early when the assignee is the desk's own
mailbox. On the portal path that mailbox already gets the "requester replied"
notice; on the email path the requester's message is sitting in it. Either way
the second copy is the same information addressed to the same inbox.

### Open

* **The unassigned digest is not metered.** It goes to a configured list on a
  fixed schedule, so the exposure is bounded by the schedule rather than by a
  counter. Same reasoning as the escalation exemption, and the same residual
  risk: a flood of tickets is a flood of listed rows, though only one email
  every two hours.
* **Every open ticket with no assignee is listed, including ones the
  assistant is handling perfectly well.** That is the literal reading of
  "unassigned" and it is the safe one, but on a busy week the digest is long.
  If it becomes noise, the fix is an age floor rather than a heuristic about
  whether the assistant seems to be coping.
* **The exemption from the recipient ceiling now covers more addresses.**
  `unmeteredRecipients` gained the L3 address and the sweep's recipients. It
  has no effect today, because every path that mails them sends directly
  rather than through `queueAndSend`, and it is there so that a future path
  which does go through it cannot quietly mute the people who have to act.
  The cost is that if one of those people files a ticket themselves, the
  ten-an-hour ceiling no longer protects their address. Two other limits
  still do: five ticket creations an hour per recipient, and twenty inbound
  messages an hour per sender.
* **A requester closing an allocated ticket does not notify its owner.** The
  closure path returns before the notification, deliberately: the work is
  over, no action is needed, and the console shows it. Named here because
  "allocated to you" could reasonably be read as meaning you hear about
  everything that happens to it.
* **An agent's inbound reply is relayed without review.** It is the same trade
  the desk already makes for its own assistant replies on the email path, and
  the sender here is a named colleague rather than a model. Worth knowing that
  a mistyped reply reaches the requester with no step in between.
