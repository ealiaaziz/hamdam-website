import { describe, it, expect } from 'vitest';
import { developerCc, isOwner, ownerEmails } from '../src/owner.js';
import type { Env } from '../src/types.js';

const env = (owner: string, cc = 'dev@example.com') =>
  ({ OWNER_EMAILS: owner, DEVELOPER_CC_EMAIL: cc }) as unknown as Env;

describe('ownerEmails', () => {
  it('parses a comma-separated secret', () => {
    expect(ownerEmails(env('a@example.com, b@example.com'))).toEqual([
      'a@example.com',
      'b@example.com',
    ]);
  });

  it('is empty when the secret is unset', () => {
    expect(ownerEmails({} as Env)).toEqual([]);
  });
});

describe('isOwner compares literally', () => {
  it('matches regardless of case or padding', () => {
    expect(isOwner(env('owner@example.com'), '  Owner@Example.com ')).toBe(true);
  });

  /**
   * Google treats these as one mailbox and this deliberately does not, for the
   * reason rateLimit.ts already gives: folding widens a set, which is right
   * for counting and wrong for deciding who somebody is. The consequence is
   * that the gate fails closed on the other spelling, so it is silence rather
   * than a wrong action, and the remedy is to list both in the secret.
   */
  it('does not fold Gmail dots', () => {
    expect(isOwner(env('first.last@gmail.com'), 'firstlast@gmail.com')).toBe(false);
    expect(isOwner(env('first.last@gmail.com,firstlast@gmail.com'), 'firstlast@gmail.com')).toBe(true);
  });

  it('does not fold plus tags', () => {
    expect(isOwner(env('owner@example.com'), 'owner+bot@example.com')).toBe(false);
  });
});

describe('developerCc is scoped to the owner', () => {
  it('copies the developer on the owner thread', () => {
    expect(developerCc(env('owner@example.com'), 'owner@example.com')).toBe('dev@example.com');
  });

  /**
   * The one that matters. Copying the developer on every reply would publish
   * his personal address to every stranger who writes in, one message at a
   * time, and there is no taking that back.
   */
  it('never copies him on a stranger ticket', () => {
    expect(developerCc(env('owner@example.com'), 'stranger@example.com')).toBeNull();
  });

  it('is null when no copy is configured', () => {
    expect(developerCc(env('owner@example.com', ''), 'owner@example.com')).toBeNull();
  });

  it('never copies someone on their own mail', () => {
    expect(developerCc(env('dev@example.com'), 'dev@example.com')).toBeNull();
  });
});
