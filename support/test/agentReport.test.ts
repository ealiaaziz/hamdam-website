import { describe, it, expect } from 'vitest';
import { parseAgentOutcome, parseAgentReport, parseHeldReason, type IssueComment } from '../src/github.js';
import { agentBlockedEmail } from '../src/render/botEmail.js';

const SHA_A = 'a3f9c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';
const SHA_B = 'bbbb11d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0';

const comment = (body: string, login = 'ealiaaziz'): IssueComment => ({ id: 1, body, user: { login } });

const report = (pr: number, sha: string, fa = 'توضیح فارسی') =>
  comment(`<!-- desk:pr=${pr} -->\n<!-- desk:sha=${sha} -->\n<!-- desk:fa -->\n${fa}\n<!-- desk:end -->`);

describe('parseAgentReport', () => {
  it('finds nothing when the agent has not reported', () => {
    expect(parseAgentReport([comment('working on it')])).toBeNull();
  });

  it('reads the pull request, the commit and the Farsi', () => {
    expect(parseAgentReport([report(9, SHA_A)])).toEqual({
      prNumber: 9,
      headSha: SHA_A,
      description: 'توضیح فارسی',
    });
  });

  /**
   * The agent pushes again after a review comment or a red build and reports
   * again. She has to be asked about the change that exists now, not the one
   * that existed first.
   */
  it('takes the newest report', () => {
    const parsed = parseAgentReport([report(9, SHA_A, 'اول'), report(9, SHA_B, 'دوم')]);
    expect(parsed?.headSha).toBe(SHA_B);
    expect(parsed?.description).toBe('دوم');
  });

  it('ignores a report missing its commit', () => {
    expect(parseAgentReport([comment('<!-- desk:pr=9 -->')])).toBeNull();
  });

  it('ignores a malformed commit rather than guessing at one', () => {
    expect(parseAgentReport([comment('<!-- desk:pr=9 -->\n<!-- desk:sha=nothex -->')])).toBeNull();
  });

  /**
   * An absent description is reported as absent rather than filled in. The
   * proposal email then tells her plainly that nothing was recorded and asks
   * her not to approve yet, which beats inventing a summary of a change
   * nobody described.
   */
  it('reports an empty description rather than inventing one', () => {
    const parsed = parseAgentReport([comment(`<!-- desk:pr=9 -->\n<!-- desk:sha=${SHA_A} -->`)]);
    expect(parsed).toEqual({ prNumber: 9, headSha: SHA_A, description: '' });
  });
});

describe('parseAgentOutcome', () => {
  const ask = (text: string) => comment(`<!-- desk:ask -->\n${text}\n<!-- desk:end -->`);
  const blocked = (text: string) => comment(`<!-- desk:blocked -->\n${text}\n<!-- desk:end -->`);

  it('finds nothing on an ordinary comment', () => {
    expect(parseAgentOutcome([comment('looking into it')])).toBeNull();
  });

  it('reads a question', () => {
    expect(parseAgentOutcome([ask('کدام دکمه؟')])).toEqual({ kind: 'ask', text: 'کدام دکمه؟' });
  });

  it('reads a stand-down', () => {
    expect(parseAgentOutcome([blocked('این کار ریسک دارد')]))
      .toEqual({ kind: 'blocked', text: 'این کار ریسک دارد' });
  });

  /**
   * The one that keeps her from being asked something already answered. A
   * pull request report is the newest word on the ticket, so a question that
   * came before it has been resolved by the work itself.
   */
  it('is superseded by a later pull request report', () => {
    expect(parseAgentOutcome([ask('کدام دکمه؟'), report(9, SHA_A)])).toBeNull();
  });

  it('still reads a question asked after a pull request', () => {
    const parsed = parseAgentOutcome([report(9, SHA_A), ask('این درست است؟')]);
    expect(parsed).toEqual({ kind: 'ask', text: 'این درست است؟' });
  });

  it('takes the newest of several', () => {
    expect(parseAgentOutcome([ask('اول'), ask('دوم')])).toEqual({ kind: 'ask', text: 'دوم' });
  });

  /**
   * The marker the agent picks must not decide whether she hears anything.
   *
   * Three markers, and picking wrong used to be silent: a question tagged
   * `desk:fa` has no pull request to propose and no `ask` to relay, so it
   * reached nobody, which is the exact outcome the three markers were
   * introduced to prevent.
   *
   * A Farsi block with no pull request beside it is the agent talking to her.
   * It reaches her as a question, because a question invites the reply that
   * gets the work moving again.
   */
  it('relays Farsi the agent tagged as a description when there is no pull request', () => {
    const mistagged = comment('<!-- desk:fa -->\nکدام دکمه؟\n<!-- desk:end -->');
    expect(parseAgentOutcome([mistagged])).toEqual({ kind: 'ask', text: 'کدام دکمه؟' });
  });

  it('does not relay the description of a pull request as a question', () => {
    expect(parseAgentOutcome([report(9, SHA_A)])).toBeNull();
  });

  it('reads a comment carrying both markers as the question', () => {
    const both = comment(
      '<!-- desk:ask -->\nسؤال\n<!-- desk:end -->\n<!-- desk:fa -->\nتوضیح\n<!-- desk:end -->',
    );
    expect(parseAgentOutcome([both])).toEqual({ kind: 'ask', text: 'سؤال' });
  });

  /**
   * The real comment that would have been emailed to her, reduced to its
   * shape. An agent disputing a claim about markers quoted one mid-sentence,
   * and a pattern that did not care about lines matched the quote, ran to the
   * real terminator, and made a thousand characters of English argument the
   * body of her answer. It never reached her only because the platform's cron
   * had stopped an hour earlier.
   *
   * A marker inside a sentence is somebody talking about the protocol. A
   * marker alone on its line is somebody using it.
   */
  it('ignores a marker quoted inside a sentence', () => {
    const disputing = comment(
      'They claim my question was wrapped in `<!-- desk:fa -->` (the wrong marker),\n'
      + 'and that is not true: my prior comment used `<!-- desk:ask -->`, above.\n'
      + '\n'
      + '<!-- desk:ask -->\n'
      + 'کدام دکمه؟\n'
      + '<!-- desk:end -->',
    );
    expect(parseAgentOutcome([disputing])).toEqual({ kind: 'ask', text: 'کدام دکمه؟' });
  });

  it('ignores markers inside a fenced code block, which is how they get quoted', () => {
    const quoting = comment('Write it like this:\n\n```\n<!-- desk:ask -->\n...\n<!-- desk:end -->\n```');
    expect(parseAgentOutcome([quoting])).toBeNull();
  });

  /**
   * The other half of that asymmetry, asserted so nobody tightens it later
   * without meeting the argument: a quoted example read as real sends her
   * something odd, a real marker read as quoted sends her nothing.
   */
  it('still reads a marker that is merely indented', () => {
    const sloppy = comment('  <!-- desk:ask -->\n  کدام دکمه؟\n  <!-- desk:end -->');
    expect(parseAgentOutcome([sloppy])).toEqual({ kind: 'ask', text: 'کدام دکمه؟' });
  });

  it('still prefers a stand-down over a description in the same comment', () => {
    const both = comment(
      '<!-- desk:fa -->\nتوضیح\n<!-- desk:end -->\n<!-- desk:blocked -->\nنمی‌شود\n<!-- desk:end -->',
    );
    expect(parseAgentOutcome([both])).toEqual({ kind: 'blocked', text: 'نمی‌شود' });
  });
});

describe('a run that died without saying why', () => {
  /**
   * The workflow guarantees a marker so she is never left in silence, and it
   * posts a token rather than prose because the Farsi she reads lives in the
   * desk. What she gets must say what it means for her, not that a job hit a
   * turn limit.
   */
  it('renders the failure token as something a person can act on', () => {
    const email = agentBlockedEmail({ ticketId: 46, reason: 'AGENT_RUN_FAILED' });

    expect(email.html).not.toContain('AGENT_RUN_FAILED');
    expect(email.html).toContain('ایلیا');
    expect(email.html).toContain('لازم نیست دوباره بفرستید');
  });

  it('still passes a real reason through', () => {
    const email = agentBlockedEmail({ ticketId: 46, reason: 'واتساپ ریسک دارد' });
    expect(email.html).toContain('واتساپ ریسک دارد');
  });

  it('is parsed from the marker the workflow posts', () => {
    const posted = comment('<!-- desk:blocked -->\nAGENT_RUN_FAILED\n<!-- desk:end -->');
    expect(parseAgentOutcome([posted])).toEqual({ kind: 'blocked', text: 'AGENT_RUN_FAILED' });
  });
});

describe('parseHeldReason', () => {
  const held = (text: string) => comment(`<!-- desk:held -->\n${text}\n<!-- desk:end -->`);

  it('finds nothing when nothing is holding the change', () => {
    expect(parseHeldReason([comment('Merged on the owner approval.')])).toBeNull();
  });

  it('reads the reason the merge stood down', () => {
    expect(parseHeldReason([held('NEEDS_A_PERSON: migrations/0007_x.sql')]))
      .toBe('NEEDS_A_PERSON: migrations/0007_x.sql');
  });

  it('takes the newest, so a holdup that was fixed and hit again reads as the new one', () => {
    expect(parseHeldReason([held('CHECKS_RUNNING: 2 still running'), held('CHECKS_FAILED: test (failure)')]))
      .toBe('CHECKS_FAILED: test (failure)');
  });

  /** Same line rule as every other marker: quoting one is not raising one. */
  it('ignores a reason quoted inside a fenced block', () => {
    expect(parseHeldReason([comment('It posts:\n\n```\n<!-- desk:held -->\nCONFLICT\n<!-- desk:end -->\n```')]))
      .toBeNull();
  });
});
