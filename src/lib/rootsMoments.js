// Pure Roots resolution for the website: which moments a visitor would see in
// the app for a given heritage and region, and when each one next arrives.
//
// This is a port of two things in hamdam-ios, kept deliberately close to them:
//   CulturalMomentsProvider.matchesHeritageAndRegion  -> matchesHeritageAndRegion
//   IranianCountdownService.nextOccurrence(of:after:) -> nextOccurrenceForRule
// The catalogue itself is generated, never hand-typed: see
// scripts/generate-roots-data.mjs and src/data/rootsMoments.ts.
//
// Everything works in whole calendar days as {year, month, day} plain objects,
// the same convention as countdown.js, whose date primitives this module
// reuses rather than duplicating.

import { daysBetween, chaharshanbeSuriDateForYear } from './countdown';

// --- Persian calendar ------------------------------------------------------

// Persian month lengths: months 1-6 are 31 days, 7-11 are 30, and Esfand (12)
// is 29 or 30 depending on the leap year. No moment in the catalogue falls in
// Esfand past day 29, so the leap rule never enters this calculation -- and
// month 12 is deliberately absent from the table below so that a future Esfand
// entry fails loudly here instead of silently drifting by a day.
const PERSIAN_MONTH_STARTS = Object.freeze({ 1: 0, 2: 31, 3: 62, 4: 93, 5: 124, 6: 155, 7: 186, 8: 216, 9: 246, 10: 276, 11: 306 });

const PERSIAN_PARTS = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

function persianPartsForUtc(year, month, day) {
  // Midday UTC on purpose: any hour near midnight risks the formatter landing
  // on the neighbouring day for a calendar that is not itself UTC-anchored.
  const parts = PERSIAN_PARTS.formatToParts(Date.UTC(year, month - 1, day, 12));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

/**
 * Gregorian date of Norooz (Farvardin 1) for a Persian year, found by testing
 * the four Gregorian days it can possibly fall on. Norooz tracks the vernal
 * equinox as observed in Tehran, so it is 20 or 21 March in practice; the
 * 19-22 window is headroom, not an expectation.
 */
export function noroozForPersianYear(persianYear) {
  const gregorianYear = persianYear + 621;
  for (const day of [19, 20, 21, 22]) {
    const parts = persianPartsForUtc(gregorianYear, 3, day);
    if (parts.year === persianYear && parts.month === 1 && parts.day === 1) {
      return { year: gregorianYear, month: 3, day };
    }
  }
  return null;
}

/**
 * Gregorian date for a fixed Persian month/day in the Persian year that begins
 * in `gregorianYear`. Mirrors IranianCountdownService.nextFixedHoliday's use of
 * a real Persian calendar rather than a fixed Gregorian approximation -- the
 * Roots tab in the app resolves these dates the same way.
 */
export function persianFixedDate(gregorianYear, persianMonth, persianDay) {
  const offsetToMonth = PERSIAN_MONTH_STARTS[persianMonth];
  if (offsetToMonth === undefined) return null;
  const norooz = noroozForPersianYear(gregorianYear - 621);
  if (!norooz) return null;
  return addDays(norooz, offsetToMonth + persianDay - 1);
}

function addDays(parts, days) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12) + days * 86_400_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

// --- Date rules ------------------------------------------------------------

/**
 * Next occurrence of a moment's date rule on or after `today`, or null when the
 * rule has no banked date in range (an unbanked year in .explicitYearlyDates,
 * or .todoPending). Null is normal and callers must drop the moment, exactly as
 * the app does.
 *
 * "On or after" (not strictly after) so a moment arriving today still shows,
 * matching the site's existing "arrives today" countdown wording.
 */
export function nextOccurrenceForRule(rule, today) {
  const candidates = [];
  switch (rule.kind) {
    case 'persianFixed':
      // Two Persian years, not two Gregorian ones: a moment late in the Persian
      // year (Bahman, Esfand) lands in the FOLLOWING Gregorian year, so
      // searching Gregorian years alone would miss the near occurrence.
      for (const year of [today.year - 1, today.year, today.year + 1]) {
        const date = persianFixedDate(year, rule.month, rule.day);
        if (date) candidates.push(date);
      }
      break;
    case 'chaharshanbeSuriSpecial':
      for (const year of [today.year, today.year + 1]) {
        const date = chaharshanbeSuriDateForYear(year);
        if (date) candidates.push(date);
      }
      break;
    case 'gregorianFixed':
      for (const year of [today.year, today.year + 1]) {
        candidates.push({ year, month: rule.month, day: rule.day });
      }
      break;
    case 'explicitYearlyDates':
      for (const year of [today.year, today.year + 1]) {
        const banked = rule.dates[String(year)];
        if (banked) candidates.push({ year, month: banked.month, day: banked.day });
      }
      break;
    case 'todoPending':
    default:
      return null;
  }

  const upcoming = candidates
    .map((date) => ({ date, daysUntil: daysBetween(today, date) }))
    .filter((c) => c.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil);
  return upcoming.length ? upcoming[0].date : null;
}

// --- Heritage and region matching -----------------------------------------

/**
 * Port of CulturalMomentsProvider.matchesHeritageAndRegion. The asymmetry is
 * the point and is load-bearing:
 *
 * - .governmentPublic is gated by where you LIVE and never by heritage. Someone
 *   born in Iran living in Brisbane still sees Ekka.
 * - .culturalHeritage is gated by where you COME FROM. Someone born in Australia
 *   living in Brisbane sees NAIDOC Week and R U OK? Day, not Yalda.
 *
 * `heritages` is the visitor's own list (empty when unset); "*" on a moment
 * means universal.
 */
export function matchesHeritageAndRegion(moment, { heritages = [], homeCountry = null, homeRegion = null } = {}) {
  if (moment.source === 'governmentPublic') {
    if (!homeCountry || !moment.heritages.includes(homeCountry)) return false;
    if (!moment.regions) return true; // national: any resident of that country
    if (!homeRegion) return false;
    return moment.regions.includes(homeRegion);
  }
  const heritageMatches =
    moment.heritages.includes('*') || moment.heritages.some((h) => heritages.includes(h));
  if (!heritageMatches) return false;
  if (!moment.regions) return true;
  if (!homeRegion) return false;
  return moment.regions.includes(homeRegion);
}

/** "AU-QLD" -> "AU". A region code always carries its country as its prefix. */
export function countryForRegion(region) {
  if (!region) return null;
  const [country] = region.split('-');
  return country || null;
}

// --- Section resolution ----------------------------------------------------

/**
 * Every moment that has a resolvable next date, closest first, with the
 * countdown already computed. Section membership is by source, matching
 * RootsTabView: Section 1 renders .culturalHeritage, Section 2 .governmentPublic.
 *
 * Rendering everything once, sorted, and filtering per selection afterwards is
 * what lets the switcher be a class toggle rather than a re-render: a subset of
 * a date-sorted list is still date-sorted.
 */
export function upcomingRootsMoments(moments, today) {
  return moments
    .map((moment) => {
      const date = nextOccurrenceForRule(moment.rule, today);
      return date ? { moment, date, daysUntil: daysBetween(today, date) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * The two Roots sections for one visitor, closest-upcoming first. `selection`
 * is { heritages, homeRegion }; homeCountry is derived from the region, since
 * where you live is what Section 2 is gated on.
 */
export function resolveRootsSections(moments, today, selection = {}) {
  const homeCountry = selection.homeCountry ?? countryForRegion(selection.homeRegion);
  const resolved = { ...selection, homeCountry };
  const upcoming = upcomingRootsMoments(moments, today);
  return {
    heritage: upcoming.filter(
      (entry) => entry.moment.source === 'culturalHeritage' && matchesHeritageAndRegion(entry.moment, resolved),
    ),
    region: upcoming.filter(
      (entry) => entry.moment.source === 'governmentPublic' && matchesHeritageAndRegion(entry.moment, resolved),
    ),
  };
}
