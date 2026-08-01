#!/usr/bin/env node
// CLI wrapper around src/itil.ts's slaDueDates() for the email-polling
// routine -- see docs/email-routine.md. Same rationale as classify.mjs:
// one source of truth for the SLA math, not a hand-computed offset an
// agent improvises each run.
//
// Usage: npx tsx scripts/sla-due.mjs --priority P2 --created-at 2026-08-01T00:00:00.000Z
// Prints: {"firstResponseDue":"...","resolveDue":"..."}

import { slaDueDates } from '../src/itil.ts';

function readFlag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? '' : (process.argv[i + 1] ?? '');
}

const priority = readFlag('priority');
const createdAt = readFlag('created-at');

if (!['P1', 'P2', 'P3', 'P4'].includes(priority) || !createdAt) {
  console.error('Usage: npx tsx scripts/sla-due.mjs --priority P1|P2|P3|P4 --created-at <ISO-8601>');
  process.exit(1);
}

const created = new Date(createdAt);
if (Number.isNaN(created.getTime())) {
  console.error(`Not a valid date: ${createdAt}`);
  process.exit(1);
}

console.log(JSON.stringify(slaDueDates(priority, created)));
