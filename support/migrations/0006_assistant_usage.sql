-- A daily ceiling on model calls.
--
-- POST /tickets is open to the internet by design: someone who needs help
-- should not have to have an account first. That was free when the assistant
-- was a keyword matcher. It is not free now, and the failure mode is not a
-- crash but a bill, which is the kind that goes unnoticed for a week.
--
-- One row per UTC day, incremented before each call. Over the ceiling, the
-- desk falls back to the keyword matcher: replies get plainer, nothing goes
-- silent, and no ticket is refused. Losing a day of good phrasing is a much
-- smaller problem than an open-ended spend, and this is deliberately the
-- crude version of the control -- per-IP rate limiting belongs at the edge,
-- in a Cloudflare rule, not in application code holding a database open.

CREATE TABLE assistant_usage (
  day TEXT PRIMARY KEY,
  calls INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
