import { describe, it, expect } from 'vitest';
import {
  approvalVerdict,
  approvesChange,
  changeRef,
  normalisePersian,
  words,
} from '../src/changeApproval.js';

describe('approvalVerdict: plain answers', () => {
  it('reads Farsi consent', () => {
    expect(approvalVerdict('بله')).toBe('approved');
    expect(approvalVerdict('آره، انجام بده')).toBe('approved');
    expect(approvalVerdict('اوکی ممنون')).toBe('approved');
    expect(approvalVerdict('تایید می‌کنم')).toBe('approved');
  });

  it('reads English consent', () => {
    expect(approvalVerdict('yes please')).toBe('approved');
    expect(approvalVerdict('go ahead')).toBe('approved');
  });

  it('reads refusal', () => {
    expect(approvalVerdict('نه')).toBe('refused');
    expect(approvalVerdict('نه، فعلاً نه')).toBe('refused');
    expect(approvalVerdict('صبر کن')).toBe('refused');
    expect(approvalVerdict('not yet')).toBe('refused');
  });
});

describe('the substring trap: why this file does not use includes()', () => {
  /**
   * "نه" is a substring of a great many ordinary Persian words. A desk that
   * matched it the way agentPolicy.ts matches "close this" would read a
   * refusal out of a sentence about Saturday and, worse in the other
   * direction, "آره" inside اداره would read as consent to deploy.
   */
  it('does not find a refusal inside ordinary words', () => {
    expect(approvalVerdict('خانه')).toBe('unclear');
    expect(approvalVerdict('روزنامه را خواندم')).toBe('unclear');
    expect(approvalVerdict('شنبه وقت دارم')).toBe('unclear');
    expect(approvalVerdict('بهانه نیاور')).toBe('unclear');
  });

  it('does not find consent inside ordinary words', () => {
    expect(approvalVerdict('اداره')).toBe('unclear');
    expect(approvalVerdict('چاره‌ای نیست')).toBe('unclear');
  });
});

describe('a refusal anywhere outranks consent', () => {
  it('will not deploy on a hedged yes', () => {
    expect(approvalVerdict('بله ولی نه الان')).toBe('refused');
    expect(approvalVerdict('yes but wait')).toBe('refused');
    expect(approvalVerdict('باشه، فعلاً صبر کن')).toBe('refused');
  });
});

describe('silence and small talk never approve', () => {
  it('treats anything else as unclear', () => {
    expect(approvalVerdict('')).toBe('unclear');
    expect(approvalVerdict('ممنون 🙏')).toBe('unclear');
    expect(approvalVerdict('سلام، خوبی؟')).toBe('unclear');
  });

  /**
   * A bug report is not an answer to "shall I apply this?", and reading it as
   * one in either direction would be wrong. As consent it deploys unasked; as
   * refusal it abandons a change she never rejected. It waits and she is
   * asked again.
   */
  it('treats a fresh symptom report as unclear, not as an answer', () => {
    expect(approvalVerdict('ربات هنوز کار نمی‌کند')).toBe('unclear');
    expect(approvalVerdict('همان مشکل قبلی هست')).toBe('unclear');
  });
});

describe('the words she is likely to actually use', () => {
  /**
   * The email asks her to reply "بله" and almost nobody answers a yes/no
   * question with the word they were offered. Each of these used to be
   * unclear, which is safe and reads exactly like the bot ignoring her: the
   * complaint that started this whole piece of work.
   */
  it('reads ordinary Farsi assent', () => {
    for (const reply of ['خوبه', 'حتماً', 'قبوله', 'بفرست', 'اعمال کنید', 'ایرادی نداره']) {
      expect(approvalVerdict(reply)).toBe('approved');
    }
  });

  it('reads ordinary Farsi refusal', () => {
    for (const reply of ['بعداً', 'نمی‌خوام', 'فعلا نه', 'صبر کنید', 'نزن']) {
      expect(approvalVerdict(reply)).toBe('refused');
    }
  });

  /**
   * Kept out on purpose. "درسته" reads as agreement on its own and opens a
   * sentence that is often the opposite: "درسته که مشکل داره" is "it is true
   * that it has a problem", which is a bug report, not permission to deploy.
   * A false refusal costs one more email; a false approval ships code to a
   * live channel, so anything that can open a sentence stays out.
   */
  it('does not accept agreement that can open a sentence', () => {
    expect(approvalVerdict('درسته')).toBe('unclear');
    expect(approvalVerdict('درسته که مشکل داره')).toBe('unclear');
  });
});

describe('an answer sent as an emoji', () => {
  /**
   * words() splits on everything that is not a letter or a digit, so a reply
   * of nothing but 👍 tokenised to nothing at all. On a phone it is the most
   * natural way to answer a yes/no question.
   */
  it('reads a thumbs-up as consent', () => {
    expect(approvalVerdict('👍')).toBe('approved');
    expect(approvalVerdict('✅')).toBe('approved');
    expect(approvalVerdict('👌 ممنون')).toBe('approved');
  });

  it('reads a thumbs-down as refusal', () => {
    expect(approvalVerdict('👎')).toBe('refused');
    expect(approvalVerdict('❌')).toBe('refused');
  });

  /**
   * 🙏 ends most of her messages. It is thanks or please, never consent, and
   * reading it as consent would deploy off the back of someone being polite.
   */
  it('never reads a folded-hands as consent', () => {
    expect(approvalVerdict('🙏')).toBe('unclear');
    expect(approvalVerdict('ممنون 🙏')).toBe('unclear');
  });

  it('still lets a refusal outrank an approving emoji', () => {
    expect(approvalVerdict('👍 ولی فعلا نه')).toBe('refused');
  });
});

describe('keyboard and encoding differences', () => {
  it('folds Arabic yeh and kaf onto their Persian forms', () => {
    // "بلي" typed on an Arabic keyboard is the same word as "بلی".
    expect(approvalVerdict('بلي')).toBe('approved');
    expect(normalisePersian('كي')).toBe('کی');
  });

  it('treats a zero-width non-joiner as a word break', () => {
    expect(words('می‌کنم')).toEqual(['می', 'کنم']);
  });
});

describe('approvesChange: consent is tied to one change', () => {
  const ref = changeRef('HAM-12', 'a3f9c1d4e5');

  it('builds a short reference from the ticket and the head sha', () => {
    expect(ref).toBe('HAM-12/a3f9c1');
  });

  it('accepts a bare yes on the current change', () => {
    expect(approvesChange('بله', ref)).toBe(true);
  });

  it('accepts a yes that names this change', () => {
    expect(approvesChange('بله، HAM-12/a3f9c1 را اعمال کن', ref)).toBe(true);
  });

  /**
   * The one this exists for. An email thread quotes its own history, so an
   * approval given last week is still sitting in the body of this week's
   * reply. Consent that names a different change is not consent to this one.
   */
  it('refuses a yes quoted from an older change', () => {
    expect(approvesChange('بله (در پاسخ به HAM-12/000111)', ref)).toBe(false);
  });

  it('refuses anything that is not an approval', () => {
    expect(approvesChange('نه', ref)).toBe(false);
    expect(approvesChange('ممنون', ref)).toBe(false);
  });
});
