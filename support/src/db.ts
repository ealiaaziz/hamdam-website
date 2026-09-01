import type {
  CommentAuthorType,
  CommentRow,
  OutboundEmailRow,
  OutboundKind,
  OutboundStatus,
  RequesterRow,
  TicketRow,
  TicketStatus,
  TicketWithRequester,
} from './types.js';
import type { Impact, Platform, Priority, Topic, Urgency } from './itil.js';
import type { Locale } from './i18n.js';
import type { Channel } from './types.js';

/**
 * Fill a requester's name in, never overwrite it (changed 2026-08-07, security
 * review).
 *
 * The conflict clause used to read `COALESCE(excluded.name, requesters.name)`,
 * which prefers the incoming value: every new ticket naming an existing address
 * rewrote that address's stored name. Nothing gated it. Anyone could post the
 * portal form with a stranger's address and a chosen name, or send mail with a
 * forged `From` display name, and the name attached to *all* of that person's
 * tickets, past ones included, changed to whatever they picked. That name is
 * what the console queue and the "Who is waiting" line of the escalation email
 * show, which is what a person reads when deciding what a ticket is and who
 * they are answering.
 *
 * The email route made it worse rather than better: `planInbound`'s
 * authentication check only runs on the path that would *append* to an existing
 * ticket, so a forged sender that falls through to a new ticket reaches here
 * having proved nothing, and it does so before the junk check, so even a
 * spam-foldered message landed the write.
 *
 * The operands are swapped, so an existing name wins and a null one is filled.
 * This is the same asymmetry `sameAddress` and `ADMIN_EMAILS` are built on:
 * widening a set is fine for counting and wrong for deciding who somebody is.
 * A requester who genuinely wants their name changed is a support request, and
 * an agent can do it; a stranger cannot.
 */
export async function upsertRequester(db: D1Database, email: string, name: string | null): Promise<RequesterRow> {
  const normalizedEmail = email.trim().toLowerCase();
  await db
    .prepare(
      `INSERT INTO requesters (email, name) VALUES (?1, ?2)
       ON CONFLICT(email) DO UPDATE SET name = COALESCE(requesters.name, excluded.name)`,
    )
    .bind(normalizedEmail, name)
    .run();
  const row = await db.prepare('SELECT * FROM requesters WHERE email = ?1').bind(normalizedEmail).first<RequesterRow>();
  if (!row) throw new Error(`upsertRequester: failed to read back ${normalizedEmail}`);
  return row;
}

export interface NewTicket {
  requesterId: number;
  subject: string;
  priority: Priority;
  impact: Impact | null;
  urgency: Urgency | null;
  category: string | null;
  channel: Channel;
  topic: Topic;
  platform: Platform;
  locale: Locale;
  trackingToken: string;
  sourceConversationId: string | null;
  lastInboundMessageId: string | null;
  createdAt: string;
  slaFirstResponseDue: string;
  slaResolveDue: string;
}

export async function createTicket(db: D1Database, t: NewTicket): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO tickets (
         requester_id, subject, status, priority, impact, urgency, category, channel,
         tracking_token, source_conversation_id, last_inbound_message_id,
         created_at, updated_at, sla_first_response_due, sla_resolve_due, topic, locale,
         platform
       ) VALUES (?1, ?2, 'new', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, ?12, ?13, ?14, ?15, ?16)
       RETURNING id`,
    )
    .bind(
      t.requesterId,
      t.subject,
      t.priority,
      t.impact,
      t.urgency,
      t.category,
      t.channel,
      t.trackingToken,
      t.sourceConversationId,
      t.lastInboundMessageId,
      t.createdAt,
      t.slaFirstResponseDue,
      t.slaResolveDue,
      t.topic,
      t.locale,
      t.platform,
    )
    .first<{ id: number }>();
  if (!result) throw new Error('createTicket: insert did not return an id');
  return result.id;
}

export async function getTicketById(db: D1Database, id: number): Promise<TicketWithRequester | null> {
  return db
    .prepare(
      `SELECT t.*, r.email AS requester_email, r.name AS requester_name
       FROM tickets t JOIN requesters r ON r.id = t.requester_id
       WHERE t.id = ?1`,
    )
    .bind(id)
    .first<TicketWithRequester>();
}

export async function findTicketByConversationId(db: D1Database, conversationId: string): Promise<TicketRow | null> {
  return db.prepare('SELECT * FROM tickets WHERE source_conversation_id = ?1 LIMIT 1').bind(conversationId).first<TicketRow>();
}

export interface QueueFilters {
  status?: TicketStatus;
  priority?: Priority;
  platform?: Platform;
}

export async function listQueue(db: D1Database, filters: QueueFilters): Promise<TicketWithRequester[]> {
  const conditions: string[] = [];
  const binds: string[] = [];
  if (filters.status) {
    conditions.push(`t.status = ?${binds.length + 1}`);
    binds.push(filters.status);
  } else {
    conditions.push(`t.status != 'closed'`);
  }
  if (filters.priority) {
    conditions.push(`t.priority = ?${binds.length + 1}`);
    binds.push(filters.priority);
  }
  if (filters.platform) {
    conditions.push(`t.platform = ?${binds.length + 1}`);
    binds.push(filters.platform);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const stmt = db.prepare(
    `SELECT t.*, r.email AS requester_email, r.name AS requester_name
     FROM tickets t JOIN requesters r ON r.id = t.requester_id
     ${where}
     ORDER BY
       CASE t.priority WHEN 'P1' THEN 0 WHEN 'P2' THEN 1 WHEN 'P3' THEN 2 ELSE 3 END,
       t.sla_first_response_due ASC`,
  );
  const result = await stmt.bind(...binds).all<TicketWithRequester>();
  return result.results;
}

export async function addComment(
  db: D1Database,
  ticketId: number,
  authorType: CommentAuthorType,
  authorName: string | null,
  body: string,
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO comments (ticket_id, author_type, author_name, body) VALUES (?1, ?2, ?3, ?4) RETURNING id`,
    )
    .bind(ticketId, authorType, authorName, body)
    .first<{ id: number }>();
  await db.prepare(`UPDATE tickets SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1`).bind(ticketId).run();
  if (!result) throw new Error('addComment: insert did not return an id');
  return result.id;
}

export async function listComments(db: D1Database, ticketId: number): Promise<CommentRow[]> {
  const result = await db
    .prepare('SELECT * FROM comments WHERE ticket_id = ?1 ORDER BY created_at ASC, id ASC')
    .bind(ticketId)
    .all<CommentRow>();
  return result.results;
}

export async function updateTicketStatus(db: D1Database, id: number, status: TicketStatus): Promise<void> {
  const now = new Date().toISOString();
  const extra =
    status === 'resolved'
      ? `, resolved_at = ?3`
      : status === 'closed'
        ? `, closed_at = ?3`
        : '';
  await db
    .prepare(`UPDATE tickets SET status = ?2, updated_at = ?3${extra} WHERE id = ?1`)
    .bind(id, status, now)
    .run();
}

export async function updateTicketPriority(db: D1Database, id: number, priority: Priority, firstResponseDue: string, resolveDue: string): Promise<void> {
  await db
    .prepare(
      `UPDATE tickets SET priority = ?2, sla_first_response_due = ?3, sla_resolve_due = ?4, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1`,
    )
    .bind(id, priority, firstResponseDue, resolveDue)
    .run();
}

export async function markFirstResponse(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(
      `UPDATE tickets SET first_response_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1 AND first_response_at IS NULL`,
    )
    .bind(id)
    .run();
}

export async function setLastInboundMessageId(db: D1Database, id: number, messageId: string): Promise<void> {
  await db.prepare('UPDATE tickets SET last_inbound_message_id = ?2 WHERE id = ?1').bind(id, messageId).run();
}

export interface NewOutboundEmail {
  ticketId: number;
  commentId: number | null;
  kind: OutboundKind;
  toEmail: string;
  ccEmail?: string | null;
  subject: string;
  bodyHtml: string;
  inReplyToMessageId: string | null;
}

export async function queueOutboundEmail(db: D1Database, e: NewOutboundEmail): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO outbound_emails (ticket_id, comment_id, kind, to_email, cc_email, subject, body_html, in_reply_to_message_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       RETURNING id`,
    )
    .bind(
      e.ticketId, e.commentId, e.kind, e.toEmail, e.ccEmail ?? null,
      e.subject, e.bodyHtml, e.inReplyToMessageId,
    )
    .first<{ id: number }>();
  if (!row) throw new Error('queueOutboundEmail: insert did not return an id');
  return row.id;
}

export async function listPendingOutboundEmails(db: D1Database): Promise<OutboundEmailRow[]> {
  const result = await db
    .prepare(`SELECT * FROM outbound_emails WHERE status = 'pending' ORDER BY created_at ASC`)
    .all<OutboundEmailRow>();
  return result.results;
}

/**
 * What the console needs to know about one undelivered email. Deliberately
 * not the whole row: see the column list below.
 */
export interface UndeliveredOutbound {
  id: number;
  kind: OutboundKind;
  to_email: string;
  status: OutboundStatus;
  failure_reason: string | null;
  created_at: string;
}

/**
 * How long a `pending` row is given before the console calls it stuck.
 *
 * Every row is `pending` for the moment between the insert and the send
 * resolving, and the send runs in `waitUntil` after the response has already
 * gone, so a row queued by the request that is rendering this page is
 * legitimately pending and must not be reported. Five minutes is far longer
 * than a Graph call and far shorter than the gap before anyone would care.
 */
const STUCK_AFTER_MS = 5 * 60 * 1000;

/**
 * Mail on this ticket that has not reached anyone.
 *
 * Read for the console rather than for the mail path, because these are the
 * states nothing retries and nothing announces. An agent's evidence that
 * their reply was delivered is a 303 back to the ticket, and that redirect
 * is returned identically whether Graph accepted the message or refused it:
 * the send runs in `waitUntil`, after the response has gone. So either the
 * console says it or nobody finds out until the customer says they were
 * ignored.
 *
 * Both `failed` and `pending`, because the second is the worse of the two
 * and was the easier one to miss. `approveDraft` releases a draft by setting
 * `pending`, and nothing in this Worker ever reads a pending row:
 * `scheduled()` runs `purgeRateLimits` and `ingestInbox`, and
 * `listPendingOutboundEmails` has no callers at all. So approving a draft
 * returns its usual redirect and then does nothing, forever, and a query for
 * `failed` alone would have reported that ticket as perfectly healthy. Same
 * for anything queued while `canSendDirectly` is false.
 *
 * `draft` is excluded: a draft is a message deliberately not sent yet, which
 * is a state the console already shows on purpose.
 *
 * Named columns rather than `SELECT *`, because `body_html` is the bulk of
 * the row and none of it is rendered here. A summary email carries the whole
 * conversation, so a handful of failed summaries on a chatty ticket is
 * megabytes fetched to display four fields, on exactly the page an agent
 * most needs to load.
 *
 * Newest first, and unbounded on purpose. This is scoped to one ticket, and
 * a ticket with enough undelivered mail to be worth paging through is a
 * ticket whose whole history someone needs to be looking at.
 */
export async function listUndeliveredOutboundForTicket(
  db: D1Database,
  ticketId: number,
  now: Date = new Date(),
): Promise<UndeliveredOutbound[]> {
  const stuckBefore = new Date(now.getTime() - STUCK_AFTER_MS).toISOString();
  const result = await db
    .prepare(
      `SELECT id, kind, to_email, status, failure_reason, created_at
         FROM outbound_emails
        WHERE ticket_id = ?1
          AND (status = 'failed' OR (status = 'pending' AND created_at <= ?2))
        ORDER BY created_at DESC`,
    )
    .bind(ticketId, stuckBefore)
    .all<UndeliveredOutbound>();
  return result.results;
}

export async function markOutboundSent(db: D1Database, id: number): Promise<void> {
  await db
    .prepare(`UPDATE outbound_emails SET status = 'sent', sent_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?1`)
    .bind(id)
    .run();
}

export async function markOutboundFailed(db: D1Database, id: number, reason: string): Promise<void> {
  await db.prepare(`UPDATE outbound_emails SET status = 'failed', failure_reason = ?2 WHERE id = ?1`).bind(id, reason).run();
}

export async function isInboundProcessed(db: D1Database, internetMessageId: string): Promise<boolean> {
  const row = await db.prepare('SELECT 1 FROM inbound_emails WHERE internet_message_id = ?1').bind(internetMessageId).first();
  return row !== null;
}

export async function recordInboundEmail(
  db: D1Database,
  internetMessageId: string,
  conversationId: string | null,
  ticketId: number | null,
  rawFrom: string | null,
  rawSubject: string | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO inbound_emails (internet_message_id, conversation_id, ticket_id, raw_from, raw_subject)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(internet_message_id) DO NOTHING`,
    )
    .bind(internetMessageId, conversationId, ticketId, rawFrom, rawSubject)
    .run();
}

export async function getSyncState(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT value FROM sync_state WHERE key = ?1').bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setSyncState(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sync_state (key, value, updated_at) VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(key, value)
    .run();
}

// ---- the ingest lock ------------------------------------------------------

/** The `sync_state` key the ingest lock lives under. */
export const INGEST_LOCK_KEY = 'ingest_lock_expires_utc';

/**
 * How long one ingest pass may hold the lock before another may take it.
 *
 * Five minutes, which is comfortably longer than a full batch of twenty five
 * messages and comfortably shorter than the time anyone would spend wondering
 * why the desk has gone quiet.
 */
export const INGEST_LOCK_TTL_MS = 5 * 60_000;

/**
 * Takes the ingest lock, or returns null because somebody else holds it.
 *
 * A successful acquire hands back the holding: the exact value written into
 * `sync_state`, which `releaseIngestLock` needs in order to release this pass's
 * lock rather than whatever lock happens to be there when the pass finishes.
 *
 * The cron fires every sixty seconds and a pass over a full batch takes
 * minutes: twenty five messages, each one a Graph fetch for headers, a
 * handful of D1 writes, a model call and up to two pieces of outbound mail.
 * So runs overlap, routinely, and overlapping runs are not merely wasteful.
 * They read the same checkpoint, fetch the same messages, and race each other
 * through `handleMessage`, where the dedupe ledger is consulted at the top and
 * written at the bottom. Both passes see `wasProcessed` as false, both go the
 * whole way, and the loser's `ON CONFLICT DO NOTHING` writes nothing and says
 * nothing. The visible result is two tickets, two acknowledgements, two model
 * calls off a small daily budget, and two pieces of mail to the requester, for
 * one email. Moving the ledger write earlier, which this change also does,
 * shrinks the window and cannot close it: two passes can still both read
 * before either writes.
 *
 * A TTL rather than a boolean held flag, and that choice is the important
 * one. A Worker can be evicted, its request cancelled, or its subrequest
 * budget exhausted, at any point including between the acquire and the
 * release. A boolean set by a run that then dies is set forever, and the
 * failure it produces is the exact failure this desk has already been bitten
 * by twice: the mailbox looks completely normal while no email is being read.
 * An expiry means the worst case is that ingestion pauses for one TTL and
 * then resumes on its own, with nobody needing to know it happened.
 *
 * The read and the write are one statement, for the same reason
 * `claimModelCall` and `consumeRateLimit` are: two crons arriving in the same
 * instant must not both see the lock as free. The `WHERE` clause on the
 * conflict branch is what makes it a lock at all, and `RETURNING value`
 * returning no row is how a caller learns it lost.
 *
 * Fails closed. If D1 cannot answer, this returns null and the pass is
 * skipped, which is the opposite of `consumeRateLimit`'s choice and correct
 * here for the opposite reason: a skipped pass costs sixty seconds and the
 * next cron picks up the same mail, while an unlocked pass during a database
 * wobble is the duplicate-everything scenario running with no brakes.
 *
 * The failure is written to `last_ingest_error` as well as to the log, for the
 * reason `ingestPass` gives about every other failure on this path: Worker
 * logs need a websocket to tail, which is the thing that is unavailable
 * exactly when somebody wants it, and a gate that can permanently disable
 * ingestion must not be the one failure that leaves no trace in the database.
 * The write is itself best effort, because if D1 is unreachable then so is
 * this, and the ten minute heartbeat is the backstop underneath both.
 */
export async function acquireIngestLock(
  db: D1Database,
  ttlMs: number = INGEST_LOCK_TTL_MS,
  now: Date = new Date(),
): Promise<IngestLockHolding | null> {
  const nowIso = now.toISOString();
  const expiresIso = new Date(now.getTime() + ttlMs).toISOString();

  try {
    // ISO-8601 UTC strings sort lexicographically in the same order they sort
    // chronologically, which is why a plain `<=` is a valid time comparison
    // here and why every other timestamp in this schema is stored this way.
    //
    // The stored value carries a random suffix after the expiry, which is the
    // fencing token `releaseIngestLock` checks. The expiry has to stay at the
    // front and stay fixed width so the `<=` above is still comparing
    // timestamps: `2026-08-08T03:00:00.000Z#a1b2...` sorts against a bare
    // timestamp exactly as the expiry alone would, up to the point where they
    // differ. The single behaviour the suffix changes is the tie, where the
    // stored expiry equals `?3` to the millisecond: the longer string now
    // sorts higher, so that instant reads as "still held" rather than "just
    // expired". At a sixty second cron that costs one pass in the rarest case
    // there is, and it errs towards not running two passes at once, which is
    // the direction this whole function exists to err in.
    const value = `${expiresIso}#${crypto.randomUUID().replaceAll('-', '')}`;
    const row = await db
      .prepare(
        `INSERT INTO sync_state (key, value, updated_at)
         VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
         ON CONFLICT(key) DO UPDATE SET
           value = ?2,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE sync_state.value <= ?3
         RETURNING value`,
      )
      .bind(INGEST_LOCK_KEY, value, nowIso)
      .first<{ value: string }>();
    return row === null ? null : { value };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn('ingest lock: could not acquire, skipping this pass:', reason);
    try {
      await setSyncState(db, 'last_ingest_error', `${nowIso} could not acquire the ingest lock: ${reason}`.slice(0, 400));
    } catch {
      // If the lock write failed because D1 is unreachable then this one will
      // too. The heartbeat going stale is what is left, and it is enough.
    }
    return null;
  }
}

/** What a pass holds while it owns the lock, and hands back to release it. */
export interface IngestLockHolding {
  /** The exact `sync_state.value` this pass wrote, expiry and fencing token. */
  value: string;
}

/**
 * Gives the lock back, so the next cron does not have to wait out the TTL.
 *
 * Written as an expiry in the past rather than as a delete, so the row stays
 * put and stays readable: "when did the last pass finish" is a question
 * somebody debugging a quiet mailbox will want answered, and a missing row
 * answers nothing.
 *
 * Only if this pass still holds it, which is the whole reason `holding` exists.
 * An unconditional release defeats the lock in the one case the lock is for. A
 * pass that overruns the TTL has already lost the lock to the next cron, and if
 * it then clears the row on its way out it frees a lock somebody else is
 * holding, so the cron after that starts a second concurrent pass and the desk
 * duplicates everything under exactly the load that made the pass slow. The
 * `WHERE value = ?2` makes the release a compare and swap: it releases what
 * this pass wrote and nothing else.
 *
 * `holding` is optional so a caller that does not have one, which today means
 * only the tests, still gets the old unconditional behaviour rather than a
 * type error.
 *
 * Never throws. This runs in a `finally`, and a bookkeeping failure here must
 * not replace whatever the pass was already reporting. The TTL is the backstop
 * if it does not land.
 */
export async function releaseIngestLock(db: D1Database, holding?: IngestLockHolding): Promise<void> {
  const released = new Date(0).toISOString();
  try {
    if (!holding) {
      await setSyncState(db, INGEST_LOCK_KEY, released);
      return;
    }
    await db
      .prepare(
        `UPDATE sync_state
            SET value = ?3, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
          WHERE key = ?1 AND value = ?2`,
      )
      .bind(INGEST_LOCK_KEY, holding.value, released)
      .run();
  } catch {
    // The expiry releases it either way.
  }
}

// ---- assistant drafts -----------------------------------------------------
//
// A draft is an outbound_emails row that has not been released. Approving it
// moves it to 'pending', after which the routine's existing drain sends it
// like anything else -- the approved path and the automatic path are the
// same code from that point on.

export interface DraftRow extends OutboundEmailRow {
  assistant_reason: string | null;
  assistant_article_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
}

export async function listDrafts(db: D1Database, ticketId: number): Promise<DraftRow[]> {
  const result = await db
    .prepare(`SELECT * FROM outbound_emails WHERE ticket_id = ?1 AND status = 'draft' ORDER BY created_at ASC`)
    .bind(ticketId)
    .all<DraftRow>();
  return result.results;
}

export async function countDrafts(db: D1Database): Promise<number> {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM outbound_emails WHERE status = 'draft'`).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function queueAssistantDraft(
  db: D1Database,
  e: NewOutboundEmail & { assistantReason: string; assistantArticleId: string | null },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO outbound_emails
         (ticket_id, comment_id, kind, to_email, cc_email, subject, body_html, in_reply_to_message_id,
          status, assistant_reason, assistant_article_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'draft', ?9, ?10)`,
    )
    .bind(
      e.ticketId, e.commentId, e.kind, e.toEmail, e.ccEmail ?? null, e.subject, e.bodyHtml,
      e.inReplyToMessageId, e.assistantReason, e.assistantArticleId,
    )
    .run();
}

/**
 * Release a draft for sending. Scoped to status='draft' so approving twice
 * is harmless: the second UPDATE matches nothing rather than resurrecting a
 * row the routine has already sent.
 */
export async function approveDraft(db: D1Database, draftId: number, ticketId: number, approvedBy: string): Promise<DraftRow | null> {
  const draft = await db
    .prepare(`SELECT * FROM outbound_emails WHERE id = ?1 AND ticket_id = ?2 AND status = 'draft'`)
    .bind(draftId, ticketId)
    .first<DraftRow>();
  if (!draft) return null;

  await db
    .prepare(
      `UPDATE outbound_emails
       SET status = 'pending', approved_by = ?2, approved_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?1 AND status = 'draft'`,
    )
    .bind(draftId, approvedBy)
    .run();
  return draft;
}

export async function discardDraft(db: D1Database, draftId: number, ticketId: number): Promise<boolean> {
  const result = await db
    .prepare(`UPDATE outbound_emails SET status = 'discarded' WHERE id = ?1 AND ticket_id = ?2 AND status = 'draft'`)
    .bind(draftId, ticketId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

// ---- assistant conversation state ----------------------------------------

export interface AgentStateRow {
  ticket_id: number;
  assistant_turns: number;
  asked_questions: string;
  rejected_articles: string;
  last_article_id: string | null;
  escalated_at: string | null;
}

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export interface AgentState {
  assistantTurns: number;
  askedQuestions: string[];
  rejectedArticles: string[];
  /** The article the assistant cited in its most recent reply, if any. */
  lastArticleId: string | null;
  escalated: boolean;
}

export async function getAgentState(db: D1Database, ticketId: number): Promise<AgentState> {
  const row = await db.prepare('SELECT * FROM ticket_agent_state WHERE ticket_id = ?1').bind(ticketId).first<AgentStateRow>();
  return {
    assistantTurns: row?.assistant_turns ?? 0,
    askedQuestions: parseJsonArray(row?.asked_questions),
    rejectedArticles: parseJsonArray(row?.rejected_articles),
    lastArticleId: row?.last_article_id ?? null,
    escalated: Boolean(row?.escalated_at),
  };
}

/** Upsert helper: the row is created lazily on the assistant's first involvement. */
async function ensureAgentState(db: D1Database, ticketId: number): Promise<void> {
  await db
    .prepare(`INSERT INTO ticket_agent_state (ticket_id) VALUES (?1) ON CONFLICT(ticket_id) DO NOTHING`)
    .bind(ticketId)
    .run();
}

export async function recordRejectedArticle(db: D1Database, ticketId: number, articleId: string): Promise<void> {
  await ensureAgentState(db, ticketId);
  const state = await getAgentState(db, ticketId);
  if (state.rejectedArticles.includes(articleId)) return;
  const next = [...state.rejectedArticles, articleId];
  await db
    .prepare(`UPDATE ticket_agent_state SET rejected_articles = ?2, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE ticket_id = ?1`)
    .bind(ticketId, JSON.stringify(next))
    .run();
}

export async function recordAssistantTurn(
  db: D1Database,
  ticketId: number,
  opts: { question?: string; action: string; articleId?: string; reason: string; escalated?: boolean },
): Promise<void> {
  await ensureAgentState(db, ticketId);
  const state = await getAgentState(db, ticketId);
  const askedQuestions = opts.question && !state.askedQuestions.includes(opts.question)
    ? [...state.askedQuestions, opts.question]
    : state.askedQuestions;
  await db
    .prepare(
      `UPDATE ticket_agent_state
       SET assistant_turns = ?2, asked_questions = ?3, last_action = ?4,
           last_article_id = ?5, last_reason = ?6,
           escalated_at = CASE WHEN ?7 = 1 AND escalated_at IS NULL
                               THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE escalated_at END,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE ticket_id = ?1`,
    )
    .bind(
      ticketId,
      state.assistantTurns + 1,
      JSON.stringify(askedQuestions),
      opts.action,
      opts.articleId ?? null,
      opts.reason,
      opts.escalated ? 1 : 0,
    )
    .run();
}

// ---- model call budget ----------------------------------------------------

/**
 * Model calls allowed per UTC day before the desk falls back to keywords.
 *
 * The arithmetic, because 200 was a round number rather than a derived one
 * and it sat above the thing it was meant to be protecting. The free Workers
 * AI allocation that comes with this plan is 10,000 neurons a day, resetting
 * at 00:00 UTC, and a reply on this model costs roughly 80 of them. That is
 * about 125 replies, so a ceiling of 200 could never be reached: the
 * allocation ran out first, and what the desk actually did on call 126 was
 * whatever Cloudflare returns when there is nothing left, handled as a model
 * failure rather than as a budget decision.
 *
 * 110 sits under the real ceiling with room for replies that cost more than
 * the average. Crossing it is a decision the desk makes and logs, and the
 * requester gets the deterministic answer, which is the graceful ending; the
 * allocation running out is the same outcome arrived at by accident.
 */
export const DEFAULT_DAILY_CALL_LIMIT = 110;

/**
 * Claims one call against today's budget. Returns false when the budget is
 * spent, which the caller treats as "answer from the knowledge base instead".
 *
 * The increment and the read are one statement, so two requests arriving
 * together cannot both see the last slot as free. Refused attempts still
 * count: a burst that has already blown the ceiling is exactly the traffic
 * that should not get a second look on the next request.
 */
export async function claimModelCall(db: D1Database, limit = DEFAULT_DAILY_CALL_LIMIT): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const row = await db
    .prepare(
      `INSERT INTO assistant_usage (day, calls) VALUES (?1, 1)
       ON CONFLICT(day) DO UPDATE SET calls = calls + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       RETURNING calls`,
    )
    .bind(day)
    .first<{ calls: number }>();
  return (row?.calls ?? Number.MAX_SAFE_INTEGER) <= limit;
}

// ---- inbound ledger and checkpoint ---------------------------------------

/**
 * Whether this exact message, from this sender, has already been handled.
 *
 * Scoped to the sender, which the first version was not. The key is
 * `internetMessageId`, and that is the sender's own `Message-ID` header: a
 * value the sender chooses. An unscoped ledger therefore lets anyone write a
 * row under an id and have a later message carrying that id skipped without
 * a trace, which turns a dedupe table into a suppression primitive.
 *
 * Exchange's ids are not predictable enough to make that a practical attack
 * today. It is still an attacker-controlled primary key doing an integrity
 * job, and pairing it with the address is free.
 *
 * The dedupe this exists for is unaffected: a retried run re-reads the same
 * message from the same sender and still matches.
 */
export async function wasProcessed(db: D1Database, internetMessageId: string, fromEmail: string): Promise<boolean> {
  const row = await db
    // `''`, not `""`. SQLite's double-quoted-string misfeature makes `""` an
    // identifier first and only falls back to a string literal when no column
    // of that name exists, so this depended on `inbound_emails` never gaining
    // a column named by the empty string, and more usefully on nobody turning
    // the fallback off. It read as a string literal to everyone and was not
    // one. Single quotes are the only spelling SQL has for a string.
    .prepare(`SELECT 1 AS hit FROM inbound_emails WHERE internet_message_id = ?1 AND lower(trim(coalesce(raw_from, ''))) = ?2`)
    .bind(internetMessageId, fromEmail.trim().toLowerCase())
    .first<{ hit: number }>();
  return Boolean(row);
}

/**
 * Records that a message failed, and says how many times it now has.
 *
 * Returns the attempt count so the caller can decide between retrying and
 * giving up. Never throws: this runs in the handler for something that has
 * already gone wrong, and a bookkeeping failure must not replace the original
 * error with a less useful one.
 */
export async function recordInboundFailure(db: D1Database, internetMessageId: string, error: string): Promise<number> {
  try {
    const row = await db
      .prepare(
        `INSERT INTO inbound_failures (internet_message_id, attempts, last_error)
         VALUES (?1, 1, ?2)
         ON CONFLICT(internet_message_id) DO UPDATE SET
           attempts = inbound_failures.attempts + 1,
           last_error = ?2,
           last_seen_at = datetime('now')
         RETURNING attempts`,
      )
      .bind(internetMessageId, error.slice(0, 400))
      .first<{ attempts: number }>();
    return row?.attempts ?? 1;
  } catch {
    // Unknown attempt count reads as "first attempt", which retries. Better
    // than giving up on a message because a counter was unavailable.
    return 1;
  }
}

/** Clears the failure record once a message finally goes through. */
export async function clearInboundFailure(db: D1Database, internetMessageId: string): Promise<void> {
  try {
    await db.prepare('DELETE FROM inbound_failures WHERE internet_message_id = ?1').bind(internetMessageId).run();
  } catch {
    // Housekeeping only.
  }
}

export async function recordInbound(
  db: D1Database,
  e: { internetMessageId: string; conversationId: string | null; ticketId: number | null; fromEmail: string; subject: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO inbound_emails (internet_message_id, conversation_id, ticket_id, raw_from, raw_subject)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(internet_message_id) DO NOTHING`,
    )
    .bind(e.internetMessageId, e.conversationId, e.ticketId, e.fromEmail, e.subject)
    .run();
}

export async function ticketIdForConversation(db: D1Database, conversationId: string | null): Promise<number | null> {
  if (!conversationId) return null;
  const row = await db
    .prepare('SELECT id FROM tickets WHERE source_conversation_id = ?1 ORDER BY id DESC LIMIT 1')
    .bind(conversationId)
    .first<{ id: number }>();
  return row?.id ?? null;
}

export async function ticketExists(db: D1Database, id: number): Promise<boolean> {
  const row = await db.prepare('SELECT 1 AS hit FROM tickets WHERE id = ?1').bind(id).first<{ hit: number }>();
  return Boolean(row);
}

/**
 * The point in time the desk has read up to.
 *
 * Advanced only after a batch is fully processed. Advancing it early would
 * turn one failed run into permanently unread mail, which is the failure
 * nobody notices until someone asks why they were ignored.
 */
export async function getCheckpoint(db: D1Database, fallbackMinutes = 15): Promise<string> {
  const row = await db.prepare(`SELECT value FROM sync_state WHERE key = 'last_checked_utc'`).bind().first<{ value: string }>();
  return row?.value ?? new Date(Date.now() - fallbackMinutes * 60_000).toISOString();
}

export async function setCheckpoint(db: D1Database, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO sync_state (key, value, updated_at) VALUES ('last_checked_utc', ?1, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .bind(value)
    .run();
}

// ---- bot changes ---------------------------------------------------------

export interface BotChangeRow {
  ticket_id: number;
  issue_number: number | null;
  pr_number: number | null;
  branch: string | null;
  head_sha: string | null;
  pending_change_ref: string | null;
  proposed_at: string | null;
  approved_ref: string | null;
  approved_at: string | null;
  refused_at: string | null;
  deployed_at: string | null;
  /** Identifies the last question or stand-down already sent to her. */
  last_outcome: string | null;
  last_outcome_at: string | null;
  dispatched_at: string;
  updated_at: string;
}

export async function getBotChange(db: D1Database, ticketId: number): Promise<BotChangeRow | null> {
  return db
    .prepare('SELECT * FROM ticket_bot_changes WHERE ticket_id = ?')
    .bind(ticketId)
    .first<BotChangeRow>();
}

export async function ticketForIssue(db: D1Database, issueNumber: number): Promise<number | null> {
  const row = await db
    .prepare('SELECT ticket_id FROM ticket_bot_changes WHERE issue_number = ?')
    .bind(issueNumber)
    .first<{ ticket_id: number }>();
  return row?.ticket_id ?? null;
}

/** Record that this ticket has been handed to the repository. */
export async function recordDispatch(
  db: D1Database,
  ticketId: number,
  issueNumber: number | null,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ticket_bot_changes (ticket_id, issue_number, dispatched_at)
       VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(ticket_id) DO UPDATE SET
         issue_number = COALESCE(excluded.issue_number, ticket_bot_changes.issue_number),
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    )
    .bind(ticketId, issueNumber)
    .run();
}

/**
 * Put a change to the owner, and clear any approval that came before it.
 *
 * The clearing is the point, and it is done here rather than left to a caller
 * to remember. An agent pushes more commits after she has said yes: to fix a
 * review comment, to make CI pass, or because she asked for something else in
 * the same thread. Carrying her approval across that push would deploy code
 * she never saw, under a "yes" she gave to something different. So proposing
 * anything new resets the answer to unanswered, and she is asked again.
 */
export async function proposeChange(
  db: D1Database,
  ticketId: number,
  change: { changeRef: string; prNumber: number | null; branch: string | null; headSha: string },
): Promise<void> {
  await db
    .prepare(
      `UPDATE ticket_bot_changes
          SET pending_change_ref = ?2,
              pr_number = COALESCE(?3, pr_number),
              branch = COALESCE(?4, branch),
              head_sha = ?5,
              proposed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
              approved_ref = NULL,
              approved_at = NULL,
              refused_at = NULL,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE ticket_id = ?1`,
    )
    .bind(ticketId, change.changeRef, change.prNumber, change.branch, change.headSha)
    .run();
}

/**
 * Record her answer against the change it was given for.
 *
 * Scoped to the pending reference, so an approval that names an older change
 * updates nothing rather than approving the current one. Returns whether it
 * took, because "she replied yes and nothing happened" needs to be visible.
 */
export async function recordApproval(
  db: D1Database,
  ticketId: number,
  changeRef: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE ticket_bot_changes
          SET approved_ref = ?2,
              approved_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE ticket_id = ?1 AND pending_change_ref = ?2`,
    )
    .bind(ticketId, changeRef)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function recordRefusal(db: D1Database, ticketId: number): Promise<void> {
  await db
    .prepare(
      `UPDATE ticket_bot_changes
          SET refused_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
              approved_ref = NULL,
              approved_at = NULL,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE ticket_id = ?1`,
    )
    .bind(ticketId)
    .run();
}

/**
 * Whether this change may be deployed right now.
 *
 * One question, one place, so no caller has to assemble it from three columns
 * and get it right. The approval must exist, and it must name the change that
 * is currently pending: an approval left over from a superseded proposal is
 * not consent to this one, and `proposeChange` clears it anyway. Belt and
 * braces on the only decision here that reaches production.
 */
export function mayDeploy(change: BotChangeRow | null): boolean {
  if (!change) return false;
  if (change.refused_at) return false;
  if (!change.approved_at || !change.approved_ref) return false;
  return change.approved_ref === change.pending_change_ref;
}

/**
 * Record that the tracked change shipped, and empty the slot it occupied.
 *
 * The emptying is the part that was missing, and it cost two faults on one
 * ticket. This table holds one row per ticket, not one per change, but a
 * ticket is a conversation and she asks for more than one thing in it. When
 * HAM-54's change shipped, its `pending_change_ref` stayed behind, so her next
 * message on that ticket, a new feature request, was read as a verdict on the
 * change that had already gone live, and recorded as her refusing it.
 *
 * So shipping clears the consent: no pending reference, no approval, no
 * refusal. The next change on this ticket asks her again from scratch, and a
 * later message cannot be read as a verdict on something already live.
 *
 * What deliberately stays is the record of what shipped: `pr_number` and
 * `head_sha`, alongside `issue_number` and `deployed_at`. Clearing those was
 * the first version of this and it was wrong in a way that reached her within
 * ten minutes. `checkProposal` decides a report is new by comparing its commit
 * against `head_sha`, so wiping it made the pull request that had just shipped
 * look like a fresh change: the desk proposed it again, she approved again,
 * and the merge workflow refused because the request was already closed, so
 * she was told the change she had just been told was live was not applied.
 * Three emails, ten minutes, two of them false.
 *
 * A change that shipped is still the newest thing on this ticket. Forgetting
 * its commit is not tidiness, it is amnesia.
 */
export async function markDeployed(db: D1Database, ticketId: number): Promise<void> {
  await db
    .prepare(
      `UPDATE ticket_bot_changes
          SET deployed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
              pending_change_ref = NULL,
              approved_ref = NULL,
              approved_at = NULL,
              refused_at = NULL,
              last_outcome = NULL,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE ticket_id = ?1`,
    )
    .bind(ticketId)
    .run();
}

/**
 * Tickets the follow-up pass still has something to do about.
 *
 * Anything dispatched on a ticket that is still open.
 *
 * This used to be "anything that has not shipped", and that was wrong in the
 * way that matters: a ticket is a conversation, and she asks for a second
 * thing after the first one ships. On HAM-54 she did exactly that, the agent
 * built it and opened a pull request, and the desk never looked, because the
 * ticket had a `deployed_at` from the day before. The change existed, was
 * correct, and would have sat there unmentioned forever.
 *
 * Open-ticket is the bound instead. It stops the scan growing without limit,
 * and it stops where a person has said the conversation is over, which is the
 * honest place to stop rather than at the first thing that shipped.
 *
 * Bounded, because this runs every minute and an unbounded scan of a growing
 * table on a cron is a bill that arrives quietly.
 */
export async function ticketsAwaitingBotFollowUp(db: D1Database, limit = 20): Promise<number[]> {
  const result = await db
    .prepare(
      `SELECT c.ticket_id FROM ticket_bot_changes c
         JOIN tickets t ON t.id = c.ticket_id
        WHERE t.status != 'closed'
        ORDER BY c.updated_at ASC
        LIMIT ?1`,
    )
    .bind(limit)
    .all<{ ticket_id: number }>();
  return (result.results ?? []).map((row) => row.ticket_id);
}

/**
 * Remember that this question or stand-down has been sent.
 *
 * Keyed on the text so a different one later still reaches her, and so the
 * cron does not mail the same question every sixty seconds. Scoped in the
 * WHERE clause to the value we believed was current, so two passes racing
 * cannot both send.
 */
/**
 * Undo the record above, because the email it was recording never left.
 *
 * The recording happens before the send, so that two passes racing cannot both
 * mail her the same question. The cost of that ordering is this case: a send
 * that fails leaves the desk certain she was told something she was never
 * told, and every later pass returns early. Clearing the mark puts the ticket
 * back in the queue and the next minute tries again.
 *
 * `last_outcome_at` is deliberately left where it was, and it is what stops
 * this being an unbounded retry. It marks when the desk first had something to
 * say, so a caller can give up on a send that has been failing for an hour
 * rather than writing one dead outbound row a minute forever. A Graph blip
 * clears in seconds; an address that will never accept mail is a person's
 * problem and the ticket is where they will find it.
 */
export async function clearAgentOutcome(db: D1Database, ticketId: number): Promise<void> {
  await db
    .prepare(
      `UPDATE ticket_bot_changes
          SET last_outcome = NULL,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE ticket_id = ?1`,
    )
    .bind(ticketId)
    .run();
}

export async function recordAgentOutcome(
  db: D1Database,
  ticketId: number,
  outcome: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE ticket_bot_changes
          SET last_outcome = ?2,
              last_outcome_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
        WHERE ticket_id = ?1 AND (last_outcome IS NULL OR last_outcome != ?2)`,
    )
    .bind(ticketId, outcome)
    .run();
  return (result.meta.changes ?? 0) > 0;
}
