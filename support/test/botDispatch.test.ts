import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { maybeDispatch, relayReply } from '../src/botDispatch.js';
import type { Env } from '../src/types.js';

/**
 * A D1 stand-in that answers the few queries this path makes and records the
 * comments written, which is where every outcome of a dispatch ends up.
 */
function fakeEnv(overrides: Partial<Env> = {}, change: Record<string, unknown> | null = null) {
  const comments: string[] = [];
  const DB = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => ({
        run: async () => ({ meta: { changes: 1 } }),
        first: async () => {
          // addComment inserts with RETURNING id, so it reads through first().
          if (sql.includes('INSERT INTO comments')) {
            comments.push(String(args[3] ?? ''));
            return { id: comments.length };
          }
          if (sql.includes('ticket_bot_changes')) return change;
          if (sql.includes('rate_limits')) {
            return { count: 1, window_start: new Date().toISOString() };
          }
          return null;
        },
        all: async () => ({ results: [] }),
      }),
    }),
  } as unknown as D1Database;

  return {
    env: {
      DB,
      OWNER_EMAILS: 'owner@example.com',
      GITHUB_TOKEN: 'token',
      GITHUB_REPO: 'owner/bot',
      ...overrides,
    } as unknown as Env,
    comments,
  };
}

const ownerMail = {
  ticketId: 12,
  subject: 'ربات',
  body: 'ربات آگهی ثبت نمی‌کند',
  fromEmail: 'owner@example.com',
  senderAuthenticated: true,
};

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      new Response(JSON.stringify({ number: 7, html_url: 'https://example.com/7' }), { status: 201 }),
    ),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe('maybeDispatch', () => {
  it('opens an issue for an authenticated owner writing about the bot', async () => {
    const { env, comments } = fakeEnv();
    await maybeDispatch(env, ownerMail);

    expect(fetch).toHaveBeenCalledOnce();
    expect(comments.join('\n')).toContain('issue #7');
  });

  /**
   * The opposite default to the console's ADMIN_EMAILS, which admits everyone
   * when unset because Cloudflare Access is already in front of it. Nothing is
   * in front of this, so unconfigured has to mean nobody: an unset owner list
   * that failed open would let any authenticated sender put an agent on the
   * repository.
   */
  it('dispatches for nobody when OWNER_EMAILS is unset', async () => {
    const { env } = fakeEnv({ OWNER_EMAILS: undefined });
    await maybeDispatch(env, ownerMail);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ignores an authenticated stranger', async () => {
    const { env } = fakeEnv();
    await maybeDispatch(env, { ...ownerMail, fromEmail: 'stranger@example.com' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ignores mail that claims to be the owner but did not authenticate', async () => {
    const { env, comments } = fakeEnv();
    await maybeDispatch(env, { ...ownerMail, senderAuthenticated: false });

    expect(fetch).not.toHaveBeenCalled();
    // Worth a person's attention rather than silence: somebody tried the gate.
    expect(comments.join('\n')).toContain('Dispatch refused');
  });

  it('says so on the ticket when the repo is not configured', async () => {
    const { env, comments } = fakeEnv({ GITHUB_TOKEN: undefined });
    await maybeDispatch(env, ownerMail);

    expect(fetch).not.toHaveBeenCalled();
    expect(comments.join('\n')).toContain('not set');
  });

  /**
   * This runs inside the ingest loop, where a throw stops the batch and, since
   * the checkpoint only advances on a clean pass, the same message returns
   * every minute forever. One email stopped all email that way in August.
   */
  it('never throws when GitHub fails, and records why', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const { env, comments } = fakeEnv();

    await expect(maybeDispatch(env, ownerMail)).resolves.toBeUndefined();
    expect(comments.join('\n')).toContain('Dispatch failed');
  });

  it('never throws when the network dies', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connection reset'); }));
    const { env, comments } = fakeEnv();

    await expect(maybeDispatch(env, ownerMail)).resolves.toBeUndefined();
    expect(comments.join('\n')).toContain('Dispatch failed');
  });
});

describe('relayReply', () => {
  const pending = {
    ticket_id: 12,
    issue_number: 7,
    pr_number: 9,
    head_sha: 'a3f9c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
    pending_change_ref: 'HAM-12/a3f9c1',
    approved_ref: null,
    approved_at: null,
    refused_at: null,
  };

  /** The bodies of every GitHub comment the desk posted in a test. */
  const postedBodies = () =>
    (fetch as unknown as { mock: { calls: [string, { body: string }][] } }).mock.calls
      .map((call) => JSON.parse(call[1].body).body as string);

  it('does nothing on a ticket that never dispatched', async () => {
    const { env } = fakeEnv({}, null);
    await relayReply(env, ownerMail);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('records an approval and relays the message', async () => {
    const { env, comments } = fakeEnv({}, pending);
    await relayReply(env, { ...ownerMail, body: 'بله، انجام بده' });

    expect(comments.join('\n')).toContain('approved HAM-12/a3f9c1');
  });

  it('records a refusal', async () => {
    const { env, comments } = fakeEnv({}, pending);
    await relayReply(env, { ...ownerMail, body: 'نه، صبر کن' });

    expect(comments.join('\n')).toContain('refused HAM-12/a3f9c1');
  });

  /**
   * The ticket id in a subject line is a routing hint and never a credential,
   * so a reply that could approve a deploy is held to the same two locks as
   * the dispatch that opened it.
   */
  it('will not let an unauthenticated sender approve anything', async () => {
    const { env, comments } = fakeEnv({}, pending);
    await relayReply(env, { ...ownerMail, senderAuthenticated: false, body: 'بله' });

    expect(comments.join('\n')).not.toContain('approved');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('will not let a stranger approve anything', async () => {
    const { env, comments } = fakeEnv({}, pending);
    await relayReply(env, { ...ownerMail, fromEmail: 'stranger@example.com', body: 'بله' });

    expect(comments.join('\n')).not.toContain('approved');
  });

  /**
   * The approval reaches the repository as a comment naming the commit, never
   * as a merge: the desk's token cannot merge and should not be able to, so an
   * email is never one step from a push. The workflow re-checks everything.
   */
  it('posts an approval naming the exact commit', async () => {
    const { env } = fakeEnv({}, pending);
    await relayReply(env, { ...ownerMail, body: 'بله، انجام بده' });

    const approval = postedBodies().find((body) => body.includes('desk:approved'));
    expect(approval).toBeDefined();
    expect(approval).toContain(`desk:sha=${pending.head_sha}`);
  });

  it('posts no approval when she refused', async () => {
    const { env } = fakeEnv({}, pending);
    await relayReply(env, { ...ownerMail, body: 'نه' });

    expect(postedBodies().some((body) => body.includes('desk:approved'))).toBe(false);
  });

  /**
   * The desk and the repository must not disagree about what was approved. If
   * the pending change moved underneath her reply the database refuses the
   * approval, and the repository must not be told otherwise.
   */
  it('posts no approval when the database refused to record one', async () => {
    const { env } = fakeEnv({}, pending);
    // recordApproval reports false by scoping its UPDATE to the pending ref.
    (env.DB as unknown as { prepare: (sql: string) => unknown }).prepare = (sql: string) => ({
      bind: () => ({
        run: async () => ({ meta: { changes: sql.includes('approved_ref = ?2') ? 0 : 1 } }),
        first: async () => (sql.includes('ticket_bot_changes') ? pending : { id: 1 }),
        all: async () => ({ results: [] }),
      }),
    });

    await relayReply(env, { ...ownerMail, body: 'بله' });
    expect(postedBodies().some((body) => body.includes('desk:approved'))).toBe(false);
  });
});
