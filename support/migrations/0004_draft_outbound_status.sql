-- Adds 'draft' to outbound_emails.status.
--
-- The solution engine runs draft-first: the assistant proposes a reply, a
-- person approves it, and only then does it go out. Rather than a separate
-- drafts table, a draft is an outbound_emails row that has not been released
-- yet. Approving it is one UPDATE from 'draft' to 'pending', after which the
-- existing routine drain sends it like anything else.
--
-- The value of doing it this way: the approved path and the automatic path
-- are the same code. A draft that an agent approves cannot render or send
-- differently from one the desk generated itself, because by then it is the
-- same row moving through the same step.
--
-- SQLite cannot alter a CHECK constraint, so the table is rebuilt again.
-- Column list written out rather than SELECT *, same reasoning as 0002.

CREATE TABLE outbound_emails_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  comment_id INTEGER REFERENCES comments(id),
  kind TEXT NOT NULL
    CHECK (kind IN ('ack', 'agent_reply', 'status_change', 'requester_reply', 'assistant_draft')),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  in_reply_to_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('draft', 'pending', 'sent', 'failed', 'discarded')),
  failure_reason TEXT,
  -- Why the assistant proposed this, and from which article. Shown beside
  -- the draft so the approver judges the reasoning, not just the prose.
  assistant_reason TEXT,
  assistant_article_id TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  sent_at TEXT
);

INSERT INTO outbound_emails_new (
  id, ticket_id, comment_id, kind, to_email, subject, body_html,
  in_reply_to_message_id, status, failure_reason, created_at, sent_at
)
SELECT
  id, ticket_id, comment_id, kind, to_email, subject, body_html,
  in_reply_to_message_id, status, failure_reason, created_at, sent_at
FROM outbound_emails;

DROP TABLE outbound_emails;

ALTER TABLE outbound_emails_new RENAME TO outbound_emails;

CREATE INDEX idx_outbound_pending ON outbound_emails(status);
