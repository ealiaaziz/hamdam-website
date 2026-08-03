-- Messages the desk could not process, and how many times it has tried.
--
-- The ingest checkpoint only advances when a whole pass succeeded, which is
-- right: a message that failed for a transient reason must be seen again, and
-- advancing past it optimistically is how mail gets silently dropped.
--
-- Taken literally, though, it means one message that fails *every* time holds
-- the line forever. The batch is ordered oldest first from the checkpoint, so
-- the failing message is in every batch, and nothing behind it is ever
-- processed. A single crafted email stops the desk receiving mail, and the
-- mailbox looks completely normal while it happens.
--
-- This is the counter that tells the difference between "try again" and "this
-- one is never going to work". Three attempts, then the desk gives up on that
-- message, records why, and lets the queue move.
CREATE TABLE IF NOT EXISTS inbound_failures (
  internet_message_id TEXT PRIMARY KEY,
  attempts            INTEGER NOT NULL DEFAULT 1,
  last_error          TEXT,
  first_seen_at       TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
