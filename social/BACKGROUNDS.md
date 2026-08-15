# Reel backgrounds

Every page of a reel sits on a background keyed to the concept's `mood` - not
to the day of the week. A weekday is not a mood, and pairing a bright image
with a poem about mortality is the failure this design exists to prevent.

## The four moods

| Mood | Reads as | Concepts |
| --- | --- | --- |
| `happy` | Morning well under way. Green and gold. | parvin-008 |
| `grave` | Before the sun clears. Cold, low, mostly shade. | khayyam-036, khayyam-007, parvin-014 |
| `love`  | Late warm light. Rose into deep amber. | rumi-050 |
| `wry`   | Plain daylight. Even, nothing dramatic. | parvin-023, hafez-004 |

All four share one structure: light gathering about a third of the way down,
the eight-point khatam star from the secondary logo near the top, and the
frame falling quiet below 60% where the verse sits. One family, four
temperatures.

## How the task uses them

Run the generator once per run, then point the renderer at its output:

```bash
python3 make_backgrounds.py /tmp/bg
export HAMDAM_BG_DIR=/tmp/bg
```

The generator is deterministic - identical output every run - so a palette
change is a commit here rather than a re-upload anywhere. It writes
`bg-happy.jpg`, `bg-grave.jpg`, `bg-love.jpg` and `bg-wry.jpg` at 1620x2880.

The photo is used twice per page: blurred and dimmed as the full-bleed
exterior, and sharp inside the framed print - the same structure as the ney
reel. The text-darkening gradient is applied after, so text stays legible.

**Failure is impossible by design.** No `HAMDAM_BG_DIR`, no file for that
mood, or an unreadable file - the renderer falls back to its own procedural
sunrise scene and the run completes.

## Replacing these with real photographs

Drop `bg-<mood>.jpg` into the same folder after running the generator and it
overrides that mood. Real photographs would be better than anything generated
here; the ney reel's advantage over every later post was that it used one.

- Portrait, at least 1080x1920. Landscape gets centre-cropped hard.
- Quiet in the lower two thirds. All text sits there.
- Own it or license it. Your own photographs make the account unfakeable.
- **No AI-generated landmarks.** Generated "Persepolis" gets the capitals and
  reliefs wrong, and this audience knows the real thing. A fabricated monument
  is the visual version of a fabricated verse.
- Subject need not be Iran. Light, water, plaster, a courtyard, a window -
  depth and warmth matter more than location.

## Why there is no scenery

Drawn cypresses, watercourses, gardens and ruins were all attempted and all
failed. Polygons drawn in code have none of the texture, imperfection or depth
that makes a scene read as real; they come out as floating shapes. Abstract
light is the one thing this method renders convincingly, so that is all these
backgrounds contain.
