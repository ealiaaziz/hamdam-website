// Shared bilingual text for cultural moments: the countdown sentence and the
// date format.
//
// Both lived in RootsMoments.astro until 2026-08-07, when the moment pages
// (/moments/<slug>/) started needing the same two sentences. The Farsi
// templates below were moved by script rather than retyped, and the homepage
// now calls these functions instead of keeping its own copy, so the two
// surfaces cannot drift into saying the same thing two ways.

import { daysBetween } from './countdown';
import { nextOccurrenceForRule } from './rootsMoments';

/**
 * "Yalda arrives in 136 days." / the Farsi equivalent.
 * @param {'en' | 'fa'} lang
 * @param {number} daysUntil
 * @param {string} name Already localised.
 */
export function countdownText(lang, daysUntil, name) {
  if (lang === 'fa') {
    if (daysUntil === 0) return `${name} امروز می‌رسد.`;
    if (daysUntil === 1) return `${name} فردا می‌رسد.`;
    return `${name} تا ${daysUntil.toLocaleString('fa-IR')} روز دیگر می‌رسد.`;
  }
  if (daysUntil === 0) return `${name} arrives today.`;
  if (daysUntil === 1) return `${name} arrives tomorrow.`;
  return `${name} arrives in ${daysUntil} days.`;
}

/**
 * The moment's date, in the visitor's calendar. Farsi gets the Persian
 * calendar, which is what the app shows and what a Farsi reader expects for
 * Yalda or Norooz; English gets the Gregorian one.
 * @param {'en' | 'fa'} lang
 * @param {{ year: number, month: number, day: number }} date
 */
export function formatMomentDate(lang, date) {
  return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(Date.UTC(date.year, date.month - 1, date.day, 12));
}

/**
 * The next `count` occurrences of a rule, earliest first.
 *
 * nextOccurrenceForRule answers for one day only, so this walks forward: each
 * result becomes the following search's starting point, one day later. It
 * stops early and returns a short list rather than padding, because
 * .explicitYearlyDates only has dates banked for the years the app shipped
 * with. A moment page showing two years when two years is all that is known is
 * correct; inventing a third would be a date this project cannot stand behind.
 *
 * @param {import('../data/rootsMoments').MomentRule} rule
 * @param {{ year: number, month: number, day: number }} today
 * @param {number} count
 */
export function upcomingOccurrences(rule, today, count) {
  const dates = [];
  let cursor = today;
  for (let i = 0; i < count; i += 1) {
    const date = nextOccurrenceForRule(rule, cursor);
    if (!date) break;
    dates.push({ date, daysUntil: daysBetween(today, date) });
    cursor = dayAfter(date);
  }
  return dates;
}

/** @param {{ year: number, month: number, day: number }} date */
function dayAfter(date) {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day, 12) + 86_400_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
