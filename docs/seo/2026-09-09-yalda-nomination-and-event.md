# Yalda 2026: the featuring nomination and the in-app event

Written 2026-09-09, the day after 1.4 went live under the new listing name.
Tooling lives in `ealiaaziz/hamdam-analytics` (`scripts/create_event_yalda.py`,
`scripts/create_nomination_yalda.py`); this note records what was decided and
why, because the next person to touch either will be doing it in December with
no time to rediscover any of it.

## What exists on App Store Connect

- **Nomination** `66e8e6f1-7bc0-449e-8511-ea585709e614`, state DRAFT, created
  2026-08-31, patched in place 2026-09-09. Nothing has been submitted. Submitting
  is Ealia's click in App Store Connect, Apps, Hamdam, Featuring Nominations.
- **In-app event** `6810236473`, reference name "Yalda, Dec 2026", state DRAFT,
  created 2026-09-09. Four English localisations (en-AU primary, en-US, en-GB,
  en-CA), card and details page on each. Submitting the event for review is
  also Ealia's click.

## What was wrong with the 31 August draft, and how each was found

Every item below was read off Apple's own read-back of the draft (the
`probe-nominations` log of 2026-08-31 07:24 UTC), not off the script.

1. **The name carried the old app name.** "Hamdam - Poetry & Reflections |
   Yalda Night 2026" on a listing that has been "Hamdam: Reflection Companion"
   since 1.4. The script now reads the en-AU name off the live `appInfo` and
   appends the suffix; it refuses to run if it cannot read one. Never type
   either name.
2. **"In the original Persian with translation."** The app shows one language
   at a time (FACTS.md, verse display). The App Store description was
   corrected for the same claim on 2026-09-01 and the nomination was missed.
   Now "in the original Persian or in English". The claim gate in
   `claims.py` did not catch this phrasing, so "with translation" and
   "and translation" are in the script's own forbidden list.
3. **`hasInAppEvents: false`** was honest on the day and stale the moment the
   event existed. The script now looks the event up by reference name and sets
   the flag to what Apple holds.
4. **The publish window opened four days before any Yalda content exists.**
   The app's Yalda season is 18 to 23 December (`SeasonalEventEngine`) and the
   riddle run finishes on the 26th (`RiddleEngine`, r353 to r360). The window is
   now 18 to 26 December. Editorial opening the app on the 15th would have found
   nothing the nomination describes.
5. **The pitch never said who the faal is for.** `showsPersianCore` serves the
   faal to readers with a Persian birth country, or to Farsi speakers with no
   birth country set. An English install with no birth country resolves to
   `.universal` and has no faal on any screen. That is exactly the device an
   Editorial reviewer opens. The description now scopes the claim ("for
   readers with a Persian connection") and Helpful Details gives the path:
   Settings, About You, Where you were born, choose Iran, or set the language
   to Farsi.
6. **The draft matched on name.** After the rename, a re-run would have
   created a second draft. It matches on id now and refuses if the id is gone.
7. **Supplemental links were www.** They 301 to the bare host. Now canonical,
   plus `/moments/yalda/`, which already ranks for "yalda 2026" (traffic log,
   early September), and `/whats-new/`.

Two things were added because they are true and were missing: the Yalda Live
Activity (on `main` since 2026-08-24, Lock Screen and Dynamic Island, starts
itself 18 December) and the 1.4 games, since backgammon and Hokm on Yalda night
is a real thing families do. Mosha'ereh is not named, for the reason in
hamdam-ios `docs/games/APP-STORE-DRAFTS.md` section 0.2.

## The event's window is not "live 1 December", and here is why

Apple shows an event card up to 14 days before the event starts. The card
appears 1 December as asked; the event therefore starts 15 December, the
earliest that allows, and ends 26 December with the last riddle. Between the
15th and the 18th the copy is still true: it promises a countdown, a Live
Activity, an icon and a night sky, all of which either exist year round or
switch on by themselves on the 18th. It promises nothing that only a
Persian-connected reader can reach; the faal and the riddle lane are the
nomination's job.

## Artwork

flux-2-pro at 2K through ElevenLabs, four candidates each, one chosen. Card
2048x1152, details page 1152x2048, both on Apple's exact ratios so no
upscaling. No text anywhere in the image, because Apple renders the event name
over the card. The scene is a Yalda table by candlelight: watermelon,
pomegranate, ajil, narcissus, tea, a closed book, and a winter night sky in
the window. Files are in hamdam-analytics `assets/events/yalda-event-*.png`.

## What would still raise the odds

- **Submit both in September.** Apple publishes no lead time for nominations,
  but holiday features are planned weeks out. Today is 103 days before Yalda.
- **Farsi copy on `/moments/yalda/`** (task #10). The page is a supplemental
  link now; its Farsi half is 24 words.
- **A screen recording of the faal** as a fifth supplemental link, once the
  Yalda season can be pinned in a debug build. Editorial cannot see the Yalda
  faal in September otherwise.

Nothing here reports a traffic number. The nomination's effect, if any, will
be visible in the 2026-12 impressions by source type, and only there.
