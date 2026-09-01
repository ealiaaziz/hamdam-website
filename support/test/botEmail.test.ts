import { describe, it, expect } from 'vitest';
import { changeHeldEmail } from '../src/render/botEmail.js';

describe('changeHeldEmail', () => {
  it('tells her plainly that it is not applied and that Ealia knows', () => {
    const email = changeHeldEmail({ ticketId: 54, reason: 'NEEDS_A_PERSON: migrations/0007_x.sql' });
    expect(email.subject).toContain('HAM-54');
    expect(email.html).toContain('ایلیا');
    expect(email.html).not.toContain('NEEDS_A_PERSON');
    expect(email.html).not.toContain('migrations/');
  });

  it('renders a reason it recognises', () => {
    const email = changeHeldEmail({ ticketId: 54, reason: 'CHECKS_FAILED: test (failure)' });
    expect(email.html).toContain('آزمایش');
  });

  /**
   * A token nobody has taught it still reaches her. Knowing a change is stuck
   * and that a person has it matters more than the precise reason, and this is
   * the path that exists so a holdup is never silence.
   */
  it('still writes to her when the reason is one it does not know', () => {
    const email = changeHeldEmail({ ticketId: 54, reason: 'SOMETHING_NEW' });
    expect(email.html).not.toContain('SOMETHING_NEW');
    expect(email.html).toContain('ایلیا');
    expect(email.html.length).toBeGreaterThan(200);
  });
});

describe('a change that merged but did not deploy', () => {
  /**
   * Merging is not shipping. The desk used to say "it is live" the moment the
   * pull request merged, which is true only while the deploy that follows
   * succeeds. She would have gone and tested behaviour that does not exist.
   */
  it('says it failed to go on, not that it is live', () => {
    const email = changeHeldEmail({ ticketId: 54, reason: 'DEPLOY_FAILED' });
    expect(email.subject).toContain('هنوز اعمال نشده');
    expect(email.html).toContain('خطا');
    expect(email.html).not.toContain('DEPLOY_FAILED');
  });

  it('distinguishes an unconfirmed deploy from a failed one', () => {
    const unsure = changeHeldEmail({ ticketId: 54, reason: 'DEPLOY_NOT_CONFIRMED' });
    expect(unsure.html).not.toContain('خطا');
    expect(unsure.html).toContain('مطمئن');
  });
});
