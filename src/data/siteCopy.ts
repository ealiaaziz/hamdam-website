// Farsi site copy, extracted byte-exact from the previously approved
// /fa landing page. Do not hand-edit the Persian; Ealia authors changes.
//
// The `garden` block below was added 2026-08-27 and comes from a second
// approved source: the Persian half of the 1.3 release notes Ealia published
// on the App Store, read from itunes.apple.com/lookup and split into these
// fields by script rather than retyped. Every split point is a sentence
// boundary in his own text. The heading is his closing sentence, the body is
// the clause before it, and the habit title is the standalone fragment he
// opened that paragraph with. The riddle title is the single noun out of his
// own sentence: it is the one label here that no fragment supplied, and a
// bare noun was chosen over composing a phrase.
//
// One clause diverges between the two languages, deliberately. The English
// says the riddle waits "beside the verse you already came for" where his
// English release note says "alongside the picks you already had" -- app
// jargon a first-time visitor cannot read. The Farsi keeps his sentence
// whole, because rewriting it here would be authoring Persian.

export const faCopy = {
  tagline: "همدم، آینه‌ی قلب و آسمان توست.",
  subhead: "همدمی برای تأمل روزانه، ریشه‌دار در خرد شعر فارسی.",
  verseIntro: "شعری برای هر صبح. پنج شاعر. دو زبان. قرن‌ها خرد.",
  garden: {
    eyebrow: "گلستان",
    heading: "چیزی از تو خواسته نمی‌شود که روزت تاب آن را نداشته باشد.",
    body: "سه مربی، ذهن و حرکت و خواب، یک سطر «امروز» را به برنامه‌ای برای تمام روز تبدیل می‌کنند؛ برنامه‌ای که از داده‌های سلامتی، تقویم و هوای تو خوانده می‌شود.",
    items: [
      { title: "باغچه‌ای برای عادت‌ها", body: "یک کار کوچک بکار، بگو کِی انجام می‌شود و روزی که نشد چه می‌کنی، و ببین که هر روز که به آن برسی کمی رشد می‌کند." },
      { title: "چیستان", body: "هر روز یک چیستان در انتظار توست، در کنار همان پیشنهادهایی که پیش‌تر داشتی." },
    ],
  },
} as const;
