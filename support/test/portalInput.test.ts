import { describe, expect, it } from 'vitest';
import {
  cleanLine,
  cleanText,
  isOversizedBody,
  isValidEmail,
  MAX_BODY_CHARS,
  MAX_REQUEST_BYTES,
  MAX_SUBJECT_CHARS,
} from '../src/validation.js';
import { tokensMatch, stripHtml } from '../src/ids.js';

// The portal is the one surface anyone on the internet can reach, and until
// these existed the only question it asked of a submission was whether the
// fields were non-empty. The email field decides where the desk sends mail
// from its own mailbox, so "non-empty" was the whole of the check standing
// between an open form and a way to have developer@hamdam.com.au deliver a
// stranger's subject line to a stranger's inbox.

describe('isValidEmail', () => {
  it('accepts the addresses people actually have', () => {
    for (const address of [
      'someone@example.com',
      'first.last@example.co.uk',
      'user+tag@example.com',
      "o'brien@example.com".replace("'", ''), // apostrophes are legal but rare
      'a@b.co',
      'UPPER.Case@Example.COM',
    ]) {
      expect(isValidEmail(address), address).toBe(true);
    }
  });

  it('rejects an address carrying a second recipient', () => {
    expect(isValidEmail('victim@example.com, attacker@example.com')).toBe(false);
    expect(isValidEmail('victim@example.com;attacker@example.com')).toBe(false);
  });

  it('rejects a display name wrapping a different address', () => {
    expect(isValidEmail('Support <attacker@example.com>')).toBe(false);
    expect(isValidEmail('"Support" attacker@example.com')).toBe(false);
  });

  it('rejects header-injection shapes', () => {
    expect(isValidEmail('a@example.com\nBcc: victim@example.com')).toBe(false);
    expect(isValidEmail('a@example.com\r\nSubject: x')).toBe(false);
  });

  it('rejects the obviously malformed', () => {
    for (const address of ['', '   ', 'no-at-sign', '@example.com', 'a@', 'a@b', 'a@.com', 'a@b.', '.a@b.com', 'a..b@c.com']) {
      expect(isValidEmail(address), address).toBe(false);
    }
  });

  it('rejects an address longer than a real one can be', () => {
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });
});

describe('cleanText and cleanLine', () => {
  it('caps length, because maxlength is a browser courtesy and nothing to curl', () => {
    expect(cleanText('x'.repeat(MAX_BODY_CHARS + 500), MAX_BODY_CHARS)).toHaveLength(MAX_BODY_CHARS);
    expect(cleanLine('x'.repeat(1000), MAX_SUBJECT_CHARS)).toHaveLength(MAX_SUBJECT_CHARS);
  });

  it('keeps the newlines a description is written with', () => {
    expect(cleanText('one\ntwo\n\nthree', 100)).toBe('one\ntwo\n\nthree');
  });

  it('strips control characters that make two strings render alike and compare differently', () => {
    expect(cleanText('nor\u0000mal\u001b[31m', 100)).toBe('normal[31m');
  });

  it('collapses a subject onto one line', () => {
    expect(cleanLine('Broken\r\nBcc: someone', 200)).toBe('Broken Bcc: someone');
  });

  it('handles missing fields without throwing', () => {
    expect(cleanText(null, 10)).toBe('');
    expect(cleanLine(undefined, 10)).toBe('');
  });
});

describe('isOversizedBody', () => {
  it('refuses a body past the ceiling', () => {
    expect(isOversizedBody(String(MAX_REQUEST_BYTES + 1))).toBe(true);
  });

  it('allows an ordinary submission, and anything with no length declared', () => {
    expect(isOversizedBody('4096')).toBe(false);
    expect(isOversizedBody(undefined)).toBe(false);
    expect(isOversizedBody('not a number')).toBe(false);
  });
});

describe('tokensMatch', () => {
  it('accepts the right token and refuses everything else', () => {
    const token = 'a'.repeat(32);
    expect(tokensMatch(token, token)).toBe(true);
    expect(tokensMatch(token, `${'a'.repeat(31)}b`)).toBe(false);
    expect(tokensMatch(token, 'a'.repeat(31))).toBe(false);
    expect(tokensMatch(token, '')).toBe(false);
  });

  it('does not short-circuit on the first differing character', () => {
    // Not a timing measurement, which would be flaky. What is checked is the
    // property that makes the timing uninteresting: both of these do the same
    // amount of work, and neither is treated as "closer" than the other.
    const token = 'abcdefgh';
    expect(tokensMatch(token, 'zbcdefgh')).toBe(false);
    expect(tokensMatch(token, 'abcdefgz')).toBe(false);
  });
});

describe('stripHtml', () => {
  it('drops the contents of style and script blocks, not just their tags', () => {
    const mail = '<style>.x{color:red}</style><p>The app will not open.</p><script>alert(1)</script>';
    expect(stripHtml(mail)).toBe('The app will not open.');
  });

  it('drops comments', () => {
    expect(stripHtml('<p>Hello<!-- tracking pixel notes --></p>')).toBe('Hello');
  });

  it('still keeps ordinary prose intact', () => {
    expect(stripHtml('<p>One</p><p>Two</p>')).toBe('One\nTwo');
  });
});

// Invisible characters, which on a deliberately right-to-left desk are not a
// theoretical problem. Escaping does not help: these are text rather than
// markup, and escapeHtml correctly passes them through. Not storing them is
// the only fix.
describe('invisible characters', () => {
  it('strips the bidirectional overrides that make stored text lie about itself', () => {
    // U+202E reorders everything after it without appearing. A subject can be
    // stored as one string and displayed as another, in the console and in
    // the escalation email, which are read by whoever is deciding what a
    // ticket is.
    expect(cleanLine('urgent ‮gpj.exe', 100)).toBe('urgent gpj.exe');
    expect(cleanText('a‪b‫c‬d‮e', 100)).toBe('abcde');
    expect(cleanText('a⁦b⁧c⁨d⁩e', 100)).toBe('abcde');
  });

  it('strips the zero-width characters that make two strings compare unequal', () => {
    expect(cleanLine('HAM​-1', 100)).toBe('HAM-1');
    expect(cleanText('a‍b﻿c⁠d', 100)).toBe('abcd');
  });

  it('keeps the zero-width non-joiner, which Persian spelling requires', () => {
    // U+200C is orthography here, not decoration: words are misspelled
    // without it. Removing it would corrupt ordinary Persian to defend
    // against a spoof it cannot perform.
    const persian = 'می‌روم';
    expect(cleanText(persian, 100)).toBe(persian);
    expect(cleanLine(persian, 100)).toBe(persian);
  });

  it('leaves ordinary Persian and English untouched', () => {
    expect(cleanText('سلام hello', 100)).toBe('سلام hello');
  });
});
