// Request parsing for the sandbox surface, kept apart from src/index.ts so it
// can be tested in plain Node. Everything here is pure: no bindings, no
// Workspace, no `cloudflare:workers` import.

/** Workspace used when the caller names none. */
export const DEFAULT_WORKSPACE = 'sandbox';

/** Longest command string accepted by POST /exec. */
export const MAX_COMMAND_BYTES = 4096;

/** Largest body accepted by PUT /files/*. */
export const MAX_WRITE_BYTES = 1024 * 1024;

/**
 * Compare two secrets without leaking the position of the first difference
 * through timing. The length check is folded into the accumulator rather than
 * short-circuiting, so a wrong-length guess costs the same as a wrong-value
 * one.
 */
export function constantTimeEquals(presented: string, expected: string): boolean {
  const a = new TextEncoder().encode(presented);
  const b = new TextEncoder().encode(expected);
  let difference = a.length ^ b.length;
  const width = Math.max(a.length, b.length);
  for (let i = 0; i < width; i += 1) {
    difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return difference === 0;
}

/**
 * Read `?workspace=` off the URL. One Durable Object per name, so the name is
 * the whole of the isolation between two callers: it is restricted to a
 * conservative character set rather than trusted, because `idFromName` will
 * happily derive an id from any string at all and two spellings that look the
 * same to a human would be two different computers.
 */
export function workspaceName(url: URL): string | null {
  const raw = url.searchParams.get('workspace');
  if (raw === null || raw === '') return DEFAULT_WORKSPACE;
  if (raw.length > 64) return null;
  return /^[a-z0-9][a-z0-9-]*$/.test(raw) ? raw : null;
}

/**
 * Turn a request path such as `/files/notes/todo.md` into the absolute
 * workspace path `/notes/todo.md`.
 *
 * The canonicalisation order is the one the support Worker's
 * `localePrefixTarget` had to learn the hard way: decode once, collapse
 * repeated slashes, resolve dot segments, and only then decide. Comparing the
 * raw pathname is what let `/fa/%61dmin` walk past a check that was reading
 * `/fa/admin`, and the same shape of mistake here would be a caller reaching
 * outside the prefix it was given.
 *
 * Decoding happens exactly once. A second pass would make `%252e%252e` mean
 * `..`, which is the bug this is written to avoid.
 */
export function workspacePath(pathname: string, prefix: string): string | null {
  if (!pathname.startsWith(prefix)) return null;
  const tail = pathname.slice(prefix.length);

  let decoded: string;
  try {
    decoded = decodeURIComponent(tail);
  } catch {
    // A malformed escape is not a path. Reject rather than guess.
    return null;
  }

  // A NUL byte truncates the name in some consumers and not others, which is
  // the entire mechanism of a poisoned-null-byte bug. There is no legitimate
  // use for one in a path here.
  if (decoded.includes('\0')) return null;

  const resolved: string[] = [];
  for (const segment of decoded.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      // Walking above the root is a caller error, not something to silently
      // clamp at `/`: clamping turns a mistaken path into a valid one that
      // reads a different file.
      if (resolved.length === 0) return null;
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  return '/' + resolved.join('/');
}

/**
 * Validate the JSON body of POST /exec.
 *
 * `unknown` rather than a declared shape because this is parsed from a request
 * body: the type would be a claim about the input, not a fact about it.
 */
export function execCommand(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const command = (body as { command?: unknown }).command;
  if (typeof command !== 'string') return null;
  const trimmed = command.trim();
  if (trimmed === '') return null;
  if (new TextEncoder().encode(trimmed).length > MAX_COMMAND_BYTES) return null;
  return trimmed;
}
