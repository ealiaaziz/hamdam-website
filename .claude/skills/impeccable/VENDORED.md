# Vendored skill — do not hand-edit

This directory is a verbatim copy of the `impeccable` design skill, vendored into
this repo rather than installed as a plugin so the skill travels with the branch
and its version is pinned in git.

- **Upstream:** https://github.com/pbakaus/impeccable
- **Author:** Paul Bakaus
- **Licence:** Apache 2.0 (`LICENSE` in this directory)
- **Skill version:** 4.1.1
- **Vendored from commit:** `c88d815e05186bf93faeaef36d7d218bff893a34` (2026-08-14)
- **Source path upstream:** `.claude/skills/impeccable/` (the Claude Code build —
  upstream also generates `.agent/`, `.cursor/` and other provider variants that
  differ only in script paths and frontmatter)

To update: re-clone upstream and re-copy that directory, then re-apply nothing —
there are no local modifications, and there should not be. Local changes belong in
`hamdam-web-director`, which outranks this skill.

## What was deliberately not installed

Upstream ships an optional **design detector hook** (`/impeccable hooks on`) that
runs on every edit to `.astro`, `.css`, `.ts` and friends, plus a deep pass on the
`Stop` event. It is **off**, and there is no `.impeccable/config.json`.

Two reasons. This repo already runs a `PreToolUse` hook that guards deploys, and a
`check:persian` pre-commit hook; adding a per-edit scanner on top changes the cost
and latency of ordinary edits for everyone on the branch. And the detector's taste
rules overlap with `hamdam-web-director`, which is the authority here — a scanner
nudging toward generic "good design" defaults on every save is exactly the conflict
the precedence rule below exists to prevent.

If you want it, `/impeccable hooks on` writes to the gitignored
`.claude/settings.local.json`, so it stays machine-local. Turn it on for yourself,
not for the branch.

## Repo constraints impeccable does not know about

These are enforced by `hamdam-web-director` and by CI, and they override anything
this skill suggests:

1. **CSP is enforcing.** `public/_headers` forbids inline styles and scripts. Keep
   `inlineStylesheets: 'never'` and `assetsInlineLimit: 0` in `astro.config`. Several
   impeccable playbooks reach for inline style attributes; those will ship a page
   that renders unstyled in production. (Upstream does carry a `detect-csp.mjs`, but
   do not rely on it catching this for you.)
2. **Never hand-type or hand-edit Persian.** `src/data/verses.ts` and
   `src/data/siteCopy.ts` are generated and byte-exact against the iOS verse bank.
   `npm run check:persian` will fail the commit.
3. **No new animation dependencies without a decision.** The scroll-driven sunrise is
   185 lines of pure timeline logic in `src/lib/cinematic.js`, with a static
   reduced-motion path. `/impeccable animate` may propose a motion library; adding one
   is a bundle, CSP and accessibility decision, not a styling one.
4. **Pushing deploys the site.** A Cloudflare Workers Build is attached to this
   repository and publishes on push, from any branch. Do not treat a push as a
   staging step.
