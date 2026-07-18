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
    persian: "غنچه گو تنگ‌دل از كارِ فروبسته مَباش\nكز دَمِ صبح مدد يابي و انفاسِ نسيم",
    english: "Tell the bud: do not be small-hearted at what remains closed — for from the morning's breath you will find help, and from the breeze's sigh.",
    poetEn: "Hafez",
    poetFa: "حافظ",
    source: "Divan-e Hafez, Ghazal 367",
  },
  {
    id: "rumi-011",
    persian: "گرچه خزان كرد جفاها بسي\nبين كه بهاران چه وفا مي‌كند",
    english: "Though autumn committed many cruelties — see what faithfulness spring brings.",
    poetEn: "Rumi",
    poetFa: "مولانا",
    source: "Divan-e Shams, Ghazal 1000",
  },
  {
    id: "parvin-008",
    persian: "گنجشك خرد گفت سحر با كبوتري\nكآخر تو هم برون كن ازين آشيان سري\nآفاق روشن است، چه خسبي به تيرگي\nروزي بپر، ببين چمن و جوئي و جري",
    english: "A small sparrow said at dawn to a pigeon: won't you too lift your head from this nest? / The horizons are bright — why do you sleep in darkness? Fly a day, go see the meadow, the stream, the brook.",
    poetEn: "Parvin",
    poetFa: "پروین",
    source: "Divan of Parvin Etesami, Mathnavis (حدیث مهر)",
  },
  {
    id: "parvin-013",
    persian: "اي دل عبث مخور غم دنيا را\nفكرت مكن نيامده فردا را\nكنج قفس چو نيك بينديشي\nچون گلشن است مرغ شكيبا را",
    english: "O heart, do not grieve vainly over this world, do not worry about a tomorrow not yet come / If you think clearly, even a cage's corner is a rose garden for the patient bird.",
    poetEn: "Parvin",
    poetFa: "پروین",
    source: "Divan of Parvin Etesami, Qasidas, Qasida 1",
  },
  {
    id: "saadi-003",
    persian: "اي نفسِ خرّمِ بادِ صبا\nاز برِ يار آمده‌اي، مرحبا!",
    english: "O joyful breath of the morning wind — you have come from the beloved; welcome!",
    poetEn: "Saadi",
    poetFa: "سعدی",
    source: "Divan-e Saadi, Ghazal 2",
  },
] as const;
