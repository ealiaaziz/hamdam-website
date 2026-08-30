import type { Impact, Platform, Priority, Topic, Urgency } from './itil.js';
import type { Locale } from './i18n.js';

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
export type OutboundKind = 'ack' | 'agent_reply' | 'status_change' | 'requester_reply' | 'assistant_draft';
export type OutboundStatus = 'draft' | 'pending' | 'sent' | 'failed' | 'discarded';

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
  topic: Topic;
  platform: Platform;
  locale: Locale;
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
  cc_email: string | null;
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
   * Cloudflare Workers AI. Declared in wrangler.jsonc, not a secret, and no
   * account credential of any kind: inference runs on the same account the
   * Worker already runs on, inside the free daily allocation.
   *
   * Optional on purpose. Unbound, every reply falls back to the keyword
   * matcher in `assistantReply.ts`, which is what local development and CI
   * run against.
   */
  AI?: Ai;
  /**
   * Model calls allowed per UTC day. Plain config, not a secret. Over the
   * ceiling the desk answers from the knowledge base instead: plainer, never
   * silent, and never a refused ticket.
   */
  ASSISTANT_DAILY_CALL_LIMIT?: string;
  /**
   * Countries the portal serves, comma-separated ISO 3166-1 alpha-2. Plain
   * config in wrangler.jsonc, because widening or narrowing it is an
   * operational decision that should be visible in a diff.
   *
   * Unset or unparseable falls back to AU and NZ rather than to serving
   * everyone: a typo here should not quietly open the site to the world.
   */
  ALLOWED_COUNTRIES?: string;
  /**
   * Who is told when a ticket needs a person, comma-separated. Plain config:
   * these are the team's own addresses, and who is on call is a fact that
   * should be visible in a diff rather than buried in a secret.
   */
  ESCALATION_RECIPIENTS?: string;
  /**
   * Comma-separated addresses allowed into the console, checked in the Worker
   * as well as by Cloudflare Access. A secret, not a var: wrangler.jsonc is
   * public and this is a list of accounts worth phishing. Unset means the
   * second lock is off and the console says so. See adminAccess.ts.
   */
  ADMIN_EMAILS?: string;
  /** The channel owner's address. See src/owner.ts. */
  OWNER_EMAILS?: string;
  /** Copied on the owner's thread only, never on a stranger's. */
  DEVELOPER_CC_EMAIL?: string;
  /** Fine-grained PAT, issues:write on the bot repo only. See src/github.ts. */
  GITHUB_TOKEN?: string;
  /** owner/name of the bot repository. */
  GITHUB_REPO?: string;
  /** Bearer secret for POST /internal/tick. Unset means the route does not exist. */
  TICK_SECRET?: string;
  /**
   * Microsoft Graph app-only credentials, so the Worker can send mail as
   * developer@hamdam.com.au the moment there is something to send, instead
   * of leaving it for the hourly Routine.
   *
   * Tenant and client id are identifiers, not secrets, but they live with
   * the secret rather than in wrangler.jsonc so all three are set or none
   * are: two thirds of a credential is just a confusing outage.
   *
   * Unset, outbound mail queues exactly as it did before and the Routine
   * sends it. Slower, never lost.
   */
  GRAPH_TENANT_ID?: string;
  GRAPH_CLIENT_ID?: string;
  GRAPH_CLIENT_SECRET?: string;
  /**
   * Local-development-only escape hatch, set in .dev.vars (never deployed).
   * Only honoured for requests with no CF-Ray header, which production
   * requests always carry, so this cannot open the console on the live site.
   */
  DEV_ADMIN_EMAIL?: string;
}
