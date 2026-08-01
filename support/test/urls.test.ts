import { describe, expect, it } from 'vitest';
import { httpsRedirectTarget, isLocalHost, trackingUrl } from '../src/urls.js';

describe('trackingUrl', () => {
  it('emits https for a production request', () => {
    expect(trackingUrl('https://support.hamdam.com.au/tickets', 42, 'abc123')).toBe(
      'https://support.hamdam.com.au/tickets/42?token=abc123',
    );
  });

  it('does NOT propagate an http request into the emailed link', () => {
    // The whole point: the token is a credential and it rides in the query
    // string, so a downgraded request must not produce a downgraded link.
    expect(trackingUrl('http://support.hamdam.com.au/tickets', 42, 'abc123')).toBe(
      'https://support.hamdam.com.au/tickets/42?token=abc123',
    );
  });

  it('keeps http for local development, where there is no certificate', () => {
    expect(trackingUrl('http://localhost:8787/tickets', 7, 'tok')).toBe('http://localhost:8787/tickets/7?token=tok');
  });

  it('percent-encodes the token rather than trusting it to be URL-safe', () => {
    expect(trackingUrl('https://support.hamdam.com.au/', 1, 'a+b/c=d')).toBe(
      'https://support.hamdam.com.au/tickets/1?token=a%2Bb%2Fc%3Dd',
    );
  });
});

describe('httpsRedirectTarget', () => {
  const VIA_EDGE = true;
  const NOT_EDGE = false;

  it('upgrades a plaintext edge request, preserving path and query', () => {
    expect(httpsRedirectTarget('http://support.hamdam.com.au/tickets/9?token=xyz', VIA_EDGE)).toBe(
      'https://support.hamdam.com.au/tickets/9?token=xyz',
    );
  });

  it('returns null when the request is already https, so no redirect loop', () => {
    expect(httpsRedirectTarget('https://support.hamdam.com.au/admin', VIA_EDGE)).toBeNull();
  });

  it('returns null off-edge even when the host looks like production', () => {
    // This is the wrangler dev case, and the reason this function takes an
    // explicit edge flag rather than checking the hostname: `wrangler dev`
    // reports the custom domain as the Host, so a hostname check would 301
    // local development to the live site.
    expect(httpsRedirectTarget('http://support.hamdam.com.au/', NOT_EDGE)).toBeNull();
  });

  it('returns null on localhost regardless of the flag', () => {
    expect(httpsRedirectTarget('http://localhost:8787/', NOT_EDGE)).toBeNull();
    expect(httpsRedirectTarget('http://127.0.0.1:8787/admin', NOT_EDGE)).toBeNull();
  });
});

describe('isLocalHost', () => {
  it('recognises the loopback names wrangler dev binds to', () => {
    expect(isLocalHost('localhost')).toBe(true);
    expect(isLocalHost('127.0.0.1')).toBe(true);
  });

  it('does not treat a lookalike production host as local', () => {
    expect(isLocalHost('localhost.hamdam.com.au')).toBe(false);
    expect(isLocalHost('support.hamdam.com.au')).toBe(false);
  });
});
