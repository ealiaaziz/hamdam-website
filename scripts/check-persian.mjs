#!/usr/bin/env node
// Persian byte-check (Phase W1.3.6).
//
// Scans source files for the corruption modes that motivate the rule:
//   A. U+FFFD replacement characters (broken re-encoding)
//   B. Invisible bidi controls (LRM/RLM, LRE/RLE/LRO/RLO/PDF, isolates)
//   C. Foreign letters spliced inside a Persian word (e.g. a Latin "d"
//      between Persian letters)
//   D. Classic UTF-8-read-as-Latin-1 mojibake bigrams (e.g. U+00D8 U+00A7)
//
// A "word" is a maximal run of letters/digits/ZWNJ/ZWJ. If a word contains
// any Persian-block character, every character in it must come from:
//   U+0600-U+06FF Arabic, U+0750-U+077F Arabic Supplement,
//   U+FB50-U+FDFF / U+FE70-U+FEFF Arabic Presentation Forms,
//   U+200C ZWNJ, U+200D ZWJ.
// Pure-ASCII words (iCloud, class names) are ignored, so source syntax never
// false-positives. Regexes are assembled from escaped strings on purpose:
// this file must never itself contain non-ASCII or invisible characters.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOTS = ['src', 'public/scripts'];
const EXTENSIONS = /\.(astro|ts|js|mjs|css|html|json|md)$/;

const PERSIAN_BLOCKS = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
const JOINERS = '\\u200C\\u200D';

const WORD = new RegExp('[\\p{L}\\p{N}' + JOINERS + ']+', 'gu');
const PERSIAN_CHAR = new RegExp('[' + PERSIAN_BLOCKS + ']', 'u');
const ALLOWED_IN_PERSIAN_WORD = new RegExp('[' + PERSIAN_BLOCKS + JOINERS + ']', 'u');
const REPLACEMENT = new RegExp('\\uFFFD');
const BIDI_CONTROL = new RegExp('[\\u200E\\u200F\\u202A-\\u202E\\u2066-\\u2069]');
const MOJIBAKE = new RegExp('[\\u00C2\\u00C3\\u00D0\\u00D8\\u00D9\\u00DB][\\u0080-\\u00BF]');

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      yield* walk(full);
    } else if (EXTENSIONS.test(entry)) {
      yield full;
    }
  }
}

const failures = [];
const codepoints = (s) =>
  [...s].map((ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'));

for (const root of ROOTS) {
  for (const file of walk(root)) {
    const rel = relative(process.cwd(), file);
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        // Escape sequences in string literals ("\n") would otherwise glue an
        // ASCII letter onto an adjacent Persian word.
        const text = line.replace(/\\[ntr\\]/g, ' ');
        if (REPLACEMENT.test(text)) {
          failures.push(`${rel}:${i + 1}  U+FFFD replacement character`);
        }
        if (BIDI_CONTROL.test(text)) {
          const bad = [...text].filter((ch) => BIDI_CONTROL.test(ch));
          failures.push(`${rel}:${i + 1}  bidi control ${codepoints(bad.join('')).join(' ')}`);
        }
        if (MOJIBAKE.test(text)) {
          failures.push(`${rel}:${i + 1}  Latin-1 mojibake pattern "${text.match(MOJIBAKE)[0]}"`);
        }
        for (const word of text.match(WORD) ?? []) {
          if (!PERSIAN_CHAR.test(word)) continue;
          const bad = [...word].filter((ch) => !ALLOWED_IN_PERSIAN_WORD.test(ch));
          if (bad.length > 0) {
            failures.push(
              `${rel}:${i + 1}  word "${word}" mixes Persian with ${codepoints(bad.join('')).join(' ')}`
            );
          }
        }
      });
  }
}

if (failures.length > 0) {
  console.error('Persian byte-check FAILED:\n');
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\n${failures.length} violation(s). Commit blocked.`);
  process.exit(1);
}

console.log('Persian byte-check passed: all Persian words within the allowed Unicode set.');
