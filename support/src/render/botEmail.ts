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
