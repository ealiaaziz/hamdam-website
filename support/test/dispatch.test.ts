import { describe, it, expect } from 'vitest';
import {
  DEFAULT_DISPATCH_DAILY_LIMIT,
  decideDispatch,
  mentionsBot,
  runDispatchGate,
  type DispatchFacts,
} from '../src/dispatch.js';

const owner: DispatchFacts = {
  senderAuthenticated: true,
  senderIsOwner: true,
  text: 'ربات آگهی ثبت نمی‌کند',
  dispatchesToday: 0,
};

describe('the happy path', () => {
  it('dispatches for an authenticated owner writing about the bot', () => {
    expect(decideDispatch(owner).dispatch).toBe(true);
  });
});

describe('authentication is the first gate', () => {
  it('refuses mail Exchange did not authenticate', () => {
    const decision = decideDispatch({ ...owner, senderAuthenticated: false, senderIsOwner: false });
    expect(decision.dispatch).toBe(false);
  });

  /**
   * A forged owner is not the same event as ordinary unauthenticated mail. It
   * is somebody trying the gate, and it should reach a person rather than be
   * filed with everything else that did not dispatch.
   */
  it('marks a forged owner as suspicious', () => {
    const decision = decideDispatch({ ...owner, senderAuthenticated: false });
    expect(decision).toMatchObject({ dispatch: false, suspicious: true });
  });

  it('does not mark ordinary unauthenticated mail as suspicious', () => {
    const decision = decideDispatch({ ...owner, senderAuthenticated: false, senderIsOwner: false });
    expect(decision).not.toHaveProperty('suspicious');
  });
});

describe('only the owner dispatches', () => {
  it('refuses an authenticated stranger writing about the bot', () => {
    const decision = decideDispatch({ ...owner, senderIsOwner: false });
    expect(decision).toMatchObject({ dispatch: false, reason: 'sender is not the channel owner' });
  });
});

describe('the message has to be about the bot', () => {
  it('refuses an owner asking about something else', () => {
    const decision = decideDispatch({ ...owner, text: 'سلام، حالت چطور است؟' });
    expect(decision.dispatch).toBe(false);
  });

  it('reads the bot vocabulary in Farsi and English', () => {
    expect(mentionsBot('ربات کار نمی‌کند')).toBe(true);
    expect(mentionsBot('مزایده باز نمی‌شود')).toBe(true);
    expect(mentionsBot('the bot is broken')).toBe(true);
    expect(mentionsBot('auction never closes')).toBe(true);
  });

  /**
   * The subtlety this list is built around. "ticket" is the support desk's
   * own word and is printed in the subject of every message it has ever sent,
   * so matching it would make every reply on every ticket look like a bot
   * report and dispatch on a thank-you.
   */
  it('does not treat the desk vocabulary as a bot report', () => {
    expect(mentionsBot('Re: [HAM-12] your ticket has been updated')).toBe(false);
    expect(mentionsBot('ممنون از پیگیری شما')).toBe(false);
  });
});

describe('the daily ceiling', () => {
  it('allows up to the limit', () => {
    const at = DEFAULT_DISPATCH_DAILY_LIMIT - 1;
    expect(decideDispatch({ ...owner, dispatchesToday: at }).dispatch).toBe(true);
  });

  /**
   * This is the answer to "what if her mailbox is taken". It cannot prevent
   * the first dispatch and does not try; it bounds the day to something a
   * person will notice.
   */
  it('refuses once the ceiling is spent', () => {
    const decision = decideDispatch({ ...owner, dispatchesToday: DEFAULT_DISPATCH_DAILY_LIMIT });
    expect(decision.dispatch).toBe(false);
    expect(decision.reason).toContain('ceiling');
  });

  it('honours a configured limit', () => {
    expect(decideDispatch({ ...owner, dispatchesToday: 1, dailyLimit: 1 }).dispatch).toBe(false);
  });
});

describe('every refusal says why', () => {
  it('always carries a reason, so a ticket can record it', () => {
    const refusals = [
      { ...owner, senderAuthenticated: false },
      { ...owner, senderIsOwner: false },
      { ...owner, text: 'سلام' },
      { ...owner, dispatchesToday: 99 },
    ].map(decideDispatch);

    for (const decision of refusals) {
      expect(decision.dispatch).toBe(false);
      expect(decision.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('runDispatchGate spends a slot only on a real dispatch', () => {
  /** A counter that reports how many times it was charged. */
  function counter(startAt = 0) {
    let charged = 0;
    return {
      get charged() { return charged; },
      consume: async () => { charged += 1; return startAt + charged; },
    };
  }

  const facts = {
    senderAuthenticated: true,
    senderIsOwner: true,
    text: 'ربات آگهی ثبت نمی‌کند',
  };

  it('charges once when it dispatches', async () => {
    const c = counter();
    const decision = await runDispatchGate(facts, c.consume);
    expect(decision.dispatch).toBe(true);
    expect(c.charged).toBe(1);
  });

  /**
   * The one this helper exists for. The bot's own daily ad cap was charged at
   * the tap that started an ad rather than at the ad, so three taps locked a
   * seller out for a day having published nothing. A ceiling charged for
   * looking is not a ceiling, it is a trap. An ordinary email from the owner
   * about anything else must cost her nothing.
   */
  it('does not charge when the message is not about the bot', async () => {
    const c = counter();
    const decision = await runDispatchGate({ ...facts, text: 'سلام، ممنون' }, c.consume);
    expect(decision.dispatch).toBe(false);
    expect(c.charged).toBe(0);
  });

  it('does not charge an unauthenticated sender', async () => {
    const c = counter();
    await runDispatchGate({ ...facts, senderAuthenticated: false }, c.consume);
    expect(c.charged).toBe(0);
  });

  it('does not charge a stranger', async () => {
    const c = counter();
    await runDispatchGate({ ...facts, senderIsOwner: false }, c.consume);
    expect(c.charged).toBe(0);
  });

  it('refuses once the day is spent, and the charge still counts the attempt', async () => {
    const c = counter(DEFAULT_DISPATCH_DAILY_LIMIT);
    const decision = await runDispatchGate(facts, c.consume);
    expect(decision.dispatch).toBe(false);
    expect(decision.reason).toContain('ceiling');
    expect(c.charged).toBe(1);
  });
});
