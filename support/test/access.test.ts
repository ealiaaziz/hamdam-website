import { beforeAll, describe, expect, it } from 'vitest';
import { extractAccessToken, verifyAccessJwt, type AccessConfig } from '../src/access.js';

// These tests sign real RS256 tokens with a generated keypair and verify them
// through the same WebCrypto path production uses. Mocking the signature check
// would leave the one part that actually protects the console untested.

const TEAM = 'hamdam.cloudflareaccess.com';
const AUD = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';
const CONFIG: AccessConfig = { teamDomain: TEAM, aud: AUD };

let publicJwk: JsonWebKey;
let privateKey: CryptoKey;
let otherPrivateKey: CryptoKey;

const NOW = Date.UTC(2026, 7, 1, 12, 0, 0);

function b64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function encodeSegment(value: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(value)));
}

async function makeToken(
  overrides: { payload?: Record<string, unknown>; header?: Record<string, unknown>; signWith?: CryptoKey } = {},
): Promise<string> {
  const header = { alg: 'RS256', kid: 'test-key', ...overrides.header };
  const payload = {
    aud: [AUD],
    iss: `https://${TEAM}`,
    exp: Math.floor(NOW / 1000) + 600,
    nbf: Math.floor(NOW / 1000) - 10,
    email: 'ealia@hamdam.com.au',
    sub: 'user-123',
    ...overrides.payload,
  };
  const signingInput = `${encodeSegment(header)}.${encodeSegment(payload)}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    overrides.signWith ?? privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64url(new Uint8Array(signature))}`;
}

const keys = async () => [publicJwk];

beforeAll(async () => {
  const params = { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' };
  // generateKey/exportKey are typed as unions in @cloudflare/workers-types
  // (they cover both key and key-pair algorithms); RSASSA always yields a
  // pair and a JWK, so narrowing here is accurate, not papering over.
  const pair = (await crypto.subtle.generateKey(params, true, ['sign', 'verify'])) as CryptoKeyPair;
  privateKey = pair.privateKey;
  publicJwk = { ...((await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey), kid: 'test-key' } as JsonWebKey & { kid: string };
  const other = (await crypto.subtle.generateKey(params, true, ['sign', 'verify'])) as CryptoKeyPair;
  otherPrivateKey = other.privateKey;
});

describe('verifyAccessJwt', () => {
  it('accepts a correctly signed, current token and returns the identity', async () => {
    const identity = await verifyAccessJwt(await makeToken(), CONFIG, keys, NOW);
    expect(identity).toEqual({ email: 'ealia@hamdam.com.au', subject: 'user-123' });
  });

  it('rejects a token signed by a different key', async () => {
    // The whole point: a forged assertion must not authenticate.
    const forged = await makeToken({ signWith: otherPrivateKey });
    expect(await verifyAccessJwt(forged, CONFIG, keys, NOW)).toBeNull();
  });

  it('rejects a tampered payload even though the signature is well-formed', async () => {
    const token = await makeToken();
    const [header, , signature] = token.split('.');
    const swapped = encodeSegment({
      aud: [AUD],
      iss: `https://${TEAM}`,
      exp: Math.floor(NOW / 1000) + 600,
      email: 'attacker@example.com',
    });
    expect(await verifyAccessJwt(`${header}.${swapped}.${signature}`, CONFIG, keys, NOW)).toBeNull();
  });

  it('rejects an expired token', async () => {
    const token = await makeToken({ payload: { exp: Math.floor(NOW / 1000) - 3600 } });
    expect(await verifyAccessJwt(token, CONFIG, keys, NOW)).toBeNull();
  });

  it('rejects a token for a different Access application', async () => {
    const token = await makeToken({ payload: { aud: ['some-other-application-aud'] } });
    expect(await verifyAccessJwt(token, CONFIG, keys, NOW)).toBeNull();
  });

  it('rejects a token from a different team', async () => {
    const token = await makeToken({ payload: { iss: 'https://attacker.cloudflareaccess.com' } });
    expect(await verifyAccessJwt(token, CONFIG, keys, NOW)).toBeNull();
  });

  it('rejects alg:none, so an unsigned token cannot walk in', async () => {
    const header = encodeSegment({ alg: 'none' });
    const payload = encodeSegment({ aud: [AUD], iss: `https://${TEAM}`, exp: Math.floor(NOW / 1000) + 600, email: 'x@y.z' });
    expect(await verifyAccessJwt(`${header}.${payload}.`, CONFIG, keys, NOW)).toBeNull();
  });

  it('rejects a token with no email claim', async () => {
    const token = await makeToken({ payload: { email: undefined } });
    expect(await verifyAccessJwt(token, CONFIG, keys, NOW)).toBeNull();
  });

  it('rejects malformed input without throwing', async () => {
    for (const bad of ['', 'not-a-jwt', 'a.b', 'a.b.c', '...']) {
      expect(await verifyAccessJwt(bad, CONFIG, keys, NOW)).toBeNull();
    }
  });

  it('still verifies when the token names an unknown kid, since Access rotates keys', async () => {
    const token = await makeToken({ header: { kid: 'rotated-away' } });
    expect(await verifyAccessJwt(token, CONFIG, keys, NOW)).not.toBeNull();
  });
});

describe('extractAccessToken', () => {
  it('prefers the assertion header', () => {
    expect(extractAccessToken('header-token', 'CF_Authorization=cookie-token')).toBe('header-token');
  });

  it('falls back to the CF_Authorization cookie', () => {
    expect(extractAccessToken(undefined, 'foo=bar; CF_Authorization=cookie-token; baz=qux')).toBe('cookie-token');
  });

  it('returns null when neither is present', () => {
    expect(extractAccessToken(undefined, 'foo=bar')).toBeNull();
    expect(extractAccessToken(undefined, undefined)).toBeNull();
  });
});
