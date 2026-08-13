# Farsi legal pages: what the outbound-host correction needs from Ealia

Companion to the `privacy-outbound-hosts` branch. **The English is done. The Farsi is not, and cannot be done by anyone but Ealia.**

## The state this leaves the site in, stated plainly

The branch corrects `/privacy/` section 5 and `/terms/` section 12 in English. It does not touch `/fa/privacy/` or `/fa/terms/`, because this repository bars Claude from authoring Persian and legal copy is the last place to make an exception.

So if this branch ships as it stands, **the English and Farsi policies disagree with each other**, and the Farsi one is the one that is wrong. It still carries the sentence saying Nager.Date is the only service the app contacts that Apple does not operate.

Two views on whether that is acceptable, and the decision is Ealia's:

- **One correct page is better than two wrong ones.** The English is the version most likely to be read by a regulator, and it becomes accurate immediately.
- **A bilingual policy that contradicts itself is its own problem.** A Farsi speaking user reading the Farsi page is being told something untrue, and "the English version is correct" is not a defence anyone should have to make.

If the second view wins, the English change should wait until the Farsi is ready, and the two ship together. **The branch is unpushed precisely so that choice is still open.**

## What changed in English, so the Farsi can match

Four changes. Section and paragraph references are to the English pages on this branch.

### 1. `/privacy/` section 5, first paragraph: a sentence added at the end

The existing paragraph about Apple's frameworks gains a note that two of them fetch images as they display them: Apple Music artwork in the mini player, and the WeatherKit attribution mark beside a forecast, both from Apple's own servers.

**Why it was added:** an exhaustive sweep of the app's network call sites found these are real outbound requests, made through `AsyncImage`, not merely links. Apple's blanket sentence covers them, but a policy claiming to be exhaustive should not leave a reader to infer it.

### 2. `/privacy/` section 5: an entirely new paragraph, inserted before the Nager.Date one

This is the substantial addition. It describes the cultural symbol photograph pipeline, in this order:

1. the device asks **www.wikidata.org** which image is recorded for the subject, using a fixed identifier that ships inside the app
2. it asks **commons.wikimedia.org** for that image's licence and credit, because a photograph cannot lawfully be displayed without them
3. it loads the picture from **upload.wikimedia.org**
4. if Wikimedia holds nothing usable, it asks **api.inaturalist.org** for the same subject by its scientific name
5. it loads any resulting photograph from **inaturalist-open-data.s3.amazonaws.com**

It closes on the point that matters for privacy: every value sent is a fixed identifier or a species name compiled into the app, and nothing about the person, their reflections, their journal or their health is included, with no account or device identifier attached.

**The five host names are Latin script and must stay exactly as written.** They are the substance of the disclosure.

### 3. `/privacy/` section 5, Nager.Date paragraph: the false clause removed

Before, it opened by calling Nager.Date the only service Hamdam contacts that Apple does not operate. That clause is deleted. **Everything else in that paragraph is unchanged and remains accurate**, including the country code detail and the once per calendar year refresh.

### 4. `/privacy/` section 5: a new closing paragraph listing every non-Apple host

An explicit, exhaustive list, grouped by who runs each service: the four Wikimedia Foundation hosts, the two iNaturalist ones, and date.nager.at, with a plain statement that there are no others.

It ends with a distinction worth carrying into the Farsi carefully, because it is the sentence that keeps the list honest rather than merely long:

> A link you tap that opens in your browser, such as an Apple Music search or the source credit under a photograph, is a page you have chosen to visit rather than a request Hamdam makes.

That is what separates the seven hosts in the list from the several other addresses that appear in the app as tappable links.

### 5. `/terms/` section 12, second paragraph: rewritten to mirror the above

Shorter than the privacy version, as it already was. It names the same hosts, states that those are the non-Apple services and there are no others, and continues to defer the detail of what each receives to section 5 of the Privacy Policy.

## Dates

Both English pages move to `Effective 13 August 2026`, and their JSON-LD `dateModified` moves to `2026-08-13`.

**The Farsi pages still read 28 July 2026 on both counts, deliberately.** A date claiming the Farsi policy was revised on 13 August would be false while its text is unrevised. Those four values move when the Farsi text does.

## The check to run afterwards

Once the Farsi is written, the same verification that was run on the English:

```
npm run build
npm test
npm run check:persian
node scripts/check-dashes.mjs
```

and then confirm the five host strings appear in `dist/fa/privacy/index.html`, and that the old sentence is gone. The English equivalent of that check is recorded in the branch's commit message.

## One thing to decide while writing it

The English says "There are no others." That is a strong claim, and it is true as of 2026-08-13, verified by enumerating every network capable call site in the app rather than by grepping for URLs.

It is also a claim that goes stale the moment someone adds a feature that fetches something. **AGENTS.md already makes keeping this list exhaustive a standing rule**, and this correction exists because that rule was not followed when the symbol photograph pipeline was built. Worth deciding whether the Farsi states it as flatly as the English does, or hedges slightly. The English does not hedge, on the view that a list presenting itself as exhaustive should say so and then be kept true.
