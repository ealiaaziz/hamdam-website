import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The one test that belongs to neither package.
//
// The site's response headers are declarative, in `public/_headers`, and the
// support desk's are a TypeScript module, in `support/src/securityHeaders.ts`.
// Two files, two formats, two deploy paths, and nothing that reads both. On
// 2026-08-16 a review fetched the two live hosts side by side and found the
// desk missing `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy`
// entirely, and naming four features in its Permissions-Policy against the
// site's twenty one. Neither file looked wrong on its own. That is the whole
// character of the bug: drift is invisible from inside either half.
//
// So this reads both as text and compares them. Text, deliberately, and not an
// import: `support/` is a separate package whose dependencies the root CI job
// never installs (see the comment in vitest.config.js), and reaching across
// that boundary for a value would make the root suite depend on the support
// tree being installed. Reading a file needs nothing.
//
// It lives at the repository root rather than in either package because it is
// about the relationship between them, and putting it in one would mean the
// other could be extracted without noticing this went with it.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const siteHeaders = readFileSync(join(root, 'public/_headers'), 'utf8');
const deskHeaders = readFileSync(join(root, 'support/src/securityHeaders.ts'), 'utf8');

/** The features named in a `Permissions-Policy` value, whatever its layout. */
function featureNames(text) {
  return new Set([...text.matchAll(/([a-z-]+)=\(/g)].map((m) => m[1]));
}

/**
 * The desk's header names, read from the object and not from the file.
 *
 * The first version of this asserted `deskHeaders.toContain('Cross-Origin-
 * Opener-Policy')`, which passed against a file where the header had been
 * deleted from `SECURITY_HEADERS` and survived only in the paragraph above it
 * explaining what it does. Caught by deleting the line and watching the test
 * stay green. A prose mention is not a header, and a test that cannot tell
 * them apart is testing the comment.
 */
function deskHeaderNames() {
  const block = /export const SECURITY_HEADERS[^=]*= \{([\s\S]*?)^\};/m.exec(deskHeaders);
  if (!block) throw new Error('support/src/securityHeaders.ts no longer declares SECURITY_HEADERS as an object literal');
  return new Set([...block[1].matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]));
}

/**
 * The site's header names, read from its rules and not from its commentary.
 *
 * `public/_headers` is more comment than configuration, by design and for good
 * reasons, so the same trap applies: every header this file discusses appears
 * in it as prose whether or not it is still set.
 */
function siteHeaderNames() {
  return new Set(
    siteHeaders
      .split('\n')
      .filter((line) => /^\s+[A-Za-z-]+:/.test(line) && !line.trim().startsWith('#'))
      .map((line) => line.trim().split(':')[0]),
  );
}

/** The site's global rule is the first block, keyed `/*`. */
function sitePermissionsPolicy() {
  const line = siteHeaders.split('\n').find((l) => l.trim().startsWith('Permissions-Policy:'));
  if (!line) throw new Error('public/_headers no longer sets Permissions-Policy');
  return line.slice(line.indexOf(':') + 1).trim();
}

/** The desk builds its value from an array, so read the array. */
function deskPermissionsPolicy() {
  const block = /const PERMISSIONS_POLICY = \[([\s\S]*?)\]\.join/.exec(deskHeaders);
  if (!block) throw new Error('support/src/securityHeaders.ts no longer builds PERMISSIONS_POLICY from an array');
  return block[1];
}

describe('the two hosts deny the same browser features', () => {
  it('the desk names every feature the site names', () => {
    const site = featureNames(sitePermissionsPolicy());
    const desk = featureNames(deskPermissionsPolicy());

    // Not an equality check. The desk is allowed to be stricter, and is: it
    // denies fullscreen where the site allows itself fullscreen. What must
    // never happen again is the desk being the more permissive of the two.
    const missing = [...site].filter((feature) => !desk.has(feature));
    expect(missing, `support/src/securityHeaders.ts does not deny: ${missing.join(', ')}`).toEqual([]);
  });

  it('the site names a useful number of features, so the check above means something', () => {
    // Guards the guard. If someone empties the site's list, the comparison
    // above passes trivially and stops protecting anything.
    expect(featureNames(sitePermissionsPolicy()).size).toBeGreaterThan(15);
  });
});

describe('the two hosts carry the same cross-origin headers', () => {
  // The gap that started this. The site has carried both since 2026-08-08;
  // the desk, which is the half holding requesters' names, addresses and
  // whatever they pasted into a ticket, had neither until 2026-08-16.
  for (const header of ['Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy']) {
    it(`both set ${header}`, () => {
      expect(siteHeaderNames()).toContain(header);
      expect(deskHeaderNames()).toContain(header);
    });
  }

  it('the desk sets every security header the site sets', () => {
    // The general form of the same question. `Cache-Control` is excluded
    // because the two hosts genuinely disagree about it and should: the site
    // wants its assets cached for a year, the desk wants its ticket pages
    // cached nowhere.
    const ignored = new Set(['Cache-Control']);
    const missing = [...siteHeaderNames()].filter((h) => !ignored.has(h) && !deskHeaderNames().has(h));
    expect(missing, `the desk does not set: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('both hosts promise HSTS on the same terms', () => {
  it('a year, all subdomains, on each', () => {
    const hsts = /max-age=(\d+); includeSubDomains/;
    expect(siteHeaders).toMatch(hsts);
    expect(deskHeaders).toMatch(hsts);
    expect(Number(hsts.exec(siteHeaders)[1])).toBeGreaterThanOrEqual(31536000);
    expect(Number(hsts.exec(deskHeaders)[1])).toBeGreaterThanOrEqual(31536000);
  });
});
