import type { Env } from './types.js';
import type { MessageHeader } from './authResults.js';

// Sending mail from the Worker, immediately.
//
// Until now every outbound email waited for the hourly Routine, because
// Workers cannot reach Composio and the Routine was the only thing that
// could. That is fine for a nightly digest and wrong for an acknowledgement:
// someone who has just described a problem and been told "a confirmation
// email is on its way" should not be waiting fifty minutes to find out that
// was true.
//
// Microsoft Graph, app-only. The mail genuinely comes from
// developer@hamdam.com.au: it is that mailbox sending, so it lands in Sent
// Items alongside everything a person sends by hand, and replies come back
// to the same inbox the Routine already reads. Nothing about the receiving
// half changes.
//
// The alternative was a third-party sending service with SPF and DKIM
// records pointed at it. That would also work, and it would mean a second
// system holding the right to send as this domain, plus a credential that
// can send as anyone. `Mail.Send` scoped to one mailbox is the smaller
// thing to be wrong about.

/** The one mailbox this desk sends from. */
export const SENDER = 'developer@hamdam.com.au';

const TOKEN_ENDPOINT = (tenant: string) => `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
const SEND_ENDPOINT = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER)}/sendMail`;

export interface MailToSend {
  toEmail: string;
  /** Copied on this message, when a copy has been configured. */
  ccEmail?: string | null;
  subject: string;
  bodyHtml: string;
}

export type SendResult = { sent: true } | { sent: false; reason: string };

/**
 * Cached app token, so a burst of tickets does not mean a burst of token
 * requests. Module scope, so it lives as long as the isolate and no longer,
 * which is the correct lifetime: a new isolate simply fetches another.
 *
 * Expiry is deliberately treated as thirty seconds earlier than claimed. A
 * token that expires in flight fails the send, and the cost of asking again
 * slightly too often is one extra request.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;
const EXPIRY_MARGIN_MS = 30_000;

export function resetTokenCache(): void {
  cachedToken = null;
}

/** True when the Worker has everything it needs to send without the Routine. */
export function canSendDirectly(env: Env): boolean {
  return Boolean(env.GRAPH_TENANT_ID && env.GRAPH_CLIENT_ID && env.GRAPH_CLIENT_SECRET);
}

async function accessToken(env: Env, now: number): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.value;

  const response = await fetch(TOKEN_ENDPOINT(env.GRAPH_TENANT_ID!), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GRAPH_CLIENT_ID!,
      client_secret: env.GRAPH_CLIENT_SECRET!,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    // The body carries Entra's own error code, which is the difference
    // between "the secret expired" and "consent was never granted". Both
    // look like "email stopped working" from outside.
    throw new Error(`token request failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
  }

  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error('token response had no access_token');

  cachedToken = {
    value: body.access_token,
    expiresAt: now + Math.max(0, (body.expires_in ?? 3600) * 1000 - EXPIRY_MARGIN_MS),
  };
  return cachedToken.value;
}

/**
 * Sends one email. Never throws: a failure comes back as a reason, because
 * every caller wants the same thing from a failed send, which is to leave
 * the row pending so the hourly Routine tries again. An exception here would
 * only give each of them a chance to forget that.
 */
export async function sendMail(env: Env, mail: MailToSend, now = Date.now()): Promise<SendResult> {
  if (!canSendDirectly(env)) return { sent: false, reason: 'graph credentials not configured' };

  try {
    const token = await accessToken(env, now);
    const response = await fetch(SEND_ENDPOINT, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: mail.subject,
          body: { contentType: 'HTML', content: mail.bodyHtml },
          toRecipients: [{ emailAddress: { address: mail.toEmail } }],
          // Omitted entirely when there is no copy, rather than sent as an
          // empty array: Graph accepts both, and a message with no ccRecipients
          // key is the one that matches what every message before this looked
          // like.
          ...(mail.ccEmail ? { ccRecipients: [{ emailAddress: { address: mail.ccEmail } }] } : {}),
        },
        // Keep it in Sent Items. A support desk where half the outgoing mail
        // is invisible to the person running it is worse than one that is
        // slow, and this is the only record that the send happened at all.
        saveToSentItems: true,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (response.status === 202) return { sent: true };

    // A stale cached token reads as 401. Drop it so the next attempt fetches
    // a fresh one rather than failing identically until the isolate recycles.
    if (response.status === 401) cachedToken = null;
    return { sent: false, reason: `graph ${response.status}: ${(await response.text()).slice(0, 200)}` };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

// ---- reading -------------------------------------------------------------
//
// The other half. Outbound went first because it was the visible complaint,
// but inbound is where the hourly Routine really hurt: a person emails the
// desk and hears nothing for up to an hour, having been told nothing at all,
// because unlike the portal there is no page to show them an acknowledgement.

/**
 * Which folder a message was found in.
 *
 * Carried through rather than flattened away, because it changes what the
 * desk is willing to do about the message. See `handleMessage`.
 */
export type MailFolder = 'inbox' | 'junk';

export interface InboundMessage {
  /** Graph's own id for the message, needed to change anything about it. */
  id: string;
  folder: MailFolder;
  internetMessageId: string;
  conversationId: string | null;
  subject: string;
  fromEmail: string;
  fromName: string | null;
  receivedAt: string;
  bodyHtml: string;
}

interface GraphMessage {
  id?: string;
  internetMessageId?: string;
  conversationId?: string;
  subject?: string;
  receivedDateTime?: string;
  from?: { emailAddress?: { address?: string; name?: string } };
  body?: { content?: string; contentType?: string };
}

/**
 * Inbox messages received since `since`, oldest first.
 *
 * `ge` rather than `gt`, with the dedupe ledger doing the real work: two
 * messages can share a timestamp to the second, and a strict comparison
 * would drop the second one permanently. Re-reading a message the ledger
 * already knows costs one skipped row.
 */
/** Graph's well-known folder names for the two places a person's mail lands. */
const FOLDER_PATH: Record<MailFolder, string> = { inbox: 'inbox', junk: 'junkemail' };

async function fetchFolder(env: Env, folder: MailFolder, since: string, limit: number, now: number): Promise<InboundMessage[]> {
  const token = await accessToken(env, now);
  const query = new URLSearchParams({
    $filter: `receivedDateTime ge ${since}`,
    $orderby: 'receivedDateTime asc',
    $top: String(limit),
    $select: 'id,internetMessageId,conversationId,subject,receivedDateTime,from,body',
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER)}/mailFolders/${FOLDER_PATH[folder]}/messages?${query}`,
    { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15_000) },
  );

  if (response.status === 401) cachedToken = null;
  if (!response.ok) throw new Error(`graph ${folder} ${response.status}: ${(await response.text()).slice(0, 200)}`);

  const body = (await response.json()) as { value?: GraphMessage[] };
  return (body.value ?? [])
    .filter((m): m is GraphMessage & { id: string; internetMessageId: string } => Boolean(m.internetMessageId && m.id))
    .map((m) => ({
      id: m.id,
      folder,
      internetMessageId: m.internetMessageId,
      conversationId: m.conversationId ?? null,
      subject: m.subject ?? '(no subject)',
      fromEmail: (m.from?.emailAddress?.address ?? '').toLowerCase(),
      fromName: m.from?.emailAddress?.name ?? null,
      receivedAt: m.receivedDateTime ?? new Date(now).toISOString(),
      bodyHtml: m.body?.content ?? '',
    }));
}

/**
 * Messages received since `since`, oldest first, from the Inbox *and* the
 * junk folder.
 *
 * `ge` rather than `gt`, with the dedupe ledger doing the real work: two
 * messages can share a timestamp to the second, and a strict comparison
 * would drop the second one permanently. Re-reading a message the ledger
 * already knows costs one skipped row.
 *
 * Junk is read because the desk was reading the Inbox and nothing else, which
 * meant Exchange's spam filter had a silent veto over which customers get
 * support. A misclassified email was not delayed or flagged, it was invisible,
 * permanently, with no trace anywhere in this system. That is the same failure
 * shape as the poison message, arrived at through somebody else's heuristic.
 *
 * Reading it does not mean believing it: `folder` travels with the message and
 * the desk answers junk differently. See `handleMessage`.
 *
 * A junk fetch that fails does not fail the pass. The Inbox is the channel
 * people are told to use, and losing the safety net is not a reason to lose
 * the main path with it.
 */
export async function fetchInbox(env: Env, since: string, limit = 25, now = Date.now()): Promise<InboundMessage[]> {
  if (!canSendDirectly(env)) return [];

  const inbox = await fetchFolder(env, 'inbox', since, limit, now);

  let junk: InboundMessage[] = [];
  try {
    junk = await fetchFolder(env, 'junk', since, limit, now);
  } catch (error) {
    console.warn('junk folder unreadable:', error instanceof Error ? error.message : String(error));
  }

  // Merged and re-sorted, then trimmed to one batch. Trimming the newest is
  // what keeps the checkpoint honest: messages are processed oldest first and
  // the checkpoint only reaches the newest one actually handled, so anything
  // dropped here is picked up next pass rather than skipped.
  return [...inbox, ...junk].sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)).slice(0, limit);
}

/**
 * The headers Exchange stamped on one message, for the sender check.
 *
 * Fetched per message rather than added to the list query's `$select`, and
 * only for the messages where it changes the outcome, which is the ones
 * proposing to write on an existing ticket. Two reasons, and the second is
 * the one that decided it.
 *
 * The cheap reason is cost: most inbound mail opens a new ticket, where the
 * sender's address is simply recorded and authenticating it proves nothing
 * about anybody.
 *
 * The real reason is blast radius. If `internetMessageHeaders` is ever
 * unavailable in a list projection, folding it into the batch query would
 * make *every* message fail the check at once, and failing this check turns
 * a reply into a new ticket. That is a graceful outcome for one message and a
 * mess across a whole mailbox. A separate GET fails one message at a time.
 *
 * Returns an empty array on any failure, which the caller must read as "no
 * evidence" and therefore as not authenticated. It must never read as
 * "nothing failed, so it passed".
 */
export async function fetchMessageHeaders(env: Env, messageId: string, now = Date.now()): Promise<MessageHeader[]> {
  if (!canSendDirectly(env)) return [];
  try {
    const token = await accessToken(env, now);
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER)}/messages/${encodeURIComponent(messageId)}?$select=internetMessageHeaders`,
      { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10_000) },
    );
    if (response.status === 401) cachedToken = null;
    if (!response.ok) {
      console.warn(`graph headers ${response.status} for ${messageId}`);
      return [];
    }
    const body = (await response.json()) as { internetMessageHeaders?: MessageHeader[] };
    return body.internetMessageHeaders ?? [];
  } catch (error) {
    console.warn(`graph headers failed for ${messageId}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Marks a message read, once the desk has actually dealt with it.
 *
 * Without this the inbox fills up: every message the desk has read, filed and
 * answered still sits there in bold, and the one thing a mailbox is good at
 * telling you at a glance stops being true.
 *
 * Deliberately after processing rather than before. An unread message then
 * means exactly one thing, "the desk has not handled this yet", which makes
 * the inbox a second view of the queue for free. A crash mid-batch leaves
 * mail unread, which is the right way round: the dedupe ledger stops it being
 * processed twice, and a human glancing at the mailbox can see something
 * stalled.
 *
 * Never throws. A message that was handled correctly but could not be marked
 * read is untidy, not broken, and rolling back real work over a flag would be
 * the worse trade. Needs `Mail.ReadWrite`; with only `Mail.Read` this returns
 * a reason and the desk carries on.
 */
export async function markRead(env: Env, messageId: string, now = Date.now()): Promise<SendResult> {
  if (!canSendDirectly(env)) return { sent: false, reason: 'graph credentials not configured' };

  try {
    const token = await accessToken(env, now);
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(SENDER)}/messages/${encodeURIComponent(messageId)}`,
      {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (response.ok) return { sent: true };
    if (response.status === 401) cachedToken = null;
    return { sent: false, reason: `graph ${response.status}: ${(await response.text()).slice(0, 200)}` };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : String(error) };
  }
}
