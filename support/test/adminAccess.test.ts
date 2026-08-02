import { describe, expect, it } from 'vitest';
import { adminAllowlist, isAllowedAgent } from '../src/adminAccess.js';
import type { Env } from '../src/types.js';

// The console's second lock. The JWT check proves an assertion is genuine and
// issued for this application, then trusts whoever it names; who counts as an
// agent lived entirely in one Cloudflare Access policy. Same argument the
// country check already won, applied to the surface that actually holds
// people's data.

const env = (ADMIN_EMAILS?: string) => ({ ADMIN_EMAILS }) as unknown as Env;

describe('adminAllowlist', () => {
  it('reads a configured list, forgivingly', () => {
    expect(adminAllowlist(env(' A@hamdam.com.au , b@hamdam.com.au '))).toEqual(['a@hamdam.com.au', 'b@hamdam.com.au']);
  });

  it('drops entries that are not addresses rather than trusting them', () => {
    expect(adminAllowlist(env('a@hamdam.com.au,,rubbish, '))).toEqual(['a@hamdam.com.au']);
  });
});

describe('isAllowedAgent', () => {
  it('admits an address on the list', () => {
    expect(isAllowedAgent('a@hamdam.com.au', env('a@hamdam.com.au,b@hamdam.com.au'))).toBe(true);
    expect(isAllowedAgent('  A@Hamdam.COM.au ', env('a@hamdam.com.au'))).toBe(true);
  });

  it('refuses an address that is not, even with a valid Access assertion', () => {
    // The whole point: Access said yes and this still says no.
    expect(isAllowedAgent('someone@else.example', env('a@hamdam.com.au'))).toBe(false);
  });

  it('does not fold plus-tags or dots the way the rate limiter does', () => {
    // Folding widens a set. Widening is right for metering and wrong for a
    // list of people who may read other people's tickets.
    expect(isAllowedAgent('a+admin@hamdam.com.au', env('a@hamdam.com.au'))).toBe(false);
    expect(isAllowedAgent('first.last@gmail.com', env('firstlast@gmail.com'))).toBe(false);
  });

  it('admits everyone when no list is configured', () => {
    // Deliberate, and the console says so on every page. Making an unset
    // variable a hard refusal would have made the deploy that introduced this
    // file a lockout of the only two people who can reach the console, with
    // the fix needing the console they can no longer reach.
    expect(isAllowedAgent('anyone@example.com', env())).toBe(true);
    expect(isAllowedAgent('anyone@example.com', env('   '))).toBe(true);
  });

  it('treats a list of pure junk as no list, not as a lockout', () => {
    // A typo in a secret should not brick the console, and it does not go
    // unnoticed either: the page shows the notice whenever the list is empty.
    expect(isAllowedAgent('anyone@example.com', env('not-an-address'))).toBe(true);
  });
});
