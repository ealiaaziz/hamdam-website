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
