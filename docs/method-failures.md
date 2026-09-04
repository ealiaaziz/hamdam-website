# Method failures

Mistakes made by assistant sessions on this project, written down so the next
one does not repeat them. Recorded 2026-09-04 at Ealia's instruction, covering
the session of 2026-08-28 to 2026-09-04.

This is not a list of bugs. Every bug in this repository is already fixed or
recorded where it belongs. This file is about **how the wrong answer got
produced**, because the failure mode repeats and the fix is a habit rather than
a patch.

## The pattern, stated once

Every entry below is the same shape:

> A command was run. Its output was misread, or its scope was narrower than
> assumed. The misreading was then reported to Ealia as a fact about the world,
> with no step in between that could have caught it.

Not one of these was caused by missing information. In every case the correct
answer was already available, usually in this repository, sometimes in the very
file that had just been read. What was missing was the habit of asking **"what
exactly does this output prove?"** before turning it into a sentence.

The three rules that would have prevented all of them:

1. **A tool's output is evidence about the tool, not about the world.** A
   directory listing describes what has been downloaded. An error code describes
   what one request did. Neither describes what a service offers.
2. **Never write a label before reading what it labels.** Two of the entries
   below are conclusions typed next to output that plainly contradicted them.
3. **Before telling a person to go and do setup work, check what already
   exists.** Twice the answer was already connected and already documented.

## The entries

### Told Ealia the App Store event was submittable when it was not

**Claimed:** "The event is complete and submittable. The only thing left is
uploading the card and hitting submit."

**True:** App Store Connect refused with "You must upload event card and details
page images or videos for the primary language of this event." The details page
asset is mandatory.

**How.** The 1920x1080 card was sent to the details page slot and Apple returned
`IMAGE_BAD_DIMENSION_SM_LESS_MIN` and `IMAGE_BAD_ASPECT_RATIO`. Rather than
reading the published specification, the asset was dropped as optional and the
event declared finished. The specification is a public table and took ten
seconds to find: the card is 16:9 landscape, the details page is 9:16 portrait.

**Rule.** A failure code that names a dimension is telling you to go and read
the dimension. An error is a question, not a verdict.

### Told Ealia to wait a week for data that was already in the repository

**Claimed:** the Search Console impressions signal could not be read until the
weekly bucket ending 4 September closed, so the effect of the 1.3.2 metadata
changes was unmeasurable.

**True:** `App_Store_Discovery_and_Engagement_Standard` had been arriving DAILY
since 2026-08-17 and every file was committed. Twenty three days of daily,
per territory impressions were sitting in `data/` the whole time.

**How.** An inventory loop ended in `ls "$d" | tail -1`. That sorts
alphabetically, so `WEEKLY_...` came last and `DAILY_...` was never printed. A
wrong shell one liner became a confident claim about what Apple serves, and then
a recommendation to wait.

**Rule.** `tail -1` on a sorted listing answers "what is last alphabetically",
not "what is newest" and certainly not "what exists". When a one liner is about
to become a claim, check the one liner first.

### Sent Ealia to Google Cloud for a credential he did not need

**Claimed:** the missing `GSC_SERVICE_ACCOUNT_KEY` was what stood between him
and a Search Console reading, followed by six setup steps involving a Cloud
project, a service account, a JSON key and a repository secret.

**True:** the property was already reachable with no credential at all through
the Composio connection, authorised at `siteOwner`. That is how the reading an
hour earlier in the same session had been taken, and `docs/seo/traffic-log.md`
already documented the path in a section that had been read.

**How.** The workflow failed, its error named the secret, and the error was
treated as the whole answer. What the secret actually buys is narrower and
should have been stated precisely: the reading happening when nobody has asked
for one.

**Rule.** Before prescribing setup work to a person, check what is already
connected. Then re-read the document you are citing, because it may already
contain the answer you are about to say does not exist.

### Wrote a conclusion next to output that contradicted it

**Claimed:** printed "(empty above = the rebased commit is content identical,
nothing lost)" directly beneath a diff listing 45 files and 5,376 insertions.

**True:** the comparison was between two trees, not two patches, so it was
showing `main`'s own progress. The claim happened to be correct, but nothing on
screen supported it. The patch level check done afterwards is what actually
established it.

**Rule.** The label goes after reading the output, never in the same command as
producing it. And pick the comparison that answers the question being asked.

### A category error in a handoff, written to be acted on by someone else

**Claimed:** "`/poets/khayyam/` is the laggard at position 30.6 while its
siblings sit at 4 to 6."

**True:** 30.6 is that page's average across every query it appears for. The 4
to 6 figures are per query positions inside the `ganjoor` cluster. `ganjoor
khayyam` is at position 5.0 and produced the only click in the window. Comparing
the two numbers was meaningless, and the handoff would have sent another job
hunting for a gap that does not exist.

**Rule.** Two numbers with the same unit are not necessarily comparable. Before
putting a comparison in a document somebody else will act on, say out loud what
each side is averaged over.

### Built a script on a premise that was already false

`scripts/probe_report_instances.py` in `hamdam-analytics` was written and pushed
with a docstring asserting that Apple served the discovery report only WEEKLY
under the ONGOING request. That was the same error as the second entry above,
committed to code. The script is still worth having, and its docstring now
records what actually happened, but the commit exists because a wrong belief was
built on before it was checked.

**Rule.** When about to write code whose reason for existing is a limitation,
verify the limitation first. The code is cheap; the wrong explanation left in
the tree for the next reader is not.

### Two arithmetic misreads, caught before they reached Ealia

Both are recorded because they are the same habit failing in a smaller way, and
because catching them was luck rather than method.

- Summed the subscription state report across every date in a backfill file and
  reported "Monthly Full price = 3". It was one subscriber across three days.
- Summed the downloads report per filename rather than per row date, so
  backfilled files double counted and the first time download series was wrong.

**Rule.** A file named for a date may contain many dates. Key on the row's own
date, and take the newest file that reports each one.

## What to do with this file

Read it at the start of a session that will be reporting numbers or telling
Ealia to do something. It is short on purpose. If it grows past a page, the
entries have stopped being about method and the file needs pruning rather than
appending.
