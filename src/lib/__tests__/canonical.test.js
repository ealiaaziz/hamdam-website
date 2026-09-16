import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every built page's canonical tag, measured against the route it was built at.
// Added 2026-09-16 while chasing a Search Console mail. The mail turned out not
// to be about this site's markup at all -- see
// docs/seo/2026-09-16-indexing-email.md -- but the search found a real wart and
// then a fact worth pinning, and this file is both.
//
// The wart: the 404 page carried `<link rel="canonical" href="https://hamdam.com.au/404">`,
// so every 404 response named /404 as a canonical URL, and /404 answers 200
// because Cloudflare serves dist/404.html as an ordinary asset as well as using
// it for not_found_handling. Nothing followed it -- URL inspection says /404 is
// unknown to Google -- so this cost nothing. It is still a tag pointing a
// crawler at an error page.
//
// Two rules, and the second is the one that regressed:
//   1. An indexable page declares exactly one canonical, and it is itself.
//   2. A noindexed page declares none. A canonical asserts "this is the
//      indexable address of this content", which is the opposite of what
//      noindex asserts; emitting both is a contradiction and, worse, an
//      invitation to crawl.
//
// Rule 1 also pins the trailing slash, and that is the half with evidence
// behind it. On 2026-09-16 all 26 sitemap URLs were inspected through the
// Search Console API and every one came back "Submitted and indexed" with
// googleCanonical exactly equal to userCanonical. That is the state this test
// exists to hold: canonicals, sitemap and Google's own choice, all agreeing on
// the trailing-slash form. /privacy answers 307 to /privacy/, so a canonical
// pointing at the redirecting form would hand Google a hop it does not need,
// and one page drifting is enough to start splitting signals.

const SITE = 'https://hamdam.com.au';

function htmlFiles(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) htmlFiles(p, acc);
    else if (e.endsWith('.html')) acc.push(p);
  }
  return acc;
}

let built = [];
try { built = htmlFiles('dist'); } catch { /* dist absent: the guard below reports it */ }

const canonicalsOf = (html) =>
  [...html.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);

const isNoindex = (html) => /<meta name="robots" content="[^"]*noindex/.test(html);

describe('canonical tags', () => {
  test('the build exists to check', () => {
    expect(built.length, 'run `npm run build` before this test').toBeGreaterThan(20);
  });

  test.each(built)('%s declares the right canonical', (file) => {
    const html = readFileSync(file, 'utf8');
    const found = canonicalsOf(html);

    if (isNoindex(html)) {
      expect(found, `${file} is noindexed and must declare no canonical`).toEqual([]);
      return;
    }

    expect(found.length, `${file} must declare exactly one canonical`).toBe(1);

    const route = file.replace(/^dist/, '').replace(/index\.html$/, '') || '/';
    expect(found[0], `${route} must canonicalise to itself`).toBe(`${SITE}${route}`);
    expect(found[0], `${route} canonical must keep its trailing slash`).toMatch(/\/$/);
  });

  test('the 404 page is noindexed and declares no canonical', () => {
    const html = readFileSync('dist/404.html', 'utf8');
    expect(isNoindex(html), '404 page lost its noindex').toBe(true);
    expect(canonicalsOf(html), '404 page must not advertise itself as canonical').toEqual([]);
  });
});
