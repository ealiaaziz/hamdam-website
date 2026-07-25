// The six signals Hamdam reads, and the one-clause promise attached to each.
// Moved here 2026-07-25 from ContextConstellation.astro, byte-exact, so the
// privacy section can carry them without a second copy of the Persian. The
// constellation component still imports them and still works; the homepage
// simply no longer gives it a section of its own, where it competed with the
// privacy claim these clauses actually support.
//
// Exactly the six signal families in the primary message (page spec §5
// item 2), each traceable to Privacy Policy §1: mood/health from §1.1,
// weather from §1.3, calendar from §1.2. Season and time of day are the
// two that need no permission at all (derived from the device's own
// clock/locale, not a protected resource), so they have no numbered
// subsection of their own -- that is the honest reason, not an omission.
// Flagged for Ealia to confirm the wording reads right against the
// shipped policy text before this section is considered final.
export const CONTEXT_SIGNALS = [
  {
    id: 'mood',
    labelEn: 'Mood',
    labelFa: 'حال و هوا',
    clauseEn: 'Only if you log it. A nudge in tone, not a score.',
    clauseFa: 'فقط اگر خودت ثبت کنی؛ اثرش در لحن است، نه در امتیاز.',
  },
  {
    id: 'weather',
    labelEn: 'Weather',
    labelFa: 'آب‌وهوا',
    clauseEn: "Through Apple's WeatherKit, on your device.",
    clauseFa: 'از طریق WeatherKit اپل، روی همان دستگاه تو.',
  },
  {
    id: 'season',
    labelEn: 'Season',
    labelFa: 'فصل',
    clauseEn: 'Where you are, time of year.',
    clauseFa: 'بر اساس موقعیت و فصل سال.',
  },
  {
    id: 'time',
    labelEn: 'Time of day',
    labelFa: 'ساعت روز',
    clauseEn: 'Morning, midday, evening, night.',
    clauseFa: 'صبح، ظهر، عصر، شب.',
  },
  {
    id: 'calendar',
    labelEn: 'Calendar',
    labelFa: 'تقویم',
    clauseEn: 'Cultural moments only, never event details.',
    clauseFa: 'فقط مناسبت‌های فرهنگی، هرگز جزئیات رویدادها.',
  },
  {
    id: 'health',
    labelEn: 'Health',
    labelFa: 'سلامت',
    clauseEn: 'Only if you choose, only on your device.',
    clauseFa: 'فقط اگر خودت بخواهی، فقط روی همان دستگاه.',
  },
] as const;

export type ContextSignal = (typeof CONTEXT_SIGNALS)[number];

export const CONTEXT_SIGNAL_ICONS: Record<ContextSignal['id'], string> = {
  mood: 'M12 4a8 8 0 100 16 8 8 0 000-16zM9 10h.01M15 10h.01M8.5 14.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5',
  weather: 'M7 17a4 4 0 010-8 5 5 0 019.6-1.5A4 4 0 0117 17H7z',
  season: 'M12 3c0 6-6 6-6 12a6 6 0 0012 0c0-6-6-6-6-12z',
  time: 'M12 4a8 8 0 100 16 8 8 0 000-16zm0 4v4l3 2',
  calendar: 'M4 9h16M7 4v3M17 4v3M5 6h14a1 1 0 011 1v12a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z',
  health: 'M4 12h4l2-6 4 12 2-6h4',
};
