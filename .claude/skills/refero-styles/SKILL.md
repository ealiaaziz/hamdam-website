---
name: refero-styles
description: Pull a real product's design system off styles.refero.design as a structured DESIGN.md brief — palette, surfaces, type scale, spacing, components, dos and don'ts. Use when a visual direction needs a concrete reference ("make it feel like Linear", "editorial like Monocle", "find me a warm-paper direction"), or when browsing aesthetics by collection. Reference input only — never the authority on what this project should look like.
---

# Refero Styles

[Refero Styles](https://styles.refero.design) publishes ~1,300 real product
websites as machine-readable design systems: named colours with the role each
one plays, surface levels, typefaces with weights and tracking, a type scale,
spacing and radii, component specs, and an explicit do/don't list. It is a
reference library, not a component library — nothing here is code you install.

This skill fetches one of those systems and renders it as a DESIGN.md you can
read and argue with.

## When to reach for it

- Someone names a look — a brand, a site, a vibe ("midnight precision
  instrument", "warm paper notebook") — and you want the actual numbers behind
  it rather than a guess.
- You are choosing a direction and want to compare a few real systems.
- You are stuck on one decision — how tight should 64px headings track, what
  does a system with one accent colour do with its second — and want to see how
  a shipped product answered it.

Do **not** reach for it to decide what this project should look like. It
supplies evidence, never the brief.

## Workflow

1. **Browse** a collection or the front page and pick candidates by their
   north-star line, not their screenshot.
2. **Fetch** one style. Read the whole DESIGN.md before quoting a hex from it.
3. **Translate**, do not transplant. Take the *reasoning* — how many accents,
   how elevation is expressed, how the type scale steps — and re-derive the
   values in this project's own palette and voice. See "What to take" below.
4. **Say where it came from.** If a decision traces to a fetched style, name
   the style in your write-up so the next person can see the source.

## Commands

```
scripts/refero_style.py browse [collection]     # list styles on a listing page
scripts/refero_style.py fetch <uuid-or-url>     # render one as DESIGN.md on stdout
```

`browse` with no argument reads the front page. Otherwise pass a collection
slug or a full URL. The published collections are:

`clean-saas` · `editorial-websites` · `dark-mode-websites` · `fintech-websites`
· `devtools-websites` · `ai-startup-websites` · `ecommerce-websites` ·
`minimal-websites` · `agency-websites` · `productivity-apps`

`fetch` takes either the style URL or just its uuid. Redirect it to a file if
you want to keep it:

```
scripts/refero_style.py fetch 90ce5883-bb24-4466-93f7-801cd617b0d1 > /tmp/linear-DESIGN.md
```

Fetched files are scratch. Do not commit them into this repo — they are someone
else's design documentation, they go stale, and a copy in the tree will get
mistaken for a decision this project has made.

## What to take, and what to leave

**Take:** structural decisions. The count of accent colours and what each one is
allowed to do. Whether elevation comes from shadows or from hairline borders and
surface steps. How many steps the type scale has and where the jumps are.
Optical tracking at display sizes. Which component carries the single filled
CTA. The don't-list is usually the most useful section on the page — it records
constraints the team had to learn.

**Leave:** the identity. Do not lift a brand's palette, its typeface pairing, or
its component trade dress into a different product and call it a direction. Two
practical reasons beyond the obvious one: a licensed typeface is a licence this
project does not hold, and a palette carries meaning from the product it was
built for, which is why a devtools near-black reads as cold the moment you put
warm content in it.

If a fetched style would replace this project's established visual identity
rather than inform one decision inside it, that is a product conversation with
the owner, not a change to make.

## In this repo

`hamdam-web-director` is the authority for anything on hamdam.com.au and it
already fixes the warm-dawn palette, the accent family and the bilingual rules.
This skill sits at the bottom of that skill's source priority, below
`frontend-design`: it is evidence to bring to a decision, and it loses every
conflict. In particular, a fetched palette never overrides the Hamdam accents,
and a fetched typeface never overrides Vazirmatn on Farsi pages.

One mechanical trap. Refero's prose is written in em dashes, and hard rule 3
bans em and en dashes anywhere under `src/`, `public/` or `support/` —
`node scripts/check-dashes.mjs` fails the commit. So never paste a fetched
description straight into a comment or a page. Restructure the sentence; a
hyphen is not the fix.

## Fetch politely

The site's `robots.txt` disallows AI crawler user-agents (`ClaudeBot`,
`GPTBot`, and others) across the whole site, while allowing ordinary agents.
Read that as: they publish this for a human working with an agent, and they do
not want it harvested.

So: **fetch pages a person has asked for, one at a time.** One `browse` and one
or two `fetch` calls per task is the shape of normal use. Do not walk
`/sitemaps/styles.xml`, do not loop `fetch` over a list, and do not build a
local mirror. If you need more than a handful of styles, that is a signal to ask
the user which direction they actually want, not to widen the crawl.

`/api/`, `/admin/`, `/extract/` and `/playground/` are disallowed for everyone —
stay off them.

## How it works, and what breaks

Style pages are a Next.js app-router document. The design system is not in the
rendered markup — it arrives as a `"designSystem": {...}` object inside the RSC
flight payload in `self.__next_f.push(...)`. The script reassembles those chunks
and parses that object, so the output is the site's own structured data rather
than scraped prose.

That coupling is the fragile part. If Refero changes its rendering, `fetch`
exits with a message saying no payload was found — it will not silently return
half a system. When that happens, open the page in a browser and use its own
"Copy DESIGN.md" button instead of trying to repair the parser mid-task.

One known gap: a few pages stream a section (often "Agent Prompt Guide")
separately, so its content is a `$`-reference the payload does not resolve. The
script drops those and prints a count at the end of the file, rather than
emitting a placeholder.

Python 3 standard library only. No dependencies, no API key, no account.
