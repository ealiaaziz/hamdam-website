# Instagram caption remediation, for Ealia and Sima

> **CORRECTED 2026-08-21. Read this before applying anything below.**
>
> The replacement text this document originally proposed, "with an English
> translation alongside", is itself a false claim and is now hard-blocked.
> The app shows one language at a time, chosen by the app-wide language
> setting, and in Farsi mode deliberately shows no English at all. That was
> established on 2026-08-16 by reading hamdam-ios; see FACTS.md, "Verse
> display", for the file-and-line sources.
>
> All four replacements below now read "in Persian, or in English". The
> blocked wording is caught by `audit_lint.py` as of 2026-08-21
> (`PRESENTATION_PATTERNS`, pinned by tests t27 to t29), so a future draft
> cannot reintroduce it the way this document did.
>
> **Two of the four captions were already published with the wrong
> replacement**: the Parvin reel of 11 August and the Rumi ney reel of
> 7 August both currently carry "with an English translation alongside" and
> need editing again. The launch post of 2 August still carries the original
> "doesn't flatten" wording and has not been touched at all.

Prepared 13 August 2026. **English only. Drafts only. Nothing here has been posted, edited or sent.**

Instagram is Sima's channel and Persian copy is Ealia's. This document is a review artefact: it proposes replacement text for four published captions and stops there. No caption has been touched.

---

## Why these four

Four published posts carry a claim about the quality of the English translation. FACTS.md marks that CONTESTED with a hard block, and has since before these posts went out, because the app still ships AI generated translations against a public commitment to cited public domain translations (Nicholson, Whinfield, Bell).

A comparative claim about translation quality is a claim about other translators' work as well as our own, and the app cannot currently substantiate either half.

Instagram permits caption editing, so these are recoverable. That is the whole reason this document exists.

**Two things have changed since the analysis that produced this list, and both are good news.**

1. **The Apple Watch claim is true.** It was flagged as a possible overclaim. It is not. The iOS project declares a `HamdamWatch Watch App` target and a complications extension, the iPhone target embeds the watch app in the shipped product, and the App Store Compatibility section states "Apple Watch: Requires watchOS 26.5 or later". The problem was that FACTS.md recorded the platform as iPhone only, so the claim audit had no basis to approve a claim the product actually supports. FACTS.md is fixed. **"on iPhone and Apple Watch" stays in all four captions.**
2. **The privacy nutrition label is clean.** The App Store listing declares "Data Not Collected", with no categories and no data types under any heading. The iOS project has no third party dependency of any kind and no analytics SDK. So the narrow privacy statements survive. See the note under post 4 for the one that does not.

## Order

By reach. The three reels first, the launch post last.

---

## Post 1 of 4. Parvin reel, 11 August

`instagram.com/reel/Db6pltQmBrE/`

**Offending text:** "with a translation that doesn't flatten it"

**Also checked:** "free on iPhone and Apple Watch". The Apple Watch half is fine. The word "free" on its own is not, because the App Store listing shows in app purchases and a bare "free" omits them. The replacement says "free to download", which is accurate and no longer.

**Replace the sign off block with:**

> One verse a day, in Persian, or in English. Hamdam is free to download on iPhone and Apple Watch. Link in bio.

---

## Post 2 of 4. Rumi ney reel, 7 August

`instagram.com/reel/DbuI9MSpvyq/`

**Offending text:** "with an English translation that doesn't flatten it"

**Also checked:** "free on iPhone and Apple Watch". Same as post 1.

**Replace the sign off block with:**

> One verse a day, in Persian, or in English. Hamdam is free to download on iPhone and Apple Watch. Link in bio.

---

## Post 3 of 4. Ney reel, 3 August

`instagram.com/reel/DbkxpdDp_Lb/`

This post has **two** separate problems. The sign off, same as the others, and a line in the body.

**Offending text, sign off:** "an English translation that doesn't flatten it"

**Replace the sign off block with:**

> One verse a day, in Persian, or in English. Hamdam is free to download on iPhone and Apple Watch. Link in bio.

**Offending text, body:**

> Most translations soften it. شکایت is a complaint, a grievance. Not a wistful sigh. The reed is protesting.

"Most translations soften it" is a comparative quality claim about other translators' work. The gloss that follows is fine and worth keeping: it makes a real point about the word.

**Replace with a factual gloss that makes the same point without the comparison:**

> [FA]شکایت[/FA] carries the sense of a complaint or a grievance. The reed is protesting.

**Note on the Persian word.** [FA]شکایت[/FA] is carried over verbatim from the caption already published. It is not authored here and not translated here: it is the same word, in the same place, with the comparative sentence in front of it removed. It is marked so the claim audit does not read it as generated Persian. **Ealia to confirm the word stands as it is before this goes to Sima.**

---

## Post 4 of 4. Launch post, 2 August

`instagram.com/p/DbiSIb-oGJe/`

**Offending text, sign off:** "an English translation that doesn't flatten it"

**Replace the sign off block with:**

> One verse a day, in Persian, or in English. Hamdam is free to download on iPhone and Apple Watch. Link in bio.

**Offending text, closing line:**

> Hamdam is live on iPhone and Apple Watch. Private. No ads. Free.

Two problems. "Free." as a full stop claim omits in app purchases. "Private." is a whole app claim, which is the broadest possible form of a privacy statement and the one FACTS.md now blocks.

**Replace with:**

> Hamdam is live on iPhone and Apple Watch. No ads, no sign up, and your journal stays on your device. Free to download.

The three narrow claims that replace "Private." are each separately true and separately checkable: no ads, no sign up, and the journal is stored on device. That is the form FACTS.md allows. The nutrition label came back clean, so the middle sentence stays rather than being cut.

**One flag on this sentence, for Ealia to settle.** "Your journal stays on your device" is true for the default configuration and slightly imprecise for a Hamdam Plus subscriber who has turned on iCloud sync, where the journal also sits in their own iCloud. Nobody else's, and Hamdam never sees it, so the spirit is right. If the precision matters, this is the alternative:

> Hamdam is live on iPhone and Apple Watch. No ads, no sign up, and your journal stays on your device or your own iCloud. Free to download.

The shorter version is the one drafted above, because that is what the remediation spec called for. Either passes the gate. This is a copy call.

---

## Persian

Every one of the four posts also carries a Persian block. **None of it is drafted here.**

For each of the four posts:

```
[FA] Persian sign off requires Ealia's review. Intent: match the amended English exactly.
Confirm the Persian does not carry a translation quality claim. [/FA]
```

The second sentence is the one that matters. The English claim was found and fixed; nobody has read the Persian for the same claim. It may well carry it too, in which case fixing only the English leaves the problem live for the audience the Persian block is written for.

---

## Verification

Every replacement string above was run through layer 1 of the claim audit gate (`marketing/claim-audit/audit_lint.py`) on the branch that adds the new blocked phrases.

- The four **live** captions FAIL, on `contested-phrase`. That is the check that the new rule actually catches what shipped, rather than catching a paraphrase of it.
- Every **replacement** string PASSES: no dash or hyphen characters, no contested translation phrase, no blocked privacy phrase, no bare "Free" claim, no dollar amounts, Australian English.

---

## Style debt, flagged and deliberately not fixed

**Em dashes.** The live captions use em dashes throughout, against the standing no dashes rule. **Not mass edited now, on purpose.** Caption edits carry a small reach penalty, and four edits is already the budget for these four posts. Spending more edits on punctuation would cost reach for no claim benefit. Future drafts comply, because layer 1 fails on the characters.

**The dash rule amendment is still outstanding.** The recommended amendment exempting verse and reflection content directories from the dash rule has not been resolved. **It should be resolved before the next pipeline run**, not after, because every run until then either trips on legitimate verse punctuation or teaches whoever is reviewing to wave the rule through.

## Minor, low priority, not for this pass

Two July posts, **21 July** and **29 July**, embed the old App Store slug `hamdam-poetry-reflection` as raw URLs in the caption text. Instagram captions are not clickable, so these are dead weight pointing at a stale slug. Worth cleaning up whenever those posts are next touched for another reason. **Do not spend a caption edit on this alone.**

---

## One item that is not an Instagram problem, raised here because it was found while checking these

Checking the privacy claims in post 4 meant reading what the app actually does. It turned up a factual error in the published privacy policy, and this is the only artefact going to Ealia this pass, so it is recorded here rather than lost.

`/privacy/` section 5 states, in bold, that **"Nager.Date (date.nager.at) is the only service Hamdam contacts that is not operated by Apple."** That is false. The app also makes network requests to:

- `www.wikidata.org` and `commons.wikimedia.org`, resolving symbol images and their licences
- `api.inaturalist.org`, the second image source
- `inaturalist-open-data.s3.amazonaws.com`, the image bytes for iNaturalist results

None of these send anything about the user, and none of them undermine the "Data Not Collected" label. But the policy presents itself as an exhaustive list of every host the app contacts, AGENTS.md makes keeping it exhaustive a standing rule, and it is not exhaustive. This is a legal document that is wrong on a checkable point.

**Not fixed in this pass**, because the remediation spec did not authorise a legal copy change and legal copy is not a claim audit edit. The fix belongs in `src/pages/privacy.astro` and `src/pages/terms.astro`, and the Farsi mirrors need Ealia's Persian. Full detail, including which service is called from which file, is in the "Outbound hosts" section added to FACTS.md.

There is a second, smaller instance of the same theme. The homepage JSON-LD `featureList` publishes **"No account, no sign-up, no tracking"**. "No tracking" is a phrase FACTS.md now blocks in outbound copy. Structured data is machine read metadata rather than marketing copy, so it is not squarely covered by that rule, but it is the same claim in a place a search engine will quote. Worth a decision alongside the privacy policy fix rather than separately.
