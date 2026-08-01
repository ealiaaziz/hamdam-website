#!/usr/bin/env node
// Refuses to deploy hamdam-support from a dirty tree or an unpushed branch.
// Mirrors ../scripts/predeploy-check.mjs (the main site's guard) for the
// same reason: this repo has no CI, so a manual `wrangler deploy` is the
// only thing standing between "what's committed" and "what's live", and
// that only works if it always runs before deploying.
//
// Escape hatch: `npm run deploy -- --force`.

import { execFileSync } from 'node:child_process';

const force = process.argv.includes('--force');
let overrodeSomething = false;

function git(...args) {
  // Run from the repo root regardless of cwd, since this package lives in a
  // subdirectory (support/) of the hamdam-website repo.
  return execFileSync('git', ['-C', new URL('..', import.meta.url).pathname, ...args], { encoding: 'utf8' }).trim();
}

function fail(problem, fix) {
  console.error(`\n  Deploy blocked: ${problem}\n`);
  console.error(`  ${fix}\n`);
  if (force) {
    console.error('  --force was passed, so continuing anyway. Production will not match the remote.\n');
    overrodeSomething = true;
    return;
  }
  console.error('  If this is genuinely intended, re-run with: npm run deploy -- --force\n');
  process.exit(1);
}

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');

const dirty = git('status', '--porcelain');
if (dirty) {
  const files = dirty.split('\n').slice(0, 10).join('\n    ');
  fail(
    `${dirty.split('\n').length} uncommitted change(s) on ${branch}:\n\n    ${files}`,
    'Commit them (or stash them) before deploying.',
  );
}

try {
  execFileSync('git', ['-C', new URL('..', import.meta.url).pathname, 'fetch', '--quiet', 'origin'], { stdio: 'ignore' });
} catch {
  fail(
    'could not reach origin to check whether this branch is pushed.',
    'A deploy needs the network anyway, so fix the connection and try again.',
  );
}

let counts = '0\t0';
try {
  git('rev-parse', '--verify', '--quiet', `refs/remotes/origin/${branch}`);
  counts = git('rev-list', '--left-right', '--count', `origin/${branch}...HEAD`);
} catch {
  fail(
    `${branch} does not exist on origin at all, so nothing about this deploy is recorded there.`,
    `Push it first: git push -u origin ${branch}`,
  );
}

const [behind, ahead] = counts.split(/\s+/).map(Number);

if (ahead > 0) {
  fail(`${ahead} commit(s) on ${branch} are not on origin.`, `Push them first: git push origin ${branch}`);
}

if (behind > 0) {
  fail(`origin/${branch} has ${behind} commit(s) you do not have locally.`, 'Pull and rebuild, so you deploy the newest work rather than overwriting it.');
}

if (overrodeSomething) {
  console.error(`  Pre-deploy check FORCED on ${branch}. What is being served will not match origin.`);
} else {
  console.log(`  Pre-deploy check passed: ${branch} is clean and matches origin.`);
}
