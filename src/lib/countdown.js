// Pure next-occurrence date maths for the three Roots moment cards (page
// spec §7). Dates match the iOS app's SeasonalEventEngine.swift exactly:
// Yalda = 21 Dec, Norooz = 20 Mar, Chaharshanbe Suri = the last Tuesday
// before 19 March (SeasonalEventEngine.lastTuesdayBeforeNorooz walks
// backward from March 19 to the first Tuesday it finds).
//
// Everything here works in whole calendar days as {year, month, day}
// plain objects, never a JS Date -- Date's local-timezone constructor and
// UTC accessors are exactly the kind of "timezone surprise" the plan
// calls out avoiding. "Today" is always the caller's job to supply
// (getBrisbaneToday() below does that at the DOM edge); every function in
// this module is a pure function of its explicit inputs.

const EPOCH_WEEKDAY_OFFSET = 4; // 1970-01-01 (epoch day 0) was a Thursday.

function toEpochDay({ year, month, day }) {
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function fromEpochDay(epochDay) {
  const d = new Date(epochDay * 86_400_000);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function weekdayForEpochDay(epochDay) {
  // 0 = Sunday ... 2 = Tuesday, matching JS Date#getDay/getUTCDay.
  return ((epochDay % 7) + 7 + EPOCH_WEEKDAY_OFFSET) % 7;
}

export function daysBetween(fromParts, toParts) {
  return toEpochDay(toParts) - toEpochDay(fromParts);
}

export function yaldaDateForYear(year) {
  return { year, month: 12, day: 21 };
}

export function noroozDateForYear(year) {
  return { year, month: 3, day: 20 };
}

export function chaharshanbeSuriDateForYear(year) {
  let epoch = toEpochDay({ year, month: 3, day: 19 });
  for (let i = 0; i <= 13; i++) {
    if (weekdayForEpochDay(epoch) === 2) return fromEpochDay(epoch);
    epoch -= 1;
  }
  return null; // Unreachable: every 14-day span contains a Tuesday.
}

export const MOMENTS = Object.freeze({
  yalda: yaldaDateForYear,
  norooz: noroozDateForYear,
  chaharshanbeSuri: chaharshanbeSuriDateForYear,
});

/**
 * Next occurrence of a moment on or after todayParts. Searches the current
 * and next calendar year, which is always enough headroom for these three
 * annual, fixed-window moments (handles year rollover, e.g. Yalda in
 * December rolling into next January's search).
 */
export function nextOccurrence(todayParts, dateForYearFn) {
  for (const year of [todayParts.year, todayParts.year + 1]) {
    const candidate = dateForYearFn(year);
    if (daysBetween(todayParts, candidate) >= 0) return candidate;
  }
  return dateForYearFn(todayParts.year + 1);
}

/** Days until each moment's next occurrence, plus which one is nearest. */
export function upcomingMoments(todayParts) {
  const entries = Object.entries(MOMENTS).map(([id, fn]) => {
    const date = nextOccurrence(todayParts, fn);
    return { id, date, daysUntil: daysBetween(todayParts, date) };
  });
  const nearestId = entries.reduce((a, b) => (b.daysUntil < a.daysUntil ? b : a)).id;
  // Calendar order of next arrival (page spec §7 item 6), not object
  // insertion order -- Object.entries(MOMENTS) is always yalda/norooz/
  // chaharshanbeSuri regardless of which is actually soonest.
  return entries
    .map((e) => ({ ...e, isNearest: e.id === nearestId }))
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

// --- DOM edge: today's date in Australia/Brisbane (AEST, UTC+10, no DST) ---
export function getBrisbaneToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}
