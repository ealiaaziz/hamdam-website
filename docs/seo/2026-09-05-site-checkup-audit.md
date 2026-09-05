# SEO Site Checkup findings, audited 2026-09-05

Seven failures were reported against `hamdam.com.au` by seositecheckup.com.
Each was checked against the site itself before anything was changed. Two
were real, one is a deliberate absence, and four were false positives. The
numbers below are measured, not quoted from the scanner.

Method: the built site served from `dist/` on localhost and driven with
Chromium through Playwright, which is what makes a claim about a *rendered*
box possible at all. A scanner reports what it infers from markup; several
of these findings are about what the browser actually does with that markup,
and those two answers differ here.

## Fixed

### Responsive images

Real, and the largest single thing on the list. The homepage shipped **zero
`srcset` attributes**: every image was served at one size to every visitor.
Measured image payload before and after, same pages, same viewports:

English homepage:

| viewport | before | after | change |
| --- | --- | --- | --- |
| 390px phone, DPR 2 | 560.0 KB | 329.3 KB | -41% |
| 390px phone, DPR 3 | 560.0 KB | 490.8 KB | -12% |
| 1440px desktop, DPR 2 | 758.8 KB | 469.9 KB | -38% |

Farsi homepage:

| viewport | before | after | change |
| --- | --- | --- | --- |
| 390px phone, DPR 2 | 490.7 KB | 296.9 KB | -39% |
| 390px phone, DPR 3 | 490.7 KB | 439.7 KB | -10% |
| 1440px desktop, DPR 2 | 689.4 KB | 437.5 KB | -37% |

A note on how these were measured, because the first version of this table
had a wrong number in it. The desktop row first read 403.6 KB and -47%. That
figure came from a run in which 21 images had loaded, against a baseline run
in which 27 had: a page-height jump to the bottom skips sections on the way
past, so which lazy images have entered the viewport varies between runs and
the two totals were not counting the same thing. Every figure above now comes
from the same script, which steps down the page in viewport-sized increments
and waits for the network to settle, and every before/after pair loaded the
same set. A percentage is only worth quoting when both of its numbers have
the same scope.

The DPR 3 row is the honest one to read carefully. The fixed sizes that were
shipped were roughly right for a top-end phone and wrong for everyone else,
so a DPR 3 phone was the one visitor already being served about the right
number of pixels. Some individual files got *larger* there, because the old
single size was under-serving them: `07-garden-en` went from 43.4 KB to
56.1 KB because a DPR 3 phone genuinely wants 789px of it and was being
handed 630. Serving the right size is the goal; serving fewer bytes is what
that usually looks like, and here it does not look like that everywhere.

Two images were missed in the first pass and covered in a follow-up: the
desktop foreground blossom plate, 1600px served into a box that reaches
420px, and the Farsi garden panel, 840px into a box that reaches 460px. Both
were in the measured oversize list from the start; neither got a sizes value
with the rest.

Three raster assets are deliberately left without a srcset, and the reason is
the same for all three: one file is shared across positions of different
sizes, and the file is already correct for the largest of them. The device
frame is 600px into a box reaching 298px, which is exactly right at DPR 2.
The three ceremony petals are 160px across ten fall positions whose largest
box is 53px, which is right at DPR 3, and each file is under 3.5 KB. The
per-position oversize factors in the raw measurement are real per position
and misleading per asset.

Every `sizes` value came from measuring the CSS box the image is painted
into, across eight viewport widths from 360 to 1920, and taking the widest.
None of them was guessed. The `width` and `height` attributes are unchanged,
so the aspect-ratio box the browser reserves is identical and there is no
new layout shift: full-page screenshots before and after are the same height
to the pixel at 390 and 1440, in both locales.

### The hero horizon plate, downloaded on phones and painted on none of them

Found while measuring the above, not on the scanner's list. The desktop and
mobile horizon plates were two `<img>` elements swapped by a `display` rule
at 768px, and both carried `loading="eager" fetchpriority="high"` because
whichever one shows is the LCP element. **Eager beats `display: none`**: a
phone downloaded the 2880px desktop plate, 25 KB, and painted none of it.

`display: none` was enough to keep the blossom plate off phones only because
that one is lazy. The fix is a `<picture>` with a media-scoped `<source>`,
which is the one construct where the browser rules a candidate out before
requesting it. The swap therefore moves out of CSS and into the markup, and
the `--desktop`/`--mobile` rules are gone.

### Favicon

Real, though not in the way the scanner phrased it. `public/favicon.ico` has
existed and has always been served at the root; nothing in the HTML pointed
at it, so anything that reads `<link>` tags rather than probing `/favicon.ico`
concluded there was no favicon. `/apple-touch-icon.png` genuinely did not
exist and 404'd for every iOS home-screen save.

Both are now declared in `BaseLayout.astro`, and `scripts/generate-og.mjs`
generates the 180x180 touch icon from the same app-icon source as the
manifest icons, flattened onto the manifest background because iOS
composites a transparent touch icon onto black.

## Not a defect

### Google Analytics

There is no Google Analytics script because this site does not carry one.
That is the product's position, stated on its own privacy page, and the
enforcing CSP has no `script-src` allowance for a third-party tag. Adding
one to satisfy a checklist would contradict a claim the app makes to its
users. Search Console already provides the search data; App Store Connect
provides the rest.

## False positives

### "Image alt test: img tags with empty or missing alt"

Measured on the built homepage: **41 `<img>` tags, 0 with no `alt`
attribute.** 30 carry `alt=""`, which is the correct and deliberate marking
for decorative art, and 11 carry descriptive text. The six app screenshots
that do carry meaning are composites, screenshot plus device frame, and are
named once on the wrapper with `role="img"` and a bilingual `aria-label`
rather than twice on the two images inside it. That is the correct pattern
and a screen reader announces it correctly; the scanner reads `alt` on the
`<img>` and stops there.

### "Image aspect ratio test: display dimensions do not match natural ratio"

Measured across every image on the page: the largest ratio skew on any
element with `object-fit: fill` is **0.29%**, on the App Store badge SVG,
which is sub-pixel rounding. Everything else uses `object-fit: cover` or
`contain`, where the box ratio differing from the image ratio is the entire
point of the property and produces a crop, not a distortion. No image on
this site is stretched.

### "To implement responsive design, use CSS media queries"

The shipped stylesheets contain **50 media queries**: 15 in
`BaseLayout.css`, 34 in `dawn-section.css`, 1 in `SectionDivider.css`.

### "Eliminate render-blocking resources"

Three stylesheets in the head, and they stay. The CSP in `public/_headers`
is enforcing with no `unsafe-inline` on `style-src`, which is why
`inlineStylesheets: 'never'` is set in the Astro config. Inlining critical
CSS is exactly the technique this site cannot use. The build emits no inline
`<style>` block and no inline `style=` attribute, verified, and that is a
deliberate trade of a scanner point for a real control.
