-- Carbon copies on outgoing mail.
--
-- The desk has only ever had one recipient per message, which was right while
-- every reply went to one requester. The change flow needs a second: the
-- developer is copied on everything the desk says to the channel owner, so the
-- whole trail is visible to him without him having to open the console or be
-- told after the fact.
--
-- Nullable, and null on every existing row, which is the correct reading of
-- every message sent before this: they had no copy, rather than an empty one.
--
-- The addresses themselves are not here and are not anywhere in this
-- repository. It is public, and escalation.ts records what that cost the last
-- time two personal addresses were written into a source file: a private Gmail
-- and a private Outlook address, attached to a named product, in a file that
-- says out loud who reads the security reports. They come from secrets.

ALTER TABLE outbound_emails ADD COLUMN cc_email TEXT;
