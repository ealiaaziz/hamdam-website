import { afterEach, describe, expect, it, vi } from 'vitest';
import { canSendDirectly, markRead, resetTokenCache, sendMail, sender } from '../src/mailer.js';
import type { Env } from '../src/types.js';

// Sending is the one thing here with no undo. These cover the parts that
// decide whether an email leaves the building and what happens when it does
// not: a failed send has to be reported, never swallowed, because the queue
// row it leaves behind is what the hourly Routine retries.

const env = {
  GRAPH_TENANT_ID: 'tenant',
  GRAPH_CLIENT_ID: 'client',
  GRAPH_CLIENT_SECRET: 'secret',
} as Env;

const mail = { toEmail: 'someone@example.com', subject: '[HAM-1] Test', bodyHtml: '<p>Hi</p>' };

function respond(handlers: ((url: string, init: RequestInit) => Response | undefined)[]) {
  return vi.fn(async (url: string, init: RequestInit) => {
    for (const h of handlers) {
      const r = h(String(url), init ?? {});
      if (r) return r;
    }
    throw new Error(`unexpected fetch: ${url}`);
  });
}

const token = (url: string) =>
  url.includes('login.microsoftonline.com')
    ? new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 })
    : undefined;

afterEach(() => {
  resetTokenCache();
  vi.unstubAllGlobals();
});

describe('canSendDirectly', () => {
  it('needs all three parts of the credential', () => {
    expect(canSendDirectly(env)).toBe(true);
    for (const missing of ['GRAPH_TENANT_ID', 'GRAPH_CLIENT_ID', 'GRAPH_CLIENT_SECRET'] as const) {
      expect(canSendDirectly({ ...env, [missing]: undefined }), missing).toBe(false);
    }
  });

  it('is false on a bare env, so an unconfigured desk queues as before', () => {
    expect(canSendDirectly({} as Env)).toBe(false);
  });
});

describe('sendMail', () => {
  it('sends from the desk mailbox and keeps it in Sent Items', async () => {
    const fetchMock = respond([token, (url) => (url.includes('graph.microsoft.com') ? new Response(null, { status: 202 }) : undefined)]);
    vi.stubGlobal('fetch', fetchMock);

    expect(await sendMail(env, mail)).toEqual({ sent: true });

    const [sendUrl, sendInit] = fetchMock.mock.calls[1];
    expect(String(sendUrl)).toContain(encodeURIComponent(sender()));
    const body = JSON.parse(String(sendInit.body));
    expect(body.saveToSentItems).toBe(true);
    expect(body.message.toRecipients[0].emailAddress.address).toBe('someone@example.com');
    expect(body.message.body.contentType).toBe('HTML');
  });

  it('reports a rejection instead of throwing', async () => {
    vi.stubGlobal(
      'fetch',
      respond([token, (url) => (url.includes('graph.microsoft.com') ? new Response('no', { status: 403 }) : undefined)]),
    );
    const result = await sendMail(env, mail);
    expect(result.sent).toBe(false);
    if (!result.sent) expect(result.reason).toContain('403');
  });

  it('reports a network failure instead of throwing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connection reset'); }));
    const result = await sendMail(env, mail);
    expect(result.sent).toBe(false);
    if (!result.sent) expect(result.reason).toContain('connection reset');
  });

  it('refuses without credentials rather than attempting anything', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await sendMail({} as Env, mail);
    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reuses the token across sends', async () => {
    const fetchMock = respond([token, (url) => (url.includes('graph.microsoft.com') ? new Response(null, { status: 202 }) : undefined)]);
    vi.stubGlobal('fetch', fetchMock);

    await sendMail(env, mail, 1_000);
    await sendMail(env, mail, 2_000);

    const tokenCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('login.microsoftonline'));
    expect(tokenCalls).toHaveLength(1);
  });

  it('fetches a fresh token once the old one has expired', async () => {
    const fetchMock = respond([token, (url) => (url.includes('graph.microsoft.com') ? new Response(null, { status: 202 }) : undefined)]);
    vi.stubGlobal('fetch', fetchMock);

    await sendMail(env, mail, 0);
    await sendMail(env, mail, 3_600_000);

    const tokenCalls = fetchMock.mock.calls.filter(([u]) => String(u).includes('login.microsoftonline'));
    expect(tokenCalls).toHaveLength(2);
  });

  it('drops a cached token that came back unauthorised', async () => {
    // Otherwise every send fails identically until the isolate recycles.
    let sendCount = 0;
    vi.stubGlobal(
      'fetch',
      respond([
        token,
        (url) => {
          if (!url.includes('graph.microsoft.com')) return undefined;
          sendCount++;
          return sendCount === 1 ? new Response('stale', { status: 401 }) : new Response(null, { status: 202 });
        },
      ]),
    );

    expect((await sendMail(env, mail, 1_000)).sent).toBe(false);
    expect((await sendMail(env, mail, 1_000)).sent).toBe(true);
  });

  it('surfaces a token failure with the reason Entra gave', async () => {
    vi.stubGlobal(
      'fetch',
      respond([(url) => (url.includes('login.microsoftonline') ? new Response('AADSTS7000215: bad secret', { status: 401 }) : undefined)]),
    );
    const result = await sendMail(env, mail);
    expect(result.sent).toBe(false);
    if (!result.sent) expect(result.reason).toContain('AADSTS7000215');
  });
});

describe('markRead', () => {
  // Without this the inbox fills up: every message the desk has read, filed
  // and answered still sits there in bold, and the one thing a mailbox is
  // good at telling you at a glance stops being true.
  const token = (url: string) =>
    url.includes('login.microsoftonline.com')
      ? new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 })
      : undefined;

  function respond(handlers: ((url: string, init: RequestInit) => Response | undefined)[]) {
    return vi.fn(async (url: string, init: RequestInit) => {
      for (const h of handlers) {
        const r = h(String(url), init ?? {});
        if (r) return r;
      }
      throw new Error(`unexpected fetch: ${url}`);
    });
  }

  it('patches isRead on the message, in the desk mailbox', async () => {
    const fetchMock = respond([token, (url) => (url.includes('graph.microsoft.com') ? new Response(null, { status: 200 }) : undefined)]);
    vi.stubGlobal('fetch', fetchMock);

    expect(await markRead(env, 'AAMkAGabc')).toEqual({ sent: true });

    const [url, init] = fetchMock.mock.calls[1];
    expect(String(url)).toContain(encodeURIComponent(sender()));
    expect(String(url)).toContain('AAMkAGabc');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(String(init.body))).toEqual({ isRead: true });
  });

  it('escapes a message id rather than splicing it into the path', async () => {
    const fetchMock = respond([token, (url) => (url.includes('graph.microsoft.com') ? new Response(null, { status: 200 }) : undefined)]);
    vi.stubGlobal('fetch', fetchMock);
    await markRead(env, 'id/with?awkward=chars');
    expect(String(fetchMock.mock.calls[1][0])).toContain(encodeURIComponent('id/with?awkward=chars'));
  });

  it('reports a refusal instead of throwing', async () => {
    // Mail.Read alone cannot write the flag. The desk should carry on
    // rather than fail a batch of real work over it.
    vi.stubGlobal(
      'fetch',
      respond([token, (url) => (url.includes('graph.microsoft.com') ? new Response('insufficient privileges', { status: 403 }) : undefined)]),
    );
    const result = await markRead(env, 'AAMkAGabc');
    expect(result.sent).toBe(false);
    if (!result.sent) expect(result.reason).toContain('403');
  });

  it('refuses without credentials rather than attempting anything', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await markRead({} as Env, 'AAMkAGabc')).sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
