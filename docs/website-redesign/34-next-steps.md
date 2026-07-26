# Website redesign: what is left

Written 2026-07-25 at the end of the session that shipped the universal Roots
rebuild, the seven-section homepage, the recaptured screenshots and the deploy
guard. Everything in `33-universal-roots-and-homepage-handoff.md` is done and
live on hamdam.com.au. Ealia signed off on the English copy and the structure
the same day, and ruled "Farsi is ok for now", so the Farsi gaps below are
deferred rather than owed.

Three items remained. None blocked the site; all three were found while doing the
work above. **Items 4 and 5 were both fixed later the same day** — item 4 is
deployed and live, item 5 is built and verified but its output still has to be
uploaded to App Store Connect by hand. Their sections are kept in full below,
because item 4's original write-up contained a wrong measurement that sent the
investigation the wrong way, and that is worth recording. **Only item 6 remains,
and it is Ealia's to do.**

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

**Still owed:** the new set has NOT been uploaded to App Store Connect. That is
Ealia's to do, at the next listing refresh. The twelve PNGs are in the
`hamdam-ios` repo at `marketing/app-store-screenshots-2026-07-25/{EN,FA}/`
(untracked, so they will not bloat the repo unless she adds them).

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

## 7. The Australian calendar was wrong, and the DOM still ships every row — CATALOGUE FIXED 2026-07-26

**Reported:** Labour Day rendering four times on 5 October, King's Birthday four
times on 14 June, ANZAC Day three times across two dates.

**What that actually was:** the un-filtered DOM. `RootsMoments.astro` renders the
whole catalogue once, date-sorted, and hides the rows the selected region
doesn't match — a deliberate choice so the region switcher can be a CSS class
toggle and stay inside CSP with no re-render. Every row is therefore present in
view-source, and the per-state duplicates are visible there. No visitor with CSS
ever sees more than one at a time, and the app cannot produce them either
(`LocationManager` yields exactly one region). Not a rendering bug.

**What it uncovered, which was real.** `src/data/rootsMoments.ts` is generated
from the app's `CulturalMoment.swift` — which is the app's OFFLINE FALLBACK,
deliberately incomplete because a live nager.at feed fills its gaps at runtime.
This site has no live feed and treats it as complete truth, so every gap showed
as a missing or wrong holiday:

| | before | after |
|---|---|---|
| Victoria | 10 resolvable holidays, none of them Victorian | 13 |
| NSW | 11, no King's Birthday | 14 |
| ACT | 14, ANZAC Day on the wrong date | 16 |
| SA / TAS / NT | no ANZAC Day at all | present |
| everyone | no Boxing Day anywhere | 26 December |

Fixed in `hamdam-ios` on branch `claude/australian-calendar-duplicates-4hk9f6`
(see that repo's `docs/decisions.md` — two earlier rulings were reversed) and
regenerated here with `node scripts/generate-roots-data.mjs --ios ../hamdam-ios`.
48 → 51 moments. `src/lib/__tests__/rootsMoments.test.js` gained per-region
sweeps over all eight jurisdictions, including one asserting no region ever sees
the same holiday name on two different dates — the shape of the original report.

**Still open, deliberately not done here:**

1. **The 33 hidden rows still ship on every page.** They are `display:none`, so
   they are invisible and out of the accessibility tree, but they are in the HTML
   of both locales and they are what prompted this report. Removing them means
   giving up the CSS-only switcher, which was a considered CSP decision — worth a
   look, not obviously worth reversing. Whoever picks this up should read the
   comment at the top of `RootsMoments.astro` first.
2. **The regenerated data is only as good as its sources.** Dates came from
   nsw.gov.au, cmtedd.act.gov.au, wa.gov.au and business.vic.gov.au via search
   summaries; direct `.gov.au` fetches were blocked by the working environment.
   Each catalogue entry's comment records that. Re-verify before launch.
3. **The app fix is not compiled.** No Swift toolchain was available. It needs an
   Xcode run before that branch merges — and if the catalogue changes there,
   regenerate here again.

**Also fixed in passing:** `scripts/check-persian.mjs` crashed with ENOENT on any
fresh clone, because `public/scripts` is one of its roots and holds no committed
files. The pre-commit hook was failing rather than running. It skips a missing
root now.

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
