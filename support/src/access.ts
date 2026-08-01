// Cloudflare Access JWT verification for the agent console.
//
// Why this exists rather than just reading Cf-Access-Authenticated-User-Email:
// that header is only trustworthy while an Access policy is actually in front
// of the route. Cloudflare sets and overwrites it for paths Access protects,
// but for any path it does not protect, a client-supplied
// `Cf-Access-Authenticated-User-Email: whoever@example.com` passes straight
// through to the Worker. So trusting the header alone means the console is
// wide open during the window between deploying and configuring Access, and
// again any time the policy is removed, renamed, or scoped to the wrong path.
// A support queue holds people's names, email addresses, and whatever they
// pasted into a ticket, so "probably configured correctly" is not the standard
// to hold it to.
//
// Verifying the signed assertion instead means the console is safe on its own
// merits: the token is signed by the team's Access keys, and nothing a client
// can send imitates that.
//
// Reference: the token arrives as the Cf-Access-Jwt-Assertion header (and as
// the CF_Authorization cookie), signed RS256, with the Access application's
// AUD tag in `aud` and the team domain in `iss`.

export interface AccessConfig {
  /** e.g. "hamdam.cloudflareaccess.com" -- Zero Trust -> Settings -> Custom Pages shows the team domain. */
  teamDomain: string;
  /** The Access application's AUD tag, from its configuration page. */
  aud: string;
}

export interface AccessIdentity {
  email: string;
  subject: string;
}

interface JwtHeader {
  alg?: string;
  kid?: string;
}

interface JwtPayload {
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
  email?: string;
  sub?: string;
}

/** Clock skew tolerance. Access tokens are short-lived; a minute is plenty. */
const LEEWAY_SECONDS = 60;

function base64UrlToBytes(input: string): Uint8Array | null {
  // atob rejects base64url's - and _ and tolerates missing padding poorly, so
  // normalise first. A malformed segment is a rejected token, never a throw.
  const normalized = input.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function decodeJsonSegment<T>(segment: string): T | null {
  const bytes = base64UrlToBytes(segment);
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

/**
 * Verify an Access JWT and return the identity it asserts, or null if the
 * token is missing, malformed, unsigned by the team's keys, expired, or
 * issued for a different application or team.
 *
 * Returns null rather than throwing: every failure here is "this request is
 * not authenticated", and the caller's job is identical in all of them.
 *
 * `fetchKeys` is injected so the signature path can be tested against a
 * generated keypair rather than the network.
 */
export async function verifyAccessJwt(
  token: string,
  config: AccessConfig,
  fetchKeys: (teamDomain: string) => Promise<JsonWebKey[]>,
  nowMs: number = Date.now(),
): Promise<AccessIdentity | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerSegment, payloadSegment, signatureSegment] = parts;

  const header = decodeJsonSegment<JwtHeader>(headerSegment);
  const payload = decodeJsonSegment<JwtPayload>(payloadSegment);
  if (!header || !payload) return null;

  // Pin the algorithm. Accepting whatever `alg` claims is how "alg: none" and
  // RS256-verified-as-HS256 confusions happen.
  if (header.alg !== 'RS256') return null;

  const expectedIssuer = `https://${config.teamDomain}`;
  if (payload.iss !== expectedIssuer) return null;

  const audiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (!audiences.includes(config.aud)) return null;

  const nowSeconds = Math.floor(nowMs / 1000);
  if (typeof payload.exp !== 'number' || nowSeconds > payload.exp + LEEWAY_SECONDS) return null;
  if (typeof payload.nbf === 'number' && nowSeconds < payload.nbf - LEEWAY_SECONDS) return null;

  if (!payload.email) return null;

  const signature = base64UrlToBytes(signatureSegment);
  if (!signature) return null;

  const keys = await fetchKeys(config.teamDomain);
  // Prefer the key the token names, but fall back to trying all published
  // keys: Access rotates signing keys and a token minted just before a
  // rotation can name a kid that is no longer first in the set.
  const candidates = header.kid ? keys.filter((k) => (k as { kid?: string }).kid === header.kid) : keys;
  const toTry = candidates.length > 0 ? candidates : keys;

  const signedData = new TextEncoder().encode(`${headerSegment}.${payloadSegment}`);

  for (const jwk of toTry) {
    try {
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const valid = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        key,
        signature as unknown as BufferSource,
        signedData as unknown as BufferSource,
      );
      if (valid) return { email: payload.email, subject: payload.sub ?? '' };
    } catch {
      // A key that fails to import is a key we cannot verify against, not a
      // reason to abandon the remaining keys.
      continue;
    }
  }

  return null;
}

interface CachedKeys {
  keys: JsonWebKey[];
  expiresAtMs: number;
}

// Module-level cache. Workers reuse an isolate across requests, so this
// spares a JWKS round trip on most of them without any storage binding. A
// cold isolate simply fetches once.
const keyCache = new Map<string, CachedKeys>();
const KEY_TTL_MS = 60 * 60 * 1000;

/** Production key fetcher: the team's published Access signing keys. */
export async function fetchAccessKeys(teamDomain: string, nowMs: number = Date.now()): Promise<JsonWebKey[]> {
  const cached = keyCache.get(teamDomain);
  if (cached && cached.expiresAtMs > nowMs) return cached.keys;

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) {
    // Serve stale keys rather than locking every agent out over a blip. They
    // are public verification keys; a stale one still cannot validate a
    // forged signature.
    if (cached) return cached.keys;
    throw new Error(`Access key fetch failed: HTTP ${response.status}`);
  }
  const body = (await response.json()) as { keys?: JsonWebKey[] };
  const keys = body.keys ?? [];
  keyCache.set(teamDomain, { keys, expiresAtMs: nowMs + KEY_TTL_MS });
  return keys;
}

/** Pull the assertion from either place Access puts it. */
export function extractAccessToken(headerValue: string | undefined, cookieHeader: string | undefined): string | null {
  if (headerValue) return headerValue;
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.trim().split('=');
    if (name === 'CF_Authorization' && rest.length > 0) return rest.join('=');
  }
  return null;
}
