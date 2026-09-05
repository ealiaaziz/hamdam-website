#!/usr/bin/env node
// Refuses to deploy anything that is not committed and pushed first.
//
// Why this exists: on 2026-07-25 the site was deployed from a local `dist`
// while four commits sat unpushed, so production was ahead of GitHub for
// several minutes and the only record of what was serving lived on one laptop.
// There is no CI on this project (deploys are a manual `wrangler deploy`), so
// nothing else was ever going to catch that.
//
// Three ways to fail, all of them "the remote does not match what you are about
// to serve":
//   1. uncommitted changes in the working tree
//   2. commits that exist locally but not on the remote
//   3. commits on the remote that are not local (someone else deployed newer work)
//
// Escape hatch: `npm run deploy -- --force`, which prints a loud warning rather
// than silently allowing it. A guard with no escape hatch gets deleted the first
// time it is genuinely in the way; one that makes you say so out loud does not.

import { execFileSync } from 'node:child_process';

const force = process.argv.includes('--force');
let overrodeSomething = false;

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
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

// Uncommitted work, including untracked files: `dist` is built from the working
// tree, so anything uncommitted here is something the remote has never seen.
const dirty = git('status', '--porcelain');
if (dirty) {
  const files = dirty.split('\n').slice(0, 10).join('\n    ');
  fail(
    `${dirty.split('\n').length} uncommitted change(s) on ${branch}:\n\n    ${files}`,
    'Commit them (or stash them) before deploying.',
  );
}

// Compare against the remote's actual current state, not a stale local ref.
// Fetch everything rather than one branch: fetching a branch that does not
// exist on the remote fails the same way an unreachable network does, and
// those two need different advice.
try {
  execFileSync('git', ['fetch', '--quiet', 'origin'], { stdio: 'ignore' });
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
  fail(
    `${ahead} commit(s) on ${branch} are not on origin.`,
    `Push them first: git push origin ${branch}`,
  );
}

if (behind > 0) {
  fail(
    `origin/${branch} has ${behind} commit(s) you do not have locally.`,
    'Pull and rebuild, so you deploy the newest work rather than overwriting it.',
  );
}

// The build reads PUBLIC_ASC_PROVIDER_TOKEN and, when it is unset, silently
// emits every App Store link without its `pt=` parameter. Nothing fails: the
// links still work, they just stop carrying Apple affiliate attribution, and
// the only way to notice is to diff the built HTML against what production
// serves. That is exactly what happened on 2026-09-05, when a deploy from an
// environment without the variable replaced all eight links on both locales
// with untagged ones. Checked here rather than in the build, because a build
// for local review has no business needing a production token.
if (!process.env.PUBLIC_ASC_PROVIDER_TOKEN) {
  fail(
    'PUBLIC_ASC_PROVIDER_TOKEN is not set, so this build would ship App Store links with no affiliate attribution.',
    'Set it in the environment before deploying, or push to main and let Workers Builds deploy, which has it.',
  );
}

// Never claim the check passed when it was overridden: a forced deploy is
// exactly the case where the log has to say what really happened.
if (overrodeSomething) {
  console.error(`  Pre-deploy check FORCED on ${branch}. What is being served will not match origin.`);
} else {
  console.log(`  Pre-deploy check passed: ${branch} is clean and matches origin.`);
}
