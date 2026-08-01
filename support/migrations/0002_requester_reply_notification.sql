-- Allow outbound_emails.kind = 'requester_reply'.
--
-- Why this migration exists: when a requester replied through the portal's
-- tracking page, the Worker recorded the comment and told nobody. No email
-- to the desk, no flag in the queue. An agent only discovered the reply by
-- happening to open the ticket, which on a real desk means "never". The fix
-- is a notification email to developer@hamdam.com.au, and that needs a new
-- value in this table's CHECK constraint.
--
-- SQLite cannot ALTER a CHECK constraint, so the table is rebuilt. The
-- column list is written out explicitly rather than using SELECT *, so a
-- future column added to one side and not the other fails loudly here
-- instead of silently shifting data between columns.

CREATE TABLE outbound_emails_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES tickets(id),
  comment_id INTEGER REFERENCES comments(id),
  kind TEXT NOT NULL
    CHECK (kind IN ('ack', 'agent_reply', 'status_change', 'requester_reply')),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  in_reply_to_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  failure_reason TEXT,
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
