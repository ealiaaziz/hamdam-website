import { describe, it, expect } from 'vitest';
import { parseAgentOutcome, parseAgentReport, type IssueComment } from '../src/github.js';

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
});
