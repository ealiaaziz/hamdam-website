import { describe, expect, it } from 'vitest';
import {
  describeRequesterAccess,
  isAllowedRequester,
  parseRequesterRules,
  requesterAllowlistConfigured,
} from '../src/requesterAccess.js';
import type { Env } from '../src/types.js';

// The one control that turns a public desk into an internal one. Hamdam's
// requesters are the public and must stay able to write; another business's
// desk has five people who may and everyone else who may not, and the same
// code has to be both.

const env = (allowlist?: string) => ({ REQUESTER_ALLOWLIST: allowlist }) as Env;

describe('parseRequesterRules', () => {
  it('accepts all three forms somebody actually writes', () => {
    expect(parseRequesterRules('example.org, @other.org, person@third.org')).toEqual([
      { kind: 'domain', value: 'example.org' },
      { kind: 'domain', value: 'other.org' },
      { kind: 'address', value: 'person@third.org' },
    ]);
  });

  it('lowercases and trims', () => {
    expect(parseRequesterRules('  Example.ORG , Person@Third.org ')).toEqual([
      { kind: 'domain', value: 'example.org' },
      { kind: 'address', value: 'person@third.org' },
    ]);
  });

  it('drops entries that cannot be a domain or an address', () => {
    // A rule nobody can satisfy would be harmless; a rule that silently
    // matches nothing while looking configured is what hides a typo.
    expect(parseRequesterRules('localhost, @, , notadomain')).toEqual([]);
  });
});

describe('isAllowedRequester', () => {
  it('permits everyone when nothing is configured', () => {
    // This is Hamdam, and it is correct there. Somebody who bought the app
    // has no account and needs none.
    for (const value of [undefined, '', '   ']) {
      expect(isAllowedRequester('stranger@anywhere.example', env(value)), String(value)).toBe(true);
    }
  });

  it('permits any address at an allowed domain', () => {
    const e = env('circuitenergy.org');
    expect(isAllowedRequester('tim@circuitenergy.org', e)).toBe(true);
    expect(isAllowedRequester('NEW.STARTER@CircuitEnergy.org', e)).toBe(true);
  });

  it('refuses everyone else once a list exists', () => {
    const e = env('circuitenergy.org');
    expect(isAllowedRequester('someone@gmail.com', e)).toBe(false);
    expect(isAllowedRequester('', e)).toBe(false);
    expect(isAllowedRequester('no-at-sign', e)).toBe(false);
  });

  it('lets one named outsider in without their whole domain', () => {
    // The contractor or the external bookkeeper. One address, not gmail.com.
    const e = env('circuitenergy.org, bookkeeper@accountants.example');
    expect(isAllowedRequester('bookkeeper@accountants.example', e)).toBe(true);
    expect(isAllowedRequester('someone.else@accountants.example', e)).toBe(false);
  });

  it('does not treat a subdomain as the domain', () => {
    // `mail.circuitenergy.org` is a different namespace, and whoever controls
    // it need not be whoever controls the parent. Matching it would widen the
    // set of people who count as staff, which is the one direction this check
    // must never move on its own.
    expect(isAllowedRequester('tim@mail.circuitenergy.org', env('circuitenergy.org'))).toBe(false);
    expect(isAllowedRequester('tim@notcircuitenergy.org', env('circuitenergy.org'))).toBe(false);
  });

  it('does not fold plus tags or dots', () => {
    // Same reasoning as sameAddress and the ADMIN_EMAILS check: folding
    // widens, and widening is wrong for a question about who somebody is.
    const e = env('tim@circuitenergy.org');
    expect(isAllowedRequester('tim+urgent@circuitenergy.org', e)).toBe(false);
    expect(isAllowedRequester('t.im@circuitenergy.org', e)).toBe(false);
  });
});

describe('describeRequesterAccess', () => {
  it('says plainly which mode the deployment is in', () => {
    expect(describeRequesterAccess(env())).toContain('Open to anyone');
    expect(describeRequesterAccess(env('circuitenergy.org'))).toContain('@circuitenergy.org');
    expect(requesterAllowlistConfigured(env())).toBe(false);
    expect(requesterAllowlistConfigured(env('circuitenergy.org'))).toBe(true);
  });
});
