-- The last thing the agent said that was not a pull request.
--
-- A run can end in three ways: a change to propose, a question it needs
-- answered before it can build, or a reason it is not building at all. The
-- first already had a home in pending_change_ref. The other two had none, so
-- they reached nobody: she got an acknowledgement and then silence, which is
-- the complaint this whole flow was built to answer.
--
-- Stored rather than derived so the cron does not mail her the same question
-- every sixty seconds. It holds a hash of the text, not the text: what is
-- needed is "have I sent this one", and the words themselves already live on
-- the issue and on the ticket.
ALTER TABLE ticket_bot_changes ADD COLUMN last_outcome TEXT;
ALTER TABLE ticket_bot_changes ADD COLUMN last_outcome_at TEXT;
