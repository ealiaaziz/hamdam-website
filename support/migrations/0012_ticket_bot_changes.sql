-- What a ticket has going on in the bot's repository.
--
-- One row per ticket, created when a dispatch is made, in the same shape as
-- ticket_agent_state: a ticket with no row here has never dispatched, which is
-- the correct reading for every ticket that predates this migration.
--
-- The column that carries the weight is pending_change_ref. The owner
-- authorises a change by replying to the desk, and her reply is the only thing
-- between a proposal and a deploy to a live channel, so consent has to name
-- what it consents to. An email thread quotes its own history: her "بله" from
-- last week is sitting in the body of this week's reply, and consent read out
-- of that blob would be consent to whatever is proposed now.
--
-- So the desk records the one change it last put to her, and approval counts
-- only for that one. When a newer change is proposed on the same ticket the
-- approval clears rather than carrying over, which is why approved_ref is
-- stored beside approved_at: "approved" on its own is not a fact, "approved
-- HAM-12/a3f9c1" is.

CREATE TABLE ticket_bot_changes (
  ticket_id INTEGER PRIMARY KEY REFERENCES tickets(id),

  -- Where the work is happening. Null until each is opened.
  issue_number INTEGER,
  pr_number INTEGER,
  branch TEXT,
  head_sha TEXT,

  -- The change currently put to the owner, and when it was put.
  pending_change_ref TEXT,
  proposed_at TEXT,

  -- Her answer, tied to the reference it was given for.
  approved_ref TEXT,
  approved_at TEXT,
  refused_at TEXT,

  -- When the approved change reached the live bot, so "is this shipped" is a
  -- column rather than an inference from a workflow log that expires.
  deployed_at TEXT,

  dispatched_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Finding the ticket that belongs to an issue or a PR, which is the direction
-- every callback from GitHub arrives in.
CREATE INDEX idx_bot_changes_issue ON ticket_bot_changes(issue_number);
CREATE INDEX idx_bot_changes_pr ON ticket_bot_changes(pr_number);
