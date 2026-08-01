#!/usr/bin/env node
// CLI wrapper around src/render/email.ts for the email-polling routine --
// see docs/email-routine.md. Guarantees an email sent by the routine for a
// newly-created ticket is byte-identical to what the Worker itself would
// have rendered, since both read from the same file.
//
// Usage:
//   npx tsx scripts/render-email.mjs --kind ack --ticket-id 5 --subject "Cannot log in" \
//     --priority P2 --tracking-url "https://support.hamdam.com.au/tickets/5?token=abc" \
//     [--requester-name "Jane Doe"]
// Prints: {"subject":"[HAM-5] Cannot log in","html":"<div ...>"}

import { ackEmail } from '../src/render/email.ts';

function readFlag(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? '' : (process.argv[i + 1] ?? '');
}

const kind = readFlag('kind');

if (kind === 'ack') {
  const ticketId = Number(readFlag('ticket-id'));
  const subject = readFlag('subject');
  const priority = readFlag('priority');
  const trackingUrl = readFlag('tracking-url');
  const requesterName = readFlag('requester-name') || null;

  if (!Number.isInteger(ticketId) || !subject || !['P1', 'P2', 'P3', 'P4'].includes(priority) || !trackingUrl) {
    console.error('Usage: npx tsx scripts/render-email.mjs --kind ack --ticket-id N --subject "..." --priority P1..P4 --tracking-url "..." [--requester-name "..."]');
    process.exit(1);
  }

  console.log(JSON.stringify(ackEmail({ ticketId, subject, priority, trackingUrl, requesterName })));
} else {
  console.error(`Unknown or missing --kind (got ${JSON.stringify(kind)}). Only "ack" is supported by this CLI -- agent replies and resolution emails are pre-rendered by the Worker into outbound_emails.body_html.`);
  process.exit(1);
}
