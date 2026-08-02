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
| Tests | 269 (Vitest) |
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
