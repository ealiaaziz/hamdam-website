/**
 * A yes has to be a yes to the change, not to whatever else was in the email.
 *
 * HAM-60, 6 September 2026. The desk sent one message that both proposed a
 * fix and asked a separate question: whether she was happy with the level of
 * access a new admin would get. She replied «بله» and gave a phone number:
 * she was answering the second question. approvesChange saw a whole-word yes,
 * no question mark, no reference, and returned true. The pull request merged
 * and deployed sixteen seconds later.
 *
 * She did want that fix, so nothing was lost. The mechanism was still wrong.
 */

import { describe, it, expect } from 'vitest';
import { approvesChange, asksSomething } from '../src/changeApproval.js';

const REF = 'HAM-60/0f426d';

// What she actually sent, verbatim from the ticket, minus the phone number.
const HER_REPLY = 'بله\nشماره تماسی که باید اضافه شود';

describe('a clean proposal, the ordinary case, which must not get harder', () => {
  it('accepts a bare «بله» when the desk asked one thing', () => {
    expect(approvesChange('بله', REF, false)).toBe(true);
  });

  it('accepts the other words she really uses', () => {
    for (const reply of ['باشه', 'اوکی', 'موافقم', 'تأیید']) {
      expect(approvesChange(reply, REF, false)).toBe(true);
    }
  });

  it('accepts her HAM-60 reply, since nothing else was being asked', () => {
    expect(approvesChange(HER_REPLY, REF, false)).toBe(true);
  });
});

describe('a proposal that also asked her something else', () => {
  it('does not read her HAM-60 reply as consent for the change', () => {
    // The regression. This returned true and shipped a deploy.
    expect(approvesChange(HER_REPLY, REF, true)).toBe(false);
  });

  it('does not read a bare yes as consent either', () => {
    expect(approvesChange('بله', REF, true)).toBe(false);
  });

  it('still accepts a yes that names this change', () => {
    // She is not locked out. She just has to say which thing she means.
    expect(approvesChange(`بله ${REF}`, REF, true)).toBe(true);
  });

  it('refuses a yes that names some older change', () => {
    expect(approvesChange('بله HAM-58/aaaaaa', REF, true)).toBe(false);
    expect(approvesChange('بله HAM-58/aaaaaa', REF, false)).toBe(false);
  });
});

describe('the tightening changes nothing about refusal', () => {
  it('a no is still a no whichever way the proposal was worded', () => {
    for (const asked of [true, false]) {
      expect(approvesChange('نه', REF, asked)).toBe(false);
      expect(approvesChange('بله ولی نه الان', REF, asked)).toBe(false);
    }
  });

  it('a yes with a question in it is still unclear, as before', () => {
    expect(approvesChange('بله، ولی این یعنی چی؟', REF, false)).toBe(false);
  });
});

describe('asksSomething: what marks a proposal as muddied', () => {
  it('sees a question mark in either alphabet', () => {
    expect(asksSomething('لطفاً آیدی عددی را بفرستید؟')).toBe(true);
    expect(asksSomething('Is that ok?')).toBe(true);
  });

  it('leaves a plain description alone', () => {
    expect(asksSomething('این تغییر آماده شده و منتظر تأیید شماست.')).toBe(false);
  });
});
