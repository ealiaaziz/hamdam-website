# Tenant knowledge base templates

Starting material for a desk that supports somebody else's staff, as opposed
to Hamdam's own customers. Nothing in this directory is read by
`scripts/generate-kb.mjs`, which globs `../kb/` only. These files are copied
into a tenant deployment's own `kb/`, not bundled into this one. Putting them
in `kb/` would have the Hamdam assistant offering a printer fix to somebody
asking about a verse.

## The two halves, and why only one of them can be written in advance

`general-it/` holds **articles**: "here is what to try". They carry
`symptoms:` and `clarifying:` front matter, no `source:` field, and the
generator does not ask for one. The steps in them are the same in any small
business running Microsoft 365, so they are true before anyone has seen the
customer's network, and they are what makes a new desk useful on its first
day.

`reference/` holds **background**: "here is how this environment actually
behaves". The generator refuses a reference file without a `source:`, and that
refusal is the whole point. Which printer, which VPN, whether self-service
password reset is switched on, what the line-of-business app is called: none
of it can be guessed, and a confident guess is worse than silence because it
is wrong in a tone that sounds researched.

So this directory ships the articles and ships `INTAKE.md` instead of the
reference files. Tim answers the intake, the answers become the reference
files, and each one cites the completed intake document as its source. That is
a real citation: a dated document a named person signed off, which is the same
standard the Hamdam reference files hold themselves to.

## Instantiating a tenant

1. Copy `general-it/*.md` into the tenant deployment's `kb/`.
2. Send `INTAKE.md` to the customer's contact. Do not start writing reference
   files from a phone call; the point of the document is that somebody can be
   pointed back at it later.
3. Turn each answered section into one file in the tenant's `kb/reference/`,
   with `source: INTAKE.md (completed <date>, confirmed by <name>)`.
4. Run `node scripts/generate-kb.mjs` in that deployment and deploy.
5. Leave the sections nobody answered out. An absent reference file makes the
   assistant say it does not know and hand over, which is correct. A
   half-remembered one makes it answer wrongly.

## Keeping them honest afterwards

The articles here are generic on purpose and stay generic. When a fix turns
out to be specific to one customer, that is a reference file about that
customer, not an edit to the shared article. Otherwise every tenant slowly
inherits every other tenant's environment, which is the cross-contamination
this directory structure exists to prevent.
