#!/usr/bin/env node
// Parameterized D1 query runner for the hourly email-polling routine (see
// docs/email-routine.md). Talks to Cloudflare's D1 HTTP API directly so
// inbound email content (subject, body, sender name -- all attacker
// controlled, since anyone can email developer@hamdam.com.au) is always
// passed as a bind parameter, never concatenated into SQL text. Never add
// a code path here that builds SQL by string-interpolating a CLI argument.
//
// Usage:
//   node scripts/db-query.mjs '<SQL with ?1 ?2 ... placeholders>' '<JSON array of params>'
//
// Prints the D1 API's JSON response (results rows under .result[0].results)
// or a non-zero exit with an error message on failure.
//
// Required env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
// Reads the database_id out of wrangler.jsonc next to this script.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const sql = process.argv[2];
const paramsJson = process.argv[3] ?? '[]';

if (!sql) {
  console.error('Usage: node scripts/db-query.mjs \'<SQL>\' \'<JSON array of params>\'');
  process.exit(1);
}

let params;
try {
  params = JSON.parse(paramsJson);
  if (!Array.isArray(params)) throw new Error('params must be a JSON array');
} catch (err) {
  console.error(`Invalid params JSON: ${err.message}`);
  process.exit(1);
}

const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!apiToken || !accountId) {
  console.error('Missing CLOUDFLARE_API_TOKEN and/or CLOUDFLARE_ACCOUNT_ID in the environment.');
  process.exit(1);
}

const wranglerConfigPath = fileURLToPath(new URL('../wrangler.jsonc', import.meta.url));
const wranglerConfig = JSON.parse(readFileSync(wranglerConfigPath, 'utf8').replace(/\/\/.*$/gm, ''));
const databaseId = wranglerConfig.d1_databases?.[0]?.database_id;
if (!databaseId || databaseId === 'REPLACE_WITH_D1_DATABASE_ID') {
  console.error('wrangler.jsonc still has the placeholder database_id -- run `wrangler d1 create hamdam-support-db` first (see README.md).');
  process.exit(1);
}

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  },
);

const body = await response.json();
if (!response.ok || body.success === false) {
  console.error(`D1 query failed (HTTP ${response.status}): ${JSON.stringify(body.errors ?? body)}`);
  process.exit(1);
}

console.log(JSON.stringify(body.result?.[0]?.results ?? [], null, 2));
