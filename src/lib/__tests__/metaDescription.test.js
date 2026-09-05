import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Every built page's meta description, measured. Added 2026-09-05 after an SEO
// scan found the homepage at 189 characters: the clause Google cut was the call
// to action.
//
// The limit is 160 for English and 200 for Farsi, and the split is not
// arbitrary. Google truncates a snippet by rendered width, not character count,
// and Persian script renders narrower per character: measured in 13px Arial,
// the 190-character Farsi privacy description is 1121px wide, almost exactly
// the same as the 189-character English homepage description was. A single
// character limit across both scripts would either cut Farsi copy that fits or
// let English copy through that does not.
//
// This also guards a mistake made while writing it. Counting Farsi with a shell
// `${#var}` counts UTF-8 bytes, so every Persian description looked twice as
// long as it is and /fa/privacy/ appeared to be 346 characters. It is 190.
// Count characters, not bytes.
const LIMIT = { en: 160, fa: 200 };

function pages(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) pages(p, acc);
    else if (e === 'index.html') acc.push(p);
  }
  return acc;
}

const dist = 'dist';
let built = [];
try { built = pages(dist); } catch { /* dist absent: the guard below reports it */ }

describe('meta descriptions', () => {
  test('the build exists to check', () => {
    expect(built.length, 'run `npm run build` before this test').toBeGreaterThan(20);
  });

  test.each(built)('%s is within its limit and non-empty', (file) => {
    const html = readFileSync(file, 'utf8');
    const m = html.match(/<meta name="description" content="([^"]*)"/);
    expect(m, `${file} has no meta description`).not.toBeNull();
    const text = m[1];
    const route = file.replace(/^dist/, '').replace(/index\.html$/, '') || '/';
    const lang = route.startsWith('/fa/') ? 'fa' : 'en';
    // Floor is 20, not 50. The first version of this test used 50 and failed
    // five Farsi pages that are correct: `/fa/poets/saadi/` is 42 characters
    // and says everything it needs to. Persian is denser per character, which
    // is the same fact the upper limits above encode, in the other direction.
    expect([...text].length, `${route} description is empty or a stub`).toBeGreaterThan(20);
    expect(
      [...text].length,
      `${route} (${lang}) description is ${[...text].length} characters, over ${LIMIT[lang]}`,
    ).toBeLessThanOrEqual(LIMIT[lang]);
  });
});
