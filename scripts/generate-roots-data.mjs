#!/usr/bin/env node
// Generates src/data/rootsMoments.ts from the shipped iOS app, so the site's
// Roots section carries the app's own catalogue rather than a hand-typed copy
// that drifts. Two sources, both in the hamdam-ios repo:
//
//   Calendar/CulturalMoment.swift  -> the moment catalogue (id, heritages,
//                                     regions, date rule, source)
//   Core/Localization.swift        -> display names (EN for every id, FA for
//                                     the seven Iranian ones) and the two
//                                     Roots section labels
//
// The Farsi strings are COPIED BYTE-EXACT out of Localization.swift and never
// retyped, which is the whole reason this script exists (hamdam-ios CLAUDE.md:
// "Never hand-type Persian"). If the iOS repo is not reachable this script
// fails loudly rather than emitting a partial file: a silently-truncated
// catalogue would look like a working site with missing moments.
//
// Usage:  node scripts/generate-roots-data.mjs [--ios <path-to-hamdam-ios>]
// Default iOS path is ../hamdam-ios relative to this repo.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argIndex = process.argv.indexOf('--ios');
const IOS_ROOT = resolve(
  REPO_ROOT,
  argIndex !== -1 ? process.argv[argIndex + 1] : process.env.HAMDAM_IOS || '../hamdam-ios',
);

const MOMENTS_SWIFT = join(IOS_ROOT, 'Hamdam/Hamdam/Calendar/CulturalMoment.swift');
const LOCALIZATION_SWIFT = join(IOS_ROOT, 'Hamdam/Hamdam/Core/Localization.swift');
const LOCATION_SWIFT = join(IOS_ROOT, 'Hamdam/Hamdam/Weather/LocationManager.swift');
const OUT_FILE = join(REPO_ROOT, 'src/data/rootsMoments.ts');

// Countries offered as heritage on the site, then the ones on the roadmap
// (Ealia, 2026-07-25) shown as next rather than available.
const HERITAGE_COUNTRIES = ['IR', 'AF', 'TJ', 'AU'];
const ROADMAP_COUNTRIES = ['GB', 'US', 'NL', 'DE'];

// IranianMonth raw values, IranianCalendarService.swift lines 21-32.
const PERSIAN_MONTHS = {
  farvardin: 1, ordibehesht: 2, khordad: 3, tir: 4, mordad: 5, shahrivar: 6,
  mehr: 7, aban: 8, azar: 9, dey: 10, bahman: 11, esfand: 12,
};

function read(path, label) {
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    fail(`cannot read ${label} at ${path}\n  ${err.message}\n  Pass --ios <path> or set HAMDAM_IOS.`);
  }
}

function fail(message) {
  console.error(`generate-roots-data: ${message}`);
  process.exit(1);
}

// --- Catalogue -------------------------------------------------------------

function parseStringArray(raw) {
  return [...raw.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
}

function parseDateRule(raw) {
  let m = raw.match(/\.persianFixed\(month:\s*\.(\w+),\s*day:\s*(\d+)\)/);
  if (m) {
    const month = PERSIAN_MONTHS[m[1]];
    if (!month) fail(`unknown Persian month "${m[1]}"`);
    return { kind: 'persianFixed', month, day: Number(m[2]) };
  }
  if (/\.chaharshanbeSuriSpecial/.test(raw)) return { kind: 'chaharshanbeSuriSpecial' };
  m = raw.match(/\.gregorianFixed\(month:\s*(\d+),\s*day:\s*(\d+)\)/);
  if (m) return { kind: 'gregorianFixed', month: Number(m[1]), day: Number(m[2]) };
  m = raw.match(/\.explicitYearlyDates\(\[([^\]]*)\]\)/);
  if (m) {
    const dates = {};
    for (const entry of m[1].matchAll(/(\d{4}):\s*MonthDay\(month:\s*(\d+),\s*day:\s*(\d+)\)/g)) {
      dates[entry[1]] = { month: Number(entry[2]), day: Number(entry[3]) };
    }
    return { kind: 'explicitYearlyDates', dates };
  }
  if (/\.todoPending/.test(raw)) return { kind: 'todoPending' };
  fail(`unrecognised dateRule in: ${raw.slice(0, 120)}`);
}

function parseMoments(source) {
  const body = source.split('static let all: [CulturalMoment] = [')[1];
  if (!body) fail('could not find CulturalMoment.all in CulturalMoment.swift');

  // Line-based on purpose: every entry in CulturalMoment.all is written on one
  // line, and a paren-balanced parse would still have to cope with the nested
  // parens inside .persianFixed(...)/MomentFactProvenance(...). One line per
  // moment is the invariant that actually holds in the source.
  const moments = [];
  for (const line of body.split('\n')) {
    const idMatch = line.match(/CulturalMoment\(id:\s*"([^"]+)"/);
    if (!idMatch) continue;
    const id = idMatch[1];
    const rest = line.split('//')[0];
    const heritages = parseStringArray((rest.match(/heritages:\s*\[([^\]]*)\]/) || [, ''])[1]);
    const regionsRaw = rest.match(/regions:\s*(nil|\[[^\]]*\])/);
    const regions = !regionsRaw || regionsRaw[1] === 'nil' ? null : parseStringArray(regionsRaw[1]);
    const source_ = /source:\s*\.culturalHeritage/.test(rest) ? 'culturalHeritage' : 'governmentPublic';
    moments.push({ id, heritages, regions, source: source_, rule: parseDateRule(rest) });
  }
  if (moments.length < 40) fail(`parsed only ${moments.length} moments, expected the full banked catalogue`);
  return moments;
}

// --- Localisation ----------------------------------------------------------

/** Body of a `static func name(_ language: AppLanguage) -> String { ... }`. */
function functionBody(source, name) {
  const start = source.indexOf(`static func ${name}(_ language: AppLanguage) -> String {`);
  if (start === -1) fail(`could not find ${name}() in Localization.swift`);
  const end = source.indexOf('\n    }', start);
  return source.slice(start, end);
}

function caseValue(body, language) {
  const match = body.match(new RegExp(`case \\.${language}:\\s*return "([^"]*)"`));
  if (!match) fail(`could not read the .${language} case out of a Localization function`);
  return match[1];
}

/** id -> display name, for one language arm of culturalMomentDisplayName. */
function parseDisplayNames(source, language) {
  const fn = source.slice(source.indexOf('static func culturalMomentDisplayName(id: String, language: AppLanguage) -> String {'));
  const arm = fn.slice(fn.indexOf(`case .${language}:`));
  const next = arm.indexOf(language === 'en' ? 'case .fa:' : '\n    }');
  const names = {};
  for (const m of arm.slice(0, next).matchAll(/case "(\w+)":\s*return "([^"]*)"/g)) {
    names[m[1]] = m[2];
  }
  return names;
}

// --- Emit ------------------------------------------------------------------

/** ["Queensland", "QLD"] pairs from LocationManager.auStateAbbreviations. */
function parseAuStates(source) {
  const declaration = 'static let auStateAbbreviations: [String: String] = [';
  const start = source.indexOf(declaration);
  if (start === -1) fail('could not find auStateAbbreviations in LocationManager.swift');
  // Past the declaration itself: the type annotation contains its own brackets.
  const bodyStart = start + declaration.length;
  const body = source.slice(bodyStart, source.indexOf(']', bodyStart));
  const states = [...body.matchAll(/"([^"]+)":\s*"([A-Z]+)"/g)].map((m) => ({ code: `AU-${m[2]}`, nameEn: m[1] }));
  if (states.length !== 8) fail(`parsed ${states.length} AU states, expected 8`);
  // Alphabetical by state name, so the chip row has a stable, readable order
  // regardless of the Swift dictionary's own (unordered) literal.
  return states.sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'));
}

/**
 * Country names come from CLDR, never hand-typed, which is the rule
 * LocationManager.homeLocationDisplayName already follows on the app side
 * (Locale.localizedString(forRegionCode:)). Intl.DisplayNames is the same
 * data through a different runtime, so the Farsi names here are no more
 * hand-authored than the app's.
 */
function countryNames(codes) {
  const en = new Intl.DisplayNames(['en-AU'], { type: 'region' });
  const fa = new Intl.DisplayNames(['fa'], { type: 'region' });
  return codes.map((code) => {
    const nameEn = en.of(code);
    const nameFa = fa.of(code);
    if (!nameEn || nameEn === code) fail(`no CLDR English name for region code "${code}"`);
    if (!nameFa || nameFa === code) fail(`no CLDR Farsi name for region code "${code}"`);
    return { code, nameEn, nameFa };
  });
}

const momentsSwift = read(MOMENTS_SWIFT, 'CulturalMoment.swift');
const localizationSwift = read(LOCALIZATION_SWIFT, 'Localization.swift');
const locationSwift = read(LOCATION_SWIFT, 'LocationManager.swift');

const moments = parseMoments(momentsSwift);
const namesEn = parseDisplayNames(localizationSwift, 'en');
const namesFa = parseDisplayNames(localizationSwift, 'fa');

// rootsHeritageSection/.fa delegates to heritageSectionLabel(.fa), and
// rootsRegionSection/.fa to locationSectionLabel(.fa) -- follow the delegation
// rather than assuming, so a change on the app side comes through here.
function bilingual(fnName) {
  const body = functionBody(localizationSwift, fnName);
  return { en: caseValue(body, 'en'), fa: caseValue(body, 'fa') };
}

const labels = {
  heritage: {
    en: caseValue(functionBody(localizationSwift, 'rootsHeritageSection'), 'en'),
    fa: caseValue(functionBody(localizationSwift, 'heritageSectionLabel'), 'fa'),
  },
  region: {
    en: caseValue(functionBody(localizationSwift, 'rootsRegionSection'), 'en'),
    fa: caseValue(functionBody(localizationSwift, 'locationSectionLabel'), 'fa'),
  },
  heritageEmpty: bilingual('rootsHeritageEmptyState'),
  regionEmpty: bilingual('rootsRegionEmptyState'),
  comingSoon: bilingual('wisdomDetailComingSoon'),
  notSet: bilingual('settingsNotSet'),
};

const auStates = parseAuStates(locationSwift);
const heritageCountries = countryNames(HERITAGE_COUNTRIES);
const roadmapCountries = countryNames(ROADMAP_COUNTRIES);

for (const moment of moments) {
  if (!namesEn[moment.id]) fail(`no English display name for "${moment.id}"`);
}

const rendered = moments.map((m) => {
  const fa = namesFa[m.id] && namesFa[m.id] !== namesEn[m.id] ? `, nameFa: ${JSON.stringify(namesFa[m.id])}` : '';
  const regions = m.regions ? JSON.stringify(m.regions) : 'null';
  return `  { id: ${JSON.stringify(m.id)}, nameEn: ${JSON.stringify(namesEn[m.id])}${fa}, heritages: ${JSON.stringify(m.heritages)}, regions: ${regions}, source: ${JSON.stringify(m.source)}, rule: ${JSON.stringify(m.rule)} },`;
}).join('\n');

const out = `// GENERATED FILE. Do not edit by hand.
// Run: node scripts/generate-roots-data.mjs
//
// Source of truth is the shipped iOS app:
//   Hamdam/Hamdam/Calendar/CulturalMoment.swift  (catalogue)
//   Hamdam/Hamdam/Core/Localization.swift        (display names, section labels)
// Every Farsi string here was copied byte-exact by that script, never retyped.
// Generated ${new Date().toISOString().slice(0, 10)} from ${moments.length} banked moments.

export type MomentRule =
  | { kind: 'persianFixed'; month: number; day: number }
  | { kind: 'chaharshanbeSuriSpecial' }
  | { kind: 'gregorianFixed'; month: number; day: number }
  | { kind: 'explicitYearlyDates'; dates: Record<string, { month: number; day: number }> }
  | { kind: 'todoPending' };

export interface RootsMoment {
  id: string;
  nameEn: string;
  /** Only the seven Iranian moments have one; the rest are English proper nouns. */
  nameFa?: string;
  heritages: string[];
  /** null means national: no subnational code required. */
  regions: string[] | null;
  source: 'culturalHeritage' | 'governmentPublic';
  rule: MomentRule;
}

export const ROOTS_MOMENTS: readonly RootsMoment[] = [
${rendered}
];

export interface BilingualLabel {
  en: string;
  fa: string;
}

/** UI strings, byte-exact from Localization.swift. No new Farsi is authored here. */
export const ROOTS_LABELS: Record<
  'heritage' | 'region' | 'heritageEmpty' | 'regionEmpty' | 'comingSoon' | 'notSet',
  BilingualLabel
> = {
${Object.entries(labels).map(([key, value]) => `  ${key}: { en: ${JSON.stringify(value.en)}, fa: ${JSON.stringify(value.fa)} },`).join('\n')}
};

export interface NamedPlace {
  code: string;
  nameEn: string;
  nameFa?: string;
}

/**
 * Heritage options, and the countries whose packs are next (Ealia, 2026-07-25).
 * Names come from CLDR, the same source LocationManager uses in the app.
 */
export const HERITAGE_COUNTRIES: readonly NamedPlace[] = [
${heritageCountries.map((c) => `  { code: ${JSON.stringify(c.code)}, nameEn: ${JSON.stringify(c.nameEn)}, nameFa: ${JSON.stringify(c.nameFa)} },`).join('\n')}
];

export const ROADMAP_COUNTRIES: readonly NamedPlace[] = [
${roadmapCountries.map((c) => `  { code: ${JSON.stringify(c.code)}, nameEn: ${JSON.stringify(c.nameEn)}, nameFa: ${JSON.stringify(c.nameFa)} },`).join('\n')}
];

/**
 * The regions Hamdam resolves today. English-only on purpose: the app's own
 * regionDisplayName renders "Queensland, Australia" in both languages, with
 * only the country name localised.
 */
export const AU_REGIONS: readonly NamedPlace[] = [
${auStates.map((s) => `  { code: ${JSON.stringify(s.code)}, nameEn: ${JSON.stringify(s.nameEn)} },`).join('\n')}
];
`;

writeFileSync(OUT_FILE, out, 'utf8');
console.log(`generate-roots-data: wrote ${moments.length} moments to src/data/rootsMoments.ts`);
