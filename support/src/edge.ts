// "Is this a real request through Cloudflare's edge?"
//
// Four separate controls were asking this question, each reading `CF-Ray`
// inline: the HTTPS redirect, the country check, the rate limiter's gate, and
// the local-development bypass on the console. Every one of them was
// individually right and none of them said out loud that they shared an
// assumption, so nothing connected them and nothing would have flagged that
// they fail together.
//
// They do fail together. If this Worker is ever reached by a path that does
// not set CF-Ray -- a service binding, a test harness wired to the real
// handler, some future Cloudflare product that fronts a Worker differently --
// then plaintext is served without a redirect, every country is allowed, no
// submission is counted, and the console's development bypass becomes live if
// DEV_ADMIN_EMAIL is ever set in production. Four controls, one header, one
// simultaneous failure.
//
// Naming it does not remove the dependency; nothing can, short of a second
// independent signal that Workers do not have. What it does is make the
// dependency a thing with a name that greps, so the next person adding a
// fifth caller finds this comment, and so a future change of signal is one
// edit rather than four.

/**
 * True when the request demonstrably came through Cloudflare's edge.
 *
 * `CF-Ray` is set on every proxied request and overwritten if a client sends
 * its own, so it cannot be forged in production or stripped to dodge a
 * control. It is simply absent under `wrangler dev`, which is the whole
 * reason it is the signal: the alternative, checking the hostname, silently
 * never fires because `wrangler dev` rewrites Host to the custom domain in
 * wrangler.jsonc.
 *
 * Read as "trusted context", never as "trusted value". The ray id itself is
 * not used for anything.
 */
export function viaCloudflareEdge(headers: { get(name: string): string | null }): boolean {
  return headers.get('cf-ray') !== null;
}

/**
 * The caller's address, or null when there is no edge to have supplied one.
 *
 * Kept beside `viaCloudflareEdge` because the pair is the shape every caller
 * actually wants: CF-Connecting-IP is trustworthy only in the context the
 * other function establishes, and on its own it is `127.0.0.1` under
 * `wrangler dev`.
 */
export function edgeClientIp(headers: { get(name: string): string | null }): string | null {
  if (!viaCloudflareEdge(headers)) return null;
  return headers.get('cf-connecting-ip');
}
