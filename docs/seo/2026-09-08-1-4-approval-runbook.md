# What happens on the site when Apple approves 1.4

Written 2026-09-08, with 1.4 submitted and in review. The point of this page is
that nothing on the day is a judgement call.

## The state this was written in, checked rather than assumed

- The App Store lookup API reported **1.3.2**, name **Hamdam: Daily Persian
  Poetry**, on both the AU and US storefronts.
- App Store Connect had **no version in PREPARE_FOR_SUBMISSION**, which is what
  a submitted version looks like from the outside.
- `hamdam-ios` `origin/main` had **no games at all**: no Chistan, no Hokm, no
  `GamesPlayGate`. The games live on `origin/feature/v1.4-games`.
- The Faal limit of three a day is **already live**, in `origin/main`
  (`RootsFaalSection.swift`), so copy about it is true today.

## Why the name is not a thing anyone flips

It never was. `appStoreNameFor` derives it from `RELEASES[0].version`, and
that record is generated from the live store. The failure direction is
deliberate: an unreadable version resolves to the OLD name, because being
briefly stale is cheaper than announcing a name Apple has not applied.

**The same now goes for the games.** `gamesShippedIn` gates every sentence that
names Chistan, Hokm, Backgammon or the three plays a day, on the same signal.
This was added because the copy for them was written while 1.4 was still in
review, and merging it would have advertised, to anyone who taps Get, four
games that are not in the build they would receive. A stale name is a mismatch
a crawler notices. A feature claim is a promise, and guideline 2.3 is about
exactly that.

So the 1.4 copy is **safe to merge to `main` at any time**. It stays invisible
until the store itself says 1.4.

## The day Apple approves

```
node scripts/extract-releases.mjs --write   # reads the live store
npm run check:release                       # fails if the two disagree
npm test                                    # WILL FAIL, see below
```

`npm test` failing is the design, not a surprise. `public/llms.txt` is static
with no build step and carries the store URL as a literal, so one test asserts
it matches `APP_STORE_CANONICAL_URL` and is meant to fail on rename day so the
rename cannot half-land. Change that one line to:

    https://apps.apple.com/app/hamdam-reflection-companion/id6784461990

Then `npm test` again, and everything below changes by itself in the same
build:

| Surface | Before | After |
|---|---|---|
| Homepage `<title>` | Hamdam: Daily Persian Poetry, Reflection and Journal | Hamdam: Reflection Companion, Persian Poetry and Journal |
| `alternateName` in JSON-LD | Hamdam: Daily Persian Poetry | Hamdam: Reflection Companion |
| Crawlable store link slug | hamdam-daily-persian-poetry | hamdam-reflection-companion |
| Homepage Free panel | no games | three plays a day, both locales |
| Homepage Plus panel | no games | unlimited plays, both locales |
| `/terms/` and `/fa/terms/` | no games entitlement | unlimited plays entitlement |

All six were verified on 2026-09-08 by editing the generated version to "1.4",
rebuilding, and reading the built HTML, then reverting. They are not predicted.

## What does NOT change, and should not

- **No prices.** The brief carries all three, and its own closing note is the
  reason not to publish them: they are set in Australian dollars and Apple
  converts per storefront, so a fixed figure on a page served worldwide is
  wrong for most readers. FACTS.md line 145 says the same.
- **The Faal lines stay unconditional**, because that limit is live today.
- **`whats-new`** regenerates from the same record, so 1.4's notes appear with
  everything else.

## Still open on the day

The Farsi for the games sentence and for "unlimited plays in the Garden" is
lifted byte for byte from the app, but both carry `needs_review: Sima` in the
app source. They are the app's own words either way; if she changes them, the
app and the site change together.
