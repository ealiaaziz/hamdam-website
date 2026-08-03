import { describe, expect, it } from 'vitest';
import { stripHtml } from '../src/ids.js';

// The email body is the one input to this desk that arrives without passing
// through a form, a length cap or a browser, and `stripHtml` is the first
// thing that touches it. Everything here is about time, not output: the
// question is not "does it convert correctly" but "can a stranger make it
// take longer than a Worker is allowed to run".
//
// They could. `[^>]*` consumes `<` happily, so against a body that is nothing
// but `<` the class ran to the end of the string at every start position,
// failed to find `>`, and backtracked all the way. Two hundred kilobytes
// measured at about forty seconds of CPU.
//
// Which was not a slow function. It was a way to stop the desk receiving
// email: the message threw, the ingest checkpoint only advances on a clean
// pass, the batch is ordered oldest first from that checkpoint, so the same
// message came back every minute and nothing behind it was ever processed.
// One email, sent once, and the mailbox looks completely normal while every
// message after it goes unread.

/** Generous for a regex over a bounded input, and far under a Worker's limit. */
const BUDGET_MS = 500;

function elapsed(input: string): number {
  const started = performance.now();
  stripHtml(input);
  return performance.now() - started;
}

describe('stripHtml cannot be made to run long', () => {
  it('survives a body that is only opening angle brackets', () => {
    // The exact shape that measured forty seconds.
    expect(elapsed('<'.repeat(200_000))).toBeLessThan(BUDGET_MS);
  });

  it('survives one far larger than any real email', () => {
    expect(elapsed('<'.repeat(2_000_000))).toBeLessThan(BUDGET_MS);
  });

  it('survives thousands of unclosed script tags', () => {
    // The other quantifier: a lazy scan to the end of the string, once per
    // opening tag that never closes.
    expect(elapsed('<script>'.repeat(50_000))).toBeLessThan(BUDGET_MS);
  });

  it('survives unclosed comments and mixed junk', () => {
    expect(elapsed('<!--'.repeat(50_000))).toBeLessThan(BUDGET_MS);
    expect(elapsed(('<<!--<script><style><'.repeat(20_000)))).toBeLessThan(BUDGET_MS);
  });

  it('survives a single enormous tag that never closes', () => {
    expect(elapsed(`<div ${'a'.repeat(500_000)}`)).toBeLessThan(BUDGET_MS);
  });
});

describe('and still converts real HTML', () => {
  it('keeps the text and drops the markup', () => {
    expect(stripHtml('<p>Hello <b>there</b></p><div>Second line</div>')).toBe('Hello there\nSecond line');
  });

  it('still removes the contents of script and style blocks', () => {
    expect(stripHtml('<style>.a{color:red}</style><p>Visible</p>')).toBe('Visible');
    expect(stripHtml('<script>alert(1)</script><p>Visible</p>')).toBe('Visible');
  });

  it('keeps Persian intact', () => {
    expect(stripHtml('<p>سلام</p>')).toBe('سلام');
  });

  it('truncates rather than refusing a very long body', () => {
    // Losing the tail of a marketing email is fine; refusing the message
    // would lose somebody's actual problem. What a person wrote in a reply is
    // at the top.
    const real = `<p>Here is my problem.</p>${'<p>padding</p>'.repeat(50_000)}`;
    const out = stripHtml(real);
    expect(out.startsWith('Here is my problem.')).toBe(true);
    expect(out.length).toBeLessThan(64 * 1024);
  });
});
