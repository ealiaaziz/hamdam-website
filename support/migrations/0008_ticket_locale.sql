-- The language a ticket is conducted in.
--
-- Hamdam's audience is substantially Persian speaking, and until now the desk
-- answered everyone in English regardless of how they wrote in. Someone who
-- opens a Persian poetry app, reads it in Persian, and then has to describe a
-- problem in a second language has been quietly told the support is for
-- somebody else.
--
-- Stored on the ticket rather than re-detected per request, because it
-- decides the language of every later email too. Re-detecting would let a
-- one-word reply flip a conversation into the wrong language halfway
-- through.
--
-- Existing rows are English, which is what they were.

ALTER TABLE tickets ADD COLUMN locale TEXT NOT NULL DEFAULT 'en'
  CHECK (locale IN ('en', 'fa'));
