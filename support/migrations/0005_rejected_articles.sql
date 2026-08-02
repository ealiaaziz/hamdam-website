-- Remember which articles a requester has already rejected.
--
-- Live failure this fixes: on HAM-3 the requester pressed "this did not
-- help" three times on the same article, and the page kept offering it,
-- because nothing read the rejection back. Meanwhile they asked a real
-- follow-up question and got no response at all. From their side the desk
-- was repeating itself and ignoring them at once, which is worse than an
-- empty page: an empty page at least does not pretend to be helping.
--
-- A rejection is the strongest signal a requester can give short of leaving,
-- and it was being written to a comment nobody read.

ALTER TABLE ticket_agent_state ADD COLUMN rejected_articles TEXT NOT NULL DEFAULT '[]';
