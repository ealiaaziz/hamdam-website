#!/usr/bin/env node
// Fails on em dashes and en dashes anywhere in the site's content files.
//
// Project hard rule 3 bans both. The rule existed before this check did, and
// the site broke it in 36 places across both languages, because nothing was
// enforcing it. Hence this file.
//
// Both the literal characters and the HTML entity forms are caught: writing
// `&mdash;` produces exactly the same glyph as U+2014 and is the more common
// way it sneaks back in on an Astro page.
//
// The fix is never a hyphen. A hyphen is a different punctuation mark with a
// different job, and swapping one for the other trades a style violation for a
// grammar error. Restructure the sentence: a comma, a colon, a semicolon, or
// two sentences.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// `support` added 2026-08-01 alongside the support desk landing in this repo.
// Without it, hard rule 3 was enforced by directory placement rather than by
// the rule: the desk ships user-facing copy (ack emails, portal pages) in
// support/src, and four em dashes went in there unnoticed because this walk
// never reached them.
//
// `computer` added 2026-08-24 for the same reason: it ships a README and a
// worker whose responses are read by a person, and a directory that is not
// walked is a rule enforced by nobody.
const ROOTS = ['src', 'public', 'support', 'computer'];
const EXTENSIONS = /\.(astro|ts|js|mjs|css|html|json|md)$/;

// src/data/verses.ts is extracted byte-exact from the iOS app's bundled verse
// bank and is regenerated, not hand-maintained. Four English translations in it
// carry an em dash. Editing them here would be silently reverted by the next
// extraction, so the fix belongs upstream in Hamdam/Content/Verses/*.json. The
// exclusion is deliberate and should be removed once that lands.
// TODO(upstream): drop this exclusion after the iOS verse bank is corrected.
const EXCLUDED = new Set(['src/data/verses.ts']);

const DASHES = [
  { pattern: /—/g, name: 'U+2014 em dash' },
  { pattern: /–/g, name: 'U+2013 en dash' },
  { pattern: /&mdash;/g, name: '&mdash;' },
  { pattern: /&ndash;/g, name: '&ndash;' },
  { pattern: /&#8212;/g, name: '&#8212;' },
  { pattern: /&#8211;/g, name: '&#8211;' },
];

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      // Build output, not writing. `wrangler deploy --dry-run --outdir=dist`
      // bundles the Anthropic SDK, whose vendored prose is full of em dashes
      // and none of which anyone reads.
      // `.wrangler` is wrangler's local dev state: generated JSON that no
      // person writes or reads, present only on a machine that has run
      // `wrangler dev`, and gitignored. Walking it makes this check fail on a
      // developer's machine and pass in CI, which is the worst arrangement
      // available.
      if (entry === 'node_modules' || entry === 'dist' || entry === '.wrangler') continue;
      yield* walk(full);
    } else if (EXTENSIONS.test(entry)) {
      yield full;
    }
  }
}

const failures = [];

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative(process.cwd(), file);
    if (EXCLUDED.has(rel)) continue;
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        for (const { pattern, name } of DASHES) {
          pattern.lastIndex = 0;
          if (pattern.test(line)) {
            failures.push(`${rel}:${i + 1}  ${name}`);
          }
        }
      });
  }
}

if (failures.length > 0) {
  console.error(`\nDash check failed: ${failures.length} occurrence(s).\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error('\nRestructure the sentence. Do not substitute a hyphen.\n');
  process.exit(1);
}

console.log('Dash check passed: no em dashes or en dashes in content files.');
