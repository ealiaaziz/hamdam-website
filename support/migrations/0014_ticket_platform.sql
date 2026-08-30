-- Which platform the requester is on: the Android build under test, or not
-- established.
--
-- Added 2026-08-30, during Android testing. Before this the desk had one
-- product and assumed one platform, and the assumption was written down in
-- the knowledge base: getting-the-app said "Hamdam is an iPhone app ... there
-- is no Android version", with an App Store link under it. That article is
-- reviewed, cited and, for the public store, correct. It is also the article
-- an Android tester's bug report matched, so the desk answered people
-- testing the Android build by telling them the thing they were testing did
-- not exist, and pointed them at iOS.
--
-- Stored rather than re-derived, for the same reason topic is: it decides
-- whether the assistant is allowed to answer at all, and that decision is
-- made once, at the moment the ticket is created. Re-deriving it later would
-- let an edit to the term list retroactively change what the desk should
-- have done.
--
-- Two values, not three. 'ios' is deliberately absent: nothing writes it,
-- because the desk does not detect iOS -- it detects Android and treats
-- everything else as unestablished. A CHECK listing a value no code can
-- produce is a claim about detection this does not make.

ALTER TABLE tickets ADD COLUMN platform TEXT NOT NULL DEFAULT 'unspecified'
  CHECK (platform IN ('android', 'unspecified'));

CREATE INDEX idx_tickets_platform ON tickets(platform);
