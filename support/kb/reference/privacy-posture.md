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
- Signals are never used for advertising, never used to train AI models off
  the device, and never shared with third parties.

Storage is local, using Apple's SwiftData, and in the person's own iCloud
account if they enable sync. Data is kept until they delete it in the app or
uninstall.

The website separately uses Cloudflare Web Analytics for cookieless page
counts. That is the website only, not the app.
