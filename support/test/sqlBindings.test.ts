import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// A static check for one specific, expensive mistake.
//
// Adding a column meant editing a prepared statement and its bind() call
// together. The bind() edit landed and the SQL edit silently did not, so the
// statement had thirteen placeholders and fourteen values. TypeScript is
// blind to this, every unit test here passed, and the first thing that
// noticed was a 500 on the live portal, because nothing in this suite talks
// to D1 at all.
//
// This does not test the database. It tests that the two halves of each
// statement still agree about how many parameters exist, which is the whole
// of what went wrong.

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'src', 'db.ts'), 'utf8');

/** Every `.prepare(`...`)` immediately followed by `.bind(...)`. */
function preparedStatements(): { sql: string; binds: number; at: number }[] {
  const found: { sql: string; binds: number; at: number }[] = [];
  const re = /\.prepare\(\s*`([\s\S]*?)`,?\s*\)\s*\.bind\(([\s\S]*?)\)\s*\./g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    const args = m[2].trim();
    // Count top-level commas, so a nested call or object counts as one arg.
    let depth = 0;
    let count = args ? 1 : 0;
    for (const ch of args) {
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth--;
      else if (ch === ',' && depth === 0) count++;
    }
    // A trailing comma before the close paren inflates the count by one.
    if (/,\s*$/.test(args)) count--;
    found.push({ sql: m[1], binds: count, at: source.slice(0, m.index).split('\n').length });
  }
  return found;
}

describe('prepared statements in db.ts', () => {
  const statements = preparedStatements();

  it('finds the statements at all, so a refactor cannot quietly disable this', () => {
    expect(statements.length).toBeGreaterThan(5);
  });

  it('binds exactly as many values as the SQL has parameters', () => {
    for (const { sql, binds, at } of statements) {
      const numbered = [...sql.matchAll(/\?(\d+)/g)].map((m) => Number(m[1]));
      if (numbered.length === 0) continue;
      const highest = Math.max(...numbered);
      const label = `db.ts:${at} -- ${sql.trim().split('\n')[0]}`;
      expect(binds, `${label}: highest placeholder is ?${highest}`).toBe(highest);
    }
  });

  it('numbers its parameters without gaps', () => {
    // ?1, ?2, ?4 binds three values and silently leaves ?4 null.
    for (const { sql, at } of statements) {
      const numbered = new Set([...sql.matchAll(/\?(\d+)/g)].map((m) => Number(m[1])));
      if (numbered.size === 0) continue;
      const highest = Math.max(...numbered);
      for (let i = 1; i <= highest; i++) {
        expect(numbered.has(i), `db.ts:${at} is missing ?${i}`).toBe(true);
      }
    }
  });
});
