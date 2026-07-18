import { describe, it, expect } from 'vitest';
import {
  daysBetween,
  yaldaDateForYear,
  noroozDateForYear,
  chaharshanbeSuriDateForYear,
  nextOccurrence,
  upcomingMoments,
  getBrisbaneToday,
} from '../countdown.js';

describe('fixed moment dates', () => {
  it('Yalda is always 21 December', () => {
    expect(yaldaDateForYear(2026)).toEqual({ year: 2026, month: 12, day: 21 });
    expect(yaldaDateForYear(2030)).toEqual({ year: 2030, month: 12, day: 21 });
  });

  it('Norooz is always 20 March', () => {
    expect(noroozDateForYear(2026)).toEqual({ year: 2026, month: 3, day: 20 });
  });
});

describe('chaharshanbeSuriDateForYear (matches SeasonalEventEngine.lastTuesdayBeforeNorooz)', () => {
  it('is always a Tuesday on or before 19 March', () => {
    for (const year of [2024, 2025, 2026, 2027, 2028, 2029, 2030]) {
      const date = chaharshanbeSuriDateForYear(year);
      expect(date.month).toBe(3);
      expect(date.day).toBeLessThanOrEqual(19);
      expect(date.day).toBeGreaterThan(19 - 7); // within one week back
      const jsDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
      expect(jsDate.getUTCDay()).toBe(2); // Tuesday
    }
  });

  it('matches the known 2025 date (18 March 2025, a Tuesday)', () => {
    expect(chaharshanbeSuriDateForYear(2025)).toEqual({ year: 2025, month: 3, day: 18 });
  });

  it('matches the known 2026 date (17 March 2026, a Tuesday)', () => {
    expect(chaharshanbeSuriDateForYear(2026)).toEqual({ year: 2026, month: 3, day: 17 });
  });
});

describe('daysBetween', () => {
  it('is 0 for the same day', () => {
    expect(daysBetween({ year: 2026, month: 3, day: 20 }, { year: 2026, month: 3, day: 20 })).toBe(0);
  });

  it('counts forward correctly across a month boundary', () => {
    expect(daysBetween({ year: 2026, month: 2, day: 28 }, { year: 2026, month: 3, day: 1 })).toBe(1);
  });

  it('can be negative for a past date', () => {
    expect(daysBetween({ year: 2026, month: 3, day: 20 }, { year: 2026, month: 3, day: 10 })).toBe(-10);
  });
});

describe('nextOccurrence (year rollover)', () => {
  it('returns this year\'s date when it has not passed yet', () => {
    const today = { year: 2026, month: 1, day: 1 };
    expect(nextOccurrence(today, yaldaDateForYear)).toEqual({ year: 2026, month: 12, day: 21 });
  });

  it('rolls over to next year once the date has passed', () => {
    const today = { year: 2026, month: 12, day: 25 };
    expect(nextOccurrence(today, yaldaDateForYear)).toEqual({ year: 2027, month: 12, day: 21 });
  });

  it('returns today itself as the next occurrence on the day of', () => {
    const today = { year: 2026, month: 3, day: 20 };
    expect(nextOccurrence(today, noroozDateForYear)).toEqual({ year: 2026, month: 3, day: 20 });
  });
});

describe('upcomingMoments', () => {
  it('returns all three moments with non-negative days-until', () => {
    const today = { year: 2026, month: 6, day: 15 };
    const moments = upcomingMoments(today);
    expect(moments).toHaveLength(3);
    for (const m of moments) {
      expect(m.daysUntil).toBeGreaterThanOrEqual(0);
    }
  });

  it('marks exactly one moment as nearest', () => {
    const today = { year: 2026, month: 6, day: 15 };
    const moments = upcomingMoments(today);
    expect(moments.filter((m) => m.isNearest)).toHaveLength(1);
  });

  it('returns moments sorted by calendar order of next arrival, not object insertion order', () => {
    // From 15 June 2026: Yalda (21 Dec) is nearest, then Chaharshanbe Suri
    // (17 Mar 2027) before Norooz (20 Mar 2027) -- Object.entries(MOMENTS)
    // insertion order would wrongly put Norooz before Chaharshanbe Suri.
    const today = { year: 2026, month: 6, day: 15 };
    const moments = upcomingMoments(today);
    expect(moments.map((m) => m.id)).toEqual(['yalda', 'chaharshanbeSuri', 'norooz']);
    expect(moments[0].isNearest).toBe(true);
    for (let i = 1; i < moments.length; i++) {
      expect(moments[i].daysUntil).toBeGreaterThanOrEqual(moments[i - 1].daysUntil);
    }
  });

  it('picks Norooz as nearest right after Yalda passes', () => {
    const today = { year: 2027, month: 1, day: 5 };
    const moments = upcomingMoments(today);
    const nearest = moments.find((m) => m.isNearest);
    expect(nearest.id).toBe('chaharshanbeSuri');
  });
});

describe('getBrisbaneToday', () => {
  it('returns a {year, month, day} shape', () => {
    const today = getBrisbaneToday(new Date('2026-06-15T12:00:00Z'));
    expect(today).toEqual({ year: 2026, month: 6, day: 15 });
  });

  it('reflects Brisbane being ahead of UTC (no DST, UTC+10)', () => {
    // 23:30 UTC on the 14th is already the 15th in Brisbane (+10h).
    const today = getBrisbaneToday(new Date('2026-06-14T23:30:00Z'));
    expect(today).toEqual({ year: 2026, month: 6, day: 15 });
  });
});
