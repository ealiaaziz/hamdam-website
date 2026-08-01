-- Hamdam Support -- initial schema.
--
-- Design notes:
-- * `tickets.id` is the only identifier stored; the human-facing "HAM-42"
--   form is derived from it at render time (see src/ids.ts) rather than
--   stored redundantly -- storing a separate public_id would need a second
--   UPDATE after the INSERT to learn the autoincrement id, which is an
--   avoidable race for no benefit.
-- * `tracking_token` gates the public "track your ticket" page: a requester
--   needs the token (emailed to them) *and* a matching email address, not a
--   password. It is not a substitute for the admin dashboard's Cloudflare
--   Access gate.
-- * SLA due timestamps are computed once at classification time (see
--   src/itil.ts) and stored, not recomputed on read, so a later change to the
--   policy table never silently rewrites the promise already made to a
--   requester.
-- * `outbound_emails` is the send queue: the hourly Composio-driven routine
--   is the only writer of `sent_at` / `status`. Nothing in the Worker sends
--   email directly -- Workers cannot reach Composio/Outlook.
-- * `inbound_emails` is the dedupe/checkpoint ledger for that same routine,
--   keyed on Outlook's `internetMessageId` so a re-run after a partial
--   failure never double-creates a ticket.

CREATE TABLE requesters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_id INTEGER NOT NULL REFERENCES requesters(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'open', 'pending', 'resolved', 'closed')),
  priority TEXT NOT NULL CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  urgency TEXT CHECK (urgency IN ('high', 'medium', 'low')),
  category TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('portal', 'email')),
  tracking_token TEXT NOT NULL UNIQUE,
  source_conversation_id TEXT,
  -- Outlook internetMessageId of the most recent inbound message on this
  -- ticket's thread. Used so an agent reply threads correctly via
  -- OUTLOOK_CREATE_DRAFT_REPLY; NULL for tickets that started on the portal
  -- and have never received an email reply.
  last_inbound_message_id TEXT,
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sla_first_response_due TEXT NOT NULL,
  sla_resolve_due TEXT NOT NULL,
  first_response_at TEXT,
  resolved_at TEXT,
  closed_at TEXT
);

CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_conversation ON tickets(source_conversation_id);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  author_type TEXT NOT NULL CHECK (author_type IN ('requester', 'agent', 'system')),
  author_name TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_comments_ticket ON comments(ticket_id);

CREATE TABLE outbound_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  comment_id INTEGER REFERENCES comments(id),
  kind TEXT NOT NULL CHECK (kind IN ('ack', 'agent_reply', 'status_change')),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  in_reply_to_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  failure_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sent_at TEXT
);

CREATE INDEX idx_outbound_pending ON outbound_emails(status);

CREATE TABLE inbound_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  internet_message_id TEXT NOT NULL UNIQUE,
  conversation_id TEXT,
  ticket_id INTEGER REFERENCES tickets(id),
  raw_from TEXT,
  raw_subject TEXT,
  processed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_inbound_conversation ON inbound_emails(conversation_id);

-- Single-row-per-key checkpoint store for the polling routine
-- (e.g. key='last_checked_utc').
CREATE TABLE sync_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
