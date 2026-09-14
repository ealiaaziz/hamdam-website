// Per-page `lastmod` for the sitemap, taken from git rather than from the clock.
//
// The sitemap carried no `lastmod` at all until 2026-09-14, on any of its 26
// URLs. That is the field a crawler uses to decide what is worth fetching
// again, so nothing on this site was telling anyone that anything had changed.
// For a site whose whole complaint is that AI assistants and indexes are weeks
// behind, that is the cheapest signal there was to give and it was not being
// given.
//
// The tempting shortcut is to stamp the build time on every URL. Do not: it
// says all 26 pages changed on every deploy, which is false on almost every
// deploy, and a source that always claims freshness is one a crawler learns to
// discount. So each URL gets the commit date of the files it is actually built
// from, and a page nobody touched keeps its old date and stays honest.
//
// If git is not available the field is omitted entirely rather than guessed.
// No `lastmod` is a missing signal; a wrong one is a misleading signal.

import { execFileSync } from 'node:child_process';

/** Files every page depends on, so a layout change moves the whole site. */
const GLOBAL = ['src/layouts/BaseLayout.astro', 'src/styles/tokens.css'];

/** Exact routes to the sources they are built from, beyond GLOBAL. */
const EXACT = {
  '/': ['src/pages/index.astro', 'src/data/siteCopy.ts', 'src/lib/appName.js'],
  '/fa/': ['src/pages/fa/index.astro', 'src/data/siteCopy.ts', 'src/lib/appName.js'],
  '/whats-new/': ['src/pages/whats-new.astro', 'src/data/releases.ts'],
  '/fa/whats-new/': ['src/pages/fa/whats-new.astro', 'src/data/releases.ts'],
  '/fal-e-hafez/': ['src/pages/fal-e-hafez.astro', 'src/data/falHafez.ts'],
  '/fa/fal-e-hafez/': ['src/pages/fa/fal-e-hafez.astro', 'src/data/falHafez.ts'],
  '/privacy/': ['src/pages/privacy.astro'],
  '/fa/privacy/': ['src/pages/fa/privacy.astro'],
  '/terms/': ['src/pages/terms.astro'],
  '/fa/terms/': ['src/pages/fa/terms.astro'],
};

/** Route shapes to their generating template and data. */
const PATTERNS = [
  [/^\/(fa\/)?poets\/[^/]+\/$/, ['src/pages/poets/[poet].astro', 'src/data/poetPages.ts', 'src/data/poets.ts']],
  [/^\/(fa\/)?moments\/[^/]+\/$/, ['src/pages/moments/[moment].astro', 'src/data/momentContent.ts', 'src/data/rootsMoments.ts']],
];

const cache = new Map();

/** ISO 8601 commit date of the last change to one path, or null. */
function commitDate(path) {
  if (cache.has(path)) return cache.get(path);
  let value = null;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', path], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    value = out || null;
  } catch {
    value = null;
  }
  cache.set(path, value);
  return value;
}

/**
 * The newest commit date across a page's sources, as a sitemap `lastmod`.
 *
 * @param {string} pathname A site-relative path with a trailing slash.
 * @returns {Date | undefined} undefined when git cannot answer, so the field
 *   is left out rather than invented.
 */
export function lastmodFor(pathname) {
  const matched = PATTERNS.find(([re]) => re.test(pathname));
  const sources = [...GLOBAL, ...(EXACT[pathname] ?? matched?.[1] ?? [])];
  const dates = sources.map(commitDate).filter(Boolean);
  if (dates.length === 0) return undefined;
  const newest = dates.sort().at(-1);
  const date = new Date(newest);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * The same date as a plain `YYYY-MM-DD` string, for `dateModified` in JSON-LD.
 *
 * Schema and sitemap read one source deliberately. They are the same claim
 * made in two places, and two sources would eventually disagree: privacy.astro
 * and terms.astro both hard-coded `dateModified: '2026-08-13'` and were still
 * publishing it on 2026-09-14, having actually changed on 2026-09-05 and
 * 2026-09-08. A wrong date on a legal page is worse than a missing one,
 * because a reader uses it to decide whether the terms they agreed to have
 * changed.
 *
 * @param {string} pathname
 * @returns {string | undefined}
 */
export function lastmodIso(pathname) {
  return lastmodFor(pathname)?.toISOString().slice(0, 10);
}
