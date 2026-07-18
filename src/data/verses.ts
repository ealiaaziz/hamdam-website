// Verses for the landing pages, extracted byte-exact from the iOS app's
// bundled verse bank (Hamdam/Content/Verses/*.json) — Ganjoor-sourced and
// already validated. Do not hand-edit the Persian; re-extract instead.

export interface Verse {
  id: string;
  persian: string;
  english: string;
  poetEn: string;
  poetFa: string;
  source: string;
}

export const verses: readonly Verse[] = [
  {
    id: "hafez-016",
    persian: "غنچه گو تنگ‌دل از کارِ فروبسته مَباش\nکز دَمِ صبح مدد یابی و انفاسِ نسیم",
    english: "Tell the bud: do not be small-hearted at what remains closed — for from the morning's breath you will find help, and from the breeze's sigh.",
    poetEn: "Hafez",
    poetFa: "حافظ",
    source: "Divan-e Hafez, Ghazal 367",
  },
  {
    id: "rumi-011",
    persian: "گرچه خزان کرد جفاها بسی\nبین که بهاران چه وفا می‌کند",
    english: "Though autumn committed many cruelties — see what faithfulness spring brings.",
    poetEn: "Rumi",
    poetFa: "مولانا",
    source: "Divan-e Shams, Ghazal 1000",
  },
  {
    id: "parvin-008",
    persian: "گنجشک خرد گفت سحر با کبوتری\nکآخر تو هم برون کن ازین آشیان سری\nآفاق روشن است، چه خسبی به تیرگی\nروزی بپر، ببین چمن و جوئی و جری",
    english: "A small sparrow said at dawn to a pigeon: won't you too lift your head from this nest? / The horizons are bright — why do you sleep in darkness? Fly a day, go see the meadow, the stream, the brook.",
    poetEn: "Parvin",
    poetFa: "پروین",
    source: "Divan of Parvin Etesami, Mathnavis (حدیث مهر)",
  },
] as const;
