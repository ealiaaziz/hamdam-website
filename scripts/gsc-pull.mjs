#!/usr/bin/env node
// Takes one Search Console reading and appends it to docs/seo/traffic-log.md.
//
// Runs monthly from .github/workflows/seo-log.yml. Written because the site
// spent a day being optimised against estimates with nothing checking them,
// and because the two schedulers available inside a Claude session are both
// unsuitable: one is gated, the other is in-memory and expires after 7 days.
// This depends on no session existing at all.
//
// No npm dependencies. The service account JWT is signed with node:crypto,
// which is about fifteen lines and avoids pulling `googleapis` (and its
// hundred-odd transitive packages) into a repo that needs none of it.
//
// WHAT THIS SCRIPT DOES NOT DO: interpret the numbers. It writes the reading
// and the arithmetic on what moved. Whether a change means anything is a
// judgement, and a script that faked one would be worse than a script that
// leaves the space blank. Each month's note ends with an explicit prompt for a
// person to fill that in.

import { createSign } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = join(ROOT, 'docs/seo/traffic-log.md');

const SITE = 'sc-domain:hamdam.com.au';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

// Fixed sample, deliberately small: the URL Inspection API is quota limited to
// 2000 calls a day and 600 a minute, but the real reason to cap it is that a
// sample you compare month to month is worth more than a sweep that changes
// shape every time. One page per template.
const INSPECT = [
  'https://hamdam.com.au/',
  'https://hamdam.com.au/fa/',
  'https://hamdam.com.au/poets/hafez/',
  'https://hamdam.com.au/fal-e-hafez/',
  'https://hamdam.com.au/moments/yalda/',
];

const ROW_MARKER = '<!-- readings:row -->';
const NOTES_MARKER = '<!-- readings:notes -->';

function fail(message) {
  console.error(`gsc-pull: ${message}`);
  process.exit(1);
}

// ---------------------------------------------------------------- auth

function loadKey() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (!raw || !raw.trim()) {
    fail(
      'GSC_SERVICE_ACCOUNT_KEY is not set.\n' +
        '  This is the JSON key for a Google service account that has been added\n' +
        '  as a user on the Search Console property. Setup steps are in\n' +
        '  docs/seo/traffic-log.md under "Credentials".'
    );
  }
  let key;
  try {
    key = JSON.parse(raw);
  } catch {
    fail('GSC_SERVICE_ACCOUNT_KEY is not valid JSON. Paste the whole key file, unmodified.');
  }
  if (!key.client_email || !key.private_key) {
    fail('GSC_SERVICE_ACCOUNT_KEY is missing client_email or private_key.');
  }
  return key;
}

async function accessToken(key) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: key.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const body = await res.json();
  if (!res.ok) fail(`token exchange failed (${res.status}): ${JSON.stringify(body)}`);
  return body.access_token;
}

// ---------------------------------------------------------------- api

async function api(token, url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) {
    const detail = body?.error?.message ?? JSON.stringify(body);
    if (res.status === 403) {
      fail(
        `Search Console refused the request (403): ${detail}\n` +
          '  The usual cause is the service account not being added as a user on the\n' +
          '  property. Search Console, Settings, Users and permissions, add\n' +
          `  ${'the service account email'} with Full permission.`
      );
    }
    fail(`${url} failed (${res.status}): ${detail}`);
  }
  return body;
}

const query = (token, start, end, dimensions) =>
  api(
    token,
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`,
    { startDate: start, endDate: end, dimensions, rowLimit: 200, dataState: 'final' }
  );

async function inspect(token, url) {
  try {
    const body = await api(token, 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
      inspectionUrl: url,
      siteUrl: SITE,
    });
    return { url, state: body?.inspectionResult?.indexStatusResult?.coverageState ?? 'unknown' };
  } catch {
    // A single flaky inspection must not lose the whole reading. The analytics
    // pull above is the part that cannot be recovered later; coverage can.
    return { url, state: 'inspection failed' };
  }
}

// ---------------------------------------------------------------- window

/** The previous calendar month. Search Console lags 2 to 3 days, so a run on
 *  the 3rd sees a complete month. Overridable for testing and backfills. */
function windowFor(today) {
  if (process.env.GSC_START && process.env.GSC_END) {
    return { start: process.env.GSC_START, end: process.env.GSC_END };
  }
  const firstOfThis = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(firstOfThis.getTime() - 86400000);
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  const iso = (d) => d.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end) };
}

// ---------------------------------------------------------------- shaping

const totalsOf = (res) => {
  const r = res?.rows?.[0];
  return {
    clicks: r?.clicks ?? 0,
    impressions: r?.impressions ?? 0,
    position: r?.position ?? 0,
  };
};

/** Reads the last data row already in the table, so the note can say what
 *  moved. Returns null on the first run after the markers were added. */
function previousRow(text) {
  const before = text.slice(0, text.indexOf(ROW_MARKER));
  const rows = before.trimEnd().split('\n').filter((l) => l.startsWith('|'));
  const last = rows.at(-1);
  if (!last || last.includes('---') || last.includes('Taken')) return null;
  const cells = last.split('|').slice(1, -1).map((c) => c.trim());
  if (cells.length < 7) return null;
  const num = (i) => Number(cells[i].replace(/[^0-9.]/g, ''));
  return {
    taken: cells[0],
    impressions: num(2),
    clicks: num(3),
    position: num(4),
    queries: num(5),
    pages: num(6),
  };
}

/** Project hard rule 3 bans em and en dashes in content. Most of this file's
 *  output is written to comply, but three strings come from Google rather than
 *  from here: coverage states, which have used an en dash in the past, and
 *  query strings, which are typed by real people who are perfectly capable of
 *  typing either. `scripts/check-dashes.mjs` does not walk `docs/`, so nothing
 *  downstream would catch it. Normalising to a comma rather than a hyphen is
 *  the same call that file's header argues for. */
const noDashes = (s) => String(s).replace(/\s*[–—]\s*/g, ', ');

const delta = (now, then, label) => {
  if (then === null || then === undefined || Number.isNaN(then)) return `${label} ${now}`;
  const d = now - then;
  if (d === 0) return `${label} unchanged at ${now}`;
  return `${label} ${then} to ${now} (${d > 0 ? '+' : ''}${Number(d.toFixed(1))})`;
};

// ---------------------------------------------------------------- main

const today = new Date();
const taken = today.toISOString().slice(0, 10);
const { start, end } = windowFor(today);

const token = await accessToken(loadKey());

const [totalsRes, queriesRes, pagesRes, geoRes] = await Promise.all([
  query(token, start, end, []),
  query(token, start, end, ['query']),
  query(token, start, end, ['page']),
  query(token, start, end, ['country', 'device']),
]);

// The headline MUST come from the no-dimension call. The `query` breakdown
// omits terms Google withholds for having too few searchers, and reading it as
// the site total understated the property by roughly half on 2026-08-08. That
// mistake is recorded in the log; this comment is here so it is not repeated.
const totals = totalsOf(totalsRes);
const queryRows = queriesRes?.rows ?? [];
const pageRows = pagesRes?.rows ?? [];
const geoRows = geoRes?.rows ?? [];

const coverage = [];
for (const url of INSPECT) coverage.push(await inspect(token, url));

const text = readFileSync(LOG, 'utf8');
if (!text.includes(ROW_MARKER) || !text.includes(NOTES_MARKER)) {
  fail(`docs/seo/traffic-log.md is missing ${ROW_MARKER} or ${NOTES_MARKER}. See the note above the table.`);
}
const prev = previousRow(text);

const row =
  `| ${taken} | ${start} to ${end} | ${totals.impressions} | ${totals.clicks} | ` +
  `${totals.position.toFixed(1)} | ${queryRows.length} | ${pageRows.length} |`;

const withheld = totals.impressions - queryRows.reduce((s, r) => s + (r.impressions ?? 0), 0);
const topQueries = queryRows
  .slice(0, 5)
  .map((r) => `\`${noDashes(r.keys[0])}\` (${r.impressions} impressions, position ${r.position.toFixed(1)})`);
const countries = Object.entries(
  geoRows.reduce((acc, r) => {
    acc[r.keys[0]] = (acc[r.keys[0]] ?? 0) + r.impressions;
    return acc;
  }, {})
)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 8)
  .map(([c, n]) => `${c.toUpperCase()} ${n}`);

// Named for the window rather than the run date: two runs in one day would
// otherwise produce two identical headings, and the month covered is the thing
// a reader is scanning for anyway.
const monthName = new Date(`${start}T00:00:00Z`).toLocaleString('en-AU', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const notes = [
  `### ${monthName}, read ${taken}`,
  '',
  `Window ${start} to ${end}, taken automatically by \`scripts/gsc-pull.mjs\`.`,
  '',
  '**What moved.** ' +
    [
      delta(pageRows.length, prev?.pages, 'Pages with impressions'),
      delta(queryRows.length, prev?.queries, 'named queries'),
      delta(totals.clicks, prev?.clicks, 'clicks'),
      delta(totals.impressions, prev?.impressions, 'impressions'),
    ].join(', ') +
    `. Average position ${totals.position.toFixed(1)}.` +
    (prev ? ` Previous reading was ${prev.taken}.` : ''),
  '',
  totals.clicks === 0
    ? '**Clicks remain 0.** No one has yet arrived at this site from Google search.'
    : `**Clicks: ${totals.clicks}.** The first number in this table that is actually visitors.`,
  '',
  `**Queries.** ${topQueries.length ? `${topQueries.join('; ')}.` : 'None named.'}` +
    (withheld > 0 ? ` A further ${withheld} impressions are against queries Google withholds.` : ''),
  '',
  `**Countries.** ${countries.length ? `${countries.join(', ')}.` : 'None recorded.'}`,
  '',
  '**Coverage of the fixed sample.**',
  '',
  '| URL | Coverage state |',
  '| --- | --- |',
  ...coverage.map((c) => `| \`${c.url.replace('https://hamdam.com.au', '')}\` | ${noDashes(c.state)} |`),
  '',
  '_Interpretation, to be filled in by a person: does this still say links are the_',
  '_binding constraint, and does it land inside the scenario bands in_',
  '_`2026-08-07-measurement.md`? A reading with no commentary is close to useless later._',
  '',
].join('\n');

writeFileSync(
  LOG,
  text.replace(ROW_MARKER, `${row}\n${ROW_MARKER}`).replace(NOTES_MARKER, `${notes}\n${NOTES_MARKER}`)
);

console.log(row);
console.log(`coverage: ${coverage.map((c) => `${c.url} = ${c.state}`).join(', ')}`);
console.log(`gsc-pull: appended reading for ${start} to ${end}`);
