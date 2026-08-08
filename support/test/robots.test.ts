import { describe, it, expect } from 'vitest';
import { SUPPORT_ROBOTS_BODY } from '../src/robots.js';
import { MTA_STS_ROBOTS_BODY, MTA_STS_HOSTNAME, mtaStsResponseFor } from '../src/mtaSts.js';

describe('SUPPORT_ROBOTS_BODY', () => {
  it('disallows every crawler from every path', () => {
    expect(SUPPORT_ROBOTS_BODY).toMatch(/^User-agent: \*$/m);
    expect(SUPPORT_ROBOTS_BODY).toMatch(/^Disallow: \/$/m);
  });

  it('has no Allow line that would re-open a subtree', () => {
    // A single `Allow:` here would carve a hole in the Disallow above it, and
    // the paths this is keeping out of search -- /tickets/:id carries its own
    // tracking token in the query string -- are not ones to re-open by
    // accident.
    expect(SUPPORT_ROBOTS_BODY).not.toMatch(/^Allow:/m);
  });

  it('ends with a newline, so the last directive is well-formed', () => {
    expect(SUPPORT_ROBOTS_BODY.endsWith('\n')).toBe(true);
  });
});

describe('the two hosts each answer for themselves', () => {
  it('the MTA-STS host keeps its own robots.txt, not the desk route', () => {
    // The MTA-STS middleware is registered before the desk's /robots.txt
    // route, so it answers first on that hostname. If that ever inverts, the
    // mail-plumbing host would start serving the desk's body -- same content
    // today, but the two are separate decisions and are documented as such.
    expect(mtaStsResponseFor(`https://${MTA_STS_HOSTNAME}/robots.txt`)).toEqual({
      status: 200,
      body: MTA_STS_ROBOTS_BODY,
    });
  });

  it('the desk hostname is not claimed by the MTA-STS handler, so its own route runs', () => {
    for (const host of ['support.hamdam.com.au', 'hamdam.com.au']) {
      expect(mtaStsResponseFor(`https://${host}/robots.txt`), host).toBeNull();
    }
  });
});
