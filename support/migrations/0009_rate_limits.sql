-- Counters for the portal's rate limits.
--
-- The portal is unauthenticated by design: someone who needs help should not
-- need an account first. What it did not have was any ceiling on how often
-- one caller could use that. Every submitted ticket writes rows, spends a
-- model call, and asks Microsoft Graph to deliver an email to an address the
-- submitter chose, so an unbounded form is an unbounded way to send mail over
-- this domain's reputation.
--
-- Fixed window rather than a token bucket. A bucket is smoother and needs a
-- stored timestamp per caller plus arithmetic on every read; a window is one
-- row, one statement, and the difference only shows up in how generous the
-- edge of the window is, which is not a distinction worth paying D1 latency
-- for on the request path.
--
-- Keyed by (bucket, subject) so the same caller can be counted separately for
-- different actions: submitting a ticket is rarer and more expensive than
-- replying on one they already own.

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket       TEXT NOT NULL,
  subject      TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject)
);

-- Purging is by age, so the sweep does not have to scan the whole table.
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);
