import { describe, expect, it } from 'vitest';
import { parseTicketStatus } from '../src/types.js';
import { parsePriority, SLA_POLICY } from '../src/itil.js';

// These guards exist because `c.req.query('status') as TicketStatus` was a
// cast, not a check: it let arbitrary query-string text reach the queue
// renderer, which interpolated it straight into an href attribute.

describe('parseTicketStatus', () => {
  it('accepts every real status', () => {
    for (const status of ['new', 'open', 'pending', 'resolved', 'closed']) {
      expect(parseTicketStatus(status)).toBe(status);
    }
  });

  it('rejects an HTML-injection payload', () => {
    expect(parseTicketStatus('"><img src=x onerror=alert(1)>')).toBeUndefined();
  });

  it('rejects unknown values, empty strings, and nullish input', () => {
    expect(parseTicketStatus('garbage')).toBeUndefined();
    expect(parseTicketStatus('')).toBeUndefined();
    expect(parseTicketStatus(undefined)).toBeUndefined();
    expect(parseTicketStatus(null)).toBeUndefined();
  });

  it('is case sensitive, so "NEW" is not silently accepted', () => {
    expect(parseTicketStatus('NEW')).toBeUndefined();
  });
});

describe('parsePriority', () => {
  it('accepts every real priority', () => {
    for (const priority of ['P1', 'P2', 'P3', 'P4']) {
      expect(parsePriority(priority)).toBe(priority);
    }
  });

  it('rejects anything else, which would otherwise throw on SLA lookup', () => {
    expect(parsePriority('P9')).toBeUndefined();
    expect(parsePriority('constructor')).toBeUndefined();
    expect(parsePriority('__proto__')).toBeUndefined();
    expect(parsePriority(undefined)).toBeUndefined();
  });

  it('only ever returns keys that exist in SLA_POLICY', () => {
    for (const candidate of ['P1', 'P4', 'P9', '__proto__', 'toString']) {
      const parsed = parsePriority(candidate);
      if (parsed !== undefined) expect(SLA_POLICY[parsed]).toBeDefined();
    }
  });
});
