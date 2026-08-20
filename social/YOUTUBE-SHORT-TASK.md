# Hamdam — YouTube Short (Tue, Fri) — v2, 20 August 2026

MODE = DRAFT_FOR_REVIEW until three Shorts have published cleanly, then AUTO_PUBLISH.

Produce one vertical Short for the Hamdam YouTube channel (`UCPnIymXnuhJBUK94wUVjH0Q`,
`@Hamdam_aus`) from the validated verse bank, and publish it.

This channel is not Instagram and does not share its constraints. The
one-post-per-day rule exists because two Instagram posts on 31 July cost about
ninety percent of reach. It does not apply across platforms. A Short may publish
on the same day as an Instagram post.

## Changes in v2

- `social/moods-fa.json` now exists (commits `95c8bbb`, `d3e130a`). Run 1
  stopped for its absence. The mood table below no longer restates the lines —
  read them from the file.
- Upload path corrected: use `YOUTUBE_MULTIPART_UPLOAD_VIDEO`, not a raw
  `proxy_execute` against the resumable endpoint.
- Page 0 length is the first thing to check on the first draft.

## Why this format exists

Three Shorts published on 31 July 2026, same day, same format, same channel,
zero subscribers: 1,124 views, 35 views, 14 views. The only variable was which
verse. The 1,124 was the most widely recognised line in Persian literature; the
other two were lines only a reader of Hafez or Rumi would know.

Reach is decided in the first half-second, by recognition. And a Short that only
shows a verse advertises poetry, not Hamdam — every one of the four videos
already on the channel omits the app's actual mechanic. So the Short opens on
the viewer's state, not the poet's name, and closes on the reflection question.
The viewer completes a Hamdam session inside the video.

## Sources of truth — read, never write

- `ealiaaziz/hamdam-website` → `social/verse-queue.json` — 238 verses. The only
  source of Persian verse text. Fetch through the GitHub connector, not
  raw.githubusercontent.com, which caches aggressively and has served stale
  files. If the connector response is too large to return inline, read the blob
  SHA from a directory listing, fetch the raw URL pinned to that commit SHA with
  a cache-busting query, and confirm `git hash-object` matches before trusting a
  byte.
- `social/moods-fa.json` — seven mood lines with their theme lists. Written and
  reviewed by Ealia. Hamdam's own copy, NOT verse text. Read `line` byte-exact.
  Do not regenerate, translate or paraphrase. If the file is absent or any
  `line` is empty, STOP and report.
- `social/hamdam_reel_render.py`, `social/build_reel.py`, `social/hamdam_theme.py`,
  `social/BACKGROUNDS.md`, `social/CTA.md` — existing render machinery.

## Hard rules

1. **Persian is copied, never typed and never generated.** Every Persian
   character on screen or in metadata is a byte-exact copy from
   `verse-queue.json` or `moods-fa.json`. If a string cannot be traced to one of
   those files, it does not ship. Three of the four videos already on the
   channel broke this and one now carries a public correction as a result.
2. **Never use `reflectionFa` or `reflectionEn`.** 42 of 238 entries make an
   unsourced claim about what a poet knew, believed or habitually did (Saadi 16,
   Hafez 13, Khayyam 5, Rumi 5, Parvin 3). Use `questionFa` and `questionEn`
   only — they address the reader, not the poet. This replaces the regex gate
   rather than relying on it.
3. **Poets are named by city and century, never by modern country.** Hafez
   (Shiraz, 14th c.), Rumi (Balkh and Konya, 13th c.), Saadi (Shiraz, 13th c.),
   Khayyam (Nishapur, 11th c.), Parvin Etesami (Tabriz and Tehran, 20th c.).
4. **No wine allegory, no flag, no religious symbol.** Exclude any verse tagged
   `wine`, `intoxication` or `tavern` — 20 entries.
5. **No generic wellness vocabulary** in any field, either language: wellness,
   mindfulness, meditation, self-care, pause-and-breathe, آرامش, مراقبه.
   Persian literature is the category. Hamdam loses the meditation-app fight and
   does not enter it.
6. **Zero letter tracking on Persian, and never italic.** Non-zero tracking
   detaches the cursive joins.
7. **No invented setting or occasion.** Never write that a poem was composed on
   a particular morning, in a particular place, or for a particular person.

## Selection

Pick the mood bucket first, then the verse.

Rotate buckets in the order given by `_rotation` in `moods-fa.json`:
`unsettled → light → missing → slow → others → restless → worn`. One per run,
so consecutive Shorts never repeat a mood. Each bucket's `themes` array defines
its eligible verses. Approximate sizes, wine excluded: unsettled 46, light 33,
missing 27, slow 20, others 19, restless 15, worn 15.

Within the bucket, rank candidates by **recognition** and take the highest
unused. Recognition means: would a Persian speaker who does not read poetry
recognise the first hemistich? Prefer lines that are proverbial in everyday
speech. If two tie, take the poet who has appeared least recently.

Then apply, in order:

- **Rumi tripwire.** If 2 or more of the last 10 posts of any type on any
  channel were Rumi, skip Rumi.
- **No poet twice in a row** on this channel.
- **No verse reused** within 60 published Shorts.
- Log every verse considered and rejected, with the reason.

## The five pages — about 15 seconds

Render 1080×1920 with the existing theme tokens. Palette is the locked
warm-dawn set: Peach `F4C4A0`, Saffron `E8B04B`, Cream `F4EDD8`, Indigo `1B1B3A`
as accent only, never a background, never more than about 8% of a page.

| Page | Hold | Content |
|---|---|---|
| 0 | 2.0s | The `line` for this run's mood, Farsi, alone, large. Nothing else — no poet, no logo, no verse. |
| 1 | 4.5s | `persian`, byte-exact, alone. |
| 2 | 3.5s | `english`, same type size as page 1, poet line by city and century beneath. |
| 3 | 3.5s | `questionFa`, alone, on a plain field. |
| 4 | 1.5s | همدم + the subscribe ask. See CTA.md. |

Total 15.0s. The follow ask also sits in the footer strip on every page — most
viewers never reach the last page.

`questionFa` appears on screen; `questionEn` does not. The two are independent
originals written to a shared intent, not translations of each other, so showing
both invites a bilingual reader to read a mismatch as carelessness. `questionEn`
goes in the first line of the description instead.

Audio: reuse an existing bed from `social/audio/`. Do not generate new music for
a Short. ElevenLabs costs roughly 900 credits per generation and editing a good
take costs the same as a new one.

## Metadata

**Title** — Persian first hemistich, then transliteration, then poet in English.
No `#Shorts`; YouTube detects Shorts by aspect ratio and duration, and the tag
inverts title direction because paragraph direction is set from the first strong
character. Example shape:

`بنی‌آدم اعضای یکدیگرند | Bani Adam Aza-ye Yekdigarand — Saadi`

**Description** — `questionEn` on line one. Then the verse, Persian then
English. Then the queue's `source` field verbatim. Then two lines on Hamdam: it
brings a verse matched to how your day feels, in Persian or English, the user's
choice all the way through; no account, no email, whatever you write stays on
the device. Then the App Store link with `?pt=127843867&ct=youtube_short&mt=8`
so installs are attributable. Then hamdam.com.au, Instagram @hamdam_au,
X @Hamdam_au.

**Tags** — Hamdam, poet in English and Persian, Persian poetry, شعر فارسی,
persian poetry with english translation, plus فال حافظ when the verse is Hafez.

**Fields** — `categoryId` 22, `defaultLanguage` fa, `madeForKids` false.

**Pinned comment** — `questionFa`, alone. No link, nothing else. This is the
invitation to reply and the only reason a viewer has to return.

## Publishing

The YouTube connection is live in Composio as `youtube_mespot-unspar`.

**Upload:** `YOUTUBE_MULTIPART_UPLOAD_VIDEO`, taking `title`, `description`,
`tags`, `categoryId`, `privacyStatus` and a `videoFile` of `{name, mimetype,
s3key}` — the same `s3key` the workbench's `upload_local_file` returns, the
route already proven for Instagram. `YOUTUBE_UPLOAD_VIDEO` is the fallback.

**Then a follow-up PUT.** Neither upload tool nor `YOUTUBE_UPDATE_VIDEO` accepts
`defaultLanguage` or `madeForKids`, and both are required. Set them with
`proxy_execute("PUT", "/videos", "youtube", query_params={"part": "snippet,status"}, ...)`.
Note the base path is `/videos`, NOT `/youtube/v3/videos`, which 404s. A PUT to
`/videos` with `part=snippet` requires `title` and `categoryId` in the body or
it fails; send the full snippet, not a patch.

This path is **untested** — no Short has been uploaded through it. If it fails,
do not improvise. Render the MP4, `upload_local_file` it, and hand Ealia the
file plus the exact title, description, tags and pinned comment to publish from
the app. A hand-off is a success, not a failure.

Two API behaviours already cost time, so do not rediscover them:

- Channel and video writes return HTTP 200 while a subsequent read still serves
  the previous value for up to a minute. Poll before concluding a write failed.
- The channel description limit is 1,000 characters; exceeding it returns a bare
  `INVALID_ARGUMENT` with no mention of length.

## Gate before publishing

- [ ] Every Persian string traced to `verse-queue.json` or `moods-fa.json` and
      byte-compared. Report the comparison, do not assert it.
- [ ] `reflectionFa` and `reflectionEn` appear nowhere in the output.
- [ ] Poet named by city and century.
- [ ] No banned wellness term in any field, either language.
- [ ] No wine-tagged verse.
- [ ] Rumi tripwire and poet rotation both evaluated and reported.
- [ ] Duration 13–17s; frames 1080×1920.
- [ ] Persian tracking zero; no italic on Persian.
- [ ] Title contains no `#Shorts`.
- [ ] View the final MP4's own frames before publishing — the exact bytes that
      ship, not a second local render. Grain is unseeded, so a re-render is not
      byte-identical.

Any unchecked item: do not publish. Report and stop.

## First draft — check this before anything else

Watch the first two seconds. If the mood line does not land before a thumb wants
to move, the format is wrong and nothing downstream matters. Report specifically
whether page 0 reads in one glance at the rendered type size. The seven lines
run 3–5 words; if any needs longer than 2.0s, say so and propose a hold change
rather than editing the Persian.

## Report each run

Verse id, poet, mood bucket, why that verse won on recognition, what was
rejected and why, the five page holds, duration, gate results item by item, the
video URL, and remaining eligible verses in the bucket.

Also report views, likes and comments on the previous three Shorts, and whether
any comment is unanswered. An unanswered comment on this channel once sat for
twenty days. Do not let that happen twice.

## Schedule

Cron `0 20 * * 1,4` — 20:00 UTC Mon/Thu = 07:00 Sydney Tue/Fri under AEDT from
4 October 2026. Under AEST until then this fires at 06:00 Sydney.

Run 1 fired at 05:17 UTC, which matches neither. If the trigger does not read
`0 20 * * 1,4`, report the discrepancy and do not infer anything from run
timestamps until it is resolved.

Two a week, not more, until three consecutive Shorts have published cleanly. The
channel already went dark for twenty days after producing its best asset;
scaling before proving it can be sustained is how that happens again.

## Review, once six Shorts have published

Compare median views against the 31 July baseline of 35 and 14 — the two
non-recognised verses, which is the honest comparison, not the 1,124 outlier.
Report subscribers gained and installs attributed to `ct=youtube_short`.

If median views are under 100 **and** subscribers gained is under 10, the
mood-first format has not earned its slot. Say so plainly and recommend
stopping. Do not defend the format because it was recommended.
