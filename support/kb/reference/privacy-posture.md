---
id: privacy-posture
title: What Hamdam does not collect
source: src/pages/privacy.astro section 2
---
Worth being able to state plainly, because people do ask:

- No user accounts and no email collection.
- No analytics of any kind in the app. No Firebase, Mixpanel, Amplitude, or
  Google Analytics. The only crash data is Apple's own built-in reporting via
  App Store Connect, aggregated and anonymised.
- No advertising SDKs, no tracking pixels, no cross-app tracking, no
  behavioural profiling.
- No Hamdam-owned servers receiving user data.
- Data is never sold, under any circumstance.
- Signals are never used for advertising and never used to train AI models off
  the device.

Storage is local, using Apple's SwiftData, and in the person's own iCloud
account if they enable sync. Data is kept until they delete it in the app or
uninstall.

The website separately uses Cloudflare Web Analytics for cookieless page
counts. That is the website only, not the app.

## This support desk is not the app, and it does share

Corrected 2026-08-08, security review. The list above used to end "and never
shared with third parties", full stop, which is accurate about the app and was
being read out by an assistant that was at that moment sending the requester's
own words to a third party. Anyone asking "what happens to my data" on a
support ticket is asking about both, and answering with only the first half is
the kind of true-but-misleading that costs the desk its credibility the moment
somebody notices.

So, plainly, and this is about the support desk and not about the Hamdam app:

- What a person writes into a support ticket, by the portal or by email, is
  sent to **Cloudflare Workers AI** so the assistant can draft a reply. That
  includes the subject, the description and every later message on the thread.
- Ticket text, names and email addresses are stored in **Cloudflare D1**, and
  email in and out goes through **Microsoft Graph** as the desk's own mailbox.
- A person on the team reads every ticket regardless of what the assistant
  does with it.
- None of this touches the app's own data. The app still holds nothing on a
  Hamdam server, and a support ticket is not a channel into it: the desk sees
  what somebody types into a ticket and nothing else.

If a requester would rather their situation was not processed that way, the
answer is that they should leave the detail out of the ticket and say so, and
a person will pick it up.
