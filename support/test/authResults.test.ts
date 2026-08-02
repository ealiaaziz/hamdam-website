import { describe, expect, it } from 'vitest';
import { exchangeAuthHeader, senderIsAuthenticated, type MessageHeader } from '../src/authResults.js';

// The check that turns "the From header says so" into "Exchange verified it".
//
// The ownership rule this feeds was written as an identity check and was not
// one: it compared the sender against the requester, and the sender was a line
// of text the sending client chose. These tests are mostly about the ways an
// attacker gets to write into the same data structure the answer is read from.

const ms = (name: string, value: string): MessageHeader => ({ name, value });

/** Roughly what Exchange Online stamps on a message that passed. */
const exchangePass = (from = 'example.com') =>
  ms(
    'Authentication-Results',
    `spf=pass (sender IP is 1.2.3.4) smtp.mailfrom=${from}; dkim=pass (signature was verified) header.d=${from};dmarc=pass action=none header.from=${from};compauth=pass reason=100`,
  );

describe('picking the header to believe', () => {
  it('ignores one the sender wrote themselves', () => {
    // This is the whole point. Authentication-Results is an ordinary header
    // and anybody can put one in the message they compose. A check that
    // scanned every header for a pass would be asking the attacker whether
    // the attacker is authentic.
    const forged = ms('Authentication-Results', 'spf=pass; dkim=pass; dmarc=pass header.from=victim.example');
    const verdict = senderIsAuthenticated([forged], 'someone@victim.example');
    expect(verdict.authenticated).toBe(false);
  });

  it('takes the receiving server’s header even if a forged one sorts above it', () => {
    // Exchange prepends its own on delivery, so in practice the genuine one
    // is already first. Selecting on compauth= as well means the ordering
    // assumption is not the only thing holding this up.
    const forged = ms('Authentication-Results', 'dmarc=pass header.from=evil.example');
    const headers = [forged, exchangePass('example.com')];
    expect(exchangeAuthHeader(headers)).toContain('compauth=');
    expect(senderIsAuthenticated(headers, 'someone@example.com').authenticated).toBe(true);
  });

  it('treats an absent verdict as unauthenticated, never as a pass', () => {
    // "We could not check" and "it passed" are the two answers that must
    // never be confused, and an empty array is what a failed Graph call
    // returns.
    expect(senderIsAuthenticated([], 'someone@example.com').authenticated).toBe(false);
    expect(senderIsAuthenticated([ms('Subject', 'hello')], 'someone@example.com').authenticated).toBe(false);
  });
});

describe('what counts as authenticated', () => {
  it('accepts dmarc=pass', () => {
    const verdict = senderIsAuthenticated([exchangePass()], 'someone@example.com');
    expect(verdict).toEqual({ authenticated: true, reason: 'dmarc=pass' });
  });

  it('accepts an aligned DKIM signature without DMARC', () => {
    // A valid signature by the domain in the From line is the claim being
    // checked, whether or not that domain publishes a DMARC policy.
    const header = ms('Authentication-Results', 'spf=none; dkim=pass header.d=example.com; dmarc=none; compauth=pass reason=109');
    expect(senderIsAuthenticated([header], 'someone@example.com').authenticated).toBe(true);
  });

  it('accepts a subdomain signature for a parent domain, and the reverse', () => {
    const header = ms('Authentication-Results', 'dkim=pass header.d=example.com; dmarc=none; compauth=pass');
    expect(senderIsAuthenticated([header], 'someone@mail.example.com').authenticated).toBe(true);
  });

  it('refuses a DKIM pass signed by somebody else', () => {
    // The signature is real and proves nothing about this From address. A
    // mailing list or a bulk sender signs with its own domain constantly.
    const header = ms('Authentication-Results', 'dkim=pass header.d=bulk-sender.example; dmarc=none; compauth=pass');
    expect(senderIsAuthenticated([header], 'someone@example.com').authenticated).toBe(false);
  });

  it('refuses a lookalike domain that merely ends the same way', () => {
    // notexample.com must not align with example.com. Suffix matching without
    // the dot is the classic way this check is written wrong.
    const header = ms('Authentication-Results', 'dkim=pass header.d=notexample.com; compauth=pass');
    expect(senderIsAuthenticated([header], 'someone@example.com').authenticated).toBe(false);
  });

  it('accepts SPF only when the envelope aligns with the From domain', () => {
    const aligned = ms('Authentication-Results', 'spf=pass smtp.mailfrom=example.com; dkim=none; dmarc=none; compauth=pass');
    expect(senderIsAuthenticated([aligned], 'someone@example.com').authenticated).toBe(true);

    // The common shape of a forgery that passes SPF: the envelope is the
    // attacker's own domain, which they legitimately control, while the From
    // header claims somebody else.
    const unaligned = ms('Authentication-Results', 'spf=pass smtp.mailfrom=attacker.example; dkim=none; dmarc=none; compauth=pass');
    expect(senderIsAuthenticated([unaligned], 'someone@example.com').authenticated).toBe(false);
  });

  it('refuses failures and softfails outright', () => {
    for (const value of [
      'spf=fail smtp.mailfrom=example.com; dkim=fail header.d=example.com; dmarc=fail; compauth=fail reason=001',
      'spf=softfail; dkim=none; dmarc=none; compauth=fail',
      'spf=temperror; dkim=temperror; dmarc=temperror; compauth=none',
    ]) {
      expect(senderIsAuthenticated([ms('Authentication-Results', value)], 'someone@example.com').authenticated, value).toBe(false);
    }
  });

  it('is not fooled by the word pass appearing elsewhere', () => {
    // "passed" in the human-readable comment, and a hostname containing the
    // substring. Field parsing has to be a field parse.
    const header = ms(
      'Authentication-Results',
      'spf=fail (sender IP is 1.2.3.4, this would have passed last week) smtp.mailfrom=pass.example.com; dkim=fail; dmarc=fail; compauth=fail',
    );
    expect(senderIsAuthenticated([header], 'someone@example.com').authenticated).toBe(false);
  });

  it('says why it refused, because a refusal downgrades a real reply', () => {
    const header = ms('Authentication-Results', 'spf=fail; dkim=none; dmarc=fail; compauth=fail');
    const verdict = senderIsAuthenticated([header], 'someone@example.com');
    expect(verdict.authenticated).toBe(false);
    expect(verdict.reason).toContain('dmarc=fail');
  });

  it('refuses an address with no domain at all', () => {
    expect(senderIsAuthenticated([exchangePass()], 'not-an-address').authenticated).toBe(false);
  });
});
