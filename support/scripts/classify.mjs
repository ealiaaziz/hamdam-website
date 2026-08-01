#!/usr/bin/env node
// CLI wrapper around src/itil.ts's classifyFromText(), for the hourly
// email-polling routine to shell out to (see docs/email-routine.md).
//
// This exists so the routine agent classifies inbound email with the exact
// same logic the Worker uses for the dashboard/SLA math -- not a
// hand-copied approximation an agent improvises fresh each run. Node 22
// imports .ts directly (type stripping), so this is a thin wrapper, not a
// build step.
//
// Usage: npx tsx scripts/classify.mjs --subject "..." --body "..."
// Prints: {"priority":"P2","impact":"medium","urgency":"high"}

import { classifyFromText } from '../src/itil.ts';

function readFlag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? '' : (process.argv[i + 1] ?? '');
}

const subject = readFlag('subject');
const body = readFlag('body');

if (!subject && !body) {
  console.error('Usage: npx tsx scripts/classify.mjs --subject "..." --body "..."');
  process.exit(1);
}

console.log(JSON.stringify(classifyFromText(subject, body)));
