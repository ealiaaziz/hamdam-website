// Generates src/data/v2Release.ts from the sibling hamdam-ios repository.
//
// WHY A SCRIPT AND NOT A HAND WRITTEN PAGE. This repository has one rule that
// cannot be bent: no Persian is authored, translated or retyped here. The 2.0
// notes are bilingual, and the Farsi half is written in hamdam-ios, where
// original Farsi copy IS permitted, and read from there byte for byte. Nothing
// below composes a Persian string; it only moves one.
//
// Source: hamdam-ios `docs/app-store/v2-release-notes.md`, section 2, which is
// the website half of that file. Section 1 is the App Store Connect field and
// is deliberately NOT read here: the store field is short and this page is not.
//
// Usage:
//
//   node scripts/extract-v2-notes.mjs [--ios-repo ../hamdam-ios] [--write]
//
// Without --write it prints the file to stdout so a diff can be read first.
//
// 2.0 IS NOT RELEASED. Nothing here writes a version into the site's
// softwareVersion, and the page says "coming" rather than "out". Apple still
// answers 1.4.2 and `npm run check:release` compares the two, so a claim of 2.0
// anywhere in the structured data would break that gate, correctly.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const iosRepo = valueOf('--ios-repo') ?? '../hamdam-ios';
const write = args.includes('--write');
const SOURCE = 'docs/app-store/v2-release-notes.md';

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

/** Everything between one `### heading` and the next `###` or `---`. */
export function section(markdown, heading) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => l.trim() === `### ${heading}`);
  if (start === -1) throw new Error(`section not found: ${heading}`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^###\s/.test(l) || l.trim() === '---');
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

/** `**EN:** text` / `**FA:** text` out of a short block. */
export function pair(block) {
  const grab = (tag) => {
    const m = block.match(new RegExp(`\\*\\*${tag}:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\s*\\n|\\n\\*\\*|$)`));
    if (!m) throw new Error(`no ${tag} half in block`);
    return m[1].replace(/\s*\n\s*/g, ' ').trim();
  };
  return { en: grab('EN'), fa: grab('FA') };
}

/**
 * The major changes: a bolded numbered English title, a `**FA title:**` line,
 * then an `EN:` paragraph and an `FA:` paragraph.
 */
export function majors(block) {
  const chunks = block.split(/\n(?=\*\*\d+\.\s)/).filter((c) => /^\*\*\d+\./.test(c.trim()));
  return chunks.map((chunk) => {
    const titleEn = chunk.match(/^\*\*\d+\.\s*([^*]+?)\*\*/);
    const titleFa = chunk.match(/\*\*FA title:\*\*\s*(.+)/);
    const bodyEn = chunk.match(/\nEN:\s*([\s\S]*?)(?=\n\s*\nFA:)/);
    const bodyFa = chunk.match(/\nFA:\s*([\s\S]*?)$/);
    if (!titleEn || !titleFa || !bodyEn || !bodyFa) {
      throw new Error(`malformed major entry: ${chunk.slice(0, 60)}`);
    }
    const flat = (s) => s.replace(/\s*\n\s*/g, ' ').trim();
    return {
      titleEn: flat(titleEn[1]),
      titleFa: flat(titleFa[1]),
      en: flat(bodyEn[1]),
      fa: flat(bodyFa[1]),
    };
  });
}

/**
 * The page's own chrome: `- **key** EN: ... / FA: ...` lines. Authored in
 * hamdam-ios so the Farsi page is complete instead of silently falling back to
 * English, which is what every earlier page had to do.
 */
export function chrome(block) {
  const out = {};
  for (const line of block.split('\n')) {
    const m = line.match(/^-\s*\*\*(\w+)\*\*\s*EN:\s*(.+?)\s*\/\s*FA:\s*(.+?)\s*$/);
    if (m) out[m[1]] = { en: m[2], fa: m[3] };
  }
  if (Object.keys(out).length === 0) throw new Error('no chrome strings parsed');
  return out;
}

/** The minor changes: `N. EN: ...` then an indented `FA: ...`. */
export function minors(block) {
  const chunks = block.split(/\n(?=\d+\.\s+EN:)/).filter((c) => /^\d+\.\s+EN:/.test(c.trim()));
  return chunks.map((chunk) => {
    const en = chunk.match(/EN:\s*([\s\S]*?)(?=\n\s*FA:)/);
    const fa = chunk.match(/\n\s*FA:\s*([\s\S]*?)$/);
    if (!en || !fa) throw new Error(`malformed minor entry: ${chunk.slice(0, 60)}`);
    const flat = (s) => s.replace(/\s*\n\s*/g, ' ').trim();
    return { en: flat(en[1]), fa: flat(fa[1]) };
  });
}

const markdown = readFileSync(join(iosRepo, SOURCE), 'utf8');

// Section 2 only. Section 1 is the store field and is a different, shorter text.
const page = markdown.slice(markdown.indexOf('## 2. The website page, complete'));

const headline = pair(section(page, 'The headline'));
const lead = pair(section(page, 'The one paragraph'));
const major = majors(section(page, 'The major changes'));
const minor = minors(section(page, 'The minor changes'));
const ui = chrome(section(page, 'The page chrome'));

if (major.length === 0) throw new Error('no major changes parsed');
if (minor.length === 0) throw new Error('no minor changes parsed');

// The Persian guard, here rather than only in the pre-commit hook, because a
// broken parse that swallowed an Arabic yeh out of the source would otherwise
// reach the site and be found by a reader.
const ARABIC_LOOKALIKES = /[\u064A\u0643\u0629\u0649\u0640]/;
const everyFarsi = [
  headline.fa,
  lead.fa,
  ...major.map((m) => `${m.titleFa} ${m.fa}`),
  ...minor.map((m) => m.fa),
  ...Object.values(ui).map((v) => v.fa),
];
for (const s of everyFarsi) {
  if (ARABIC_LOOKALIKES.test(s)) throw new Error(`Arabic look alike in Farsi string: ${s.slice(0, 40)}`);
}

const q = (s) => JSON.stringify(s);
const bilingual = (o, indent) => `${indent}en: ${q(o.en)},\n${indent}fa: ${q(o.fa)},`;

const file = `// GENERATED by scripts/extract-v2-notes.mjs. Do not hand edit.
//
// Source: hamdam-ios ${SOURCE}, section 2.
//
// Every Farsi string below was written in hamdam-ios and copied here by script.
// Nothing in this repository authors, translates or retypes Persian, which is
// the standing rule, and this file is the reason the 2.0 page can be bilingual
// at all. Regenerate rather than edit:
//
//   node scripts/extract-v2-notes.mjs --write
//
// 2.0 HAS NOT SHIPPED. The copy is written as what is coming, and no version
// number from this file reaches any structured data, because Apple still
// answers 1.4.2 and npm run check:release compares the site against the store.

export interface V2Entry {
  readonly titleEn: string;
  readonly titleFa: string;
  readonly en: string;
  readonly fa: string;
}

export interface V2Line {
  readonly en: string;
  readonly fa: string;
}

export const V2_HEADLINE = {
${bilingual(headline, '  ')}
} as const;

export const V2_LEAD = {
${bilingual(lead, '  ')}
} as const;

export const V2_MAJOR: readonly V2Entry[] = [
${major
  .map(
    (m) => `  {
    titleEn: ${q(m.titleEn)},
    titleFa: ${q(m.titleFa)},
    en: ${q(m.en)},
    fa: ${q(m.fa)},
  },`,
  )
  .join('\n')}
];

export const V2_MINOR: readonly V2Line[] = [
${minor.map((m) => `  { en: ${q(m.en)}, fa: ${q(m.fa)} },`).join('\n')}
];

/** The page's own chrome, both halves authored in hamdam-ios. */
export const V2_UI: Record<string, V2Line> = {
${Object.entries(ui)
  .map(([k, v]) => `  ${k}: { en: ${q(v.en)}, fa: ${q(v.fa)} },`)
  .join('\n')}
};
`;

if (write) {
  writeFileSync('src/data/v2Release.ts', file);
  console.log(
    `wrote src/data/v2Release.ts: ${major.length} major, ${minor.length} minor, ${Object.keys(ui).length} chrome`,
  );
} else {
  process.stdout.write(file);
}
