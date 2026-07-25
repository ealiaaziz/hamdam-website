import { describe, it, expect } from 'vitest';
import {
  noroozForPersianYear,
  persianFixedDate,
  nextOccurrenceForRule,
  matchesHeritageAndRegion,
  countryForRegion,
  upcomingRootsMoments,
  resolveRootsSections,
} from '../rootsMoments.js';
import { ROOTS_MOMENTS } from '../../data/rootsMoments.ts';

// Expected values throughout this file are stated independently of the
// implementation, per hamdam-ios CLAUDE.md's mutation-testing rules:
//
//   Norooz    -- the Persian year begins on the day of the vernal equinox as
//                observed in Tehran (UTC+3:30), rolling to the next day when
//                the equinox falls after noon there. 2026: equinox 20 Mar
//                14:46 UTC = 18:16 Tehran, after noon, so Norooz is 21 Mar.
//                2028: 20 Mar 02:17 UTC = 05:47 Tehran, before noon, so
//                Norooz is 20 Mar. That flip is the witness -- an off-by-one
//                or a fixed-date shortcut cannot reproduce both.
//   Month days -- IranianCalendarService.swift states each Persian month's
//                Gregorian range (Farvardin 21 Mar, Tir 22 Jun, Mehr 23 Sep,
//                Azar 22 Nov, Bahman 21 Jan). Counting forward from the
//                month's first day gives each date below without going
//                through this module's arithmetic at all.

describe('noroozForPersianYear (equinox in Tehran, not a fixed Gregorian date)', () => {
  it('lands on 21 March when the equinox falls after Tehran noon', () => {
    expect(noroozForPersianYear(1405)).toEqual({ year: 2026, month: 3, day: 21 });
    expect(noroozForPersianYear(1406)).toEqual({ year: 2027, month: 3, day: 21 });
    expect(noroozForPersianYear(1409)).toEqual({ year: 2030, month: 3, day: 21 });
  });

  it('lands on 20 March when the equinox falls before Tehran noon', () => {
    expect(noroozForPersianYear(1407)).toEqual({ year: 2028, month: 3, day: 20 });
    expect(noroozForPersianYear(1408)).toEqual({ year: 2029, month: 3, day: 20 });
  });
});

describe('persianFixedDate (the seven Iranian moments)', () => {
  it('Yalda is Azar 30: 29 days after Azar 1 (22 November) = 21 December', () => {
    expect(persianFixedDate(2026, 9, 30)).toEqual({ year: 2026, month: 12, day: 21 });
    expect(persianFixedDate(2028, 9, 30)).toEqual({ year: 2028, month: 12, day: 20 });
  });

  it('Mehregan is Mehr 10: 9 days after Mehr 1 (23 September) = 2 October', () => {
    expect(persianFixedDate(2026, 7, 10)).toEqual({ year: 2026, month: 10, day: 2 });
  });

  it('Tirgan is Tir 10: 9 days after Tir 1 (22 June) = 1 July', () => {
    expect(persianFixedDate(2026, 4, 10)).toEqual({ year: 2026, month: 7, day: 1 });
  });

  it('Sizdah Bedar is Farvardin 13: 12 days after Norooz', () => {
    expect(persianFixedDate(2026, 1, 13)).toEqual({ year: 2026, month: 4, day: 2 });
    // 1407 starts a day earlier (20 March 2028), so this must move with it.
    expect(persianFixedDate(2028, 1, 13)).toEqual({ year: 2028, month: 4, day: 1 });
  });

  it('Sepandarmazgan is Bahman 29, which falls in the NEXT Gregorian year', () => {
    // 28 days after Bahman 1 (21 January) = 18 February, in 2027 for the
    // Persian year that began in March 2026.
    expect(persianFixedDate(2026, 11, 29)).toEqual({ year: 2027, month: 2, day: 18 });
  });

  it('returns null for Esfand rather than guessing the leap-year length', () => {
    expect(persianFixedDate(2026, 12, 1)).toBeNull();
  });
});

describe('nextOccurrenceForRule', () => {
  const today = { year: 2026, month: 7, day: 25 };

  it('rolls a persianFixed moment forward once it has passed', () => {
    // Tirgan 2026 was 1 July, already gone: next is 1 July 2027.
    expect(nextOccurrenceForRule({ kind: 'persianFixed', month: 4, day: 10 }, today))
      .toEqual({ year: 2027, month: 7, day: 1 });
  });

  it('reaches back a Persian year for a moment that lands early in the Gregorian year', () => {
    // On 5 January 2027, Sepandarmazgan is 18 February 2027 -- the Bahman 29 of
    // the Persian year that began in MARCH 2026. Searching Gregorian 2027 and
    // 2028 alone would return February 2028 and be a year late.
    expect(nextOccurrenceForRule({ kind: 'persianFixed', month: 11, day: 29 }, { year: 2027, month: 1, day: 5 }))
      .toEqual({ year: 2027, month: 2, day: 18 });
  });

  it('returns today itself when the moment is today', () => {
    expect(nextOccurrenceForRule({ kind: 'gregorianFixed', month: 7, day: 25 }, today)).toEqual(today);
  });

  it('picks the banked year for explicitYearlyDates and rolls to the next banked year', () => {
    const rule = {
      kind: 'explicitYearlyDates',
      dates: { 2026: { month: 9, day: 10 }, 2027: { month: 9, day: 9 } },
    };
    expect(nextOccurrenceForRule(rule, today)).toEqual({ year: 2026, month: 9, day: 10 });
    expect(nextOccurrenceForRule(rule, { year: 2026, month: 9, day: 11 }))
      .toEqual({ year: 2027, month: 9, day: 9 });
  });

  it('pins both sides of the day-of boundary for explicitYearlyDates', () => {
    const rule = { kind: 'explicitYearlyDates', dates: { 2026: { month: 9, day: 10 } } };
    expect(nextOccurrenceForRule(rule, { year: 2026, month: 9, day: 10 }))
      .toEqual({ year: 2026, month: 9, day: 10 });
    expect(nextOccurrenceForRule(rule, { year: 2026, month: 9, day: 11 })).toBeNull();
  });

  it('returns null for an unbanked year and for todoPending', () => {
    expect(nextOccurrenceForRule({ kind: 'explicitYearlyDates', dates: {} }, today)).toBeNull();
    expect(nextOccurrenceForRule({ kind: 'todoPending' }, today)).toBeNull();
  });
});

describe('matchesHeritageAndRegion', () => {
  const yalda = { source: 'culturalHeritage', heritages: ['IR', 'AF', 'TJ'], regions: null };
  const naidoc = { source: 'culturalHeritage', heritages: ['AU'], regions: null };
  const australiaDay = { source: 'governmentPublic', heritages: ['AU'], regions: null };
  const ekka = { source: 'governmentPublic', heritages: ['AU'], regions: ['AU-QLD'] };
  const universal = { source: 'culturalHeritage', heritages: ['*'], regions: null };

  it('gates heritage moments on where you come from', () => {
    expect(matchesHeritageAndRegion(yalda, { heritages: ['IR'] })).toBe(true);
    expect(matchesHeritageAndRegion(yalda, { heritages: ['AU'] })).toBe(false);
    expect(matchesHeritageAndRegion(naidoc, { heritages: ['AU'] })).toBe(true);
    expect(matchesHeritageAndRegion(naidoc, { heritages: ['IR'] })).toBe(false);
  });

  it('shows nothing in either section when heritage and region are both unset', () => {
    expect(matchesHeritageAndRegion(yalda, {})).toBe(false);
    expect(matchesHeritageAndRegion(australiaDay, {})).toBe(false);
    expect(matchesHeritageAndRegion(ekka, {})).toBe(false);
  });

  it('matches a universal ("*") heritage moment even with no heritage set', () => {
    expect(matchesHeritageAndRegion(universal, {})).toBe(true);
  });

  it('gates public holidays on where you LIVE, never on heritage', () => {
    // The load-bearing case: Iranian heritage, living in Queensland, still sees
    // Australia Day and Ekka. Inverting the predicate breaks exactly this.
    const iranianInBrisbane = { heritages: ['IR'], homeCountry: 'AU', homeRegion: 'AU-QLD' };
    expect(matchesHeritageAndRegion(australiaDay, iranianInBrisbane)).toBe(true);
    expect(matchesHeritageAndRegion(ekka, iranianInBrisbane)).toBe(true);
    expect(matchesHeritageAndRegion(yalda, iranianInBrisbane)).toBe(true);
  });

  it('does not show another state\'s holiday', () => {
    const inSydney = { heritages: ['AU'], homeCountry: 'AU', homeRegion: 'AU-NSW' };
    expect(matchesHeritageAndRegion(ekka, inSydney)).toBe(false);
    expect(matchesHeritageAndRegion(australiaDay, inSydney)).toBe(true);
  });

  it('does not show Australian public holidays to someone living outside Australia', () => {
    const inTehran = { heritages: ['IR'], homeCountry: 'IR', homeRegion: null };
    expect(matchesHeritageAndRegion(australiaDay, inTehran)).toBe(false);
    expect(matchesHeritageAndRegion(ekka, inTehran)).toBe(false);
    expect(matchesHeritageAndRegion(yalda, inTehran)).toBe(true);
  });

  it('gives a national holiday to a country resident with no subnational code', () => {
    expect(matchesHeritageAndRegion(australiaDay, { homeCountry: 'AU', homeRegion: null })).toBe(true);
    expect(matchesHeritageAndRegion(ekka, { homeCountry: 'AU', homeRegion: null })).toBe(false);
  });
});

describe('countryForRegion', () => {
  it('takes the country prefix, so a new country is a data change only', () => {
    expect(countryForRegion('AU-QLD')).toBe('AU');
    expect(countryForRegion('GB-ENG')).toBe('GB');
    expect(countryForRegion(null)).toBeNull();
    expect(countryForRegion('')).toBeNull();
  });
});

describe('upcomingRootsMoments (against the generated catalogue)', () => {
  const today = { year: 2026, month: 7, day: 25 };
  const upcoming = upcomingRootsMoments(ROOTS_MOMENTS, today);

  it('resolves a date for every moment with a banked rule', () => {
    // auNAIDOCWeek has only 2026 banked and it has passed by 25 July 2026;
    // auBoxingDay is deliberately banked empty. Both correctly drop out.
    const dropped = ROOTS_MOMENTS.length - upcoming.length;
    expect(dropped).toBe(2);
    expect(upcoming.map((e) => e.moment.id)).not.toContain('auBoxingDay');
  });

  it('is sorted closest-first with no past dates', () => {
    expect(upcoming[0].daysUntil).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < upcoming.length; i++) {
      expect(upcoming[i].daysUntil).toBeGreaterThanOrEqual(upcoming[i - 1].daysUntil);
    }
  });

  it('puts the right moment first from a known day', () => {
    // From 25 July 2026 the next moment in the whole catalogue is NT Picnic Day
    // on 3 August 2026, nine days out.
    expect(upcoming[0].moment.id).toBe('auNtPicnicDay');
    expect(upcoming[0].daysUntil).toBe(9);
    expect(upcoming[0].date).toEqual({ year: 2026, month: 8, day: 3 });
  });
});

describe('resolveRootsSections (what a visitor would actually see)', () => {
  const today = { year: 2026, month: 7, day: 25 };

  it('gives an Iranian-heritage Brisbane visitor both sections', () => {
    const { heritage, region } = resolveRootsSections(ROOTS_MOMENTS, today, {
      heritages: ['IR'],
      homeRegion: 'AU-QLD',
    });
    // All seven Iranian moments resolve a date; none of the AU cultural pack
    // reaches Section 1, because that is heritage-gated.
    expect(heritage.map((e) => e.moment.id).sort()).toEqual([
      'chaharshanbeSuri', 'mehregan', 'norooz', 'sepandarmazgan', 'sizdahBedar', 'tirgan', 'yalda',
    ]);
    expect(region.map((e) => e.moment.id)).toContain('auQldEkka');
    expect(region.map((e) => e.moment.id)).not.toContain('auNswLabourDay');
  });

  it('gives an Australian-heritage Brisbane visitor the AU cultural pack, no Persian moments', () => {
    const { heritage, region } = resolveRootsSections(ROOTS_MOMENTS, today, {
      heritages: ['AU'],
      homeRegion: 'AU-QLD',
    });
    expect(heritage.map((e) => e.moment.id)).toContain('auRUOKDay');
    expect(heritage.map((e) => e.moment.id)).not.toContain('yalda');
    expect(region.map((e) => e.moment.id)).toContain('auQldEkka');
  });

  it('gives an Iranian-heritage visitor outside Australia no public holidays at all', () => {
    const { heritage, region } = resolveRootsSections(ROOTS_MOMENTS, today, { heritages: ['IR'] });
    expect(heritage).toHaveLength(7);
    expect(region).toHaveLength(0);
  });

  it('gives a visitor with neither set two empty sections', () => {
    const { heritage, region } = resolveRootsSections(ROOTS_MOMENTS, today, {});
    expect(heritage).toHaveLength(0);
    expect(region).toHaveLength(0);
  });

  it('derives the country from the region, so residence alone drives Section 2', () => {
    const { region } = resolveRootsSections(ROOTS_MOMENTS, today, { homeRegion: 'AU-NSW' });
    expect(region.map((e) => e.moment.id)).toContain('auNswLabourDay');
    expect(region.map((e) => e.moment.id)).not.toContain('auQldEkka');
  });

  it('keeps each section sorted closest-first', () => {
    const { heritage } = resolveRootsSections(ROOTS_MOMENTS, today, { heritages: ['IR'] });
    // From 25 July 2026: Mehregan (2 Oct) before Yalda (21 Dec) before
    // Sepandarmazgan (18 Feb 2027) before Chaharshanbe Suri (16 Mar 2027).
    expect(heritage.slice(0, 3).map((e) => e.moment.id)).toEqual(['mehregan', 'yalda', 'sepandarmazgan']);
  });
});
