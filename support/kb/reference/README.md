# App reference

Background the assistant may answer *from*, as distinct from `../*.md`, which
are fixes it may *offer*. An article says "here is what to try". A reference
file says "here is how Hamdam actually behaves", which is what most questions
about an app turn out to need.

Every fact here comes from a reviewed source in this repository, cited in the
file's `source:` field. The reason for that rule is the state this directory
was created to fix: the starter knowledge base confidently described a sign-in
screen the app does not have, and told people to check their internet
connection for verses that are bundled and work offline. Both were offered to
real requesters. An assistant grounded in wrong facts is worse than one
grounded in nothing, because it is wrong with a straight face.

If you cannot cite it, do not write it. "The team will need to check that" is
a legitimate thing for the desk to say.

Sources worth knowing:

* `src/pages/privacy.astro` -- what the app reads, writes, stores and sends.
  Section 5 is the exhaustive list of every host the app contacts.
* `src/pages/terms.astro` -- plans, trial, Family Sharing, cancellation, and
  the health and crisis boundaries.
* `docs/website-redesign/31-product-truth-verification.md` -- claims already
  checked against evidence, including the ones marked "verification
  required", which are the ones not to state as fact.

Regenerate after editing: `node scripts/generate-kb.mjs`
