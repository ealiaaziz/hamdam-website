import { describe, it, expect } from 'vitest';
import {
  PREFERRED_SOURCE,
  PREFERRED_SOURCE_URL,
  normalizeSourceDomain,
  preferredSourceUrl,
} from '../preferredSource.js';

describe('PREFERRED_SOURCE', () => {
  it('is frozen and points at the apex the canonical tags already declare', () => {
    expect(Object.isFrozen(PREFERRED_SOURCE)).toBe(true);
    expect(PREFERRED_SOURCE.DOMAIN).toBe('hamdam.com.au');
  });
});

describe('normalizeSourceDomain', () => {
  it('accepts a bare hostname', () => {
    expect(normalizeSourceDomain('hamdam.com.au')).toBe('hamdam.com.au');
  });

  it('lowercases and trims', () => {
    expect(normalizeSourceDomain('  Hamdam.COM.au  ')).toBe('hamdam.com.au');
  });

  it('strips a scheme, a path and a trailing root dot', () => {
    expect(normalizeSourceDomain('https://hamdam.com.au/fa/')).toBe('hamdam.com.au');
    expect(normalizeSourceDomain('http://hamdam.com.au')).toBe('hamdam.com.au');
    expect(normalizeSourceDomain('hamdam.com.au.')).toBe('hamdam.com.au');
  });

  it('keeps a subdomain, which Google treats as its own source', () => {
    expect(normalizeSourceDomain('support.hamdam.com.au')).toBe('support.hamdam.com.au');
  });

  it('rejects anything that is not a hostname, rather than passing it through', () => {
    for (const bad of ['', '   ', 'hamdam', 'not a domain', '-hamdam.com.au', 'hamdam..au', null, undefined, 42, {}]) {
      expect(normalizeSourceDomain(bad)).toBeNull();
    }
  });
});

describe('preferredSourceUrl', () => {
  it('builds the deep link Google documents', () => {
    expect(preferredSourceUrl('hamdam.com.au')).toBe(
      'https://www.google.com/preferences/source?q=hamdam.com.au'
    );
  });

  it('returns null for an unusable domain, so the caller renders no link', () => {
    expect(preferredSourceUrl('[DOMAIN]')).toBeNull();
    expect(preferredSourceUrl(null)).toBeNull();
  });
});

describe('PREFERRED_SOURCE_URL', () => {
  it('matches the switch: a URL while enabled, null once it is off', () => {
    expect(PREFERRED_SOURCE_URL).toBe(
      PREFERRED_SOURCE.ENABLED ? 'https://www.google.com/preferences/source?q=hamdam.com.au' : null
    );
  });

  it('loads no third-party script, so the enforcing CSP needs no widening', () => {
    expect(PREFERRED_SOURCE_URL).not.toContain('news.google.com');
  });
});
