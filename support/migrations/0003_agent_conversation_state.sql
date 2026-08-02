-- Conversation state for the solution engine (docs/solution-engine-design.md).
--
-- The policy in src/agentPolicy.ts needs two facts that no existing table
-- holds: how many times the assistant has already replied on this ticket,
-- and which clarifying questions it has already asked. Without the first,
-- the turn limit cannot be enforced and a conversation can run forever.
-- Without the second, it repeats itself, which is the most obvious way for
-- an assistant to reveal that nobody is home.
--
-- One row per ticket, created lazily on the assistant's first involvement.
-- A ticket with no row here has never been touched by the assistant, which
-- is the correct reading for every ticket that predates this migration.
--
-- asked_questions is a JSON array. D1 is SQLite, so this could be a child
-- table; it is not, because nothing ever queries across it -- it is read and
-- written whole, for one ticket, by one process.

CREATE TABLE ticket_agent_state (
  ticket_id INTEGER PRIMARY KEY REFERENCES tickets(id),
  assistant_turns INTEGER NOT NULL DEFAULT 0,
  asked_questions TEXT NOT NULL DEFAULT '[]',
  -- Last action the policy chose, for auditing what the assistant did and
  -- why without re-deriving it from email logs.
  last_action TEXT CHECK (last_action IN ('send_solution', 'ask_clarifying', 'escalate')),
  last_article_id TEXT,
  last_reason TEXT,
  -- Set once, when the ticket leaves the assistant for a person. Present
  -- means hands off: the assistant must not resume a conversation a human
  -- has taken over, even if a later message would match an article.
  escalated_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_agent_state_escalated ON ticket_agent_state(escalated_at);
