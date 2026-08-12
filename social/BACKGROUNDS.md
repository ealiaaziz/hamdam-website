# Reel backgrounds

The renderer can composite a real photograph behind every page of a reel.
It is keyed to the concept's `mood`, not to the day of the week - a weekday
is not a mood, and pairing a bright image with a poem about mortality is the
failure this design exists to prevent.

## How it works

Set `HAMDAM_BG_DIR` to a folder containing:

| File | Used by concepts with |
| --- | --- |
| `bg-grave.jpg` | mood `grave` - khayyam-036, khayyam-007, parvin-014 |
| `bg-happy.jpg` | mood `happy` - parvin-008 |
| `bg-wry.jpg`   | mood `wry` - parvin-023, hafez-004 |
| `bg-love.jpg`  | mood `love` - rumi-050 |

`.jpeg` and `.png` also work. The photo is used twice: blurred and dimmed
as the full-bleed exterior, and sharp inside the framed print - the same
structure as the ney reel, which is the best-performing post on the account.
The text-darkening gradient is applied after the photo, so text stays legible
whatever the image brightness.

**Failure is impossible by design.** No `HAMDAM_BG_DIR`, no file for that
mood, or an unreadable file - the renderer silently falls back to the
procedural sunrise scene and the run completes.

## Sourcing rules

- Portrait or square, at least 1080x1920, ideally larger. Landscape gets
  centre-cropped hard and usually loses its subject.
- Quiet in the lower two thirds. All text sits there. Busy foregrounds fight it.
- **Own it or license it.** Your own photographs are best - they make the
  account unfakeable. Otherwise use genuinely free-for-commercial-use stock
  and record the source.
- **No AI-generated landmarks.** Generated "Persepolis" images get the
  capitals and reliefs wrong, and this audience knows the real thing. A
  fabricated monument is the visual version of a fabricated verse.
- Subject does not need to be Iran. Light, water, plaster, a courtyard, a
  window - depth and warmth matter more than location.

## What good looks like per mood

- **grave** - low light, stone, dusk, still water. Restrained, not gloomy.
- **happy** - morning light, open sky, green. Bright without being loud.
- **wry** - ordinary domestic light. A table, a doorway, cloth.
- **love** - warm interior light, soft focus, dusk.
