import type { Impact, Priority, Urgency } from './itil.js';

export type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed';

export const TICKET_STATUSES: readonly TicketStatus[] = ['new', 'open', 'pending', 'resolved', 'closed'];

/**
 * Validate a status coming from a query string or form body.
 *
 * `as TicketStatus` on untrusted input is a lie to the type checker, not a
 * check: it let `?status=<anything>` reach the page renderer, which
 * interpolated it into an href and gave us HTML injection. Returns
 * undefined for anything not in the set, so callers fall back to their
 * default rather than echoing attacker input.
 */
export function parseTicketStatus(value: string | undefined | null): TicketStatus | undefined {
  return value && (TICKET_STATUSES as readonly string[]).includes(value) ? (value as TicketStatus) : undefined;
}
export type Channel = 'portal' | 'email';
export type CommentAuthorType = 'requester' | 'agent' | 'system';
export type OutboundKind = 'ack' | 'agent_reply' | 'status_change';
export type OutboundStatus = 'pending' | 'sent' | 'failed';

export interface RequesterRow {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

export interface TicketRow {
  id: number;
  requester_id: number;
  subject: string;
  status: TicketStatus;
  priority: Priority;
  impact: Impact | null;
  urgency: Urgency | null;
  category: string | null;
  channel: Channel;
  tracking_token: string;
  source_conversation_id: string | null;
  last_inbound_message_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  sla_first_response_due: string;
  sla_resolve_due: string;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface TicketWithRequester extends TicketRow {
  requester_email: string;
  requester_name: string | null;
}

export interface CommentRow {
  id: number;
  ticket_id: number;
  author_type: CommentAuthorType;
  author_name: string | null;
  body: string;
  created_at: string;
}

export interface OutboundEmailRow {
  id: number;
  ticket_id: number;
  comment_id: number | null;
  kind: OutboundKind;
  to_email: string;
  subject: string;
  body_html: string;
  in_reply_to_message_id: string | null;
  status: OutboundStatus;
  failure_reason: string | null;
  created_at: string;
  sent_at: string | null;
}

export interface Env {
  DB: D1Database;
  /**
   * Cloudflare Access team domain, e.g. "hamdam.cloudflareaccess.com", and
   * the Access application's AUD tag. Both are plain config, not secrets
   * (the AUD identifies the app; it does not authorise anything on its
   * own), so they live in wrangler.jsonc rather than in `wrangler secret`.
   * The agent console refuses to serve while either is unset.
   */
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  /**
   * Local-development-only escape hatch, set in .dev.vars (never deployed).
   * Only honoured for requests with no CF-Ray header, which production
   * requests always carry, so this cannot open the console on the live site.
   */
  DEV_ADMIN_EMAIL?: string;
}
