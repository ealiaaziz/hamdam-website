import { afterEach, describe, expect, it } from 'vitest';
import { applyIdentity, DEFAULT_IDENTITY, identity, resetIdentity, ticketPrefixPattern } from '../src/identity.js';
import { parseTicketPublicId, ticketPublicId } from '../src/ids.js';
import { cleanSubject, isFromTheDesk, ticketIdFromSubject } from '../src/inbound.js';
import type { Env } from '../src/types.js';

// A second deployment must not be a fork. These pin the two halves of that:
// unset is Hamdam byte for byte, and set changes every place the desk asserts
// who it is.

afterEach(resetIdentity);

const env = (over: Partial<Env> = {}) => over as Env;

describe('an unconfigured deployment', () => {
  it('is the desk that runs today', () => {
    expect(identity()).toEqual(DEFAULT_IDENTITY);
    applyIdentity(env());
    expect(identity()).toEqual(DEFAULT_IDENTITY);
    expect(ticketPublicId(42)).toBe('HAM-42');
    expect(isFromTheDesk('developer@hamdam.com.au')).toBe(true);
  });
});

describe('a configured deployment', () => {
  it('takes its mailbox, prefix, name and address from configuration', () => {
    applyIdentity(
      env({
        SUPPORT_MAILBOX: 'Support@Circuitenergy.org',
        TICKET_PREFIX: 'CE',
        BRAND_NAME: 'Circuit Energy IT',
        PUBLIC_BASE_URL: 'https://help.circuitenergy.org/',
      }),
    );

    expect(identity().mailbox).toBe('support@circuitenergy.org');
    expect(identity().brandName).toBe('Circuit Energy IT');
    // Trailing slash removed, so every interpolated link is not // in the path.
    expect(identity().baseUrl).toBe('https://help.circuitenergy.org');
  });

  it('adds the separator a prefix is missing rather than assuming one', () => {
    // "CE" and "CE-" should both mean CE-1. Without the separator, CE12 cannot
    // be parsed back to 12, which would break every reply that quotes a tag.
    applyIdentity(env({ TICKET_PREFIX: 'CE' }));
    expect(ticketPublicId(1)).toBe('CE-1');
    applyIdentity(env({ TICKET_PREFIX: 'CE-' }));
    expect(ticketPublicId(1)).toBe('CE-1');
  });

  it('renames tickets everywhere the prefix is read, not just where it is written', () => {
    applyIdentity(env({ TICKET_PREFIX: 'CE' }));
    expect(ticketPublicId(7)).toBe('CE-7');
    expect(parseTicketPublicId('CE-7')).toBe(7);
    expect(ticketIdFromSubject('RE: [CE-7] printer again')).toBe(7);
    expect(cleanSubject('RE: [CE-7] printer again')).toBe('printer again');
  });

  it('stops recognising the previous desk once renamed', () => {
    // The round trip has to move together. A desk that writes CE-7 and still
    // reads HAM-7 would file its own replies as new tickets.
    applyIdentity(env({ TICKET_PREFIX: 'CE', SUPPORT_MAILBOX: 'support@circuitenergy.org' }));
    expect(parseTicketPublicId('HAM-7')).toBeNull();
    expect(ticketIdFromSubject('RE: [HAM-7] anything')).toBeNull();
    expect(isFromTheDesk('developer@hamdam.com.au')).toBe(false);
    expect(isFromTheDesk('support@circuitenergy.org')).toBe(true);
  });

  it('escapes the prefix before it reaches a regular expression', () => {
    // Nobody should configure this, but a prefix is operator input reaching a
    // pattern, and "." matching any character would quietly match tickets
    // belonging to a differently named desk on a forwarded thread.
    applyIdentity(env({ TICKET_PREFIX: 'C.E-' }));
    expect(ticketPrefixPattern()).toBe('C\\.E-');
    expect(ticketIdFromSubject('RE: [CXE-7] not ours')).toBeNull();
    expect(ticketIdFromSubject('RE: [C.E-7] ours')).toBe(7);
  });

  it('ignores blank configuration rather than adopting it', () => {
    applyIdentity(env({ SUPPORT_MAILBOX: '   ', TICKET_PREFIX: '', BRAND_NAME: '' }));
    expect(identity()).toEqual(DEFAULT_IDENTITY);
  });
});
