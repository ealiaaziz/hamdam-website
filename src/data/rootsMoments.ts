// GENERATED FILE. Do not edit by hand.
// Run: node scripts/generate-roots-data.mjs
//
// Source of truth is the shipped iOS app:
//   Hamdam/Hamdam/Calendar/CulturalMoment.swift  (catalogue)
//   Hamdam/Hamdam/Core/Localization.swift        (display names, section labels)
// Every Farsi string here was copied byte-exact by that script, never retyped.
// Generated 2026-07-26 from 51 banked moments.

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
  { id: "yalda", nameEn: "Yalda", nameFa: "یلدا", heritages: ["IR","AF","TJ"], regions: null, source: "culturalHeritage", rule: {"kind":"persianFixed","month":9,"day":30} },
  { id: "norooz", nameEn: "Norooz", nameFa: "نوروز", heritages: ["IR","AF","TJ"], regions: null, source: "culturalHeritage", rule: {"kind":"persianFixed","month":1,"day":1} },
  { id: "chaharshanbeSuri", nameEn: "Chaharshanbe Suri", nameFa: "چهارشنبه‌سوری", heritages: ["IR","AF","TJ"], regions: null, source: "culturalHeritage", rule: {"kind":"chaharshanbeSuriSpecial"} },
  { id: "mehregan", nameEn: "Mehregan", nameFa: "مهرگان", heritages: ["IR","AF","TJ"], regions: null, source: "culturalHeritage", rule: {"kind":"persianFixed","month":7,"day":10} },
  { id: "sizdahBedar", nameEn: "Sizdah Bedar", nameFa: "سیزده بدر", heritages: ["IR","AF","TJ"], regions: null, source: "culturalHeritage", rule: {"kind":"persianFixed","month":1,"day":13} },
  { id: "tirgan", nameEn: "Tirgan", nameFa: "تیرگان", heritages: ["IR"], regions: null, source: "culturalHeritage", rule: {"kind":"persianFixed","month":4,"day":10} },
  { id: "sepandarmazgan", nameEn: "Sepandarmazgan", nameFa: "سپندارمذگان", heritages: ["IR"], regions: null, source: "culturalHeritage", rule: {"kind":"persianFixed","month":11,"day":29} },
  { id: "auRUOKDay", nameEn: "R U OK? Day", heritages: ["AU"], regions: null, source: "culturalHeritage", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":9,"day":10},"2027":{"month":9,"day":9}}} },
  { id: "auNAIDOCWeek", nameEn: "NAIDOC Week", heritages: ["AU"], regions: null, source: "culturalHeritage", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":7,"day":5}}} },
  { id: "auReconciliationWeek", nameEn: "National Reconciliation Week", heritages: ["AU"], regions: null, source: "culturalHeritage", rule: {"kind":"gregorianFixed","month":5,"day":27} },
  { id: "auHarmonyDay", nameEn: "Harmony Day", heritages: ["AU"], regions: null, source: "culturalHeritage", rule: {"kind":"gregorianFixed","month":3,"day":21} },
  { id: "auRemembranceDay", nameEn: "Remembrance Day", heritages: ["AU"], regions: null, source: "culturalHeritage", rule: {"kind":"gregorianFixed","month":11,"day":11} },
  { id: "auMelbourneCup", nameEn: "Melbourne Cup", heritages: ["AU"], regions: null, source: "culturalHeritage", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":11,"day":3},"2027":{"month":11,"day":2}}} },
  { id: "auFirstDayOfSummer", nameEn: "First Day of Summer", heritages: ["AU"], regions: null, source: "culturalHeritage", rule: {"kind":"gregorianFixed","month":12,"day":1} },
  { id: "auNewYear", nameEn: "New Year's Day", heritages: ["AU"], regions: null, source: "governmentPublic", rule: {"kind":"gregorianFixed","month":1,"day":1} },
  { id: "auAustraliaDay", nameEn: "Australia Day", heritages: ["AU"], regions: null, source: "governmentPublic", rule: {"kind":"gregorianFixed","month":1,"day":26} },
  { id: "auGoodFriday", nameEn: "Good Friday", heritages: ["AU"], regions: null, source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":4,"day":3},"2027":{"month":3,"day":26}}} },
  { id: "auEasterSaturday", nameEn: "Easter Saturday", heritages: ["AU"], regions: ["AU-ACT","AU-NSW","AU-NT","AU-QLD","AU-SA","AU-VIC"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":4,"day":4},"2027":{"month":3,"day":27}}} },
  { id: "auEasterSunday", nameEn: "Easter Sunday", heritages: ["AU"], regions: ["AU-ACT","AU-NSW","AU-NT","AU-QLD","AU-SA","AU-VIC","AU-WA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":4,"day":5},"2027":{"month":3,"day":28}}} },
  { id: "auEasterMonday", nameEn: "Easter Monday", heritages: ["AU"], regions: null, source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":4,"day":6},"2027":{"month":3,"day":29}}} },
  { id: "auAnzacDay", nameEn: "ANZAC Day", heritages: ["AU"], regions: null, source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":4,"day":25},"2027":{"month":4,"day":25}}} },
  { id: "auAnzacDayAdditional", nameEn: "ANZAC Day (additional public holiday)", heritages: ["AU"], regions: ["AU-ACT","AU-NSW","AU-WA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":4,"day":27},"2027":{"month":4,"day":26}}} },
  { id: "auAnzacDayAdditionalQldNt", nameEn: "ANZAC Day (additional public holiday)", heritages: ["AU"], regions: ["AU-NT","AU-QLD"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2027":{"month":4,"day":26}}} },
  { id: "auChristmasDay", nameEn: "Christmas Day", heritages: ["AU"], regions: null, source: "governmentPublic", rule: {"kind":"gregorianFixed","month":12,"day":25} },
  { id: "auChristmasDaySubstitute", nameEn: "Christmas Day (substitute holiday)", heritages: ["AU"], regions: null, source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2027":{"month":12,"day":27}}} },
  { id: "auBoxingDay", nameEn: "Boxing Day", heritages: ["AU"], regions: ["AU-ACT","AU-NSW","AU-NT","AU-QLD","AU-TAS","AU-VIC","AU-WA"], source: "governmentPublic", rule: {"kind":"gregorianFixed","month":12,"day":26} },
  { id: "auBoxingDaySubstitute", nameEn: "Boxing Day (additional public holiday)", heritages: ["AU"], regions: ["AU-ACT","AU-NSW","AU-NT","AU-QLD","AU-TAS","AU-VIC","AU-WA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":12,"day":28},"2027":{"month":12,"day":28}}} },
  { id: "auQldLabourDay", nameEn: "Labour Day", heritages: ["AU"], regions: ["AU-QLD"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":5,"day":4},"2027":{"month":5,"day":3}}} },
  { id: "auQldEkka", nameEn: "Ekka (Royal Queensland Show)", heritages: ["AU"], regions: ["AU-QLD"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":8,"day":12}}} },
  { id: "auQldKingsBirthday", nameEn: "King's Birthday", heritages: ["AU"], regions: ["AU-QLD"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":10,"day":5},"2027":{"month":10,"day":4}}} },
  { id: "auNswLabourDay", nameEn: "Labour Day", heritages: ["AU"], regions: ["AU-NSW"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":10,"day":5},"2027":{"month":10,"day":4}}} },
  { id: "auNswKingsBirthday", nameEn: "King's Birthday", heritages: ["AU"], regions: ["AU-NSW"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":6,"day":8},"2027":{"month":6,"day":14}}} },
  { id: "auVicLabourDay", nameEn: "Labour Day", heritages: ["AU"], regions: ["AU-VIC"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":3,"day":9},"2027":{"month":3,"day":8}}} },
  { id: "auVicKingsBirthday", nameEn: "King's Birthday", heritages: ["AU"], regions: ["AU-VIC"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":6,"day":8},"2027":{"month":6,"day":14}}} },
  { id: "auWaLabourDay", nameEn: "Labour Day", heritages: ["AU"], regions: ["AU-WA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":3,"day":2},"2027":{"month":3,"day":1}}} },
  { id: "auWaDay", nameEn: "Western Australia Day", heritages: ["AU"], regions: ["AU-WA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":6,"day":1},"2027":{"month":6,"day":7}}} },
  { id: "auWaKingsBirthday", nameEn: "King's Birthday", heritages: ["AU"], regions: ["AU-WA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":9,"day":28},"2027":{"month":9,"day":27}}} },
  { id: "auActCanberraDay", nameEn: "Canberra Day", heritages: ["AU"], regions: ["AU-ACT"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":3,"day":9},"2027":{"month":3,"day":8}}} },
  { id: "auActReconciliationDay", nameEn: "Reconciliation Day", heritages: ["AU"], regions: ["AU-ACT"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":6,"day":1},"2027":{"month":5,"day":31}}} },
  { id: "auActKingsBirthday", nameEn: "King's Birthday", heritages: ["AU"], regions: ["AU-ACT"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":6,"day":8},"2027":{"month":6,"day":14}}} },
  { id: "auActLabourDay", nameEn: "Labour Day", heritages: ["AU"], regions: ["AU-ACT"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":10,"day":5},"2027":{"month":10,"day":4}}} },
  { id: "auSaAdelaideCupDay", nameEn: "Adelaide Cup Day", heritages: ["AU"], regions: ["AU-SA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":3,"day":9},"2027":{"month":3,"day":8}}} },
  { id: "auSaKingsBirthday", nameEn: "King's Birthday", heritages: ["AU"], regions: ["AU-SA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":6,"day":8},"2027":{"month":6,"day":14}}} },
  { id: "auSaLabourDay", nameEn: "Labour Day", heritages: ["AU"], regions: ["AU-SA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":10,"day":5},"2027":{"month":10,"day":4}}} },
  { id: "auSaProclamationDay", nameEn: "Proclamation Day", heritages: ["AU"], regions: ["AU-SA"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":12,"day":28},"2027":{"month":12,"day":28}}} },
  { id: "auTasEightHoursDay", nameEn: "Eight Hours Day", heritages: ["AU"], regions: ["AU-TAS"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":3,"day":9},"2027":{"month":3,"day":8}}} },
  { id: "auTasKingsBirthday", nameEn: "King's Birthday", heritages: ["AU"], regions: ["AU-TAS"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":6,"day":8},"2027":{"month":6,"day":14}}} },
  { id: "auTasRecreationDay", nameEn: "Recreation Day", heritages: ["AU"], regions: ["AU-TAS"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":11,"day":2},"2027":{"month":11,"day":1}}} },
  { id: "auNtMayDay", nameEn: "May Day", heritages: ["AU"], regions: ["AU-NT"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":5,"day":4},"2027":{"month":5,"day":3}}} },
  { id: "auNtKingsBirthday", nameEn: "King's Birthday", heritages: ["AU"], regions: ["AU-NT"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":6,"day":8},"2027":{"month":6,"day":14}}} },
  { id: "auNtPicnicDay", nameEn: "Picnic Day", heritages: ["AU"], regions: ["AU-NT"], source: "governmentPublic", rule: {"kind":"explicitYearlyDates","dates":{"2026":{"month":8,"day":3},"2027":{"month":8,"day":2}}} },
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
  heritage: { en: "Where you come from", fa: "از کجا می‌آیی؟" },
  region: { en: "Where you live", fa: "الان کجا زندگی می‌کنی؟" },
  heritageEmpty: { en: "Set your heritage to see cultural moments", fa: "میراث خودت را تنظیم کن تا مناسبت‌های فرهنگی را ببینی" },
  regionEmpty: { en: "Set your region to see local holidays", fa: "منطقه‌ات را تنظیم کن تا تعطیلات محلی را ببینی" },
  comingSoon: { en: "Coming soon", fa: "به‌زودی" },
  notSet: { en: "Not set", fa: "تنظیم نشده" },
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
  { code: "IR", nameEn: "Iran", nameFa: "ایران" },
  { code: "AF", nameEn: "Afghanistan", nameFa: "افغانستان" },
  { code: "TJ", nameEn: "Tajikistan", nameFa: "تاجیکستان" },
  { code: "AU", nameEn: "Australia", nameFa: "استرالیا" },
];

export const ROADMAP_COUNTRIES: readonly NamedPlace[] = [
  { code: "GB", nameEn: "United Kingdom", nameFa: "بریتانیا" },
  { code: "US", nameEn: "United States", nameFa: "ایالات متحده" },
  { code: "NL", nameEn: "Netherlands", nameFa: "هلند" },
  { code: "DE", nameEn: "Germany", nameFa: "آلمان" },
];

/**
 * The regions Hamdam resolves today. English-only on purpose: the app's own
 * regionDisplayName renders "Queensland, Australia" in both languages, with
 * only the country name localised.
 */
export const AU_REGIONS: readonly NamedPlace[] = [
  { code: "AU-ACT", nameEn: "Australian Capital Territory" },
  { code: "AU-NSW", nameEn: "New South Wales" },
  { code: "AU-NT", nameEn: "Northern Territory" },
  { code: "AU-QLD", nameEn: "Queensland" },
  { code: "AU-SA", nameEn: "South Australia" },
  { code: "AU-TAS", nameEn: "Tasmania" },
  { code: "AU-VIC", nameEn: "Victoria" },
  { code: "AU-WA", nameEn: "Western Australia" },
];
