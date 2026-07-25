# Website redesign: what is left

Written 2026-07-25 at the end of the session that shipped the universal Roots
rebuild, the seven-section homepage, the recaptured screenshots and the deploy
guard. Everything in `33-universal-roots-and-homepage-handoff.md` is done and
live on hamdam.com.au. Ealia signed off on the English copy and the structure
the same day, and ruled "Farsi is ok for now", so the Farsi gaps below are
deferred rather than owed.

Three items remain. None blocks the site; all three were found while doing the
work above.

---

## 4. The transparent band at the top of every app screenshot

**Where:** `src/assets/website-redesign/screenshots/{EN,FA}/*.png`, produced by
the orchestrator in the `hamdam-ios` repo.

**What:** each capture has a fully transparent band across the top: 31pt (93
pixels at 3x) on five of the six screens, 62pt (186 pixels) on `05-journey`.
Confirmed by decoding the PNGs and reading the alpha channel, not by eye. On the
site it sits under the device frame's bezel against a dark backing, so it reads
as chrome rather than a gap, which is why it shipped.

**What is already known:**

- It is not the safe-area inset. The raw pass was changed to render with no
  `additionalSafeAreaInsets` and the band did not move.
- It is not fixed by `.ignoresSafeArea()` on the phone frame. That was tried,
  built, re-exported and measured: identical 93-row band.
- Rendering the canvas one status bar taller and cropping the difference back
  off also did not clear it (the residual just changed size).
- The band is a constant 31pt across five screens, which points at a layout
  constant rather than per-screen content. `05-journey` being exactly double is
  the strongest clue available.

**Suggested next step:** stop guessing at the cause and measure it. Log
`hostingController.view.safeAreaInsets` and the resolved frame of
`ScreenshotPhoneFrame` inside a real export run, rather than reasoning about
what UIKit should be doing to a hosting controller that is the root view of an
offscreen window sized 1290x2796 on a 402x874 device screen.

**Files:** `Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/` in `hamdam-ios`
(`ScreenshotOrchestrator.swift`, `ScreenshotViewFactory.swift`). Runbook:
`docs/app-store/phase-3-screenshot-orchestrator.md`, which documents the fix
that landed and this residual.

---

## 5. The composed App Store screenshot set has the same undersized-content bug

**Where:** `hamdam-ios`, the composed pass in `ScreenshotOrchestrator.exportAll`.

**What:** the raw pass used to lay a phone screen out on a 1179x2556 POINT
canvas, which is an iPad and a half of logical space, so real content occupied a
small centred band. That was fixed for the raw set on 2026-07-25 by rendering at
393x852 real device points at 3x. **The composed set was deliberately left
alone** and still has the bug: the phone mockup inside the marketing frame
carries the same tiny content.

**Why it was left:** the composer's layout (headline sizes, mockup insets in
`ScreenshotComposerView.swift`) is tuned against the pixel-as-point canvas, and
that set is already shipped to App Store Connect. Changing the screen image's
scale changes its point size and therefore the composer's layout.

**Impact:** the live App Store listing, not this website. Worth doing before the
next listing refresh.

**Suggested next step:** feed the composer the new phone-sized render and retune
the mockup frame against it, then re-run the visual QA checklist already in the
runbook. Do not change `ScreenshotMetrics.composedWidth/Height` — the output
must stay exactly 1290x2796.

---

## 6. Revoke the Cloudflare API token

**What:** the token at `~/.config/hamdam-audit/cf-token` was created 2026-07-21
as a short-lived, narrowly-scoped custom token (Account: Workers Scripts Edit;
Zone: redirect-rules/Rulesets Edit, this zone only) and was meant to be revoked
the same day. Ealia chose on 2026-07-25 to keep it active **until the website
redesign is done**, which is what this document is the end of.

**Action:** revoke it at dash.cloudflare.com, My Profile, API Tokens. Mint a
fresh short-lived one for the next deploy rather than letting a "temporary"
credential become permanent. It is a user action; a session cannot do it.

**Note:** the user-level deploy hook in `~/.claude/settings.json` references the
repo path, not the token, so revoking breaks nothing except the next deploy,
which will fail with an auth error until a new token is supplied.

---

## Not on this list, on purpose

- **Farsi.** The Roots heading still frames that section as Persian-only, the FA
  hero still leads with the tagline rather than a function-first line, and the
  FA feature grid has five icons where English has eight. All three need Persian
  only Ealia writes. Her call 2026-07-25: "Farsi is ok for now."
- **A 1024px overflow.** At that width the document reports a scroll width of
  1168, from the poets carousel (which bleeds by design) and the paired device
  frames in JourneyPair. The page cannot actually be scrolled horizontally,
  verified on production. Neither component was touched by the redesign work, so
  this is almost certainly pre-existing. Worth a glance, not a defect.
