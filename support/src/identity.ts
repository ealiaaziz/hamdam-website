import type { Env } from './types.js';

// Who this deployment is.
//
// One Worker serves one desk. That is the whole tenancy model: Hamdam's
// customers and another business's staff never share a database, a mailbox,
// an Access application or a knowledge base, because they never share a
// Worker. Isolation by construction rather than by a `tenant_id` column
// somebody has to remember to filter on in every query.
//
// What that model still needs is for the code to stop asserting it is
// Hamdam. The mailbox, the public address, the ticket prefix and the name in
// an email footer were literals in seven files; a second deployment would
// have had to fork the source to change them, and a fork is where two desks
// quietly stop being the same product.
//
// So they live here, with Hamdam's values as the defaults. A deployment that
// sets nothing is the desk that exists today, byte for byte.

export interface DeskIdentity {
  /** The mailbox this desk sends from and reads. */
  mailbox: string;
  /** Prefix on the public ticket id, including its separator. */
  ticketPrefix: string;
  /** Name for email footers and internal subject lines. */
  brandName: string;
  /** Public origin, for links in mail that no request context reaches. */
  baseUrl: string;
  /**
   * Whether this deployment named itself.
   *
   * Hamdam's portal chrome is bilingual and its Persian half is not a
   * translation of `brandName`, it is its own string. So the chrome keeps
   * using the locale table unless a deployment has actually set a name, and
   * only then is it overridden. Without this the Persian portal silently
   * started titling itself in English.
   */
  brandConfigured: boolean;
}

export const DEFAULT_IDENTITY: DeskIdentity = {
  mailbox: 'developer@hamdam.com.au',
  ticketPrefix: 'HAM-',
  brandName: 'Hamdam Support',
  baseUrl: 'https://support.hamdam.com.au',
  brandConfigured: false,
};

/**
 * Module scope, deliberately.
 *
 * `ticketPublicId` is called from twenty-six places, most of them renderers
 * that never see an `Env`, and threading a parameter through all of them to
 * change one string would be a large diff across the whole surface of a live
 * desk. Module state is safe here for the same reason the tenancy model works
 * at all: one Worker is one desk, so there is no second tenant's value for
 * this to leak to. It is the same lifetime as the cached Graph token in
 * mailer.ts, which has held fine.
 *
 * Left unset it is Hamdam, which is what every existing test asserts and what
 * production already does.
 */
let current: DeskIdentity = DEFAULT_IDENTITY;

function clean(value: string | undefined, fallback: string): string {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * Reads the deployment's identity out of its configuration.
 *
 * Called once at the top of `fetch` and `scheduled`. Cheap enough to do per
 * request, and doing it there rather than at module load means a value is
 * never read before the runtime has supplied `env`.
 *
 * These are `vars` in wrangler.jsonc rather than secrets, on the same
 * reasoning as ALLOWED_COUNTRIES: which mailbox a desk answers as is an
 * operational fact that should be visible in a diff, not a hidden one.
 */
export function applyIdentity(env: Env): void {
  const baseUrl = clean(env.PUBLIC_BASE_URL, DEFAULT_IDENTITY.baseUrl).replace(/\/+$/, '');
  const prefix = clean(env.TICKET_PREFIX, DEFAULT_IDENTITY.ticketPrefix);
  current = {
    mailbox: clean(env.SUPPORT_MAILBOX, DEFAULT_IDENTITY.mailbox).toLowerCase(),
    // A prefix with no separator would make HAM12 unparseable back to 12, so
    // one is added rather than assumed. Configuring "CE" and getting "CE-1"
    // is the least surprising reading of the setting.
    ticketPrefix: /[-_/]$/.test(prefix) ? prefix : `${prefix}-`,
    brandName: clean(env.BRAND_NAME, DEFAULT_IDENTITY.brandName),
    baseUrl,
    brandConfigured: (env.BRAND_NAME ?? '').trim().length > 0,
  };
}

export function identity(): DeskIdentity {
  return current;
}

/** Tests only. Production sets identity once per invocation and never clears it. */
export function resetIdentity(): void {
  current = DEFAULT_IDENTITY;
}

/** The prefix, escaped for embedding in a regular expression. */
export function ticketPrefixPattern(): string {
  return identity().ticketPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
