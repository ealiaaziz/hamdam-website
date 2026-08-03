import { describe, expect, it } from 'vitest';
import { HEARTBEAT_STALE_AFTER_MS, describeAge, readHeartbeat } from '../src/heartbeat.js';

// "Is the desk still reading its mail?" had no answer, and the two ways this
// system has gone quiet both looked identical to a slow week from outside.
// These tests are mostly about the one direction that must never be wrong:
// not knowing has to read as not knowing, never as fine.

const NOW = Date.parse('2026-08-03T12:00:00.000Z');
const agoMs = (ms: number) => new Date(NOW - ms).toISOString();

describe('readHeartbeat', () => {
  it('is healthy while the cron is keeping up', () => {
    expect(readHeartbeat(agoMs(30_000), NOW)).toMatchObject({ state: 'ok' });
    expect(readHeartbeat(agoMs(9 * 60_000), NOW)).toMatchObject({ state: 'ok' });
  });

  it('goes stale once the silence is longer than a stalled cron', () => {
    expect(readHeartbeat(agoMs(HEARTBEAT_STALE_AFTER_MS + 1_000), NOW)).toMatchObject({ state: 'stale' });
    expect(readHeartbeat(agoMs(6 * 3600_000), NOW).state).toBe('stale');
  });

  it('reads nothing recorded as unknown, never as healthy', () => {
    // The whole point. An absence of evidence was being read as evidence of
    // health, and repeating that inside the fix would be its own joke.
    expect(readHeartbeat(null, NOW)).toEqual({ state: 'unknown', ageMs: null });
    expect(readHeartbeat('', NOW)).toEqual({ state: 'unknown', ageMs: null });
  });

  it('reads a timestamp it cannot parse as unknown', () => {
    for (const junk of ['not a date', 'null', '0000-13-45']) {
      expect(readHeartbeat(junk, NOW).state, junk).toBe('unknown');
    }
  });

  it('treats a timestamp from the future as fresh', () => {
    // Clock skew between D1 and a Worker is real and small. Calling it stale
    // would raise an alarm about the one thing definitely not wrong.
    const beat = readHeartbeat(new Date(NOW + 5_000).toISOString(), NOW);
    expect(beat.state).toBe('ok');
    expect(beat.ageMs).toBe(0);
  });

  it('tolerates a couple of skipped cron minutes', () => {
    // Cloudflare does not promise the exact minute, and two missed
    // invocations under load are ordinary. An alert that cries wolf gets
    // muted, and a muted alert is the state this whole file exists to avoid.
    expect(readHeartbeat(agoMs(3 * 60_000), NOW).state).toBe('ok');
  });
});

describe('describeAge', () => {
  it('reads as something a person would say', () => {
    expect(describeAge(null)).toBe('never');
    expect(describeAge(20_000)).toBe('less than a minute ago');
    expect(describeAge(60_000)).toBe('1 minute ago');
    expect(describeAge(14 * 60_000)).toBe('14 minutes ago');
    expect(describeAge(3600_000)).toBe('1 hour ago');
    expect(describeAge(5 * 3600_000)).toBe('5 hours ago');
  });
});
