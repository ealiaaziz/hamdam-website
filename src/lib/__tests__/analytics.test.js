import { describe, it, expect } from 'vitest';
import { normalizeBeaconToken, beaconConfig, resolveBeaconToken, PRODUCTION_BEACON_TOKEN } from '../analytics.js';

// The point of these is the fail-closed direction. appStore.js records what
// happens when a token does not fail closed: `[ASC_PROVIDER_TOKEN]` shipped as
// a literal in every store link on the site for weeks, on the reasoning that an
// unresolved value would simply be ignored. It was not ignored, it was
// rendered. A malformed beacon token must produce no tag at all rather than a
// tag that reports nowhere.

describe('normalizeBeaconToken', () => {
  const valid = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

  it('accepts a 32-character hex token', () => {
    expect(normalizeBeaconToken(valid)).toBe(valid);
    expect(valid).toHaveLength(32);
  });

  it('accepts uppercase hex and trims surrounding whitespace', () => {
    expect(normalizeBeaconToken(valid.toUpperCase())).toBe(valid.toUpperCase());
    expect(normalizeBeaconToken(`  ${valid}\n`)).toBe(valid);
  });

  it('rejects the placeholder shapes that have reached production before', () => {
    for (const raw of ['[CF_BEACON_TOKEN]', '${CF_BEACON_TOKEN}', 'your-token-here', 'TODO']) {
      expect(normalizeBeaconToken(raw)).toBeNull();
    }
  });

  it('rejects wrong lengths and non-hex characters', () => {
    expect(normalizeBeaconToken(valid.slice(0, 31))).toBeNull();
    expect(normalizeBeaconToken(`${valid}0`)).toBeNull();
    expect(normalizeBeaconToken(valid.replace('a', 'g'))).toBeNull();
    expect(normalizeBeaconToken(valid.replace('a', '-'))).toBeNull();
  });

  it('rejects empty and non-string input rather than throwing', () => {
    for (const raw of ['', '   ', null, undefined, 42, {}, [], true]) {
      expect(normalizeBeaconToken(raw)).toBeNull();
    }
  });
});

describe('beaconConfig', () => {
  it('emits the JSON shape the beacon expects', () => {
    const token = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    expect(JSON.parse(beaconConfig(token))).toEqual({ token });
  });

  it('escapes rather than concatenates, so a token cannot break the attribute', () => {
    // Defence in depth: normalizeBeaconToken already bars everything but hex,
    // so this only matters if that check is ever loosened.
    const hostile = '"},"x":"';
    const out = beaconConfig(hostile);
    expect(JSON.parse(out)).toEqual({ token: hostile });
    expect(Object.keys(JSON.parse(out))).toEqual(['token']);
  });
});

const VALID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const OTHER = '0f1e2d3c4b5a69788796a5b4c3d2e1f0';

describe('resolveBeaconToken', () => {
  // Rule 2 is the whole point of the gate: every push to this repo deploys, so
  // a CI build is a production build, and a build on a laptop is not and must
  // not write page views into the production dataset.
  it('emits the committed token on a CI build', () => {
    expect(resolveBeaconToken({ productionToken: VALID, isCi: true })).toBe(VALID);
  });

  it('emits nothing off CI, even with a valid committed token', () => {
    expect(resolveBeaconToken({ productionToken: VALID, isCi: false })).toBeNull();
  });

  it('lets an explicit override win, on CI or off it', () => {
    expect(resolveBeaconToken({ explicit: OTHER, productionToken: VALID, isCi: true })).toBe(OTHER);
    expect(resolveBeaconToken({ explicit: OTHER, productionToken: VALID, isCi: false })).toBe(OTHER);
  });

  it('ignores a malformed override rather than trusting it', () => {
    // Falls through to the normal rules instead of emitting junk.
    expect(resolveBeaconToken({ explicit: '[TOKEN]', productionToken: VALID, isCi: true })).toBe(VALID);
    expect(resolveBeaconToken({ explicit: '[TOKEN]', productionToken: VALID, isCi: false })).toBeNull();
  });

  it('fails closed when the committed token is missing or malformed', () => {
    for (const bad of [null, undefined, '', 'TODO', VALID.slice(0, 31)]) {
      expect(resolveBeaconToken({ productionToken: bad, isCi: true })).toBeNull();
    }
  });

  it('returns null when handed nothing at all', () => {
    expect(resolveBeaconToken()).toBeNull();
  });
});

describe('PRODUCTION_BEACON_TOKEN', () => {
  // Guards the two ways this can be wrong once someone pastes the real value:
  // a placeholder, or a typo in the shape. Null is the current, expected state.
  it('is either null or a well-formed token, never a placeholder', () => {
    if (PRODUCTION_BEACON_TOKEN !== null) {
      expect(normalizeBeaconToken(PRODUCTION_BEACON_TOKEN)).toBe(PRODUCTION_BEACON_TOKEN);
    }
  });
});
