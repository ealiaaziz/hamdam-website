import { describe, expect, it } from 'vitest';
import {
  CONTENT_SECURITY_POLICY,
  DEFAULT_CACHE_CONTROL,
  PERMISSIONS_POLICY,
  SECURITY_HEADERS,
} from '../src/securityHeaders.js';

// These headers were set inline in index.ts, which meant the only way to check
// them was to drive the whole Hono app, which nothing did. On 2026-08-16 a
// review comparing the two live hosts found the desk missing both cross-origin
// headers the marketing site had carried for eight days, and denying four
// browser features where the site denied twenty one. Nothing was broken; the
// list had simply drifted, in the direction of the host that holds the data.
//
// So the list is a value now, and this file is the thing that reads it.

describe('the header set', () => {
  it('carries both cross-origin headers, which is the gap that was found', () => {
    expect(SECURITY_HEADERS['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(SECURITY_HEADERS['Cross-Origin-Resource-Policy']).toBe('same-origin');
  });

  it('still carries everything it carried before', () => {
    expect(SECURITY_HEADERS['X-Frame-Options']).toBe('DENY');
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(SECURITY_HEADERS['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains; preload');
  });

  it('asks for a year of HSTS across every subdomain', () => {
    // A year is the preload list's floor. Anything shorter is not merely
    // weaker, it is ineligible, and the header claims `preload`.
    const hsts = SECURITY_HEADERS['Strict-Transport-Security'];
    const maxAge = Number(/max-age=(\d+)/.exec(hsts)?.[1]);
    expect(maxAge).toBeGreaterThanOrEqual(31536000);
    expect(hsts).toContain('includeSubDomains');
  });
});

describe('the content security policy', () => {
  it('allows no inline script or style, which is what makes it worth having', () => {
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-inline');
    expect(CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
  });

  it('refuses framing, plugins and base tag rewriting', () => {
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(CONTENT_SECURITY_POLICY).toContain("base-uri 'self'");
  });

  it('lets forms post only to this desk', () => {
    // The console's state-changing routes are guarded by the Origin check in
    // urls.ts; this is the other half, and it is the half that survives a
    // browser sending no Origin at all.
    expect(CONTENT_SECURITY_POLICY).toContain("form-action 'self'");
  });

  it('names a default, so a directive nobody thought of still falls back to self', () => {
    expect(CONTENT_SECURITY_POLICY).toMatch(/^default-src 'self'/);
  });
});

describe('the permissions policy', () => {
  const features = PERMISSIONS_POLICY.split(', ');

  it('grants nothing to anybody, including this origin', () => {
    // Every entry is `feature=()`, the empty allowlist. The marketing site
    // allows itself fullscreen; a ticket form has nothing to show fullscreen,
    // so the desk's list is the stricter one and this asserts it stays that
    // way rather than being relaxed to match the site by someone tidying up.
    for (const feature of features) {
      expect(feature).toMatch(/^[a-z-]+=\(\)$/);
    }
  });

  it('names the features that actually reach a person', () => {
    // The four the old list had, which are the ones with a camera, a
    // microphone, a location or a card behind them.
    for (const feature of ['geolocation', 'camera', 'microphone', 'payment']) {
      expect(features).toContain(`${feature}=()`);
    }
  });

  it('names the tracking features too, which the old list did not', () => {
    for (const feature of ['browsing-topics', 'interest-cohort', 'idle-detection', 'display-capture']) {
      expect(features).toContain(`${feature}=()`);
    }
  });

  it('lists each feature once', () => {
    expect(new Set(features).size).toBe(features.length);
  });
});

describe('the default cache control', () => {
  it('keeps ticket pages out of every cache in the path', () => {
    // The tracking token is in the query string, so a shared cache keyed on
    // the URL is a cache keyed on the credential.
    expect(DEFAULT_CACHE_CONTROL).toContain('private');
    expect(DEFAULT_CACHE_CONTROL).toContain('no-store');
  });
});
