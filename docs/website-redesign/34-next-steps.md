# Website redesign: what is left

Written 2026-07-25 at the end of the session that shipped the universal Roots
rebuild, the seven-section homepage, the recaptured screenshots and the deploy
guard. Everything in `33-universal-roots-and-homepage-handoff.md` is done and
live on hamdam.com.au. Ealia signed off on the English copy and the structure
the same day, and ruled "Farsi is ok for now", so the Farsi gaps below are
deferred rather than owed.

Three items remained. None blocked the site; all three were found while doing the
work above. **Items 4 and 5 were both fixed later the same day** — item 4 is
deployed and live, item 5 built and verified. Their sections are kept in full below,
because item 4's original write-up contained a wrong measurement that sent the
investigation the wrong way, and that is worth recording.

**All three are now closed, 2026-08-22.** Item 4 is deployed and live. Item 6
was closed as a deliberate decision to keep the credential rather than as work
done, and its section records what was weighed. Item 5's "Still owed" line was
stale: the App Store listing carries a seven-shot set per locale committed to
`hamdam-analytics/assets/screenshots/` on 2026-08-17 and uploaded from there,
three weeks after the 2026-07-25 export that section describes. Verified
against the live listing, not inferred.

**But one thing this document never tracked is still open, and it is worse than
anything above:** the listing's first screenshot, `01-hero-en.png`, shows a
screen the app cannot display. See "the hero screenshot" in FACTS.md. The
website's copy of it was replaced on 2026-08-16; the App Store's was not.

---

## 4. The transparent band at the top of every app screenshot — FIXED 2026-07-25

**Where it was:** `src/assets/website-redesign/screenshots/{EN,FA}/*.png`,
produced by the orchestrator in the `hamdam-ios` repo.

**First, a correction to the note this section used to carry:** the band was a
uniform 31pt (93 pixels at 3x) on **all twelve** captures. It was not 62pt on
`05-journey`. That claim was wrong, and since it was described here as "the
strongest clue available" it was actively misleading. Re-measured by decoding
the alpha channel of every shipped PNG.

The advice to measure rather than reason was right, and measuring settled it in
one export run. There were **two** causes stacked on each other, which is why
each earlier single-cause attempt failed:

1. **The offscreen host window's inherited safe area.** That window is a real
   window on a real screen, so it inherits that device's insets (top 62pt on the
   402x874 screen). The host view inherited them too, and SwiftUI centres the
   phone frame's fixed 852pt height inside the resulting 790pt safe region:
   y = 62 + (790 - 852) / 2 = **31**. Exactly the band.
2. **"Your Journey"'s own top padding**, which only became visible once the
   first cause was fixed. It pads its content down by a status bar height so its
   title clears the synthetic "9:41", and that moved its background down with
   it, leaving 60pt unpainted.

**Why the earlier attempts could not have worked**, now that the mechanism is
known: `.ignoresSafeArea()` inside the phone frame acts below the level where
the offset is applied, and clearing `additionalSafeAreaInsets` does nothing to
an inset that is *inherited* rather than additional.

**One trap worth recording.** Cancelling the safe area outright fixes the band
but sends Reflections' and Roots' navigation titles straight through the
synthetic status bar, because NavigationStack reads `additionalSafeAreaInsets`
and nothing else. A SwiftUI `.safeAreaInset` and a `.safeAreaPadding` were both
tried from outside it and both rendered the collision unchanged. The shipped fix
therefore keeps a one-status-bar safe area and cancels the placement offset it
causes, rather than zeroing the safe area.

**Verified:** all twelve re-exported PNGs decode to zero transparent rows and a
uniform alpha of 255, at the unchanged 1179x2556. Both switches default to off
and are set only by the raw call site, so the composed App Store set (item 5)
renders exactly as it did when it was shipped.

**Files:** `Hamdam/Hamdam/DebugTools/ScreenshotOrchestrator/` in `hamdam-ios`
(`ScreenshotOrchestrator.swift`, `ScreenshotViewFactory.swift`). Runbook:
`docs/app-store/phase-3-screenshot-orchestrator.md`.

**Note for whoever re-exports next:** the export renders whatever is on the
`hamdam-ios` working branch, so a re-export also picks up unrelated app changes.
This set was captured off `feature/phase31-roots-global` at commit `a25457a8`,
which had just removed the unattributed Wikipedia imagery from the Roots cards,
so `04-roots` differs from the previous set for that reason as well.

---

## 5. The composed App Store screenshot set had the same undersized-content bug — FIXED 2026-07-25

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

**Impact:** the live App Store listing, not this website.

**What was done**, following the suggested next step above: the composed pass now
renders at the same real device points as the raw one, and the composer was
retuned against it. The retuning turned out to be one substantive change plus
three consequential ones:

- The mockup is **fitted inside a box** rather than sized by width alone. A screen
  that fills the device is 0.46 wide-to-tall, so the old `width * 0.77` rule gave
  a mockup around 2150pt tall that overflowed the subheadline above it and the
  App Store grid-crop safe zone below. It now fits within 0.77 of the width and
  0.70 of the height, preserving aspect; width still governs the short screens.
- `minCroppedHeight` 900 -> 300 and `rowCropSafetyMargin` 130 -> 44, each a third
  of its old value, because the crop they bound is now measured in device points.
- The content measurement replaces the inherited safe area instead of adding to
  it, so it measures against the same insets the render uses.
- The composed screen render gets the same safe-area treatment as the raw pass,
  so the mockup is an opaque phone screen rather than one with a transparent
  strip showing the marketing gradient through it.

`ScreenshotMetrics.composedWidth/composedHeight` were not touched: **verified all
twelve are still exactly 1290x2796.** The raw website set was re-exported from the
same build and compared against what is live: mean absolute pixel difference
0.002, i.e. unchanged, so this work did not disturb the site.

**Was owed, now closed 2026-08-22.** This said the new set had not been
uploaded and that it was Ealia's to do. That stopped being true and nobody
updated it. The listing carries seven shots per locale, uploaded from
`hamdam-analytics/assets/screenshots/`, committed there 2026-08-17, three weeks
after the export below. Checked against the live listing rather than inferred
from the dates.

Note what is NOT fixed by that upload: the first of those seven,
`01-hero-en.png`, is a synthetic composition of a screen the app cannot
display. That is a separate defect from this section's crop bug, it is still
live, and it is recorded under "the hero screenshot" in FACTS.md. The twelve PNGs are in the
`hamdam-ios` repo at `marketing/app-store-screenshots-2026-07-25/{EN,FA}/`
(untracked, so they will not bloat the repo unless she adds them).

---

## 6. The Cloudflare API token: CLOSED 2026-08-22, kept deliberately

**Decision: Ealia keeps the token as it is. Nothing to do. Do not reopen this.**

The token at `~/.config/hamdam-audit/cf-token` was created 2026-07-21 as a
short-lived, narrowly-scoped custom token (Account: Workers Scripts Edit; Zone:
redirect-rules/Rulesets Edit, this zone only) and was meant to be revoked the
same day. It was kept through the redesign, and on 2026-08-22 Ealia decided to
keep it indefinitely because it is useful and re-minting one each time is
friction for no real gain.

It is closed rather than left open because an item nobody intends to action
stops being read, and takes the items around it down with it. That is the same
failure `docs/app-store/pre-upload-checklist.md` records in its own closing
section.

**What was weighed, so nobody has to re-derive it.** The website is a Worker,
so Workers Scripts Edit means the holder can replace hamdam.com.au with
anything, and Rulesets Edit means they can redirect its traffic. That is the
real blast radius: not a data leak, but the domain serving someone else's
content. Against that: the token is a file on Ealia's own Mac, it is in no
repository, and the scopes are narrow rather than account-wide. A middle path
was offered, a fresh token carrying a 90 day expiry and optionally an IP
restriction, which keeps the convenience and stops a temporary credential
becoming permanent by default. Ealia declined it. That is a legitimate call on
a low-likelihood risk and it is recorded here as a decision, not a debt.

**If it ever does need replacing:** revoke at dash.cloudflare.com, My Profile,
API Tokens, then mint a new one with the same two scopes. The user-level deploy
hook in `~/.claude/settings.json` references the repo path and not the token,
so nothing breaks except the next manual deploy, which fails with an auth error
until a new token is supplied.

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
