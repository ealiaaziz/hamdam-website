---
id: email-not-sending-or-arriving
title: Email is not sending, or messages are not arriving
symptoms:
  - email not sending
  - stuck in outbox
  - not receiving email
  - outlook not working
  - emails missing
  - mail not syncing
clarifying:
  - Does the same thing happen at outlook.office.com in a browser?
  - Is it all messages, or only ones to a particular person or company?
---

The first question is whether the problem is the app on your machine or the
mail service behind it, and one check settles it.

1. Open https://outlook.office.com in a browser and look at the same mailbox.
   If the missing message is there, or a send works there, then the mailbox is
   fine and the problem is the Outlook app on that device.
2. If it is the app: close Outlook completely, wait ten seconds, reopen it.
   Check the bottom of the window for "Disconnected" or "Working Offline",
   and turn Working Offline off if it is on.
3. Check the Junk Email folder and the Deleted Items folder before concluding
   a message never arrived.
4. If a message is stuck in the Outbox, it is usually a large attachment.
   Anything above roughly 20 MB will not go, and cloud storage links are the
   way around it rather than compressing harder.

If mail to one particular company bounces while everything else works, that is
their side refusing us rather than a fault here. Reply and paste the bounce
message in full, including the part that looks like machine output, because
the reason code in it is the whole answer.
