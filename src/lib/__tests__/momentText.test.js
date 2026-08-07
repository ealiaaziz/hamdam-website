import { describe, it, expect } from 'vitest';
import { countdownText, formatMomentDate, upcomingOccurrences } from '../momentText.js';
import { ROOTS_MOMENTS } from '../../data/rootsMoments.ts';

const ruleFor = (id) => ROOTS_MOMENTS.find((m) => m.id === id).rule;

describe('countdownText', () => {
  it('handles today, tomorrow and later in English', () => {
    expect(countdownText('en', 0, 'Yalda')).toBe('Yalda arrives today.');
    expect(countdownText('en', 1, 'Yalda')).toBe('Yalda arrives tomorrow.');
    expect(countdownText('en', 136, 'Yalda')).toBe('Yalda arrives in 136 days.');
  });

  it('handles the same three cases in Farsi, with Persian digits', () => {
    expect(countdownText('fa', 0, 'یلدا')).toContain('امروز');
    expect(countdownText('fa', 1, 'یلدا')).toContain('فردا');
    // 136 in Persian-Indic digits, which is what toLocaleString('fa-IR') gives.
    expect(countdownText('fa', 136, 'یلدا')).toContain('۱۳۶');
  });
});

describe('formatMomentDate', () => {
  const date = { year: 2026, month: 12, day: 21 };

  it('formats Gregorian for English', () => {
    expect(formatMomentDate('en', date)).toBe('21 December 2026');
  });

  it('formats the Persian calendar for Farsi', () => {
    // 21 December 2026 is 30 Azar 1405. The point of the assertion is that the
    // Farsi page does not simply restate the Gregorian date in Persian digits.
    const out = formatMomentDate('fa', date);
    expect(out).toContain('۱۴۰۵');
    expect(out).not.toContain('2026');
  });
});

describe('upcomingOccurrences', () => {
  const today = { year: 2026, month: 8, day: 7 };

  it('returns consecutive distinct dates, earliest first', () => {
    const dates = upcomingOccurrences(ruleFor('yalda'), today, 3);
    expect(dates).toHaveLength(3);
    const keys = dates.map((d) => `${d.date.year}-${d.date.month}-${d.date.day}`);
    expect(new Set(keys).size).toBe(3);
    for (let i = 1; i < dates.length; i += 1) {
      expect(dates[i].daysUntil).toBeGreaterThan(dates[i - 1].daysUntil);
    }
  });

  it('counts days from today, not from the previous occurrence', () => {
    const [first] = upcomingOccurrences(ruleFor('yalda'), today, 1);
    expect(first.daysUntil).toBe(136);
  });

  it('never returns a date in the past', () => {
    for (const id of ['yalda', 'norooz', 'chaharshanbeSuri']) {
      for (const { daysUntil } of upcomingOccurrences(ruleFor(id), today, 4)) {
        expect(daysUntil).toBeGreaterThanOrEqual(0);
      }
    }
  });

  // The reason the function stops short instead of padding: explicitYearlyDates
  // only knows the years the app banked. Two real dates beat three where one is
  // invented.
  it('returns a short list rather than inventing unbanked years', () => {
    const ekka = ruleFor('auQldEkka'); // only 2026 is banked
    expect(upcomingOccurrences(ekka, today, 5)).toHaveLength(1);
  });

  it('returns nothing for a rule with no banked dates at all', () => {
    expect(upcomingOccurrences(ruleFor('auBoxingDay'), today, 3)).toEqual([]);
  });
});
