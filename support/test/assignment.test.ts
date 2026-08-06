import { describe, expect, it } from 'vitest';
import { assignableAddresses, l3Engineer, mayBeAssigned, unassignedAlertRecipients } from '../src/assignment.js';
import type { Env } from '../src/types.js';

// `assigned_to` is not a label, it is an authority: the address in it may
// reply to the desk by email and have those words sent to the requester over
// this domain. So the interesting tests here are the refusals, and the
// interesting property is that nothing arriving in a request can widen the
// set.

const env = (over: Partial<Env> = {}) => over as Env;

describe('l3Engineer', () => {
  it('reads a configured address, lowercased', () => {
    expect(l3Engineer(env({ L3_ENGINEER_EMAIL: '  Engineer@Example.com ' }))).toBe('engineer@example.com');
  });

  it('returns null rather than a default when it is unset', () => {
    // Deliberately not falling back to a person's address written into a
    // public repository. Unset means escalations are alerted but not
    // allocated, and the console says so on every page.
    expect(l3Engineer(env())).toBeNull();
    expect(l3Engineer(env({ L3_ENGINEER_EMAIL: '' }))).toBeNull();
    expect(l3Engineer(env({ L3_ENGINEER_EMAIL: '   ' }))).toBeNull();
  });

  it('refuses anything that is not an address', () => {
    // A typo here would otherwise be written into assigned_to and become a
    // string nobody can send mail to but which counts as an owner, hiding the
    // ticket from the unassigned sweep.
    for (const value of ['not-an-address', 'a@b', 'two@addresses.com, three@addresses.com', '<engineer@example.com>']) {
      expect(l3Engineer(env({ L3_ENGINEER_EMAIL: value })), value).toBeNull();
    }
  });
});

describe('assignableAddresses', () => {
  it('is the L3 engineer plus the console allowlist', () => {
    expect(
      assignableAddresses(env({ L3_ENGINEER_EMAIL: 'l3@example.com', ADMIN_EMAILS: 'a@example.com, b@example.com' })),
    ).toEqual(['l3@example.com', 'a@example.com', 'b@example.com']);
  });

  it('names nobody twice', () => {
    expect(assignableAddresses(env({ L3_ENGINEER_EMAIL: 'l3@example.com', ADMIN_EMAILS: 'L3@Example.com' }))).toEqual([
      'l3@example.com',
    ]);
  });

  it('is empty when nothing is configured', () => {
    // Unlike the console allowlist, an empty list here does not mean "permit
    // anyone". It can afford not to: a signed-in agent can still take a
    // ticket, because the route allows their own verified Access identity
    // rather than reading it out of this list.
    expect(assignableAddresses(env())).toEqual([]);
  });
});

describe('mayBeAssigned', () => {
  const configured = env({ L3_ENGINEER_EMAIL: 'l3@example.com', ADMIN_EMAILS: 'agent@example.com' });

  it('accepts a configured address in any casing', () => {
    expect(mayBeAssigned('L3@EXAMPLE.COM', configured)).toBe(true);
    expect(mayBeAssigned(' agent@example.com ', configured)).toBe(true);
  });

  it('refuses everything else', () => {
    expect(mayBeAssigned('stranger@elsewhere.example', configured)).toBe(false);
    expect(mayBeAssigned('', configured)).toBe(false);
  });

  it('does not fold plus tags or dots the way the rate limiter does', () => {
    // Folding widens a set. That is right for counting how much mail an inbox
    // is being sent and wrong for deciding who somebody is, and this decides
    // who somebody is: a fold here would let l3+anything@ inherit the right
    // to answer tickets as the desk.
    expect(mayBeAssigned('l3+urgent@example.com', configured)).toBe(false);
    expect(mayBeAssigned('l.3@example.com', configured)).toBe(false);
  });
});

describe('unassignedAlertRecipients', () => {
  it('splits a configured list', () => {
    expect(unassignedAlertRecipients(env({ UNASSIGNED_ALERT_RECIPIENTS: 'a@example.com, b@example.com' }))).toEqual([
      'a@example.com',
      'b@example.com',
    ]);
  });

  it('drops entries that are not addresses rather than trying to mail them', () => {
    expect(unassignedAlertRecipients(env({ UNASSIGNED_ALERT_RECIPIENTS: 'a@example.com,,nonsense' }))).toEqual([
      'a@example.com',
    ]);
  });

  it('falls back to the monitored desk mailbox, never to nobody', () => {
    // A sweep that reports to no one is worse than no sweep at all: it runs,
    // it costs a query, and it looks like coverage.
    for (const value of [undefined, '', '   ', 'not-an-address']) {
      expect(unassignedAlertRecipients(env({ UNASSIGNED_ALERT_RECIPIENTS: value })), String(value)).toEqual([
        'developer@hamdam.com.au',
      ]);
    }
  });
});
