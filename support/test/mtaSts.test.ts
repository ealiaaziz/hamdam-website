import { describe, expect, it } from 'vitest';
import {
  MTA_STS_HOSTNAME,
  MTA_STS_MAX_AGE,
  MTA_STS_MODE,
  MTA_STS_MX,
  MTA_STS_PATH,
  MTA_STS_POLICY_ID,
  mtaStsDnsRecord,
  mtaStsPolicy,
  mtaStsResponseFor,
} from '../src/mtaSts.js';

// This file is read by other people's mail servers, and the failure it can
// cause is inbound mail silently stopping. That is the one failure this desk
// cannot detect from the inside: nothing arrives, and nothing arriving looks
// exactly like a quiet day.

describe('the policy document', () => {
  const policy = mtaStsPolicy();

  it('is what RFC 8461 asks for, down to the line endings', () => {
    // CRLF, and a trailing one. Nothing in the wild appears to mind, but the
    // audience for this file is arbitrary MTAs written over thirty years.
    expect(policy.endsWith('\r\n')).toBe(true);
    expect(policy.includes('\n\r')).toBe(false);
    for (const line of policy.split('\r\n').filter(Boolean)) {
      expect(line).toMatch(/^[a-z_]+: \S+$/);
    }
  });

  it('declares the version first', () => {
    expect(policy.split('\r\n')[0]).toBe('version: STSv1');
  });

  it('covers the zone MX exactly, and the suffix Microsoft moves tenants within', () => {
    // The exact host is what the MX record says today. The wildcard is the
    // one that stops this becoming an outage when Microsoft moves the tenant
    // to another host under the same suffix, which happens without notice.
    expect(policy).toContain('mx: hamdam-com-au.mail.protection.outlook.com');
    expect(policy).toContain('mx: *.mail.protection.outlook.com');
  });

  it('never widens past Exchange Online', () => {
    // A pattern like `*` or `*.com` would satisfy the syntax and destroy the
    // point: the policy would accept whatever an attacker redirected to.
    for (const mx of MTA_STS_MX) {
      expect(mx.endsWith('.mail.protection.outlook.com')).toBe(true);
      expect(mx.replace(/^\*/, '').includes('*')).toBe(false);
    }
  });

  it('lasts at least the week the RFC recommends', () => {
    expect(MTA_STS_MAX_AGE).toBeGreaterThanOrEqual(604800);
    expect(policy).toContain(`max_age: ${MTA_STS_MAX_AGE}`);
  });

  it('is in testing mode until the TLS reports say otherwise', () => {
    // Not a style assertion. Enforce mode makes a sender refuse delivery
    // rather than report a problem, so promoting it is a decision to be made
    // against TLS-RPT data, and this test is what makes flipping it a change
    // somebody has to look at rather than a one-character edit that rides
    // along in an unrelated commit.
    expect(MTA_STS_MODE).toBe('testing');
    expect(policy).toContain('mode: testing');
  });
});

describe('the DNS record it depends on', () => {
  it('is the syntax a sender parses', () => {
    expect(mtaStsDnsRecord()).toBe(`v=STSv1; id=${MTA_STS_POLICY_ID};`);
  });

  it('has an id inside the length and alphabet a TXT record allows', () => {
    // RFC 8461: 1-32 alphanumeric characters. An id that fails this is not
    // rejected loudly; senders just never fetch the policy.
    expect(MTA_STS_POLICY_ID).toMatch(/^[A-Za-z0-9]{1,32}$/);
  });
});

describe('what gets served, and where', () => {
  it('answers the one path on the one hostname', () => {
    const result = mtaStsResponseFor(`https://${MTA_STS_HOSTNAME}${MTA_STS_PATH}`);
    expect(result).toEqual({ status: 200, body: mtaStsPolicy() });
  });

  it('serves nothing else on that hostname', () => {
    // The hostname exists for one file. Falling through would publish the
    // ticket form, and every later route, at a second address added for mail
    // plumbing that nobody would think to audit.
    for (const path of ['/', '/tickets/1', '/admin', '/fa', '/.well-known/security.txt']) {
      expect(mtaStsResponseFor(`https://${MTA_STS_HOSTNAME}${path}`), path).toEqual({ status: 404 });
    }
  });

  it('leaves the support desk alone', () => {
    // Including at the same path: the policy is only ever read from
    // mta-sts.<domain>, so answering it elsewhere adds a second copy that can
    // drift from the real one.
    for (const url of [
      'https://support.hamdam.com.au/',
      `https://support.hamdam.com.au${MTA_STS_PATH}`,
      `https://hamdam.com.au${MTA_STS_PATH}`,
      'http://localhost:8787/',
    ]) {
      expect(mtaStsResponseFor(url), url).toBeNull();
    }
  });

  it('is not fooled by case or by a port', () => {
    expect(mtaStsResponseFor(`https://MTA-STS.Hamdam.Com.Au${MTA_STS_PATH}`)).toEqual({ status: 200, body: mtaStsPolicy() });
    expect(mtaStsResponseFor(`https://${MTA_STS_HOSTNAME}:8787${MTA_STS_PATH}`)).toEqual({ status: 200, body: mtaStsPolicy() });
  });

  it('does not match a lookalike hostname', () => {
    for (const host of ['mta-sts.hamdam.com.au.evil.example', 'notmta-sts.hamdam.com.au', 'mta-sts.hamdam.com']) {
      expect(mtaStsResponseFor(`https://${host}${MTA_STS_PATH}`), host).toBeNull();
    }
  });

  it('hands back an unparseable URL rather than throwing', () => {
    expect(mtaStsResponseFor('not a url')).toBeNull();
  });
});
