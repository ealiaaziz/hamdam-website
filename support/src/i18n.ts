// Every word a requester reads, in both languages.
//
// Hamdam is a Persian poetry app. Until now its support desk answered
// everyone in English, which quietly tells a Persian speaker that the app is
// for them and the help is for somebody else.
//
// The Farsi here was authored for this desk, not generated from the iOS
// app's copy bank the way the marketing site's Persian is. That is a
// deliberate exception and it is worth knowing about: nothing in the app or
// the website had support-desk vocabulary in it, so there was nothing to
// draw from. It is checked by scripts/check-persian.mjs for the corruption
// modes that matter (mojibake, stray bidi controls, Latin letters spliced
// into Persian words), but a byte check cannot tell you whether the tone is
// right. Read it before it meets a customer.
//
// Written plainly on purpose. Support copy is read by someone who is already
// annoyed, so it is short, uses ordinary words, and never reaches for
// literary Persian just because the product is literary.

export type Locale = 'en' | 'fa';

export const LOCALES: readonly Locale[] = ['en', 'fa'];

export function parseLocale(value: string | undefined | null): Locale {
  return value === 'fa' ? 'fa' : 'en';
}

/**
 * The language someone wrote in.
 *
 * Used for email, which arrives with no locale attached. A Persian speaker
 * who writes to the desk in Persian should not get an English reply just
 * because the mailbox has no URL prefix to read.
 *
 * The threshold is a proportion rather than a presence test: an English
 * message quoting one Persian word is still English, and answering it in
 * Persian would be worse than the mistake it is trying to avoid.
 */
export function detectLocale(text: string): Locale {
  const letters = text.replace(/[^\p{L}]/gu, '');
  if (letters.length === 0) return 'en';
  const persian = (letters.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/gu) ?? []).length;
  return persian / letters.length >= 0.3 ? 'fa' : 'en';
}

/** Right-to-left is a property of the locale, not a per-page decision. */
export function direction(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'fa' ? 'rtl' : 'ltr';
}

/** Path prefix, so links inside a page stay in the language they were opened in. */
export function localePath(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return locale === 'fa' ? `/fa${clean === '/' ? '' : clean}` : clean;
}

export interface Strings {
  brandSupport: string;
  otherLanguage: string;
  otherLanguageHref: string;

  submitTitle: string;
  submitHeading: string;
  submitLede: string;
  fieldName: string;
  fieldEmail: string;
  fieldSubject: string;
  fieldDescription: string;
  /**
   * The line under the description box saying what happens to what they type.
   *
   * Added 2026-08-08. The desk sends the subject, the description and every
   * later message on the thread to Cloudflare Workers AI so the assistant can
   * draft a reply, and until this line existed the only place that was written
   * down was a design document nobody submitting a ticket has read. Telling
   * somebody after the fact that a third party processed the paragraph they
   * just wrote about their problem is not a disclosure, it is an apology.
   *
   * Placed under the field rather than in the lede at the top, because the
   * moment it is useful is the moment they are deciding what to type, and it
   * says what to do about it rather than only what happens: leave the part out
   * and say so. It also says a person reads every ticket regardless, because
   * without that the notice reads as "a robot will handle this", which is both
   * discouraging and untrue.
   */
  submitAiNotice: string;
  fieldImpact: string;
  fieldUrgency: string;
  impactLow: string;
  impactMedium: string;
  impactHigh: string;
  urgencyLow: string;
  urgencyMedium: string;
  urgencyHigh: string;
  submitButton: string;
  errorAllFields: string;
  errorEmail: string;
  trackLink: string;

  trackTitle: string;
  trackHeading: string;
  trackLede: string;
  fieldTicketId: string;
  fieldToken: string;
  trackButton: string;
  trackError: string;

  statusNoticeCreated: string;
  statusNoticeEmailed: string;
  openedAt: string;
  firstResponseTarget: string;
  resolutionTarget: string;
  noMessages: string;
  addReply: string;
  sendButton: string;
  emailMeButton: string;
  emailMeHint: string;
  closedNotice: string;
  you: string;
  supportAuthor: string;
  systemAuthor: string;
  overdue: string;

  statusNew: string;
  statusOpen: string;
  statusPending: string;
  statusResolved: string;
  statusClosed: string;

  ackGreeting: (name: string | null) => string;
  ackOpened: string;
  ackTrack: string;
  ackOrReply: string;
  ackPortalFast: string;
  priorityLine: (priority: string, first: string, resolve: string) => string;

  footer: string;

  // What the desk says when the model is unavailable, over budget, or
  // refused. These are the words a requester actually reads on a bad day, so
  // they exist in both languages: falling back to English on a Persian
  // ticket would announce the failure more loudly than the failure itself.
  replySolutionIntro: string;
  replySolutionOutro: string;
  replyClarifyIntro: string;
  replyAlreadyEscalated: string;
  replyExhausted: string;
  replyOutsideWritten: string;
  replyHamdamUnsourced: string;
  replyGeneralAdvice: string;
  replyClosed: string;
}

const EN: Strings = {
  brandSupport: 'Support',
  otherLanguage: 'فارسی',
  otherLanguageHref: '/fa',

  submitTitle: 'Get help',
  submitHeading: 'How can we help?',
  submitLede: 'Tell us what is going on. You will get an answer on the next page, straight away, and a copy by email.',
  fieldName: 'Your name',
  fieldEmail: 'Your email',
  fieldSubject: 'Subject',
  fieldDescription: 'What is happening?',
  submitAiNotice:
    'An automated assistant reads what you write here so it can answer you straight away, and it runs on Cloudflare Workers AI. Please leave out anything you would not want processed that way. A person on the team reads every ticket either way.',
  fieldImpact: 'Who is affected?',
  fieldUrgency: 'How urgent is it?',
  impactLow: 'Just me',
  impactMedium: 'My whole team',
  impactHigh: 'The whole organisation',
  urgencyLow: 'It can wait',
  urgencyMedium: 'It is slowing me down',
  urgencyHigh: 'I am stuck, I cannot work',
  submitButton: 'Submit ticket',
  errorAllFields: 'Please fill in every field.',
  errorEmail: 'That email address does not look right. We send your ticket and every reply to it, so it has to be one that works.',
  trackLink: 'Already have a ticket?',

  trackTitle: 'Find your ticket',
  trackHeading: 'Find your ticket',
  trackLede: 'Both of these are in the email we sent when you opened it.',
  fieldTicketId: 'Ticket number',
  fieldToken: 'Tracking code',
  trackButton: 'Open it',
  trackError: 'That ticket ID or tracking code looks wrong.',

  statusNoticeCreated: 'Ticket created. A confirmation email is on its way to',
  statusNoticeEmailed: 'On its way. It carries this conversation exactly as it stands now, to',
  openedAt: 'opened',
  firstResponseTarget: 'First response target',
  resolutionTarget: 'Resolution target',
  noMessages: 'No messages yet.',
  addReply: 'Add a reply',
  sendButton: 'Send',
  emailMeButton: 'Email me this conversation',
  emailMeHint: 'Sends everything above as it stands right now. Keep going here as long as you like; ask again whenever you want the latest version.',
  closedNotice: 'This ticket is closed. Email developer@hamdam.com.au to reopen it.',
  you: 'You',
  supportAuthor: 'Hamdam Support',
  systemAuthor: 'System',
  overdue: 'First response overdue',

  statusNew: 'new',
  statusOpen: 'open',
  statusPending: 'waiting on you',
  statusResolved: 'resolved',
  statusClosed: 'closed',

  ackGreeting: (name) => (name ? `Hi ${name.split(' ')[0]},` : 'Hi,'),
  ackOpened: 'Thanks for reaching out. We have opened a support ticket for you:',
  ackTrack: 'You can track progress and reply any time here:',
  ackOrReply: 'Or just reply to this email. Either way, it lands in the same place.',
  ackPortalFast: 'One thing worth knowing: the tracking page answers straight away, so if we already have a fix written up for what you are seeing, you will get it there in seconds rather than waiting on this mailbox.',
  priorityLine: (priority, first, resolve) =>
    `Priority: ${priority}. Our target is to make first contact within ${first} and to resolve within ${resolve}.`,

  footer: 'Hamdam Support &middot; every ticket is emailed to and from developer@hamdam.com.au',

  replySolutionIntro: 'Thanks for the extra detail. This looks like it might be the one:',
  replySolutionOutro: 'If that does not do it, say so and I will pass this to one of the team.',
  replyClarifyIntro: 'Thanks, that helps. One more thing and I should be able to narrow it down:',
  replyAlreadyEscalated:
    'Thanks, I have added that to the ticket. It is already with a person on the team and they will see it, so there is nothing you need to do.',
  replyExhausted:
    'I have run out of things I know to try for this one, so I am handing it to a person on the team. They can see everything you have written here, so you will not need to repeat yourself.',
  replyOutsideWritten:
    'That is outside what I have written down, so I am passing it to a person rather than guessing at an answer. They can see this whole conversation.',
  replyHamdamUnsourced:
    'That is a question about Hamdam itself and I do not have it written down, so I am passing it to a person rather than guessing. They can see this whole conversation, so you will not need to repeat any of it.',
  replyGeneralAdvice:
    'That is general advice rather than something from our own notes on the app, so tell me if it does not match what you are seeing and I will pass it to a person.',
  replyClosed:
    'Closed, as you asked. I am emailing you the whole conversation for your records. If it comes up again, reply to that email and this ticket reopens.',
};

// The Farsi. Authored here, reviewed by nobody yet, and flagged as such in
// the module header.
const FA: Strings = {
  brandSupport: 'پشتیبانی',
  otherLanguage: 'English',
  otherLanguageHref: '/',

  submitTitle: 'درخواست پشتیبانی',
  submitHeading: 'چطور می‌توانیم کمک کنیم؟',
  submitLede: 'بنویسید چه اتفاقی افتاده است. در همان صفحه‌ی بعد پاسخ می‌گیرید و یک نسخه هم به ایمیل شما فرستاده می‌شود.',
  fieldName: 'نام شما',
  fieldEmail: 'ایمیل شما',
  fieldSubject: 'موضوع',
  fieldDescription: 'چه اتفاقی افتاده است؟',
  submitAiNotice:
    'یک دستیار خودکار آنچه را اینجا می‌نویسید می‌خواند تا بتواند بی‌درنگ پاسخ بدهد، و این دستیار روی Cloudflare Workers AI اجرا می‌شود. لطفاً چیزی را که نمی‌خواهید به این شکل پردازش شود ننویسید. در هر حال یک نفر از تیم همه‌ی درخواست‌ها را می‌خواند.',
  fieldImpact: 'چه کسانی درگیر شده‌اند؟',
  fieldUrgency: 'چقدر فوری است؟',
  impactLow: 'فقط خودم',
  impactMedium: 'همه‌ی تیم من',
  impactHigh: 'همه‌ی سازمان',
  urgencyLow: 'می‌تواند صبر کند',
  urgencyMedium: 'کارم را کند کرده است',
  urgencyHigh: 'کارم کاملاً متوقف شده است',
  submitButton: 'ثبت درخواست',
  errorAllFields: 'لطفاً همه‌ی بخش‌ها را پر کنید.',
  errorEmail: 'نشانی ایمیل درست به نظر نمی‌رسد. درخواست و همه‌ی پاسخ‌ها به همین نشانی فرستاده می‌شود.',
  trackLink: 'از قبل درخواستی دارید؟',

  trackTitle: 'پیگیری درخواست',
  trackHeading: 'پیگیری درخواست',
  trackLede: 'هر دو مورد در ایمیلی که هنگام ثبت درخواست فرستادیم آمده است.',
  fieldTicketId: 'شماره‌ی درخواست',
  fieldToken: 'کد پیگیری',
  trackButton: 'نمایش',
  trackError: 'شماره‌ی درخواست یا کد پیگیری درست نیست.',

  statusNoticeCreated: 'درخواست شما ثبت شد. ایمیل تأیید در راه است به',
  statusNoticeEmailed: 'فرستاده شد. همین گفت‌وگو دقیقاً به همین شکل رفت به',
  openedAt: 'ثبت‌شده در',
  firstResponseTarget: 'زمان هدف برای نخستین پاسخ',
  resolutionTarget: 'زمان هدف برای حل شدن',
  noMessages: 'هنوز پیامی نیست.',
  addReply: 'پاسخ شما',
  sendButton: 'ارسال',
  emailMeButton: 'این گفت‌وگو را برایم ایمیل کن',
  emailMeHint: 'همه‌ی موارد بالا را به همین شکل فعلی می‌فرستد. هر وقت خواستید همین‌جا ادامه دهید و هر بار که نسخه‌ی تازه خواستید دوباره درخواست کنید.',
  closedNotice: 'این درخواست بسته شده است. برای بازکردن دوباره به developer@hamdam.com.au ایمیل بزنید.',
  you: 'شما',
  supportAuthor: 'پشتیبانی همدم',
  systemAuthor: 'سامانه',
  overdue: 'نخستین پاسخ از زمان هدف گذشته است',

  statusNew: 'تازه',
  statusOpen: 'در حال بررسی',
  statusPending: 'منتظر پاسخ شما',
  statusResolved: 'حل شد',
  statusClosed: 'بسته',

  ackGreeting: (name) => (name ? `${name.split(' ')[0]} عزیز،` : 'سلام،'),
  ackOpened: 'ممنون که پیام دادید. درخواست پشتیبانی شما ثبت شد:',
  ackTrack: 'هر زمان خواستید می‌توانید از این نشانی وضعیت را ببینید و پاسخ بدهید:',
  ackOrReply: 'یا کافی است به همین ایمیل پاسخ دهید. هر دو به یک جا می‌رسد.',
  ackPortalFast: 'یک نکته: صفحه‌ی پیگیری بی‌درنگ پاسخ می‌دهد، پس اگر برای چیزی که می‌بینید از قبل راه‌حلی نوشته باشیم، در چند ثانیه همان‌جا می‌گیرید و لازم نیست منتظر ایمیل بمانید.',
  priorityLine: (priority, first, resolve) =>
    `اولویت: ${priority}. هدف ما این است که ظرف ${first} نخستین پاسخ را بدهیم و ظرف ${resolve} مشکل را حل کنیم.`,

  footer: 'پشتیبانی همدم &middot; هر درخواست از نشانی developer@hamdam.com.au فرستاده و دریافت می‌شود',

  replySolutionIntro: 'ممنون از توضیح بیشتر. به نظر می‌رسد این مورد باشد:',
  replySolutionOutro: 'اگر این مشکل را حل نکرد، بگویید تا درخواست را به یکی از همکاران بسپارم.',
  replyClarifyIntro: 'ممنون، کمک کرد. یک نکته‌ی دیگر بگویید تا بتوانم دقیق‌تر شوم:',
  replyAlreadyEscalated:
    'ممنون، این را هم به درخواست اضافه کردم. درخواست شما همین حالا دست یکی از همکاران است و آن را می‌بیند، پس کاری لازم نیست انجام دهید.',
  replyExhausted:
    'هر چه بلد بودم برای این مورد امتحان شد، پس آن را به یکی از همکاران می‌سپارم. همه‌ی آنچه اینجا نوشته‌اید را می‌بیند و لازم نیست دوباره توضیح دهید.',
  replyOutsideWritten:
    'این موضوع بیرون از چیزی است که نزد ما نوشته شده، پس به جای حدس زدن آن را به یکی از همکاران می‌سپارم. کل این گفت‌وگو را می‌بیند.',
  replyHamdamUnsourced:
    'این پرسشی درباره‌ی خود همدم است و پاسخ آن نزد ما نوشته نشده، پس به جای حدس زدن آن را به یکی از همکاران می‌سپارم. کل این گفت‌وگو را می‌بیند و لازم نیست چیزی را دوباره بگویید.',
  replyGeneralAdvice:
    'این یک راهنمایی عمومی است و از یادداشت‌های خود ما درباره‌ی برنامه نیامده، پس اگر با آنچه می‌بینید جور نبود بگویید تا آن را به یکی از همکاران بسپارم.',
  replyClosed:
    'همان‌طور که خواستید بسته شد. کل گفت‌وگو را برای بایگانی خودتان ایمیل می‌کنم. اگر دوباره پیش آمد، به همان ایمیل پاسخ دهید تا این درخواست باز شود.',
};

const TABLE: Record<Locale, Strings> = { en: EN, fa: FA };

export function strings(locale: Locale): Strings {
  return TABLE[locale];
}
