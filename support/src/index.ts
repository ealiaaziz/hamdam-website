import { Hono, type Context } from 'hono';
import type { Env } from './types.js';
import { APP_CSS } from './render/styles.js';
import { outOfRegionPage, submitFormPage, trackLookupPage } from './render/portal.js';
import { ticketStatusPage } from './render/status.js';
import { adminQueuePage, adminTicketPage } from './render/admin.js';
import { classifyTicket, parseImpact, parsePriority, parseUrgency, slaDueDates } from './itil.js';
import { ackEmail, agentReplyEmail, conversationSummaryEmail, requesterReplyNotification, resolvedEmail } from './render/email.js';
import { assistantWrittenEmail } from './render/agentEmail.js';
import { generateTrackingToken, parseTicketPublicId, stripHtml, ticketPublicId, tokensMatch } from './ids.js';
import { cleanLine, cleanText, isOversizedBody, isValidEmail, MAX_BODY_CHARS, MAX_NAME_CHARS, MAX_SUBJECT_CHARS } from './validation.js';
import { callerKey, consumeRateLimit, mayEmailRecipient, meteringSubject, purgeRateLimits, type RateLimitBucket } from './rateLimit.js';
import { httpsRedirectTarget, isCrossSiteRequest, isLocalHost, localePrefixTarget, trackingUrl } from './urls.js';
import { extractAccessToken, fetchAccessKeys, verifyAccessJwt } from './access.js';
import { KB_ARTICLES } from './kb.js';
import { suggestionBlock } from './render/agentSuggestion.js';
import { canSendDirectly, sendMail } from './mailer.js';
import { isAllowedCountry, parseAllowedCountries } from './geo.js';
import { mtaStsResponseFor } from './mtaSts.js';
import { viaCloudflareEdge } from './edge.js';
import { HEARTBEAT_KEY, readHeartbeat } from './heartbeat.js';
import { adminAllowlist, isAllowedAgent } from './adminAccess.js';
import { detectLocale, localePath, parseLocale, type Locale } from './i18n.js';
import { ingestInbox, queueAndSend as queueAndSendFromCron } from './ingest.js';
import { followUpBotChanges } from './botFollowUp.js';
import { requestedJobs, tickAuthorised, tickWork } from './tick.js';
import { notifyEscalation, unmeteredRecipients } from './escalation.js';
import { requestedClosure } from './agentPolicy.js';

import { composeAssistantReplyLive, ASSISTANT_NAME } from './assistantReply.js';
import {
  addComment,
  approveDraft,
  claimModelCall,
  DEFAULT_DAILY_CALL_LIMIT,
  getAgentState,
  getSyncState,
  recordAssistantTurn,
  recordRejectedArticle,
  discardDraft,
  listDrafts,
  listUndeliveredOutboundForTicket,
  queueAssistantDraft,
  createTicket,
  getTicketById,
  listComments,
  listQueue,
  markFirstResponse,
  markOutboundFailed,
  markOutboundSent,
  queueOutboundEmail,
  type NewOutboundEmail,
  updateTicketPriority,
  updateTicketStatus,
  upsertRequester,
} from './db.js';
import { parseTicketStatus, type CommentRow, type TicketWithRequester } from './types.js';
import { strings } from './i18n.js';

// The desk's own mailbox. Notifications about ticket activity go here, and
// the routine must ignore inbound mail from this address so the desk does
// not ingest its own outgoing email as requester replies.
const SUPPORT_INBOX = 'developer@hamdam.com.au';

/**
 * The submitted form, or null when the body was not one.
 *
 * `c.req.formData()` throws on a body it cannot parse, and every POST here
 * called it unguarded, so `Content-Type: application/json` on the public
 * ticket form produced an unhandled exception and a 500. Nothing leaked,
 * because Hono's default returns a bare "Internal Server Error", but the
 * request had already consumed a rate limit slot and a database write on its
 * way to failing, and a 500 is the wrong thing to tell somebody whose request
 * was simply malformed.
 *
 * A body this function cannot read is a client error. Saying so costs one
 * line and stops a stranger being able to write an exception into the logs
 * at will.
 */
async function readForm(c: DeskContext): Promise<FormData | null> {
  try {
    return await c.req.formData();
  } catch {
    return null;
  }
}

/** The Hono context this app actually builds, so helpers can accept one. */
type DeskEnv = { Bindings: Env; Variables: { agentEmail: string } };
type DeskContext = Context<DeskEnv>;

/**
 * The thread as the assistant should see it: what the requester wrote and
 * what has been written back, in order.
 *
 * System notes are dropped. They are the desk talking to itself ("requester
 * reported that article X did not help") and feeding them in as dialogue
 * would have the assistant answering its own bookkeeping. The rejection they
 * record still reaches the model, as state rather than as conversation.
 */
function threadTurns(comments: readonly CommentRow[]): { author: 'requester' | 'assistant'; body: string }[] {
  return comments
    .filter((m) => m.author_type === 'requester' || m.author_type === 'agent')
    .map((m) => ({ author: m.author_type === 'requester' ? ('requester' as const) : ('assistant' as const), body: m.body }));
}

/**
 * How many model calls the desk may make today. Configurable because the
 * right number is a spending decision, not an engineering one; the default
 * is a day of ordinary traffic with headroom, not a day of abuse.
 */
function dailyCallLimit(env: Env): number {
  const configured = Number(env.ASSISTANT_DAILY_CALL_LIMIT);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_DAILY_CALL_LIMIT;
}

/**
 * Queues the one outbound update this desk sends a requester mid-ticket.
 *
 * Called at the points where the conversation has actually settled: they
 * said it worked, a person took it over, or they asked for it. Not on every
 * turn. The portal is where the fast back-and-forth happens and they are
 * watching it; an email per turn would be a pile of half-finished threads
 * about a problem that has since moved on.
 */
async function queueConversationSummary(
  c: DeskContext,
  ticket: TicketWithRequester,
  comments: readonly CommentRow[],
  status: 'resolved' | 'with_a_person' | 'in_progress',
): Promise<void> {
  const turns = comments
    .filter((m) => m.author_type === 'requester' || m.author_type === 'agent')
    .map((m) => ({ who: m.author_type === 'requester' ? ('you' as const) : ('support' as const), body: m.body }));

  const rendered = conversationSummaryEmail({
    ticketId: ticket.id,
    subject: ticket.subject,
    priority: ticket.priority,
    requesterName: ticket.requester_name,
    trackingUrl: trackingUrl(c.req.url, ticket.id, ticket.tracking_token),
    status,
    turns,
  });

  await queueAndSend(c, {
    ticketId: ticket.id,
    commentId: null,
    kind: 'status_change',
    toEmail: ticket.requester_email,
    subject: rendered.subject,
    bodyHtml: rendered.html,
    inReplyToMessageId: ticket.last_inbound_message_id,
  });
}

/**
 * Queues an email and tries to send it there and then.
 *
 * The queue is still the record: the row goes in first, and it only becomes
 * 'sent' once Graph has accepted it. A failed send therefore leaves a
 * perfectly ordinary pending row, which the hourly Routine picks up exactly
 * as it always has. Immediate delivery is an improvement on the queue, not a
 * replacement for it, and the failure mode is the old behaviour rather than
 * a lost email.
 *
 * The send is not awaited by the request. A requester pressing "submit"
 * should not wait on SMTP to see their ticket, and `waitUntil` keeps the
 * Worker alive for it after the response has gone.
 */
async function queueAndSend(
  c: DeskContext,
  email: NewOutboundEmail,
  options: { humanAuthored?: boolean } = {},
): Promise<number> {
  const id = await queueOutboundEmail(c.env.DB, email);
  if (!canSendDirectly(c.env)) return id;

  const deliver = async () => {
    // The ceiling on how much mail one address can be made to receive,
    // checked at the act of sending because that is the single point every
    // path crosses. The portal metered its own submissions and the mailbox
    // metered its own senders, and neither of them was counting the thing
    // that matters to a stranger, which is their own inbox.
    //
    // Human-authored mail is exempt, for the same reason escalation is, and
    // the reason is a hole rather than a preference. This ceiling exists to
    // bound *machine-generated* volume, but checking it at the one point
    // every path crosses meant it was also being applied to an agent typing
    // a reply into the console. That conflation was reachable. The portal
    // never verifies a requester's address, so a stranger could open five
    // tickets naming victim@customer.com (`ticket_create_email`, 5/hr),
    // take the tracking tokens straight back out of the 303, and press
    // "email me this conversation" five more times (`ticket_summary`, which
    // is metered per IP at 10/hr, not per recipient). Ten pieces of mail,
    // which is exactly that address's `outbound_recipient` budget. From
    // then on every reply an agent typed to that person was marked `failed`
    // below and never sent, while the console returned its usual redirect
    // and the agent believed it had gone. One address, repeatable every
    // hour, and the desk quietly loses the ability to answer a named
    // customer.
    //
    // Exempt means neither blocked nor counted, matching how
    // `mayEmailRecipient` already treats the escalation addresses: an
    // agent's reply is not the volume this bounds, and it must not be able
    // to spend the budget either. It cannot be turned into a way to send
    // unmetered mail, because the only caller that sets it is behind
    // Cloudflare Access and the `ADMIN_EMAILS` allowlist.
    //
    // Deliberately not keyed on `kind`. `ingest.ts` queues the *assistant's*
    // reply as `agent_reply` too, and that one is machine mail and stays
    // metered. What matters is who composed the text, not what the row is
    // labelled, and only the call site knows that, so it is passed in.
    if (!options.humanAuthored) {
      const allowance = await mayEmailRecipient(c.env.DB, email.toEmail, unmeteredRecipients(c.env));
      if (!allowance.allowed) {
        await markOutboundFailed(c.env.DB, id, `recipient hourly limit reached (${allowance.count})`);
        return;
      }
    }
    const result = await sendMail(c.env, {
      toEmail: email.toEmail,
      ccEmail: email.ccEmail ?? null,
      subject: email.subject,
      bodyHtml: email.bodyHtml,
    });
    if (result.sent) await markOutboundSent(c.env.DB, id);
    else await markOutboundFailed(c.env.DB, id, result.reason);
  };

  // Marked failed, not left pending, so the reason is visible in the console
  // rather than the row sitting there looking like it is still on its way.
  //
  // Corrected 2026-08-08. This used to say "the Routine retries failed rows
  // too", and it has not been true since the hourly Routine was retired on
  // 2026-08-02. Nothing in this Worker re-reads a `failed` or a `pending`
  // outbound row: the scheduled handler runs `purgeRateLimits` and
  // `ingestInbox`, and that is the whole of it. So `failed` here means a
  // person has to notice it and resend, which is exactly why
  // `mayEmailRecipient` fails open rather than closed.
  //
  // Amended 2026-08-10. This used to end "and why a drain pass belongs on
  // the list of things this desk still needs", named as the fix for the
  // hole described above. It is not the fix, and writing it would have been
  // the wrong call. A drain re-enters `mayEmailRecipient` and is refused
  // again for as long as the window holds, so the best it buys is the same
  // reply an hour late, in exchange for a retry counter, a migration, and
  // new failure semantics on the mail path. The exemption above removes the
  // reachability outright, in the request, with no schema change. A drain
  // pass is still a reasonable thing to want for ordinary Graph flakiness,
  // but it is a reliability feature and should be argued for on those
  // terms, not smuggled in as a security fix.
  //
  // What `failed` still means is that a person has to notice, so the admin
  // ticket page now says so out loud rather than leaving the agent to infer
  // delivery from a redirect.
  c.executionCtx.waitUntil(deliver());
  return id;
}

/**
 * Counts this request against a bucket and, when it is over, renders the
 * refusal. Returns null when the caller may proceed.
 *
 * Keyed on CF-Connecting-IP, which Cloudflare overwrites at the edge, so it
 * cannot be spoofed the way an X-Forwarded-For could. Absent means local
 * development and is not limited: the same signal already decides the HTTPS
 * redirect and the country check, and there is no edge in front of
 * `wrangler dev` to supply one.
 */
async function overRateLimit(c: DeskContext, bucket: RateLimitBucket, subject?: string): Promise<Response | null> {
  // callerKey answers both questions at once: whether this is an edge request
  // worth counting, and who to count it against. A null means local
  // development, and that holds for the recipient buckets too, which is why
  // it is consulted even when the subject is supplied.
  const caller = callerKey(c.req.raw.headers);
  if (!caller) return null;

  const outcome = await consumeRateLimit(c.env.DB, bucket, subject ?? caller);
  if (outcome.allowed) return null;

  // Plain text and a Retry-After, not a styled page. The audience for this
  // response is a script, and the one person who ever sees it by accident is
  // better served by the email route than by a prettier wall. 429 rather than
  // 403 because it is a "not now", and the difference matters to anyone
  // debugging it later.
  return c.text(
    'Too many requests. The desk limits how often one caller can submit, to keep its mail deliverable. Email developer@hamdam.com.au and a ticket opens straight away.',
    429,
    { 'retry-after': String(outcome.retryAfterSeconds) },
  );
}

const app = new Hono<DeskEnv>();

/**
 * The security headers, as a function, so the two responses that never got
 * them can have them too.
 *
 * These used to be set inline in the middleware below, after `await next()`,
 * which quietly meant they were applied to exactly the responses that come
 * back *through* that await and to nothing else. Two do not:
 *
 *  - The HTTPS redirect returns before `next()` is ever called, so the one
 *    response in this Worker that is definitely being served over plaintext,
 *    to a browser that has not yet been told to use TLS, was the only one
 *    with no HSTS on it. That is the response HSTS exists for. A browser
 *    following the 301 does get the header from the https response that
 *    follows, so this was a narrow miss rather than an open door, and it is
 *    still the wrong way round.
 *  - `onError` produces its 500 outside the middleware chain, so the response
 *    served when something has already gone wrong, which is when the
 *    behaviour of the page is least predictable, was the one served with no
 *    CSP, no nosniff and no frame-ancestors.
 *
 * A named function applied in all three places, rather than three copies of
 * the list, because the failure this is fixing is a list that existed in one
 * place and was not reached from two others.
 */
function applySecurityHeaders(c: Context<DeskEnv>): void {
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Nothing generated here is cacheable by anything in the middle.
  //
  // A ticket page carries a person's name, their email address and whatever
  // they pasted into a description, and it is reached by a URL that has the
  // only credential guarding it in the query string. Both halves of that make
  // a stored copy dangerous: a shared cache keyed on the URL is keyed on the
  // credential, and browser back-button restores put the thread on screen
  // after the tab was handed to someone else.
  //
  // Set only where nothing has spoken already, so /static/app.css keeps the
  // long cache lifetime it asks for. Defaulting the other way round would
  // mean every new route was cacheable until someone remembered.
  if (!c.res.headers.has('cache-control')) {
    c.header('Cache-Control', 'private, no-store, max-age=0');
  }
}

// Redirect http to https before anything else runs, and never serve a
// ticket over plaintext.
//
// Cloudflare's "Always Use HTTPS" zone setting should catch this at the
// edge (README covers turning it on) and Universal SSL provisions the
// certificate automatically, but a zone setting is one dashboard toggle
// away from being off. This Worker is the last thing that can still
// refuse, and the stakes here are higher than on the marketing site: the
// tracking token in /tickets/:id?token=... is the only credential guarding
// a ticket, so one plaintext request leaks a working credential.
//
// HSTS is not a substitute, even now that the redirect carries it too.
// Browsers ignore a Strict-Transport-Security header delivered over plaintext
// http, and it does nothing on a first-ever visit -- the redirect is what
// makes that first request safe. Setting it on the 301 as well is belt and
// braces for the browsers that do keep it, not a replacement for redirecting.
//
// CF-Ray, not the hostname, is what tells us this is a real edge request:
// `wrangler dev` reports the custom domain as the Host, so a hostname check
// would 301 local development to production. See httpsRedirectTarget.
app.use('*', async (c, next) => {
  const target = httpsRedirectTarget(c.req.url, viaCloudflareEdge(c.req.raw.headers));
  if (target) {
    // Set on the redirect itself, not only on what it redirects to. This is
    // the plaintext response, so it is the one that most needs to tell the
    // browser never to try plaintext again.
    c.res = c.redirect(target, 301);
    applySecurityHeaders(c);
    return c.res;
  }

  await next();
  applySecurityHeaders(c);
});

// The MTA-STS policy, served before anything else looks at the request.
//
// Deliberately above the country check. Everything below this line is the
// support portal, which is served only where Hamdam is sold; this is not the
// portal. It is a file read by other people's mail servers, and those sit
// wherever the person emailing the desk happens to have their mail hosted.
// Refusing it by country would mean a sender in a country we do not serve
// cannot read the policy -- and the desk's own documentation says email is
// the one channel that is never geo-restricted, precisely so that someone
// outside the list can still reach a person.
//
// Below the header middleware, so the policy still comes back with HSTS on
// it, and below the HTTPS redirect, because a policy fetched over plaintext
// proves nothing and RFC 8461 requires the certificate check that only https
// performs.
app.use('*', async (c, next) => {
  const policy = mtaStsResponseFor(c.req.url);
  if (!policy) return next();
  if (policy.status === 404) return c.text('Not found\n', 404);
  return c.text(policy.body, 200, {
    'content-type': 'text/plain; charset=utf-8',
    // Cacheable, unlike everything else here. It is a public constant, it
    // contains nothing about anybody, and it is fetched by machines that
    // will otherwise ask for it on every delivery.
    'cache-control': 'public, max-age=3600',
  });
});

// Whether the desk is still reading its mail, in a form a machine can watch.
//
// Above the country check for the same reason the MTA-STS policy is: an
// uptime monitor runs wherever its provider runs, and a health check that is
// only reachable from seven countries reports an outage every time the
// monitor moves. It is also the one endpoint whose whole job is to be
// checkable by something outside this system, which is the only kind of
// watching that survives this system being what broke.
//
// Deliberately says nothing. Two words and a status code: no ticket counts,
// no error text, no timestamps. A public endpoint is a public endpoint, and
// everything an operator needs beyond "is it alive" is behind Access on the
// console, where it belongs.
app.get('/health', async (c) => {
  const beat = readHeartbeat(await getSyncState(c.env.DB, HEARTBEAT_KEY));
  const healthy = beat.state === 'ok';
  return c.text(healthy ? 'ok\n' : 'stale\n', healthy ? 200 : 503, {
    'content-type': 'text/plain; charset=utf-8',
    // Short, but not zero. A monitor polling every minute should not put a
    // database read on the critical path of anything, and thirty seconds of
    // staleness is invisible against a ten minute threshold.
    'cache-control': 'public, max-age=30',
  });
});

// Drive a tick by hand, when whatever normally drives it has stopped.
//
// Above the country check, like /health, because the thing calling this runs
// wherever it runs and the desk being unreachable from it is the situation
// this exists for.
//
// Every guard is in tickAuthorised and it fails closed: no TICK_SECRET, no
// route. See tick.ts for why this is here at all, and why the job is
// selectable rather than doing everything at once.
//
// Not metered. The recipient ceiling still applies to every email this
// causes, because that lives at the act of sending and everything crosses it;
// what is deliberately absent is a per-caller limit, because the caller is
// whoever holds the secret and rate limiting a bearer secret protects nobody.
app.post('/internal/tick', async (c) => {
  if (!tickAuthorised(c.env.TICK_SECRET, c.req.header('x-desk-tick') ?? null)) {
    // 404 rather than 401. An unauthenticated caller learns nothing about
    // whether this route exists, and there is no legitimate caller who needs
    // to be told they got the secret wrong.
    return c.notFound();
  }

  const work = requestedJobs(c.req.query('job') ?? null);
  const done: Record<string, unknown> = {};

  if (work.purge) {
    await purgeRateLimits(c.env.DB);
    done.purge = 'done';
  }
  if (work.ingest) done.ingest = await ingestInbox(c.env);
  if (work.followUp) {
    done.followUp = await followUpBotChanges(c.env, (email) => queueAndSendFromCron(c.env, email));
  }

  return c.json(done);
});

// Serve only where Hamdam is sold.
//
// Runs after the HTTPS redirect and inside the header middleware, so a
// refusal still carries CSP, HSTS and the rest: a blocked response is still
// a response, and stripping its headers would make the block itself the
// weakest page on the site.
//
// The Cloudflare WAF rule is the real control and stops this traffic before
// a Worker runs. This is what still refuses if that rule is ever removed,
// which would otherwise fail silently and stay failed.
//
// Local development has no CF-Ray and no country, and is left alone. That is
// the same signal the HTTPS redirect uses, and it cannot be forged in
// production because Cloudflare overwrites CF-Ray at the edge.
app.use('*', async (c, next) => {
  if (!viaCloudflareEdge(c.req.raw.headers)) return next();

  // `request.cf.country` only. The CF-IPCountry header used to be a fallback
  // here, and it is the wrong shape for one: Cloudflare adds it only when the
  // visitor-location managed transform is enabled, and where it is not added,
  // a client-supplied `CF-IPCountry: AU` arrives untouched. So the fallback
  // could only ever fire in precisely the configuration where it is
  // attacker-controlled. `request.cf` is populated by the runtime on every
  // edge request and cannot be set from outside; absent means no country,
  // which this already treats as a refusal.
  const country = (c.req.raw as Request & { cf?: { country?: string } }).cf?.country;
  if (isAllowedCountry(country, parseAllowedCountries(c.env.ALLOWED_COUNTRIES))) return next();

  return c.html(outOfRegionPage(), 403);
});

// ---- static -----------------------------------------------------------

app.get('/static/app.css', (c) => c.text(APP_CSS, 200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'public, max-age=3600' }));

// ---- public portal ------------------------------------------------------

app.get('/', (c) => c.html(submitFormPage({ locale: requestLocale(c) })));

app.post('/tickets', async (c) => {
  // Refused before the body is read, because the body is the cost.
  if (isOversizedBody(c.req.header('content-length'))) return c.text('Request too large.', 413);

  const limited = await overRateLimit(c, 'ticket_create_ip');
  if (limited) return limited;

  const form = await readForm(c);
  if (!form) return c.text('Expected a form submission.', 400);
  // Trimmed, stripped of control characters and capped here rather than
  // trusted from the form. `maxlength` is a courtesy to a browser and nothing
  // at all to a script, and every one of these fields goes on to be stored,
  // rendered, put in front of the model, and mailed.
  const name = cleanLine(form.get('name'), MAX_NAME_CHARS);
  const email = cleanLine(form.get('email'), 254);
  const subject = cleanLine(form.get('subject'), MAX_SUBJECT_CHARS);
  const description = cleanText(form.get('description'), MAX_BODY_CHARS);
  // parseImpact/parseUrgency, not a cast: see their comment in itil.ts. A cast
  // told the type checker these were valid and told the matrix lookup nothing,
  // so a malformed body answered 500 instead of 400.
  const impact = parseImpact(form.get('impact'));
  const urgency = parseUrgency(form.get('urgency'));

  const invalid = (error: string) =>
    c.html(
      submitFormPage({ error, values: { name, email, subject, description }, locale: requestLocale(c) }),
      400,
    );

  if (!name || !email || !subject || !description) return invalid(strings(requestLocale(c)).errorAllFields);

  // The address is where an email goes, not a label on a record. An
  // unchecked one makes this form a way of having the desk's own mailbox
  // deliver a stranger's subject line to a stranger's inbox.
  if (!isValidEmail(email)) return invalid(strings(requestLocale(c)).errorEmail);

  // The exemption from the outbound ceiling is not a public form field.
  //
  // `unmeteredRecipients` exempts developer@hamdam.com.au and the escalation
  // list from `outbound_recipient`, and that exemption is right: an alert to
  // the team is the one message whose entire purpose is to arrive, and
  // metering it would let a busy hour silence the thing announcing the hour
  // is busy. What nothing checked is that those addresses are also just
  // strings a stranger can type into this form. Doing so opens a ticket whose
  // requester is a team address, so the acknowledgement, the assistant's
  // reply and every summary afterwards all go to that address with the one
  // ceiling that bounds outbound mail turned off, and they arrive at the
  // inbox the desk itself reads. That is an unbounded mail amplifier aimed at
  // the team, and it is also a way to fill the mailbox the cron is trying to
  // work through.
  //
  // Folded through `meteringSubject` for the same reason the exemption check
  // is: an exemption that can be dodged by spelling an address differently is
  // not one, and this guard has to fold exactly the way the thing it guards
  // does or it will disagree with it.
  const meteredEmail = meteringSubject(email);
  if (unmeteredRecipients(c.env).some((address) => meteringSubject(address) === meteredEmail)) {
    // The same generic error the shape check gives. Confirming which
    // addresses are special would tell a stranger who the team are and which
    // of their addresses this desk treats differently, and there is no honest
    // message to show here anyway: a real person at one of those addresses
    // does not need the public form.
    return invalid(strings(requestLocale(c)).errorEmail);
  }

  // Counted per recipient as well as per caller. A caller with a pool of
  // addresses can defeat the IP limit; they cannot defeat both, and what
  // needs bounding is how much mail one person can be sent.
  //
  // Folded rather than merely lowercased. `victim+1@gmail.com` and
  // `victim+2@gmail.com` are one inbox and were two buckets, so the ceiling
  // this line exists to enforce was a suggestion to anyone who had noticed.
  const emailLimited = await overRateLimit(c, 'ticket_create_email', meteredEmail);
  if (emailLimited) return emailLimited;

  const requester = await upsertRequester(c.env.DB, email, name);
  // The form's impact and urgency set the base rating; what the ticket is
  // about can only raise it. A Hamdam problem never sits in the "whenever we
  // get to it" band, however mildly the person described it, because they
  // are having trouble with the thing they paid for.
  const { priority, topic } = classifyTicket(impact, urgency, `${subject}\n${description}`);
  // The page they used decides the language of the ticket and every email on
  // it, except when they plainly wrote in the other one: a Persian speaker
  // who lands on the English form and types Persian meant Persian.
  const locale = detectLocale(`${subject}\n${description}`) === 'fa' ? 'fa' : requestLocale(c);
  const now = new Date();
  const { firstResponseDue, resolveDue } = slaDueDates(priority, now);
  const trackingToken = generateTrackingToken();

  const ticketId = await createTicket(c.env.DB, {
    requesterId: requester.id,
    subject,
    priority,
    impact,
    urgency,
    category: null,
    channel: 'portal',
    topic,
    locale,
    trackingToken,
    sourceConversationId: null,
    lastInboundMessageId: null,
    createdAt: now.toISOString(),
    slaFirstResponseDue: firstResponseDue,
    slaResolveDue: resolveDue,
  });

  await addComment(c.env.DB, ticketId, 'requester', name, description);

  const email_ = ackEmail({
    ticketId,
    subject,
    priority,
    trackingUrl: trackingUrl(c.req.url, ticketId, trackingToken),
    requesterName: name,
    locale,
  });
  await queueAndSend(c, {
    ticketId,
    commentId: null,
    kind: 'ack',
    toEmail: requester.email,
    subject: email_.subject,
    bodyHtml: email_.html,
    inReplyToMessageId: null,
  });

  // Answer them before they leave the page. A new ticket used to land on a
  // status page that said "we have got this" and nothing else, so the first
  // real response was however long the queue took. The whole argument for an
  // interactive desk is that the person who has just described their problem
  // is still sitting there: this is the one moment where a fast answer costs
  // them nothing to read.
  const first = await composeAssistantReplyLive(
    {
      priority,
      conversationText: `${subject}\n${description}`,
      assistantTurns: 0,
      askedQuestions: [],
      rejectedArticles: [],
      topic,
      locale,
    },
    {
      ai: c.env.AI,
      ticketSubject: subject,
      turns: [{ author: 'requester', body: description }],
      claim: () => claimModelCall(c.env.DB, dailyCallLimit(c.env)),
    },
  );
  await addComment(c.env.DB, ticketId, 'agent', ASSISTANT_NAME, first.body);
  await recordAssistantTurn(c.env.DB, ticketId, {
    question: first.question,
    action: first.action,
    articleId: first.articleId,
    reason: first.reason,
    escalated: first.escalated,
  });
  // A brand new ticket has never been escalated before, so this is always
  // the first time and always worth sending.
  if (first.escalated) c.executionCtx.waitUntil(notifyEscalation(c.env, ticketId, first.reason));

  return c.redirect(localePath(locale, `/tickets/${ticketId}?token=${trackingToken}&submitted=1`), 303);
});

app.get('/track', (c) => c.html(trackLookupPage({ locale: requestLocale(c) })));

app.get('/tickets/lookup', (c) => {
  const id = parseTicketPublicId(String(c.req.query('id') ?? ''));
  const token = String(c.req.query('token') ?? '').trim();
  const locale = requestLocale(c);
  if (!id || !token) return c.html(trackLookupPage({ error: strings(locale).trackError, locale }), 400);
  return c.redirect(localePath(locale, `/tickets/${id}?token=${encodeURIComponent(token)}`), 303);
});

app.get('/tickets/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const token = String(c.req.query('token') ?? '');
  if (!Number.isInteger(id) || !token) return c.notFound();

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket || !tokensMatch(ticket.tracking_token, token)) return c.notFound();

  const comments = await listComments(c.env.DB, id);

  // The card under the thread asks "did that help?", and it has to be about
  // the answer the assistant actually gave. It used to re-derive a match on
  // every page load, which meant the card could offer one article while the
  // reply above it discussed another, and pressing "this did not help"
  // rejected whichever one the matcher happened to like at that moment.
  //
  // So: read what was cited, do not guess at it. Answers drawn from general
  // knowledge cite nothing and get no card; replying in the thread is the
  // way to say it did not work, which is the more useful signal anyway.
  const state = await getAgentState(c.env.DB, id);
  const citedArticle =
    state.lastArticleId && !state.rejectedArticles.includes(state.lastArticleId)
      ? KB_ARTICLES.find((a) => a.id === state.lastArticleId)
      : undefined;
  const suggestion = citedArticle
    ? suggestionBlock({ article: citedArticle, ticketId: id, token, confidence: 'confident' })
    : undefined;

  return c.html(ticketStatusPage({ ticket, comments, justSubmitted: c.req.query('submitted') === '1', justEmailed: c.req.query('emailed') === '1', suggestion }));
});

// Feedback on a suggestion. Recorded either way: "this did not help" is the
// signal that tells the desk an article is wrong or missing, and it is worth
// more than the resolutions.
app.post('/tickets/:id/feedback', async (c) => {
  const id = Number(c.req.param('id'));
  const token = String(c.req.query('token') ?? '');
  if (!Number.isInteger(id) || !token) return c.notFound();

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket || !tokensMatch(ticket.tracking_token, token)) return c.notFound();

  // Read before metering, because which bucket applies depends on which
  // button was pressed, and the two buttons cost the desk entirely different
  // things. Reading a form on a request that has already produced a valid
  // tracking token is not the expensive part of anything.
  const form = await readForm(c);
  if (!form) return c.text('Expected a form submission.', 400);
  const outcome = String(form.get('outcome') ?? '');
  // Only an article the desk actually publishes. Anything else was not on
  // the page it came from, and taking it at face value writes attacker text
  // into a system comment and grows the ticket's rejected list without bound.
  const submitted = String(form.get('article') ?? '').trim();
  const articleId = KB_ARTICLES.some((a) => a.id === submitted) ? submitted : '';

  if (outcome === 'solved') {
    // Metered on the same bucket as /summary, and after the token check for
    // the same reason it is there: a caller guessing ticket numbers must not
    // be able to spend a real requester's allowance.
    //
    // This route was not metered at all, which made it the cheaper of the two
    // doors to the same action. Pressing "this solved it" resolves the ticket
    // and emails the whole conversation, so anyone holding one tracking token,
    // including the requester's own mail client following a link, could ask
    // the desk for unlimited outbound mail while the button beside it was
    // capped at ten an hour. Sharing the bucket rather than adding a new one
    // is deliberate: what is being bounded is mail to this person, not presses
    // of a particular button.
    const limited = await overRateLimit(c, 'ticket_summary');
    if (limited) return limited;

    // Idempotent on the feedback, not on the ticket's status, and the
    // difference is not academic.
    //
    // Keying on `status !== 'resolved'` looked like the same thing and was
    // strictly worse: it also swallowed the press when an agent had already
    // resolved the ticket in the console. A requester who then opens their
    // tracking link, reads the suggestion and presses "this solved it" is
    // telling the desk something it does not know yet, namely that the
    // article was the thing that helped, and the whole route exists to
    // capture that. They got no comment recorded, no summary, and a redirect
    // that looked exactly like success.
    //
    // So the guard asks the question actually being asked: has this ticket
    // already had a "solved" press recorded on it? A second press then means
    // nothing at all, which is what a reload or a replayed POST should mean,
    // and a first press still counts however the ticket got to where it is.
    const comments = await listComments(c.env.DB, id);
    if (!alreadyReportedSolved(comments)) {
      await addComment(c.env.DB, id, 'system', null, solvedNote(articleId));
      if (ticket.status !== 'resolved') await updateTicketStatus(c.env.DB, id, 'resolved');
      // They have agreed it is fixed. That is the settled state worth putting
      // in their inbox, and the only thing in it is what they already read.
      await queueConversationSummary(c, ticket, await listComments(c.env.DB, id), 'resolved');
    }
  } else if (outcome === 'unresolved') {
    // A different bucket, because this is a different cost.
    //
    // "This did not help" sends no mail at all: it writes a comment, records
    // a rejection and moves the ticket off `new`. Metering it against
    // `ticket_summary` put a storage-only action behind the desk's outbound
    // mail ceiling, so a requester who had emailed themselves the
    // conversation ten times that hour could no longer tell the desk an
    // article was wrong. That signal is the most valuable thing this route
    // collects, and it was the one being dropped. `ticket_reply` is the
    // bucket for a press that stores something, which is what this is.
    const limited = await overRateLimit(c, 'ticket_reply');
    if (limited) return limited;

    await addComment(c.env.DB, id, 'system', null, `Requester reported that the suggested article "${articleId}" did not help. Needs a person.`);
    // Remember it, so nothing offers this article again on this ticket.
    if (articleId) await recordRejectedArticle(c.env.DB, id, articleId);
    if (ticket.status === 'new') await updateTicketStatus(c.env.DB, id, 'open');
  }

  return c.redirect(`/tickets/${id}?token=${encodeURIComponent(token)}`, 303);
});

/** The system note a "this solved it" press leaves behind. */
function solvedNote(articleId: string): string {
  return `Requester reported that the suggested article "${articleId}" resolved this.`;
}

/**
 * Whether a "this solved it" press has already been recorded on this ticket.
 *
 * Reads the note back rather than keeping a column for it, because the note is
 * already the record: it is written on the same path, in the same transaction
 * order, and it is the thing an agent reads to know what happened. A second
 * source of truth for "did this fire" is a second thing that can disagree.
 *
 * Matched on both ends of the sentence so it cannot collide with the
 * "did not help" note, which shares its opening words.
 */
function alreadyReportedSolved(comments: readonly { author_type: string; body: string }[]): boolean {
  return comments.some(
    (comment) =>
      comment.author_type === 'system' &&
      comment.body.startsWith('Requester reported that the suggested article') &&
      comment.body.endsWith('resolved this.'),
  );
}

// "Email me where this got to."
//
// The requester decides when the conversation has reached a state worth
// keeping, which is the case the automatic triggers cannot read: they have
// what they need, they are done reading, and they want it in writing. No
// approval step, because every word of it is already on their screen.
app.post('/tickets/:id/summary', async (c) => {
  const id = Number(c.req.param('id'));
  const token = String(c.req.query('token') ?? '');
  if (!Number.isInteger(id) || !token) return c.notFound();

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket || !tokensMatch(ticket.tracking_token, token)) return c.notFound();

  // Rate limited after the token check, not before, so a caller cannot spend
  // somebody else's allowance by guessing ticket numbers. This one sends an
  // email on every press, which is why it is metered at all.
  const limited = await overRateLimit(c, 'ticket_summary');
  if (limited) return limited;

  const comments = await listComments(c.env.DB, id);
  const state = await getAgentState(c.env.DB, id);
  const status = ticket.status === 'resolved' ? 'resolved' : state.escalated ? 'with_a_person' : 'in_progress';
  await queueConversationSummary(c, ticket, comments, status);
  await addComment(c.env.DB, id, 'system', null, 'Requester asked for the conversation by email.');

  return c.redirect(localePath(ticket.locale, `/tickets/${id}?token=${encodeURIComponent(token)}&emailed=1`), 303);
});

app.post('/tickets/:id/reply', async (c) => {
  const id = Number(c.req.param('id'));
  const token = String(c.req.query('token') ?? '');
  if (!Number.isInteger(id) || !token) return c.notFound();
  if (isOversizedBody(c.req.header('content-length'))) return c.text('Request too large.', 413);

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket || !tokensMatch(ticket.tracking_token, token)) return c.notFound();

  // After the token check, so guessing ticket numbers cannot burn a real
  // requester's allowance. Loose, because the fast back-and-forth in the
  // portal is the feature; it is here because every reply also mails the desk
  // and spends a model call.
  const limited = await overRateLimit(c, 'ticket_reply');
  if (limited) return limited;

  const form = await readForm(c);
  if (!form) return c.text('Expected a form submission.', 400);
  const body = cleanText(form.get('body'), MAX_BODY_CHARS);
  if (body) {
    const commentId = await addComment(c.env.DB, id, 'requester', ticket.requester_name, body);
    if (ticket.status === 'pending' || ticket.status === 'resolved') {
      await updateTicketStatus(c.env.DB, id, 'open');
    }

    // Tell the desk. A portal reply used to land silently: the comment was
    // stored and nothing surfaced it, so an agent found out only by opening
    // the ticket speculatively, while the requester reasonably assumed
    // someone had been told.
    const url = new URL(c.req.url);
    const adminUrl = `${isLocalHost(url.hostname) ? url.protocol : 'https:'}//${url.host}/admin/tickets/${id}`;
    const rendered = requesterReplyNotification({
      ticketId: id,
      subject: ticket.subject,
      requesterName: ticket.requester_name,
      requesterEmail: ticket.requester_email,
      message: body,
      adminUrl,
    });
    await queueAndSend(c, {
      ticketId: id,
      commentId,
      kind: 'requester_reply',
      toEmail: SUPPORT_INBOX,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      inReplyToMessageId: null,
    });

    // "Close this ticket" is an instruction, not a question, and it is one
    // the desk can carry out. Doing it here rather than sending it to the
    // model is the difference between a ticket that closes and a reply that
    // says it closed: the assistant has no way to change a ticket's status,
    // so asked to handle this it produced "This ticket is being closed as
    // requested" and left it open.
    if (requestedClosure(body)) {
      await updateTicketStatus(c.env.DB, id, 'closed');
      await addComment(
        c.env.DB,
        id,
        'agent',
        ASSISTANT_NAME,
        strings(ticket.locale).replyClosed,
      );
      await queueConversationSummary(c, { ...ticket, status: 'closed' }, await listComments(c.env.DB, id), 'resolved');
      return c.redirect(localePath(ticket.locale, `/tickets/${id}?token=${encodeURIComponent(token)}`), 303);
    }

    // Answer them now, in the thread. This is what was missing: the engine
    // was matching, drafting and notifying, but every output went somewhere
    // the requester could not see, so from their side the desk was silent.
    const allComments = await listComments(c.env.DB, id);
    const conversationText = [ticket.subject, ...allComments.filter((m) => m.author_type === 'requester').map((m) => m.body)].join('\n');
    const state = await getAgentState(c.env.DB, id);
    const reply = await composeAssistantReplyLive(
      {
        priority: ticket.priority,
        conversationText,
        assistantTurns: state.assistantTurns,
        askedQuestions: state.askedQuestions,
        rejectedArticles: state.rejectedArticles,
        alreadyEscalated: state.escalated,
      topic: ticket.topic,
      locale: ticket.locale,
      },
      {
        ai: c.env.AI,
        ticketSubject: ticket.subject,
        turns: threadTurns(allComments),
        // Two budgets, and both have to say yes. The daily one caps what the
        // desk spends; the per-ticket one caps how much of that any single
        // conversation may take, which the daily one on its own cannot do. A
        // global counter with no per-ticket bound means one tracking token is
        // enough to empty the day's assistant for every other requester.
        //
        // Ordered per-ticket first so a ticket that has already used its six
        // does not also spend a call off the daily budget being told so.
        claim: async () =>
          (await consumeRateLimit(c.env.DB, 'model_call_ticket', String(id))).allowed &&
          (await claimModelCall(c.env.DB, dailyCallLimit(c.env))),
      },
    );
    await addComment(c.env.DB, id, 'agent', ASSISTANT_NAME, reply.body);
    await recordAssistantTurn(c.env.DB, id, {
      question: reply.question,
      action: reply.action,
      articleId: reply.articleId,
      reason: reply.reason,
      escalated: reply.escalated,
    });
    if (reply.escalated && ticket.status === 'new') {
      await updateTicketStatus(c.env.DB, id, 'open');
    }
    // Only on the transition. A requester adding three messages to a ticket
    // already handed over should not produce three identical alerts: an
    // alert that arrives repeatedly stops being read, which is worse than
    // one that never arrived.
    if (reply.escalated && !state.escalated) {
      c.executionCtx.waitUntil(notifyEscalation(c.env, id, reply.reason));
    }

    // No email per turn. The portal already answered them, instantly, and
    // they are looking at it. An email now would describe a conversation
    // that is still moving.
    //
    // The exception is a handover: once a person owns the ticket the fast
    // loop is over, the requester may well close the tab, and "a human has
    // this and can see everything you wrote" is exactly the thing worth
    // having in their inbox.
    if (reply.escalated) {
      await queueConversationSummary(c, ticket, await listComments(c.env.DB, id), 'with_a_person');
    }
  }
  return c.redirect(localePath(ticket.locale, `/tickets/${id}?token=${encodeURIComponent(token)}`), 303);
});

// ---- admin console --------------------------------------------------------
//
// Authentication is Cloudflare Access, verified here rather than assumed.
// The console proves identity from the signed Cf-Access-Jwt-Assertion, not
// from Cf-Access-Authenticated-User-Email: that header is only meaningful
// while an Access policy actually fronts this path, and is otherwise
// client-settable. See src/access.ts for the full reasoning.
//
// Unconfigured means closed. If ACCESS_TEAM_DOMAIN/ACCESS_AUD are unset
// there is no way to verify anything, so the console refuses rather than
// falling back to a weaker check -- the fallback is exactly the state an
// attacker would want to induce.

app.use('/admin/*', async (c, next) => {
  // CSRF: the Access assertion travels in a cookie, which a cross-site form
  // POST would send for free. See isCrossSiteRequest.
  if (
    c.req.method !== 'GET' &&
    c.req.method !== 'HEAD' &&
    isCrossSiteRequest(c.req.url, c.req.header('origin'), viaCloudflareEdge(c.req.raw.headers))
  ) {
    return c.text('Forbidden: cross-site request rejected.', 403);
  }

  const teamDomain = c.env.ACCESS_TEAM_DOMAIN;
  const aud = c.env.ACCESS_AUD;

  // Local development: `wrangler dev` never carries CF-Ray (only Cloudflare's
  // edge sets it, and it overwrites any client value), so this cannot be
  // reached in production no matter what a client sends. Still opt-in via a
  // .dev.vars value that is never deployed.
  if (!viaCloudflareEdge(c.req.raw.headers) && c.env.DEV_ADMIN_EMAIL) {
    c.set('agentEmail', c.env.DEV_ADMIN_EMAIL);
    await next();
    return;
  }

  if (!teamDomain || !aud) {
    return c.text(
      'The agent console is not configured yet: set ACCESS_TEAM_DOMAIN and ACCESS_AUD, then redeploy. See support/README.md.',
      503,
    );
  }

  const token = extractAccessToken(c.req.header('cf-access-jwt-assertion'), c.req.header('cookie'));
  if (!token) return c.text('Forbidden: no Cloudflare Access assertion on this request.', 403);

  const identity = await verifyAccessJwt(token, { teamDomain, aud }, fetchAccessKeys);
  if (!identity) return c.text('Forbidden: Cloudflare Access assertion failed verification.', 403);

  // The second lock, and the one that was missing.
  //
  // Everything above proves the assertion is genuine and was issued for this
  // application. It says nothing about whether the person it names should be
  // reading a support queue: that lived entirely in one Cloudflare Access
  // policy, so widening that policy widened this console silently and from
  // somewhere else.
  //
  // Which is the pattern this codebase argues for everywhere else and had not
  // applied here. The country check is a WAF rule *and* geo.ts. The console
  // is the Access proxy *and* the JWT verification above. Both exist because
  // a control configured in a dashboard is one click from being different and
  // the change leaves no trace in the repository.
  //
  // Unset means no second lock, which is the state this shipped in, so it
  // cannot be a hard failure without locking the only two people out of their
  // own console on deploy. It is a refusal to be silent instead: the console
  // says so on every page and the reason is recorded.
  if (!isAllowedAgent(identity.email, c.env)) {
    console.warn(`admin refused: ${identity.email} is not in ADMIN_EMAILS`);
    return c.text('Forbidden: this account is not on the console allowlist.', 403);
  }

  c.set('agentEmail', identity.email);
  await next();
});

app.get('/admin', async (c) => {
  const agentEmail = c.get('agentEmail');
  const statusParam = parseTicketStatus(c.req.query('status'));
  const priorityParam = parsePriority(c.req.query('priority'));
  const tickets = await listQueue(c.env.DB, { status: statusParam, priority: priorityParam });
  return c.html(
    adminQueuePage({
      tickets,
      filterStatus: statusParam,
      filterPriority: priorityParam,
      agentEmail,
      allowlistConfigured: adminAllowlist(c.env).length > 0,
      ingest: readHeartbeat(await getSyncState(c.env.DB, HEARTBEAT_KEY)),
    }),
  );
});

app.get('/admin/tickets/:id', async (c) => {
  const agentEmail = c.get('agentEmail');
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();
  const comments = await listComments(c.env.DB, id);
  const drafts = await listDrafts(c.env.DB, id);
  const undeliveredOutbound = await listUndeliveredOutboundForTicket(c.env.DB, id);
  return c.html(
    adminTicketPage({
      ticket,
      comments,
      agentEmail,
      drafts,
      undeliveredOutbound,
      allowlistConfigured: adminAllowlist(c.env).length > 0,
    }),
  );
});

app.post('/admin/tickets/:id/reply', async (c) => {
  const agentEmail = c.get('agentEmail');
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();

  const form = await readForm(c);
  if (!form) return c.text('Expected a form submission.', 400);
  // Capped like the requester's, though this side is authenticated: the cap
  // is about what the email and the stored row can hold, not about trust.
  const body = cleanText(form.get('body'), MAX_BODY_CHARS);
  if (body) {
    const commentId = await addComment(c.env.DB, id, 'agent', agentEmail, body);
    await markFirstResponse(c.env.DB, id);
    if (ticket.status === 'new') await updateTicketStatus(c.env.DB, id, 'open');

    const rendered = agentReplyEmail({ ticketId: id, subject: ticket.subject, agentName: agentEmail, message: body });
    // The one call site that is human-authored: an agent, behind Access and
    // the allowlist, has typed this and pressed send. It is exempt from the
    // per-recipient ceiling because that ceiling bounds machine-generated
    // mail, and because a stranger who has spent a requester's budget must
    // not thereby be able to stop the desk answering them. See the note in
    // `queueAndSend`.
    await queueAndSend(
      c,
      {
        ticketId: id,
        commentId,
        kind: 'agent_reply',
        toEmail: ticket.requester_email,
        subject: rendered.subject,
        bodyHtml: rendered.html,
        inReplyToMessageId: ticket.last_inbound_message_id,
      },
      { humanAuthored: true },
    );
  }
  return c.redirect(`/admin/tickets/${id}`, 303);
});

// Ask the assistant for a reply to a ticket it has not touched.
//
// Email-created tickets never pass through the portal, so nothing has run
// the assistant on them: the routine writes them straight to D1. Rather than
// give a scheduled job an API key and let it email strangers unattended,
// the button lives here, behind Access, and produces a draft. An agent looks
// at the ticket, asks for a first pass, reads it, and sends it or does not.
app.post('/admin/tickets/:id/assistant-draft', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();

  const comments = await listComments(c.env.DB, id);
  const state = await getAgentState(c.env.DB, id);
  const conversationText = [ticket.subject, ...comments.filter((m) => m.author_type === 'requester').map((m) => m.body)].join('\n');

  const reply = await composeAssistantReplyLive(
    {
      priority: ticket.priority,
      conversationText,
      assistantTurns: state.assistantTurns,
      askedQuestions: state.askedQuestions,
      rejectedArticles: state.rejectedArticles,
      alreadyEscalated: state.escalated,
      topic: ticket.topic,
      locale: ticket.locale,
    },
    {
      ai: c.env.AI,
      ticketSubject: ticket.subject,
      turns: threadTurns(comments),
      claim: () => claimModelCall(c.env.DB, dailyCallLimit(c.env)),
    },
  );

  // An escalation is the assistant saying this one is yours. Queuing that as
  // an email to the requester would tell them a person is picking it up in
  // the same breath as the person asking for help writing to them.
  if (!reply.escalated) {
    const rendered = assistantWrittenEmail({
      ticketId: id,
      subject: ticket.subject,
      body: reply.body,
      requesterName: ticket.requester_name,
      trackingUrl: trackingUrl(c.req.url, id, ticket.tracking_token),
    });
    await queueAssistantDraft(c.env.DB, {
      ticketId: id,
      commentId: null,
      kind: 'assistant_draft',
      toEmail: ticket.requester_email,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      inReplyToMessageId: ticket.last_inbound_message_id,
      assistantReason: reply.reason,
      assistantArticleId: reply.articleId ?? null,
    });
  } else {
    await addComment(c.env.DB, id, 'system', null, `Assistant declined to draft a reply: ${reply.reason}`);
  }

  return c.redirect(`/admin/tickets/${id}`, 303);
});

app.post('/admin/tickets/:id/status', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id)) return c.notFound();
  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();

  const form = await readForm(c);
  if (!form) return c.text('Expected a form submission.', 400);
  const status = parseTicketStatus(String(form.get('status') ?? '')) ?? ticket.status;
  const priority = parsePriority(String(form.get('priority') ?? '')) ?? ticket.priority;

  if (priority !== ticket.priority) {
    const { firstResponseDue, resolveDue } = slaDueDates(priority, new Date(ticket.created_at));
    await updateTicketPriority(c.env.DB, id, priority, firstResponseDue, resolveDue);
  }
  if (status !== ticket.status) {
    await updateTicketStatus(c.env.DB, id, status);
    if (status === 'resolved') {
      const trackingUrlStr = trackingUrl(c.req.url, id, ticket.tracking_token);
      const rendered = resolvedEmail({ ticketId: id, subject: ticket.subject, trackingUrl: trackingUrlStr });
      await queueAndSend(c, {
        ticketId: id,
        commentId: null,
        kind: 'status_change',
        toEmail: ticket.requester_email,
        subject: rendered.subject,
        bodyHtml: rendered.html,
        inReplyToMessageId: ticket.last_inbound_message_id,
      });
    }
  }
  return c.redirect(`/admin/tickets/${id}`, 303);
});

app.post('/admin/tickets/:id/drafts/:draftId/approve', async (c) => {
  const agentEmail = c.get('agentEmail');
  const id = Number(c.req.param('id'));
  const draftId = Number(c.req.param('draftId'));
  if (!Number.isInteger(id) || !Number.isInteger(draftId)) return c.notFound();

  const ticket = await getTicketById(c.env.DB, id);
  if (!ticket) return c.notFound();

  const draft = await approveDraft(c.env.DB, draftId, id, agentEmail);
  if (draft) {
    // The approver owns the words from here. Recording the reply under their
    // name, not the assistant's, is the honest account: they read it and
    // chose to send it, which is the whole point of drafting first.
    await addComment(c.env.DB, id, 'agent', agentEmail, stripHtml(draft.body_html));
    await markFirstResponse(c.env.DB, id);
    if (ticket.status === 'new') await updateTicketStatus(c.env.DB, id, 'open');
  }
  return c.redirect(`/admin/tickets/${id}`, 303);
});

app.post('/admin/tickets/:id/drafts/:draftId/discard', async (c) => {
  const agentEmail = c.get('agentEmail');
  const id = Number(c.req.param('id'));
  const draftId = Number(c.req.param('draftId'));
  if (!Number.isInteger(id) || !Number.isInteger(draftId)) return c.notFound();

  const discarded = await discardDraft(c.env.DB, draftId, id);
  if (discarded) {
    // Worth a system note: a discarded draft is the signal that an article
    // was wrong for this ticket, and that is what improves the knowledge
    // base. Silently dropping it loses the only record that it happened.
    await addComment(c.env.DB, id, 'system', null, `${agentEmail} discarded a suggested reply.`);
  }
  return c.redirect(`/admin/tickets/${id}`, 303);
});

app.notFound((c) => c.text('Not found', 404));

/**
 * The last word on anything that throws.
 *
 * Without this, what a failing route tells the world is whatever the
 * framework decides, and that is a dependency's choice rather than ours. It
 * is a bare "Internal Server Error" today, which is right, and nothing
 * guarantees it stays that way through an upgrade.
 *
 * So: one message out, and the detail goes to the log instead. The log is
 * worth writing to now that observability is on; before that this would have
 * been a line nobody could read.
 */
app.onError((error, c) => {
  console.error(`unhandled ${c.req.method} ${new URL(c.req.url).pathname}:`, error instanceof Error ? error.stack ?? error.message : String(error));
  // Hono runs this outside the middleware chain, so nothing above has set a
  // header on it. The response served when something has already gone wrong
  // is the last one that should be the unprotected one.
  c.res = c.text('Something went wrong. Please try again, or email developer@hamdam.com.au.', 500);
  applySecurityHeaders(c);
  return c.res;
});

/**
 * The Worker itself: HTTP, plus the cron that reads the inbox.
 *
 * The inbox pass is what makes the hourly Routine unnecessary rather than
 * merely slower. Failures are logged and swallowed: a scheduled handler that
 * throws gets retried by Cloudflare, and a retry that re-reads the same
 * batch is exactly what the dedupe ledger and the held checkpoint already
 * handle better.
 */
/**
 * The locale this request is being served in.
 *
 * Set by the prefix strip below, never read from the path inside a handler,
 * so there is one place that decides and the routes stay single-registration.
 * Forging the header only changes which language a public page renders in,
 * which is not a boundary worth defending.
 */
function requestLocale(c: DeskContext): Locale {
  return parseLocale(c.req.header(LOCALE_HEADER));
}

const LOCALE_HEADER = 'x-hamdam-locale';

/**
 * Serves the whole public portal under /fa as well as /, without registering
 * every route twice.
 *
 * Hono's routes are flat and a second registration of each one would be a
 * second place to forget something. Stripping the prefix here means /fa/track
 * and /track are the same handler reached the same way, differing only in a
 * header the handler reads for its strings.
 *
 * The console is deliberately not translated. It is an internal tool with one
 * or two users who both read English, and a half-translated admin surface is
 * worse than an untranslated one.
 *
 * Which is why /fa/admin is refused outright rather than merely left in
 * English. The prefix strip made an alias for *every* route, the console
 * included, and the Cloudflare Access application in front of this Worker is
 * scoped to the path `support.hamdam.com.au/admin`. So /fa/admin reached the
 * console handler without Access ever seeing the request: the Worker's own
 * JWT check refused it, which is exactly the defence in depth that check
 * exists for and is why this was a second front door rather than an open one.
 * But it was a door Access could not log, could not rate limit, and could not
 * apply a policy to, and "the inner check happened to hold" is not a thing to
 * leave standing once you have noticed it.
 */
function withLocalePrefix(request: Request): Request {
  const url = new URL(request.url);
  const target = localePrefixTarget(url.pathname);

  // Rebuilding a Request drops `cf`, and `cf` is where the country lives.
  //
  // This cost the Persian portal an outage, briefly and in production. The
  // country check used to read `cf?.country ?? header('cf-ipcountry')`, and
  // the header half was removed as hardening, on the reasoning that it could
  // only fire in a configuration where it was forgeable. It could also fire
  // here: every /fa request reaches the geo check as a *reconstructed*
  // Request, whose `cf` is undefined no matter what the real one carried. So
  // the header was not a fallback for a rare misconfiguration. It was the
  // only thing answering the question on half the site, and removing it
  // turned every Persian page into "not available in your country".
  //
  // Carried explicitly now, so the rewrite preserves what the runtime put
  // there and the geo check reads a real country on every path. Hardening a
  // fallback away is only safe once you know what the primary actually
  // returns, and this is what "actually" looked like.
  const rebuild = (rewritten: URL, headers: Headers): Request =>
    new Request(rewritten, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
      cf: (request as Request & { cf?: unknown }).cf,
    } as RequestInit);

  // Nothing to rewrite: either no prefix, or a prefixed path the prefix is
  // not allowed to reach (/fa/admin). Either way the request is served as it
  // arrived, minus any locale header a client tried to supply.
  //
  // The path decides the locale, and only the path. That header is an
  // internal channel between this function and the handlers, so a client
  // sending its own has to be cleared rather than merged with: otherwise
  // `X-Hamdam-Locale: fa` on an English URL renders a Persian page, and the
  // locale it sets is the locale the resulting ticket and every email on it
  // are conducted in.
  if (target === null) {
    if (!request.headers.has(LOCALE_HEADER)) return request;
    const cleaned = new Headers(request.headers);
    cleaned.delete(LOCALE_HEADER);
    return rebuild(url, cleaned);
  }

  url.pathname = target;
  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, 'fa');
  return rebuild(url, headers);
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(withLocalePrefix(request), env, ctx);
  },
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    // Not every job on every tick. See tick.ts for which and why; the short
    // version is that this Worker gets 10 ms of CPU per invocation and was
    // measured using nine of them.
    const work = tickWork(event.scheduledTime);

    // Housekeeping. Rate limit rows accumulate one per distinct caller and are
    // dead the moment their window rolls; sweeping them here keeps that off
    // the request path, where somebody is waiting.
    if (work.purge) ctx.waitUntil(purgeRateLimits(env.DB));
    ctx.waitUntil(
      ingestInbox(env)
        .then((summary) => {
          if (summary.fetched > 0) console.log('ingest', JSON.stringify(summary));
        })
        .catch((error) => {
          console.error('ingest failed:', error instanceof Error ? error.message : String(error));
        }),
    );

    // The half of the bot change flow that no email triggers: the agent
    // opening a pull request, and a merge shipping it. Neither tells the desk
    // anything, so the desk looks. Separate from the ingest chain on purpose,
    // so a mailbox outage does not also stop her being told her change is
    // live, and so a failure here cannot stop the mail.
    if (work.followUp) ctx.waitUntil(
      followUpBotChanges(env, (email) => queueAndSendFromCron(env, email))
        .then((summary) => {
          // Logged whenever a change is in flight, not only when the pass did
          // something. A pass that watches a ticket and does nothing is the
          // state that hid a real fault for an hour: the desk was silent, the
          // logs were silent, and silence read as "nothing is happening" when
          // it meant "something is stuck". One line per follow-up pass, and
          // only while a change is open, buys that back.
          if (summary.watching > 0) console.log('bot follow-up', JSON.stringify(summary));
        })
        .catch((error) => {
          console.error('bot follow-up failed:', error instanceof Error ? error.message : String(error));
        }),
    );
  },
};

// Also exported for the ITIL prompt / email-routine docs to link back to
// concrete public IDs without re-deriving the format.
export { ticketPublicId };
