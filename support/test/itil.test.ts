import { describe, expect, it } from 'vitest';
import { classifyFromMatrix, classifyFromText, slaDueDates, SLA_POLICY } from '../src/itil.js';

describe('classifyFromMatrix', () => {
  it('maps high impact + high urgency to P1', () => {
    expect(classifyFromMatrix('high', 'high')).toBe('P1');
  });

  it('maps low impact + low urgency to P4', () => {
    expect(classifyFromMatrix('low', 'low')).toBe('P4');
  });

  it('maps medium impact + high urgency to P2', () => {
    expect(classifyFromMatrix('medium', 'high')).toBe('P2');
  });

  it('is symmetric for the mixed medium/high cells (both P2)', () => {
    expect(classifyFromMatrix('high', 'medium')).toBe('P2');
    expect(classifyFromMatrix('medium', 'high')).toBe('P2');
  });
});

describe('classifyFromText', () => {
  it('flags outage language as P1', () => {
    const r = classifyFromText('Production is down', 'The whole app is down for all users right now.');
    expect(r.priority).toBe('P1');
  });

  it('flags a security breach as P1 even without "down"', () => {
    const r = classifyFromText('urgent', 'We think our account was compromised.');
    expect(r.priority).toBe('P1');
  });

  it('flags login errors as P2', () => {
    const r = classifyFromText('Cannot log in', 'I get an error every time I try to log in, blocking my work.');
    expect(r.priority).toBe('P2');
  });

  it('flags casual questions as P4', () => {
    const r = classifyFromText('Quick question', 'How do I change my display name? No rush at all.');
    expect(r.priority).toBe('P4');
  });

  it('defaults to P3 when nothing matches', () => {
    const r = classifyFromText('Feedback', 'The onboarding screen could use a bit more spacing.');
    expect(r.priority).toBe('P3');
  });

  it('flags a security incident as P1 -- the real miss that prompted this', () => {
    // Live email, classified P3 before the keyword list was widened.
    const r = classifyFromText("Checking Tim's support for security incidents. He's under fire!", '');
    expect(r.priority).toBe('P1');
  });

  it('flags the other security wordings people actually use', () => {
    for (const text of ['we got hacked', 'phishing email going around', 'malware on the laptop', 'unauthorised access to the admin panel', 'possible data leak']) {
      expect(classifyFromText('help', text).priority).toBe('P1');
    }
  });

  it('accepts false positives in the security direction, knowingly', () => {
    // Reads as reassurance to a human, P1 to the classifier. Deliberate:
    // an over-called security ticket costs a re-price, an under-called one
    // costs much more. Documented rather than quietly tolerated.
    expect(classifyFromText('Weekly report', 'No security incidents to report.').priority).toBe('P1');
  });

  it('prefers P1 over P2 keywords when both are present', () => {
    const r = classifyFromText('down', 'Everything is down and broken for everyone.');
    expect(r.priority).toBe('P1');
  });
});

describe('slaDueDates', () => {
  it('computes P1 first-response due 15 minutes out', () => {
    const created = new Date('2026-08-01T00:00:00.000Z');
    const { firstResponseDue } = slaDueDates('P1', created);
    expect(firstResponseDue).toBe('2026-08-01T00:15:00.000Z');
  });

  it('computes P4 resolve due 5 days out', () => {
    const created = new Date('2026-08-01T00:00:00.000Z');
    const { resolveDue } = slaDueDates('P4', created);
    expect(resolveDue).toBe('2026-08-06T00:00:00.000Z');
  });

  it('every priority has a strictly looser SLA than the one above it', () => {
    const order: Array<keyof typeof SLA_POLICY> = ['P1', 'P2', 'P3', 'P4'];
    for (let i = 1; i < order.length; i++) {
      expect(SLA_POLICY[order[i]].firstResponseMinutes).toBeGreaterThan(SLA_POLICY[order[i - 1]].firstResponseMinutes);
      expect(SLA_POLICY[order[i]].resolveMinutes).toBeGreaterThan(SLA_POLICY[order[i - 1]].resolveMinutes);
    }
  });
});
