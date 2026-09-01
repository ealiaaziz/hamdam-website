import { escapeHtml, textToSafeHtml, ticketPublicId } from '../ids.js';

// The two emails the change flow sends the channel owner: one asking whether
// to apply a change, and one telling her it is live.
//
// Both are written for someone who does not read code, in the language she
// writes in. The Farsi here is authored rather than generated, like the rest
// of i18n.ts, and like that file it has not been reviewed by a native speaker
// yet.
//
// The approval email is the one that matters. It is the thing she answers, and
// her answer merges code into a channel with a real audience, so it has to say
// plainly what will change and make "yes" and "no" equally easy. It never
// describes the diff: she authorises the behaviour, and CI checks the code.

const WRAP_OPEN = `<div dir="rtl" style="font-family:Vazirmatn,Tahoma,sans-serif;color:#241E15;max-width:34rem;margin:0 auto;line-height:1.8">`;
const WRAP_CLOSE = `</div>`;
const RULE = `<hr style="border:none;border-top:1px solid #241E15;opacity:0.15;margin:1.25rem 0">`;
const FOOTER = `<p style="font-size:0.8rem;color:#574A38">Hamdam Support &middot; developer@hamdam.com.au</p>`;

/**
 * Ask her whether to apply a change.
 *
 * The reference is printed because her reply is matched against it: an email
 * thread quotes its own history, so a "yes" has to be attachable to one
 * change rather than to whichever one is quoted lowest in the message.
 */
export function changeProposalEmail(opts: {
  ticketId: number;
  description: string;
  changeRef: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);

  // The description comes from the agent, which is a model, so it is escaped
  // like any other text this desk did not write.
  const described = textToSafeHtml(opts.description)
    || '<p>توضیحی ثبت نشده است. لطفاً فعلاً تأیید نکنید و به همین ایمیل پاسخ دهید.</p>';

  const html = `${WRAP_OPEN}
<p>سلام،</p>
<p>مشکلی که گزارش کردید بررسی شد و یک تغییر آماده است. قبل از اینکه روی ربات
اصلی اعمال شود، می‌خواهیم شما تأیید کنید.</p>
<p style="font-weight:bold">این تغییر چه می‌کند:</p>
${described}
<p>اگر درست است، کافی است در پاسخ به همین ایمیل بنویسید <b>بله</b>.<br>
اگر نه، یا اگر مطمئن نیستید، بنویسید <b>نه</b> و هیچ تغییری اعمال نمی‌شود.</p>
<p>اگر پاسخ ندهید هیچ اتفاقی نمی‌افتد. سکوت به معنی تأیید نیست.</p>
<p style="font-size:0.85rem;color:#574A38">شناسهٔ این تغییر: ${escapeHtml(opts.changeRef)}</p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`;

  return { subject: `[${publicId}] تأیید تغییر ربات`, html };
}

/** Tell her the change she approved is live. */
export function changeShippedEmail(opts: {
  ticketId: number;
  description: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const described = textToSafeHtml(opts.description);

  const html = `${WRAP_OPEN}
<p>سلام،</p>
<p>تغییری که تأیید کردید اعمال شد و از همین حالا روی ربات فعال است.</p>
${described}
<p>لطفاً یک بار امتحان کنید. اگر درست شده بود، در پاسخ بنویسید
<b>ممنون، درست شد</b> تا این درخواست را ببندیم. اگر هنوز مشکل دارد، همین‌جا
بنویسید چه دیدید.</p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`;

  return { subject: `[${publicId}] تغییر ربات اعمال شد`, html };
}

/**
 * A question from the agent, or a reason it is not building what she asked.
 *
 * Both exist so a request never ends in silence. She replies to this email
 * like any other, the desk relays her answer onto the issue, and the agent
 * picks it up from there.
 *
 * Deliberately not dressed up as an apology or as a decision that has been
 * made for her. A question is a question; a stand-down says what will not
 * happen and who to talk to, so she knows the next move is hers or Ealia's
 * rather than wondering whether anything is happening at all.
 */
export function agentQuestionEmail(opts: {
  ticketId: number;
  question: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const html = `${WRAP_OPEN}
<p>سلام،</p>
<p>برای اینکه درست انجامش بدهیم، یک سؤال داریم:</p>
${textToSafeHtml(opts.question)}
<p>در پاسخ به همین ایمیل بنویسید. تا وقتی جواب ندهید هیچ تغییری اعمال
نمی‌شود.</p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`;

  return { subject: `[${publicId}] یک سؤال دربارهٔ درخواست شما`, html };
}

/**
 * The token the bot repo's workflow posts when a run died without saying why.
 *
 * The workflow guarantees a marker so she is never left in silence, but it
 * does not write her Farsi: that lives here, with the rest of it. A run that
 * crashed is not something to explain to her in technical terms, so this says
 * what it means for her instead, which is that it is being looked at.
 */
const RUN_FAILED = 'AGENT_RUN_FAILED';

export function agentBlockedEmail(opts: {
  ticketId: number;
  reason: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);

  if (opts.reason.trim() === RUN_FAILED) {
    return {
      subject: `[${publicId}] درخواست شما در حال بررسی است`,
      html: `${WRAP_OPEN}
<p>سلام،</p>
<p>درخواست شما ثبت شد، ولی این بار نتوانستیم خودکار انجامش دهیم. ایلیا
نگاهش می‌کند و خبر می‌دهیم.</p>
<p>لازم نیست دوباره بفرستید.</p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`,
    };
  }

  const html = `${WRAP_OPEN}
<p>سلام،</p>
<p>این مورد را نمی‌توانیم همین‌طور انجام دهیم. دلیلش این است:</p>
${textToSafeHtml(opts.reason)}
<p>اگر باز هم می‌خواهید انجام شود، در پاسخ به همین ایمیل بنویسید تا با ایلیا
در میان بگذاریم.</p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`;

  return { subject: `[${publicId}] دربارهٔ درخواست شما`, html };
}

/**
 * She approved it and it has not shipped, because something is holding it.
 *
 * The gap this closes: the desk only ever watched for a merge, so a change
 * that was approved and then refused by the merge guard produced nothing at
 * all. On 2026-08-31 that happened on a change she had asked for, and she
 * asked twice whether it had been applied while the answer sat on a pull
 * request she has no reason to ever look at.
 *
 * The reason arrives as a token from the workflow, because the Farsi lives
 * here. Anything unrecognised still reaches her: the words matter less than
 * her knowing it is stuck and that a person has been told.
 */
const HELD_REASONS: Record<string, string> = {
  NEEDS_A_PERSON: 'این تغییر بخشی را عوض می‌کند که باید یک نفر قبلش ببیند.',
  CHECKS_FAILED: 'آزمایش‌های خودکار روی این تغییر رد شدند، و تغییری که آزمایش‌ها را رد کند روی ربات اعمال نمی‌شود.',
  CHECKS_RUNNING: 'آزمایش‌های خودکار هنوز تمام نشده‌اند.',
  CONFLICT: 'این تغییر با نسخهٔ فعلی ربات همخوانی ندارد و باید دوباره ساخته شود.',
  DEPLOY_FAILED: 'تغییر آماده بود ولی هنگام نصب روی ربات خطا داد، برای همین اعمال نشده است.',
  DEPLOY_NOT_CONFIRMED: 'تغییر آماده است ولی هنوز مطمئن نشده‌ایم روی ربات نشسته باشد.',
};

export function changeHeldEmail(opts: {
  ticketId: number;
  reason: string;
}): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const token = opts.reason.split(':')[0]?.trim() ?? '';
  const explained = HELD_REASONS[token];

  const because = explained
    ? `<p>${explained}</p>`
    : '<p>یک مانع فنی جلوی اعمال شدنش را گرفته است.</p>';

  const html = `${WRAP_OPEN}
<p>سلام،</p>
<p>تغییری که تأیید کردید هنوز روی ربات اعمال نشده است.</p>
${because}
<p>ایلیا خبر دارد و پیگیری می‌کند. لازم نیست کاری بکنید؛ همین‌جا به شما خبر
می‌دهیم که اعمال شد.</p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`;

  return { subject: `[${publicId}] تغییر ربات هنوز اعمال نشده`, html };
}

/**
 * Take back something the desk told her that was not true.
 *
 * Sent once, by hand, after the desk contradicted itself: it told her a change
 * was live, then asked her to approve it again, then told her it had not been
 * applied. The first message was the true one. She has no way to know that,
 * and leaving her to work it out is worse than the original fault, because
 * next time she will not know which of these emails to believe.
 *
 * Deliberately short, deliberately not an explanation of the mechanism. What
 * she needs is which message was right and whether she has to do anything.
 */
export function correctionEmail(opts: { ticketId: number }): { subject: string; html: string } {
  const publicId = ticketPublicId(opts.ticketId);
  const html = `${WRAP_OPEN}
<p>سلام،</p>
<p>چند پیام پشت سر هم از ما گرفتید که با هم نمی‌خواندند. عذر می‌خواهیم.</p>
<p><b>درست این است: تغییری که تأیید کردید اعمال شده و روی ربات فعال است.</b>
پیام‌هایی که بعد از آن آمد و می‌گفت هنوز اعمال نشده یا دوباره تأیید کنید،
اشتباه بود و باید نادیده گرفته شود.</p>
<p>کاری لازم نیست بکنید. اشکالی که باعث این پیام‌ها شد برطرف شده است.</p>
${RULE}
${FOOTER}
${WRAP_CLOSE}`;

  return { subject: `[${publicId}] اصلاح: تغییر شما اعمال شده است`, html };
}
