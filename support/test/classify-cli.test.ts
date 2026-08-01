import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/classify.mjs', import.meta.url));

function run(subject: string, body: string) {
  const out = execFileSync('npx', ['tsx', script, '--subject', subject, '--body', body], { encoding: 'utf8' });
  return JSON.parse(out);
}

describe('classify.mjs CLI', () => {
  it('matches classifyFromText for an outage report (the routine relies on this staying true)', () => {
    expect(run('Production down', 'The whole app is down for all users')).toEqual({
      priority: 'P1',
      impact: 'high',
      urgency: 'high',
    });
  });

  it('matches classifyFromText for a casual question', () => {
    expect(run('Quick question', 'How do I reset my password, no rush')).toEqual({
      priority: 'P4',
      impact: 'low',
      urgency: 'low',
    });
  });
});
