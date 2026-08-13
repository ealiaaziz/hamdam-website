# Brand term recovery, 13 August 2026

Companion note to the `seo-brand-entity` branch. The code change on that branch is small and the decisions attached to it are not, so the decisions are written down here rather than left in a pull request body where they stop being findable once the pull request closes.

## The problem, stated accurately

Over the 3 July to 11 August window, the query `hamdam` returned **13 impressions at average position 22.5, with zero clicks** (Google Search Console, `sc-domain:hamdam.com.au`).

This is not a technical fault, and it is worth being blunt about that before anyone goes looking for one. The site already has:

- canonical URLs
- hreflang `en`, `fa` and `x-default`
- a full `SoftwareApplication` and `Organization` JSON-LD graph
- HSTS with `includeSubDomains; preload`
- a clean, enforcing CSP
- `http` to `https` and `www` redirects, both returning 301

There is nothing here to fix. "Hamdam" is a common Persian word and a widely used brand name, and the domain is six weeks old with no external links. That is the whole explanation. A six week old site competing on a generic term against established entities sits at position 22 because that is where a site with no accumulated authority sits.

**Nothing in this branch will fix that quickly.** Search authority compounds over months. The reason to do it now is Yalda in December: whatever is going to have accumulated by then has to start accumulating now.

## What shipped on this branch

`sameAs` on the Organization node in `src/lib/schema.js`:

    https://www.instagram.com/hamdam_au/
    https://x.com/Hamdam_au
    https://apps.apple.com/au/app/hamdam-daily-persian-poetry/id6784461990

Verified present in the built output at `dist/index.html`, and pinned by four cases in `src/lib/__tests__/schema.test.js`.

The test that used to assert `not.toHaveProperty('sameAs')` has been inverted rather than deleted. Its job was never "have no sameAs"; it was "claim no profile nobody has confirmed", and it still does that: the array is frozen, the host of every entry is checked, and a fourth entry appearing without a host check fails.

**No LinkedIn URL.** Whether a Hamdam company page exists is genuinely unresolved: the connector returned 403 on organisation ACLs, and a 403 does not distinguish "there is no page" from "you cannot see the page". Adding a guessed URL to `sameAs` is exactly the failure the original no-sameAs comment existed to prevent. See the measurement gap note; this is one of its secondary items.

## Decision for Ealia: the homepage H1

**Not decided here. This is a copy call and copy is Ealia's.** Both options are presented; neither has been applied.

The current markup, in `src/pages/index.astro` lines 96 and 97, passed to `HeroCinematic`:

    title="A verse and a reflection, chosen for how your day feels."
    subhead="Hamdam reflects your heart and your sky."

The brand name does not appear in the H1. It appears in the `<title>` tag and in the subhead. This is defensible as copy and weak as entity signalling.

### Option A: keep the H1, put the brand in the subheading

**Verified, and the answer changes the recommendation: this is a no-op, twice over.**

The task spec asked to check how the subheading is marked up before proposing this. Two things came back.

1. The subhead already contains the brand. "Hamdam reflects your heart and your sky" starts with the word. There is nothing to add.
2. The subhead is not a heading. `src/components/HeroCinematic.astro` line 118 renders it as `<p class="hero__sub text-balance">`, not `<h2>`. So even if the brand were being added rather than already sitting there, it would be added to body text, which carries very little of the entity weight that motivated the suggestion in the first place.

Option A is therefore not a smaller version of Option B. It is nothing at all. It is written up rather than dropped because "we considered putting it in the subhead" should not come back around in two months as a fresh idea.

### Option B: lead with the name

    Hamdam. A verse and a reflection, chosen for how your day feels.

This puts the brand in the H1, which is the actual signal. The cost is real and worth stating plainly: the current H1 was a deliberate choice, approved by Ealia on 2026-07-25, and the comment above it in `index.astro` records the reasoning. The approved sentence was demoted to the subhead specifically so that **the first thing a visitor reads is the function, not the name**. Option B partially undoes that. It puts a proper noun a first-time visitor does not recognise ahead of the sentence that tells them what the thing does.

So this is a trade between a person landing on the page and a machine building an entity graph, and it is not obvious which should win. That is why it is Ealia's call and not a change on this branch.

If Option B is chosen, it is a one line edit to `title` on line 96 of `src/pages/index.astro`, plus the Farsi homepage, which needs Ealia's Persian.

## Poet pages: the long term content bet, not yet

`/poets/hafez/` drew **15 impressions at average position 54.8** over the same window. That is the highest impression count of any page on the site and the worst average position on the site, and both facts have the same cause: it is competing against every Hafez resource on the internet, and it is a six week old page.

**Do not invest here yet.** Recorded as the long term content bet, to be revisited once the brand term is secured. Ranking for `hamdam` is a fight against ambiguity; ranking for `hafez` is a fight against Britannica, Wikipedia, Poetry Foundation, and every Persian literature department with a web page. The first is winnable with time and entity signals. The second needs content nobody else has, which is a real project and not an SEO tweak.

## Out of scope, deliberately

Backlink acquisition, content expansion, and any paid work. Those need Ealia's decision, not code.
