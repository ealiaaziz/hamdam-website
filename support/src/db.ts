import type {
  CommentAuthorType,
  CommentRow,
  OutboundEmailRow,
  OutboundKind,
  RequesterRow,
  TicketRow,
  TicketStatus,
  TicketWithRequester,
} from './types.js';
import type { Impact, Priority, Urgency } from './itil.js';
import type { Channel } from './types.js';

export async function upsertRequester(db: D1Database, email: string, name: string | null): Promise<RequesterRow> {
  const normalizedEmail = email.trim().toLowerCase();
  await db
    .prepare(
      `INSERT INTO requesters (email, name) VALUES (?1, ?2)
       ON CONFLICT(email) DO UPDATE SET name = COALESCE(excluded.name, requesters.name)`,
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
         created_at, updated_at, sla_first_response_due, sla_resolve_due
       ) VALUES (?1, ?2, 'new', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, ?12, ?13)
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
  subject: string;
  bodyHtml: string;
  inReplyToMessageId: string | null;
}

export async function queueOutboundEmail(db: D1Database, e: NewOutboundEmail): Promise<void> {
  await db
    .prepare(
      `INSERT INTO outbound_emails (ticket_id, comment_id, kind, to_email, subject, body_html, in_reply_to_message_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(e.ticketId, e.commentId, e.kind, e.toEmail, e.subject, e.bodyHtml, e.inReplyToMessageId)
    .run();
}

export async function listPendingOutboundEmails(db: D1Database): Promise<OutboundEmailRow[]> {
  const result = await db
    .prepare(`SELECT * FROM outbound_emails WHERE status = 'pending' ORDER BY created_at ASC`)
    .all<OutboundEmailRow>();
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
  e: NewOutboundEmail & { assistantReason: string; assistantArticleId: string },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO outbound_emails
         (ticket_id, comment_id, kind, to_email, subject, body_html, in_reply_to_message_id,
          status, assistant_reason, assistant_article_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'draft', ?8, ?9)`,
    )
    .bind(
      e.ticketId, e.commentId, e.kind, e.toEmail, e.subject, e.bodyHtml,
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
  escalated: boolean;
}

export async function getAgentState(db: D1Database, ticketId: number): Promise<AgentState> {
  const row = await db.prepare('SELECT * FROM ticket_agent_state WHERE ticket_id = ?1').bind(ticketId).first<AgentStateRow>();
  return {
    assistantTurns: row?.assistant_turns ?? 0,
    askedQuestions: parseJsonArray(row?.asked_questions),
    rejectedArticles: parseJsonArray(row?.rejected_articles),
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
