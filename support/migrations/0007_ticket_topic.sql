-- What the ticket is about: the Hamdam app, or general computing help.
--
-- The desk answers both, and it does not owe them the same speed. A Hamdam
-- ticket is someone hitting a problem with the product, and they may be a
-- day away from deleting the app. A general question is a favour, gladly
-- done, and honestly answered whenever it is reached.
--
-- Stored rather than re-derived, because it sets the SLA clock at the moment
-- the ticket is created. Re-deriving it later would let a change to the term
-- list silently retime tickets that were already promised something.
--
-- Existing rows default to 'general_it' rather than being guessed at. The
-- three tickets that predate this migration are closed test tickets.

ALTER TABLE tickets ADD COLUMN topic TEXT NOT NULL DEFAULT 'general_it'
  CHECK (topic IN ('hamdam', 'general_it'));

CREATE INDEX idx_tickets_topic ON tickets(topic);
