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
